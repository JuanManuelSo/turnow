import 'server-only';

import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { Resend } from 'resend';
import { localDateTimeToInstant } from '@/lib/timezone';
import { decryptCancellationCode } from '@/server/business/booking-security';
import { getDb } from '@/server/db/client';
import {
  appointmentAccessCodes, appointmentEmailNotifications, appointments, businesses,
} from '@/server/db/schema';
import { buildBookingEmail, type BookingEmailKind } from './booking-templates';

const resendWindowMs = 28 * 24 * 60 * 60 * 1000;

function resendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { client: new Resend(apiKey), from };
}

function dateInTimezone(date: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function reminderTime(startsAt: Date, timezone: string) {
  const localDate = dateInTimezone(startsAt, timezone);
  return localDateTimeToInstant(localDate, '08:00', timezone);
}

type NotificationId = { businessId: string; id: string };

async function setNotification(
  notification: NotificationId,
  values: Partial<typeof appointmentEmailNotifications.$inferInsert>,
) {
  await getDb().update(appointmentEmailNotifications).set({ ...values, updatedAt: new Date() })
    .where(and(
      eq(appointmentEmailNotifications.businessId, notification.businessId),
      eq(appointmentEmailNotifications.id, notification.id),
    ));
}

async function notificationContext(notification: NotificationId) {
  const [row] = await getDb().select({
    delivery: appointmentEmailNotifications,
    appointment: appointments,
    businessName: businesses.name,
    businessSlug: businesses.slug,
    codeCiphertext: appointmentAccessCodes.codeCiphertext,
    codeKeyVersion: appointmentAccessCodes.encryptionKeyVersion,
  }).from(appointmentEmailNotifications)
    .innerJoin(appointments, and(
      eq(appointments.businessId, appointmentEmailNotifications.businessId),
      eq(appointments.id, appointmentEmailNotifications.appointmentId),
    ))
    .innerJoin(businesses, eq(businesses.id, appointmentEmailNotifications.businessId))
    .leftJoin(appointmentAccessCodes, and(
      eq(appointmentAccessCodes.businessId, appointments.businessId),
      eq(appointmentAccessCodes.appointmentId, appointments.id),
      isNull(appointmentAccessCodes.revokedAt),
    ))
    .where(and(
      eq(appointmentEmailNotifications.businessId, notification.businessId),
      eq(appointmentEmailNotifications.id, notification.id),
    )).limit(1);

  if (!row) return null;
  return row;
}

async function cancelScheduledEmail(
  notification: NotificationId,
  resendEmailId: string,
  appointmentConfirmed: boolean,
) {
  const resend = resendClient();
  if (!resend) return;
  try {
    const { error } = await resend.client.emails.cancel(resendEmailId);
    if (error) throw new Error(error.message);
    await setNotification(notification, {
      status: appointmentConfirmed ? 'pending' : 'cancelled',
      resendEmailId: null,
      attempts: 0,
      lastError: null,
    });
  } catch (error) {
    const currentAttempts = (await notificationContext(notification))?.delivery.attempts ?? 0;
    await setNotification(notification, {
      status: 'cancel_pending',
      attempts: currentAttempts + 1,
      lastError: error instanceof Error ? error.message.slice(0, 1000) : 'No se pudo cancelar el correo programado.',
    });
  }
}

async function processOne(notification: NotificationId) {
  const resend = resendClient();
  if (!resend) return;
  const row = await notificationContext(notification);
  if (!row) return;
  const delivery = row.delivery;
  const appointment = row.appointment;

  if (delivery.status === 'sent' || delivery.status === 'cancelled' || delivery.status === 'skipped') return;

  if (delivery.status === 'cancel_pending' && delivery.resendEmailId) {
    await cancelScheduledEmail(notification, delivery.resendEmailId, appointment.status === 'confirmed');
    const refreshed = await notificationContext(notification);
    if (refreshed?.delivery.status === 'pending') return processOne(notification);
    return;
  }

  if (delivery.kind === 'reminder' && delivery.status === 'scheduled') {
    if (appointment.status !== 'confirmed' || appointment.startsAt.getTime() <= Date.now()) {
      if (delivery.resendEmailId) await cancelScheduledEmail(notification, delivery.resendEmailId, false);
      else await setNotification(notification, { status: 'cancelled' });
      return;
    }
    const expectedTime = reminderTime(appointment.startsAt, appointment.timezoneSnapshot);
    if (expectedTime.getTime() !== delivery.scheduledAt.getTime() && delivery.resendEmailId) {
      await setNotification(notification, { status: 'cancel_pending', scheduledAt: expectedTime });
      return processOne(notification);
    }
    return;
  }

  if (appointment.status !== 'confirmed') {
    await setNotification(notification, { status: 'cancelled' });
    return;
  }
  if (!appointment.customerEmail || !row.codeCiphertext || row.codeKeyVersion === null) {
    await setNotification(notification, { status: 'skipped', lastError: 'Falta email o código privado de la reserva.' });
    return;
  }

  const now = new Date();
  let scheduledAt = delivery.scheduledAt;
  if (delivery.kind === 'reminder') {
    scheduledAt = reminderTime(appointment.startsAt, appointment.timezoneSnapshot);
    if (appointment.startsAt.getTime() <= scheduledAt.getTime() || scheduledAt.getTime() <= now.getTime()) {
      await setNotification(notification, { status: 'skipped', scheduledAt, lastError: null });
      return;
    }
    if (scheduledAt.getTime() > now.getTime() + resendWindowMs) {
      if (scheduledAt.getTime() !== delivery.scheduledAt.getTime()) {
        await setNotification(notification, { scheduledAt, lastError: null });
      }
      return;
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    await setNotification(notification, { attempts: delivery.attempts + 1, lastError: 'Falta NEXT_PUBLIC_SITE_URL.' });
    return;
  }
  const manageUrl = new URL(`/${encodeURIComponent(row.businessSlug)}/cancelar`, siteUrl).toString();
  const kind = delivery.kind as BookingEmailKind;
  const email = buildBookingEmail({
    kind,
    customerName: appointment.customerName,
    businessName: row.businessName,
    serviceName: appointment.serviceNameSnapshot,
    professionalName: appointment.professionalNameSnapshot,
    locationName: appointment.locationNameSnapshot,
    locationAddress: appointment.locationAddressSnapshot,
    startsAt: appointment.startsAt,
    timezone: appointment.timezoneSnapshot,
    durationMinutes: appointment.durationMinutesSnapshot,
    priceMinor: appointment.priceMinorSnapshot,
    currency: appointment.currencySnapshot,
    cancellationNoticeMinutes: appointment.cancellationNoticeMinutesSnapshot,
    cancellationCode: decryptCancellationCode(row.codeCiphertext, row.codeKeyVersion),
    manageUrl,
  });
  const idempotencyKey = `${delivery.kind}/${delivery.id}/${scheduledAt.getTime()}`;

  try {
    const sendInput = {
      from: resend.from,
      to: [appointment.customerEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(kind === 'reminder' && scheduledAt.getTime() > now.getTime()
        ? { scheduledAt: scheduledAt.toISOString() }
        : {}),
    };
    const { data, error } = await resend.client.emails.send(sendInput, { idempotencyKey });
    if (error) throw new Error(error.message);
    const scheduled = kind === 'reminder' && scheduledAt.getTime() > now.getTime();
    if (scheduled && !data?.id) throw new Error('Resend no devolvió el identificador del recordatorio programado.');
    await setNotification(notification, {
      status: scheduled ? 'scheduled' : 'sent',
      scheduledAt,
      resendEmailId: scheduled ? data?.id ?? null : null,
      sentAt: scheduled ? null : new Date(),
      attempts: delivery.attempts + 1,
      lastError: null,
    });
  } catch (error) {
    await setNotification(notification, {
      status: 'pending',
      scheduledAt,
      attempts: delivery.attempts + 1,
      lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Error al enviar el correo.',
    });
  }
}

export async function processAppointmentEmailNotifications(appointmentId: string) {
  const rows = await getDb().select({
    id: appointmentEmailNotifications.id, businessId: appointmentEmailNotifications.businessId,
  }).from(appointmentEmailNotifications).where(and(
    eq(appointmentEmailNotifications.appointmentId, appointmentId),
    inArray(appointmentEmailNotifications.status, ['pending', 'scheduled', 'cancel_pending']),
  )).orderBy(asc(appointmentEmailNotifications.kind));
  for (const row of rows) await processOne(row);
}

export async function processEmailNotificationQueue() {
  const rows = await getDb().select({
    id: appointmentEmailNotifications.id, businessId: appointmentEmailNotifications.businessId,
  }).from(appointmentEmailNotifications).where(inArray(
    appointmentEmailNotifications.status, ['pending', 'scheduled', 'cancel_pending'],
  )).orderBy(asc(appointmentEmailNotifications.scheduledAt)).limit(100);
  for (const row of rows) await processOne(row);
  return { checked: rows.length };
}

export async function cancelAppointmentEmailNotifications(appointmentId: string) {
  const rows = await getDb().select({
    id: appointmentEmailNotifications.id,
    businessId: appointmentEmailNotifications.businessId,
    status: appointmentEmailNotifications.status,
    resendEmailId: appointmentEmailNotifications.resendEmailId,
  }).from(appointmentEmailNotifications).where(and(
    eq(appointmentEmailNotifications.appointmentId, appointmentId),
    inArray(appointmentEmailNotifications.status, ['pending', 'scheduled']),
  ));
  for (const row of rows) {
    if (row.status === 'scheduled' && row.resendEmailId) {
      await setNotification(row, { status: 'cancel_pending' });
      await processOne(row);
    } else {
      await setNotification(row, { status: 'cancelled' });
    }
  }
}

export async function refreshAppointmentReminder(appointmentId: string) {
  const [appointment] = await getDb().select({
    businessId: appointments.businessId,
    status: appointments.status,
    startsAt: appointments.startsAt,
    timezone: appointments.timezoneSnapshot,
  }).from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appointment || appointment.status !== 'confirmed') return;
  const scheduledAt = reminderTime(appointment.startsAt, appointment.timezone);
  const [reminder] = await getDb().select({
    id: appointmentEmailNotifications.id,
    businessId: appointmentEmailNotifications.businessId,
    status: appointmentEmailNotifications.status,
    resendEmailId: appointmentEmailNotifications.resendEmailId,
  }).from(appointmentEmailNotifications).where(and(
    eq(appointmentEmailNotifications.businessId, appointment.businessId),
    eq(appointmentEmailNotifications.appointmentId, appointmentId),
    eq(appointmentEmailNotifications.kind, 'reminder'),
  )).limit(1);
  if (!reminder) return;

  const shouldSend = scheduledAt.getTime() > Date.now() && scheduledAt.getTime() < appointment.startsAt.getTime();
  const nextStatus = shouldSend ? 'pending' : 'skipped';

  if (reminder.status === 'scheduled' && reminder.resendEmailId) {
    await setNotification(reminder, { status: 'cancel_pending', scheduledAt });
    await processOne(reminder);
    return;
  }
  await setNotification(reminder, {
    status: nextStatus, scheduledAt, resendEmailId: null, attempts: 0, lastError: null, sentAt: null,
  });
  if (nextStatus === 'pending') await processOne(reminder);
}
