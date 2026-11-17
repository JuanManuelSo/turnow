'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { localDateTimeToInstant } from '@/lib/timezone';
import { getDb } from '@/server/db/client';
import { lockBusinessSchedule } from '@/server/db/locks';
import { getAvailableSlots } from '@/server/business/availability';
import { consumePublicAttempt } from '@/server/business/public-rate-limit';
import {
  createCancellationCode, decryptCancellationCode, encryptCancellationCode,
  hashBookingRequest, hashCancellationCode, isWithinCancellationWindow,
} from '@/server/business/booking-security';
import { getPublicBusinessBySlug } from '@/server/business/public-business';
import {
  appointmentAccessCodes, appointmentEvents, appointments, bookingRequests,
  businessSettings, businesses, calendarOccupancies, locations,
  professionalLocations, professionalServices, professionals, services,
} from '@/server/db/schema';

export type PublicBookingState = {
  error?: string;
  fields?: Record<string, string>;
  result?: {
    code: string;
    date: string;
    time: string;
    customerName: string;
    locationName: string;
    locationAddress: string | null;
    serviceName: string;
    professionalName: string;
    duration: number;
    priceMinor: number | null;
    showPrice: boolean;
    currency: string;
    cancellationNoticeMinutes: number;
    businessSlug: string;
  };
};

function clientIdentifier(requestHeaders: Headers) {
  // In the expected reverse-proxy setup, the trusted ingress appends the connecting IP last.
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return forwarded || requestHeaders.get('x-real-ip')?.trim() || 'unknown-client';
}

const availabilitySchema = z.object({
  locationId: z.uuid(), serviceId: z.uuid(), professionalId: z.union([z.uuid(), z.literal('any')]), date: z.iso.date(),
});

export async function getPublicAvailability(businessSlug: string, input: unknown) {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { slots: [], error: 'Revisá la sede, servicio, profesional y fecha.' };
  const business = await getPublicBusinessBySlug(businessSlug);
  if (!business?.publicBookingEnabled) return { slots: [], error: 'Las reservas online no están disponibles por el momento.' };
  const requestHeaders = await headers();
  const permitted = await consumePublicAttempt({
    businessId: business.id, scope: 'lookup', identifier: `availability:${clientIdentifier(requestHeaders)}`, limit: 120, windowMinutes: 60,
  });
  if (!permitted) return { slots: [], error: 'Hiciste muchas consultas seguidas. Esperá un momento y probá de nuevo.' };
  const slots = await getAvailableSlots({
    businessId: business.id,
    locationId: parsed.data.locationId,
    serviceId: parsed.data.serviceId,
    date: parsed.data.date,
    professionalId: parsed.data.professionalId === 'any' ? null : parsed.data.professionalId,
  });
  return { slots: slots.map(slot => ({ time: slot.time })) };
}

const bookingSchema = z.object({
  locationId: z.uuid('Elegí una sede.'),
  serviceId: z.uuid('Elegí un servicio.'),
  professionalId: z.union([z.uuid(), z.literal('any')]),
  date: z.iso.date('Elegí una fecha válida.'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Elegí un horario disponible.'),
  customerName: z.string().trim().min(1, 'Ingresá tu nombre.').max(160, 'El nombre es demasiado largo.'),
  customerPhone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Usá el formato internacional, por ejemplo +5493415550100.'),
  idempotencyKey: z.uuid(),
});

function fieldErrors(issues: readonly { path: PropertyKey[] | readonly PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.flatMap(issue => {
    const key = issue.path[0];
    return typeof key === 'string' ? [[key, issue.message]] : [];
  }));
}

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
};

function confirmationResult(input: {
  code: string; showPrice: boolean; appointment: {
    startsAt: Date; customerName: string; locationNameSnapshot: string; locationAddressSnapshot: string | null;
    serviceNameSnapshot: string; professionalNameSnapshot: string; durationMinutesSnapshot: number;
    priceMinorSnapshot: number | null; currencySnapshot: string; cancellationNoticeMinutesSnapshot: number;
    timezoneSnapshot: string;
  }; businessSlug: string;
}) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: input.appointment.timezoneSnapshot,
    year: 'numeric', month: '2-digit', day: '2-digit' }).format(input.appointment.startsAt);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: input.appointment.timezoneSnapshot,
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(input.appointment.startsAt);
  return {
    code: input.code, date, time, customerName: input.appointment.customerName,
    locationName: input.appointment.locationNameSnapshot, locationAddress: input.appointment.locationAddressSnapshot,
    serviceName: input.appointment.serviceNameSnapshot, professionalName: input.appointment.professionalNameSnapshot,
    duration: input.appointment.durationMinutesSnapshot,
    priceMinor: input.showPrice ? input.appointment.priceMinorSnapshot : null,
    showPrice: input.showPrice,
    currency: input.appointment.currencySnapshot,
    cancellationNoticeMinutes: input.appointment.cancellationNoticeMinutesSnapshot,
    businessSlug: input.businessSlug,
  };
}

export async function createPublicBooking(
  businessSlug: string,
  _previous: PublicBookingState,
  formData: FormData,
): Promise<PublicBookingState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries([
    'locationId', 'serviceId', 'professionalId', 'date', 'time', 'customerName', 'customerPhone', 'idempotencyKey',
  ].map(key => [key, text(formData, key)])));
  if (!parsed.success) return { error: 'Revisá los datos marcados y volvé a intentar.', fields: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  const business = await getPublicBusinessBySlug(businessSlug);
  if (!business?.publicBookingEnabled) return { error: 'Las reservas online no están disponibles por el momento.' };

  const requestHeaders = await headers();
  const permitted = await consumePublicAttempt({
    businessId: business.id, scope: 'booking', identifier: clientIdentifier(requestHeaders), limit: 10, windowMinutes: 15,
  });
  if (!permitted) return { error: 'Hiciste varias reservas seguidas. Esperá 15 minutos y probá de nuevo.' };

  const requestHash = hashBookingRequest({
    locationId: input.locationId, serviceId: input.serviceId, professionalId: input.professionalId,
    date: input.date, time: input.time, customerName: input.customerName, customerPhone: input.customerPhone,
  });
  try {
    const result = await getDb().transaction(async tx => {
      await lockBusinessSchedule(tx, business.id);
      const [previousRequest] = await tx.select({
        requestHash: bookingRequests.requestHash, appointmentId: bookingRequests.appointmentId,
      }).from(bookingRequests).where(and(
        eq(bookingRequests.businessId, business.id), eq(bookingRequests.idempotencyKey, input.idempotencyKey),
      )).limit(1);
      if (previousRequest) {
        if (previousRequest.requestHash !== requestHash) throw new Error('Esta solicitud ya se usó con otros datos. Recargá la página para iniciar una nueva reserva.');
        const [appointment] = await tx.select().from(appointments).where(and(
          eq(appointments.businessId, business.id), eq(appointments.id, previousRequest.appointmentId),
        )).limit(1);
        const [accessCode] = appointment ? await tx.select({
          ciphertext: appointmentAccessCodes.codeCiphertext, keyVersion: appointmentAccessCodes.encryptionKeyVersion,
        }).from(appointmentAccessCodes).where(and(
          eq(appointmentAccessCodes.businessId, business.id),
          eq(appointmentAccessCodes.appointmentId, appointment.id),
          sql`${appointmentAccessCodes.revokedAt} is null`,
        )).limit(1) : [];
        if (!appointment || !accessCode) throw new Error('No se pudo recuperar la confirmación. Contactá al negocio.');
        const [currentService] = await tx.select({ showPrice: services.showPrice }).from(services).where(and(
          eq(services.businessId, business.id), eq(services.id, appointment.serviceId),
        )).limit(1);
        const code = decryptCancellationCode(accessCode.ciphertext, accessCode.keyVersion);
        return { code, appointment, showPrice: currentService?.showPrice ?? false };
      }

      const slots = await getAvailableSlots({
        businessId: business.id, locationId: input.locationId, serviceId: input.serviceId,
        date: input.date, professionalId: input.professionalId === 'any' ? null : input.professionalId,
      }, tx);
      const slot = slots.find(candidate => candidate.time === input.time);
      if (!slot) throw new Error('Ese horario acaba de ocuparse o ya no está disponible. Conservamos tus datos; elegí otra hora.');

      const [selection] = await tx.select({
        locationId: locations.id, locationName: locations.name, locationAddress: locations.addressText,
        locationTimezone: locations.timezone, locationPhone: locations.contactPhone,
        professionalId: professionals.id, professionalName: professionals.displayName,
        serviceId: services.id, serviceName: services.name, duration: services.durationMinutes, showPrice: services.showPrice,
        price: services.priceMinor, currency: businesses.currency,
        buffer: businessSettings.bufferAfterMinutes,
        cancellationNotice: businessSettings.cancellationNoticeMinutes,
      }).from(businesses)
        .innerJoin(locations, and(eq(locations.businessId, businesses.id), eq(locations.id, input.locationId)))
        .innerJoin(professionalLocations, and(
          eq(professionalLocations.businessId, businesses.id), eq(professionalLocations.locationId, locations.id),
          eq(professionalLocations.professionalId, slot.professionalId), eq(professionalLocations.isActive, true),
        ))
        .innerJoin(professionals, and(
          eq(professionals.businessId, businesses.id), eq(professionals.id, slot.professionalId), eq(professionals.isActive, true),
        ))
        .innerJoin(professionalServices, and(
          eq(professionalServices.businessId, businesses.id), eq(professionalServices.professionalId, professionals.id),
          eq(professionalServices.serviceId, input.serviceId), eq(professionalServices.isActive, true),
        ))
        .innerJoin(services, and(
          eq(services.businessId, businesses.id), eq(services.id, input.serviceId), eq(services.isActive, true),
        ))
        .innerJoin(businessSettings, eq(businessSettings.businessId, businesses.id))
        .where(and(eq(businesses.id, business.id), eq(businesses.status, 'active'),
          eq(businessSettings.publicBookingEnabled, true), eq(locations.isActive, true)))
        .limit(1);
      if (!selection) throw new Error('La sede o el servicio ya no están disponibles. Actualizá la página.');

      const startsAt = localDateTimeToInstant(input.date, input.time, selection.locationTimezone);
      if (startsAt.getTime() <= Date.now()) throw new Error('Ese horario ya pasó. Elegí otro momento.');
      const endsAt = new Date(startsAt.getTime() + selection.duration * 60_000);
      const occupiedUntil = new Date(endsAt.getTime() + selection.buffer * 60_000);
      const [conflict] = await tx.select({ id: calendarOccupancies.id }).from(calendarOccupancies).where(and(
        eq(calendarOccupancies.businessId, business.id), eq(calendarOccupancies.professionalId, slot.professionalId),
        eq(calendarOccupancies.isActive, true), lt(calendarOccupancies.startsAt, occupiedUntil),
        gt(calendarOccupancies.endsAt, startsAt),
      )).limit(1);
      if (conflict) throw new Error('Ese horario acaba de ocuparse. Conservamos tus datos; elegí otra hora.');

      const [appointment] = await tx.insert(appointments).values({
        businessId: business.id, locationId: selection.locationId, professionalId: slot.professionalId,
        serviceId: selection.serviceId, status: 'confirmed', source: 'public',
        selectionMode: input.professionalId === 'any' ? 'any' : 'specific', startsAt, endsAt,
        durationMinutesSnapshot: selection.duration, bufferAfterMinutesSnapshot: selection.buffer,
        priceMinorSnapshot: selection.price, currencySnapshot: selection.currency,
        cancellationNoticeMinutesSnapshot: selection.cancellationNotice, timezoneSnapshot: selection.locationTimezone,
        locationNameSnapshot: selection.locationName, locationAddressSnapshot: selection.locationAddress,
        serviceNameSnapshot: selection.serviceName, professionalNameSnapshot: selection.professionalName,
        customerName: input.customerName, customerPhone: input.customerPhone,
      }).returning();

      await tx.insert(calendarOccupancies).values({
        businessId: business.id, locationId: selection.locationId, professionalId: slot.professionalId,
        appointmentId: appointment.id, kind: 'appointment', startsAt, endsAt: occupiedUntil,
      });
      const code = createCancellationCode();
      const encrypted = encryptCancellationCode(code);
      await tx.insert(appointmentAccessCodes).values({
        businessId: business.id, appointmentId: appointment.id,
        codeHash: hashCancellationCode(code), codeCiphertext: encrypted.ciphertext,
        encryptionKeyVersion: encrypted.keyVersion,
      });
      await tx.insert(bookingRequests).values({
        businessId: business.id, idempotencyKey: input.idempotencyKey,
        requestHash, appointmentId: appointment.id,
      });
      await tx.insert(appointmentEvents).values({
        businessId: business.id, appointmentId: appointment.id, eventType: 'created',
        actorType: 'customer', actorUserId: null, appointmentVersion: appointment.version,
        changes: { source: 'public', startsAt: startsAt.toISOString(), selectionMode: appointment.selectionMode },
      });
      return { code, appointment, showPrice: selection.showPrice };
    });

    revalidatePath('/dashboard');
    return { result: confirmationResult({ ...result, businessSlug }) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo confirmar la reserva. Intentá nuevamente.' };
  }
}

const accessCodeSchema = z.string().trim().min(24).max(64).regex(/^[A-Z0-9_-]+$/i);

export type PublicCancellationLookup = {
  error?: string;
  appointment?: {
    date: string; time: string; serviceName: string; locationName: string; locationAddress: string | null;
    professionalName: string; customerName: string; status: 'confirmed' | 'cancelled' | 'attended' | 'no_show';
    cancellationAllowed: boolean; contactPhone: string | null;
  };
};

async function findPublicAppointment(businessId: string, code: string) {
  const [row] = await getDb().select({
    appointment: appointments, locationPhone: locations.contactPhone,
  }).from(appointmentAccessCodes)
    .innerJoin(appointments, and(
      eq(appointments.businessId, appointmentAccessCodes.businessId),
      eq(appointments.id, appointmentAccessCodes.appointmentId),
    ))
    .leftJoin(locations, and(
      eq(locations.businessId, appointments.businessId), eq(locations.id, appointments.locationId),
    ))
    .where(and(eq(appointmentAccessCodes.businessId, businessId),
      eq(appointmentAccessCodes.codeHash, hashCancellationCode(code)),
      sql`${appointmentAccessCodes.revokedAt} is null`)).limit(1);
  return row;
}

function cancellationDetails(row: NonNullable<Awaited<ReturnType<typeof findPublicAppointment>>>) {
  const appointment = row.appointment;
  const timezone = appointment.timezoneSnapshot;
  const cancellationAllowed = appointment.status === 'confirmed'
    && isWithinCancellationWindow(appointment.startsAt, appointment.cancellationNoticeMinutesSnapshot);
  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(appointment.startsAt),
    time: new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(appointment.startsAt),
    serviceName: appointment.serviceNameSnapshot, locationName: appointment.locationNameSnapshot,
    locationAddress: appointment.locationAddressSnapshot, professionalName: appointment.professionalNameSnapshot,
    customerName: appointment.customerName, status: appointment.status,
    cancellationAllowed, contactPhone: row.locationPhone,
  };
}

async function permittedCodeAttempt(businessId: string, scope: 'lookup' | 'cancel') {
  const requestHeaders = await headers();
  return consumePublicAttempt({
    businessId, scope, identifier: `code-${scope}:${clientIdentifier(requestHeaders)}`,
    limit: scope === 'lookup' ? 20 : 8, windowMinutes: 15,
  });
}

export async function lookupPublicBooking(businessSlug: string, rawCode: string): Promise<PublicCancellationLookup> {
  const code = accessCodeSchema.safeParse(rawCode);
  if (!code.success) return { error: 'Revisá el código e intentá de nuevo.' };
  const business = await getPublicBusinessBySlug(businessSlug, true);
  if (!business) return { error: 'No encontramos una reserva con ese código.' };
  if (!await permittedCodeAttempt(business.id, 'lookup')) return { error: 'Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.' };
  const row = await findPublicAppointment(business.id, code.data);
  if (!row) return { error: 'No encontramos una reserva con ese código.' };
  return { appointment: cancellationDetails(row) };
}

export async function cancelPublicBooking(businessSlug: string, rawCode: string): Promise<PublicCancellationLookup> {
  const code = accessCodeSchema.safeParse(rawCode);
  if (!code.success) return { error: 'Revisá el código e intentá de nuevo.' };
  const business = await getPublicBusinessBySlug(businessSlug, true);
  if (!business) return { error: 'No encontramos una reserva con ese código.' };
  if (!await permittedCodeAttempt(business.id, 'cancel')) return { error: 'Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.' };
  try {
    const response = await getDb().transaction(async tx => {
      await lockBusinessSchedule(tx, business.id);
      const [row] = await tx.select({
        appointment: appointments, occupancyId: calendarOccupancies.id, locationPhone: locations.contactPhone,
      }).from(appointmentAccessCodes)
        .innerJoin(appointments, and(
          eq(appointments.businessId, appointmentAccessCodes.businessId),
          eq(appointments.id, appointmentAccessCodes.appointmentId),
        ))
        .innerJoin(calendarOccupancies, and(
          eq(calendarOccupancies.businessId, appointments.businessId),
          eq(calendarOccupancies.appointmentId, appointments.id), eq(calendarOccupancies.isActive, true),
        ))
        .leftJoin(locations, and(eq(locations.businessId, appointments.businessId), eq(locations.id, appointments.locationId)))
        .where(and(eq(appointmentAccessCodes.businessId, business.id),
          eq(appointmentAccessCodes.codeHash, hashCancellationCode(code.data)),
          sql`${appointmentAccessCodes.revokedAt} is null`)).limit(1);
      if (!row) return { error: 'No encontramos una reserva con ese código.' } as PublicCancellationLookup;
      if (row.appointment.status === 'cancelled') return { appointment: cancellationDetails(row) } as PublicCancellationLookup;
      if (row.appointment.status !== 'confirmed') return { error: 'Este turno ya no puede cancelarse desde el enlace.' } as PublicCancellationLookup;
      if (!isWithinCancellationWindow(row.appointment.startsAt, row.appointment.cancellationNoticeMinutesSnapshot)) {
        return { appointment: cancellationDetails(row) } as PublicCancellationLookup;
      }

      const cancelledAt = new Date();
      const [updated] = await tx.update(appointments).set({
        status: 'cancelled', cancelledAt, cancellationReason: 'Cancelación solicitada por el cliente',
        version: row.appointment.version + 1, updatedAt: cancelledAt,
      }).where(and(
        eq(appointments.businessId, business.id), eq(appointments.id, row.appointment.id),
        eq(appointments.version, row.appointment.version), eq(appointments.status, 'confirmed'),
      )).returning();
      if (!updated) return { error: 'El turno cambió mientras procesábamos la cancelación. Consultá nuevamente.' } as PublicCancellationLookup;

      await tx.update(calendarOccupancies).set({ isActive: false, updatedAt: cancelledAt })
        .where(and(eq(calendarOccupancies.businessId, business.id), eq(calendarOccupancies.id, row.occupancyId)));
      await tx.insert(appointmentEvents).values({
        businessId: business.id, appointmentId: row.appointment.id, eventType: 'cancelled',
        actorType: 'customer', actorUserId: null, appointmentVersion: updated.version,
        changes: { reason: 'Cancelación solicitada por el cliente', cancelledAt: cancelledAt.toISOString() },
      });
      return { appointment: cancellationDetails({ appointment: updated, locationPhone: row.locationPhone }) } as PublicCancellationLookup;
    });
    revalidatePath('/dashboard');
    return response;
  } catch {
    return { error: 'No se pudo cancelar el turno. Intentá de nuevo.' };
  }
}
