'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, eq, gt, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireSession } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { lockBusinessSchedule } from '@/server/db/locks';
import {
  appointmentEvents, appointmentPayments, appointments, businesses, calendarOccupancies,
  locations, professionalLocations, professionalServices, professionals, services,
} from '@/server/db/schema';
import { localDateTimeToInstant } from '@/lib/timezone';
import { getAvailableSlots } from '@/server/business/availability';
import { combineAnyProfessionalSlots } from '@/server/business/availability-engine';
import {
  cancelAppointmentEmailNotifications, refreshAppointmentReminder,
} from '@/server/email/notifications';

export type AgendaActionState = { error?: string; success?: string; fields?: Record<string, string> };

const bookingSchema = z.object({
  locationId: z.string().uuid('Elegí una sede válida.'),
  professionalId: z.union([z.string().uuid('Elegí un profesional.'), z.literal('any')]),
  serviceId: z.string().uuid('Elegí un servicio.'),
  date: z.iso.date('Elegí una fecha válida.'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Elegí un horario válido.'),
  customerName: z.string().trim().min(1, 'Ingresá el nombre del cliente.').max(160),
  customerPhone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Usá formato internacional, por ejemplo +5493415550100.'),
});

function fieldErrors(issues: readonly { path: PropertyKey[] | readonly PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.flatMap(issue => {
    const key = issue.path[0];
    return typeof key === 'string' ? [[key, issue.message]] : [];
  }));
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function actorType(role: string) {
  return role === 'owner' ? 'owner' as const : 'location_operator' as const;
}

export async function getManualAvailability(input: {
  locationId: string;
  serviceId: string;
  date: string;
  professionalId: string;
}) {
  const access = await requireSession();
  const parsed = z.object({
    locationId: z.uuid(), serviceId: z.uuid(), date: z.iso.date(),
    professionalId: z.union([z.uuid(), z.literal('any')]),
  }).safeParse(input);
  if (!parsed.success) return { slots: [], error: 'Completá sede, servicio, profesional y fecha.' };
  if (access.membership.role === 'location_operator' && parsed.data.locationId !== access.membership.locationId) {
    return { slots: [], error: 'No tenés permiso para consultar otra sede.' };
  }
  const slots = await getAvailableSlots({
    businessId: access.membership.businessId,
    locationId: parsed.data.locationId,
    serviceId: parsed.data.serviceId,
    date: parsed.data.date,
    professionalId: parsed.data.professionalId === 'any' ? null : parsed.data.professionalId,
  });
  return { slots: slots.map(slot => ({ time: slot.time, professionalId: slot.professionalId, professionalName: slot.professionalName })) };
}

export async function createManualAppointment(_previous: AgendaActionState, formData: FormData): Promise<AgendaActionState> {
  const access = await requireSession();
  const parsed = bookingSchema.safeParse(Object.fromEntries(['locationId', 'professionalId', 'serviceId', 'date', 'time', 'customerName', 'customerPhone'].map(key => [key, text(formData, key)])));
  if (!parsed.success) return { error: 'Revisá los datos del turno.', fields: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  if (access.membership.role === 'location_operator' && input.locationId !== access.membership.locationId) {
    return { error: 'No tenés permiso para crear turnos en otra sede.' };
  }

  const db = getDb();
  try {
    await db.transaction(async tx => {
      await lockBusinessSchedule(tx, access.membership.businessId);
      const availableSlots = await getAvailableSlots({
        businessId: access.membership.businessId,
        locationId: input.locationId,
        serviceId: input.serviceId,
        date: input.date,
        professionalId: input.professionalId === 'any' ? null : input.professionalId,
      }, tx);
      const chosenSlot = availableSlots.find(slot => slot.time === input.time);
      if (!chosenSlot) throw new Error('Ese horario ya no está disponible según los horarios y la agenda. Elegí otro momento.');
      const assignedProfessionalId = chosenSlot.professionalId;
      const [selection] = await tx.select({
        locationId: locations.id, locationName: locations.name, address: locations.addressText,
        timezone: locations.timezone, activeLocation: locations.isActive,
        professionalId: professionals.id, professionalName: professionals.displayName,
        serviceId: services.id, serviceName: services.name,
        duration: services.durationMinutes, price: services.priceMinor,
        businessTimezone: businesses.timezone, currency: businesses.currency,
        buffer: sql<number>`coalesce((select buffer_after_minutes from app.business_settings where business_id = ${access.membership.businessId}), 0)`.mapWith(Number),
        cancellationNotice: sql<number>`coalesce((select cancellation_notice_minutes from app.business_settings where business_id = ${access.membership.businessId}), 0)`.mapWith(Number),
      }).from(locations)
        .innerJoin(businesses, eq(businesses.id, locations.businessId))
        .innerJoin(professionalLocations, and(
          eq(professionalLocations.businessId, locations.businessId),
          eq(professionalLocations.locationId, locations.id),
          eq(professionalLocations.isActive, true),
        ))
        .innerJoin(professionals, and(
          eq(professionals.businessId, professionalLocations.businessId),
          eq(professionals.id, professionalLocations.professionalId),
          eq(professionals.isActive, true),
        ))
        .innerJoin(professionalServices, and(
          eq(professionalServices.businessId, professionals.businessId),
          eq(professionalServices.professionalId, professionals.id),
          eq(professionalServices.isActive, true),
        ))
        .innerJoin(services, and(
          eq(services.businessId, professionalServices.businessId),
          eq(services.id, professionalServices.serviceId),
          eq(services.isActive, true),
        ))
        .where(and(
          eq(locations.businessId, access.membership.businessId),
          eq(locations.id, input.locationId),
          eq(professionals.id, assignedProfessionalId),
          eq(services.id, input.serviceId),
        )).limit(1);
      if (!selection?.activeLocation) throw new Error('La sede, el profesional o el servicio ya no están disponibles. Actualizá la página e intentá de nuevo.');

      const timezone = selection.timezone || selection.businessTimezone;
      const startsAt = localDateTimeToInstant(input.date, input.time, timezone);
      if (startsAt.getTime() <= Date.now() - 60_000) throw new Error('Elegí un horario futuro para crear el turno.');
      const endsAt = new Date(startsAt.getTime() + selection.duration * 60_000);
      const occupiedUntil = new Date(endsAt.getTime() + selection.buffer * 60_000);
      const [conflict] = await tx.select({ id: calendarOccupancies.id }).from(calendarOccupancies).where(and(
        eq(calendarOccupancies.businessId, access.membership.businessId),
        eq(calendarOccupancies.professionalId, assignedProfessionalId),
        eq(calendarOccupancies.isActive, true),
        lt(calendarOccupancies.startsAt, occupiedUntil),
        gt(calendarOccupancies.endsAt, startsAt),
      )).limit(1);
      if (conflict) throw new Error('Ese profesional ya tiene un turno en ese horario. Elegí otro momento.');

      const [appointment] = await tx.insert(appointments).values({
        businessId: access.membership.businessId,
        locationId: input.locationId,
        professionalId: assignedProfessionalId,
        serviceId: input.serviceId,
        status: 'confirmed',
        source: 'manual',
        selectionMode: input.professionalId === 'any' ? 'any' : 'specific',
        startsAt,
        endsAt,
        durationMinutesSnapshot: selection.duration,
        bufferAfterMinutesSnapshot: selection.buffer,
        priceMinorSnapshot: selection.price,
        currencySnapshot: selection.currency,
        cancellationNoticeMinutesSnapshot: selection.cancellationNotice,
        timezoneSnapshot: timezone,
        locationNameSnapshot: selection.locationName,
        locationAddressSnapshot: selection.address,
        serviceNameSnapshot: selection.serviceName,
        professionalNameSnapshot: selection.professionalName,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
      }).returning({ id: appointments.id, version: appointments.version });
      await tx.insert(calendarOccupancies).values({
        businessId: access.membership.businessId,
        locationId: input.locationId,
        professionalId: assignedProfessionalId,
        appointmentId: appointment.id,
        kind: 'appointment',
        startsAt,
        endsAt: occupiedUntil,
        createdByUserId: access.user.id,
      });
      await tx.insert(appointmentEvents).values({
        businessId: access.membership.businessId,
        appointmentId: appointment.id,
        eventType: 'created',
        actorType: actorType(access.membership.role),
        actorUserId: access.user.id,
        appointmentVersion: appointment.version,
        changes: { source: 'manual', startsAt: startsAt.toISOString() },
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear el turno.' };
  }
  revalidatePath('/dashboard');
  return { success: 'Turno creado y guardado.' };
}

const paymentSchema = z.object({
  appointmentId: z.string().uuid(),
  amount: z.string().regex(/^\d{1,8}(?:[.,]\d{1,2})?$/, 'Ingresá un importe válido.'),
  method: z.enum(['cash', 'transfer', 'card', 'other']),
  note: z.string().trim().max(500).optional(),
  correctedPaymentId: z.string().uuid().optional(),
  correctionReason: z.string().trim().max(300).optional(),
});

export async function recordManualPayment(_previous: AgendaActionState, formData: FormData): Promise<AgendaActionState> {
  const access = await requireSession();
  const parsed = paymentSchema.safeParse({
    appointmentId: text(formData, 'appointmentId'), amount: text(formData, 'amount'),
    method: text(formData, 'method'), note: text(formData, 'note') || undefined,
    correctedPaymentId: text(formData, 'correctedPaymentId') || undefined,
    correctionReason: text(formData, 'correctionReason') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revisá el pago.' };
  const amountMinor = Math.round(Number(parsed.data.amount.replace(',', '.')) * 100);
  if (amountMinor < 0 || (amountMinor === 0 && !parsed.data.correctedPaymentId)) return { error: 'El importe debe ser mayor que cero.' };

  try {
    await getDb().transaction(async tx => {
      const [appointment] = await tx.select({ id: appointments.id, locationId: appointments.locationId, price: appointments.priceMinorSnapshot, currency: appointments.currencySnapshot, status: appointments.status })
        .from(appointments).where(and(eq(appointments.businessId, access.membership.businessId), eq(appointments.id, parsed.data.appointmentId))).limit(1).for('update');
      if (!appointment) throw new Error('No encontramos ese turno.');
      if (access.membership.role === 'location_operator' && appointment.locationId !== access.membership.locationId) throw new Error('No tenés permiso para registrar pagos en otra sede.');
      if (appointment.status === 'cancelled') throw new Error('No se pueden registrar nuevos pagos en un turno cancelado.');

      const existing = await tx.select({ id: appointmentPayments.id, amount: appointmentPayments.amountMinor })
        .from(appointmentPayments).where(and(
          eq(appointmentPayments.businessId, access.membership.businessId),
          eq(appointmentPayments.appointmentId, appointment.id),
          sql`${appointmentPayments.reversedAt} is null`,
        ));
      const [activeCorrection] = parsed.data.correctedPaymentId
        ? await tx.select({ id: appointmentPayments.id }).from(appointmentPayments).where(and(
          eq(appointmentPayments.businessId, access.membership.businessId),
          eq(appointmentPayments.appointmentId, appointment.id),
          eq(appointmentPayments.id, parsed.data.correctedPaymentId),
          sql`${appointmentPayments.reversedAt} is null`,
        )).limit(1)
        : [];
      if (parsed.data.correctedPaymentId && !activeCorrection) throw new Error('Ese pago ya fue corregido. Recargá el turno.');
      const balanceBefore = existing.reduce((sum, row) => sum + row.amount, 0) - (activeCorrection ? (existing.find(row => row.id === activeCorrection.id)?.amount ?? 0) : 0);
      if (appointment.price !== null && balanceBefore + amountMinor > appointment.price) throw new Error('El importe supera el saldo pendiente del turno.');

      if (activeCorrection) {
        const reason = parsed.data.correctionReason?.trim();
        if (!reason) throw new Error('Indicá el motivo de la corrección.');
        await tx.update(appointmentPayments).set({ reversedAt: new Date(), reversalReason: reason })
          .where(and(eq(appointmentPayments.businessId, access.membership.businessId), eq(appointmentPayments.id, activeCorrection.id)));
      }
      if (amountMinor > 0) await tx.insert(appointmentPayments).values({
          businessId: access.membership.businessId,
          appointmentId: appointment.id,
          amountMinor,
          currency: appointment.currency,
          method: parsed.data.method,
          note: parsed.data.note || null,
          correctedPaymentId: activeCorrection?.id ?? null,
          recordedByUserId: access.user.id,
        });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el pago.' };
  }
  revalidatePath('/dashboard');
  return { success: 'Pago registrado.' };
}

export async function updateAppointmentStatus(formData: FormData): Promise<void> {
  const access = await requireSession();
  const appointmentId = text(formData, 'appointmentId');
  const status = z.enum(['attended', 'no_show', 'cancelled']).safeParse(text(formData, 'status'));
  const id = z.string().uuid().safeParse(appointmentId);
  if (!status.success || !id.success) return;
  const updated = await getDb().transaction(async tx => {
    await lockBusinessSchedule(tx, access.membership.businessId);
    const [appointment] = await tx.select().from(appointments).where(and(
      eq(appointments.businessId, access.membership.businessId), eq(appointments.id, id.data),
    )).limit(1);
    if (!appointment || (access.membership.role === 'location_operator' && appointment.locationId !== access.membership.locationId)) return false;
    if (appointment.status !== 'confirmed') return false;
    if (status.data === 'no_show' && appointment.startsAt.getTime() > Date.now()) return false;
    const nextVersion = appointment.version + 1;
    await tx.update(appointments).set({
      status: status.data,
      cancelledAt: status.data === 'cancelled' ? new Date() : null,
      cancellationReason: status.data === 'cancelled' ? 'Cancelado desde la agenda' : null,
      version: nextVersion,
      updatedAt: new Date(),
    }).where(and(eq(appointments.businessId, access.membership.businessId), eq(appointments.id, id.data)));
    if (status.data === 'cancelled') await tx.update(calendarOccupancies).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(calendarOccupancies.businessId, access.membership.businessId), eq(calendarOccupancies.appointmentId, id.data)));
    await tx.insert(appointmentEvents).values({
      businessId: access.membership.businessId, appointmentId: id.data,
      eventType: status.data === 'cancelled' ? 'cancelled' : 'status_changed',
      actorType: actorType(access.membership.role), actorUserId: access.user.id,
      appointmentVersion: nextVersion, changes: { from: appointment.status, to: status.data },
    });
    return true;
  });
  if (updated && status.data === 'cancelled') {
    try { await cancelAppointmentEmailNotifications(id.data); }
    catch (error) { console.error('No se pudo cancelar el recordatorio por email del turno.', error); }
  }
  revalidatePath('/dashboard');
}

export type RescheduleOptionsResult = {
  error?: string;
  locations: Array<{ id: string; name: string }>;
  professionals: Array<{ id: string; name: string }>;
  slots: Array<{ time: string; professionalId: string; professionalName: string }>;
};

export async function getRescheduleOptions(input: {
  appointmentId: string;
  locationId?: string;
  professionalId?: string;
  date: string;
}): Promise<RescheduleOptionsResult> {
  const access = await requireSession();
  const empty = { locations: [], professionals: [], slots: [] };
  const parsed = z.object({
    appointmentId: z.uuid(),
    locationId: z.uuid().optional(),
    professionalId: z.union([z.uuid(), z.literal('any')]).optional(),
    date: z.iso.date(),
  }).safeParse(input);
  if (!parsed.success) return { ...empty, error: 'Revisá la sede, la fecha y el profesional.' };

  const db = getDb();
  const [appointment] = await db.select({
    id: appointments.id, locationId: appointments.locationId,
    professionalId: appointments.professionalId, serviceId: appointments.serviceId,
    duration: appointments.durationMinutesSnapshot, buffer: appointments.bufferAfterMinutesSnapshot,
    status: appointments.status,
  }).from(appointments).where(and(
    eq(appointments.businessId, access.membership.businessId),
    eq(appointments.id, parsed.data.appointmentId),
  )).limit(1);
  if (!appointment || appointment.status !== 'confirmed') {
    return { ...empty, error: 'Este turno ya no se puede reprogramar.' };
  }
  if (access.membership.role === 'location_operator' && appointment.locationId !== access.membership.locationId) {
    return { ...empty, error: 'No tenés permiso para cambiar este turno.' };
  }

  const locationRows = await db.select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(and(
      eq(locations.businessId, access.membership.businessId),
      eq(locations.isActive, true),
    ))
    .orderBy(asc(locations.name));
  const allowedLocations = access.membership.role === 'owner'
    ? locationRows
    : locationRows.filter(location => location.id === access.membership.locationId);

  const targetLocationId = parsed.data.locationId ?? appointment.locationId;
  if (!allowedLocations.some(location => location.id === targetLocationId)) {
    return {
      locations: allowedLocations, professionals: [], slots: [],
      error: access.membership.role === 'owner'
        ? 'Elegí una sede activa.'
        : 'Solo la cuenta del negocio puede mover turnos a otra sede.',
    };
  }

  const professionalRows = await db.select({ id: professionals.id, name: professionals.displayName })
    .from(professionals)
    .innerJoin(professionalLocations, and(
      eq(professionalLocations.businessId, professionals.businessId),
      eq(professionalLocations.professionalId, professionals.id),
      eq(professionalLocations.locationId, targetLocationId),
      eq(professionalLocations.isActive, true),
    ))
    .innerJoin(professionalServices, and(
      eq(professionalServices.businessId, professionals.businessId),
      eq(professionalServices.professionalId, professionals.id),
      eq(professionalServices.serviceId, appointment.serviceId),
      eq(professionalServices.isActive, true),
    ))
    .where(and(
      eq(professionals.businessId, access.membership.businessId),
      eq(professionals.isActive, true),
    ))
    .orderBy(asc(professionals.displayName));

  const slots = await getAvailableSlots({
    businessId: access.membership.businessId,
    locationId: targetLocationId,
    serviceId: appointment.serviceId,
    date: parsed.data.date,
    ...(parsed.data.professionalId && parsed.data.professionalId !== 'any'
      ? { professionalId: parsed.data.professionalId }
      : {}),
    excludeAppointmentId: appointment.id,
    durationMinutesOverride: appointment.duration,
    bufferMinutesOverride: appointment.buffer,
    allowInactiveService: true,
  });
  const mappedSlots = slots.map(slot => ({
    time: slot.time,
    professionalId: slot.professionalId,
    professionalName: slot.professionalName,
    workloadMinutes: slot.workloadMinutes,
  }));

  return {
    locations: allowedLocations,
    professionals: professionalRows,
    slots: parsed.data.professionalId && parsed.data.professionalId !== 'any'
      ? mappedSlots
      : combineAnyProfessionalSlots(mappedSlots),
  };
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  locationId: z.string().uuid('Elegí una sede válida.'),
  professionalId: z.string().uuid('Elegí un profesional.'),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export async function rescheduleAppointment(_previous: AgendaActionState, formData: FormData): Promise<AgendaActionState> {
  const access = await requireSession();
  const parsed = rescheduleSchema.safeParse({
    appointmentId: text(formData, 'appointmentId'),
    locationId: text(formData, 'locationId'),
    professionalId: text(formData, 'professionalId'),
    date: text(formData, 'date'),
    time: text(formData, 'time'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revisá la sede, la fecha y la hora.' };

  try { await getDb().transaction(async tx => {
    await lockBusinessSchedule(tx, access.membership.businessId);
    const [appointment] = await tx.select({
      id: appointments.id, locationId: appointments.locationId, professionalId: appointments.professionalId,
      startsAt: appointments.startsAt, endsAt: appointments.endsAt, duration: appointments.durationMinutesSnapshot,
      serviceId: appointments.serviceId,
      buffer: appointments.bufferAfterMinutesSnapshot, timezone: appointments.timezoneSnapshot,
      status: appointments.status, version: appointments.version,
    }).from(appointments).where(and(
      eq(appointments.businessId, access.membership.businessId), eq(appointments.id, parsed.data.appointmentId),
    )).limit(1);
    if (!appointment || appointment.status !== 'confirmed') throw new Error('Este turno ya no se puede reprogramar.');
    if (access.membership.role === 'location_operator' && appointment.locationId !== access.membership.locationId) throw new Error('No tenés permiso para cambiar este turno.');
    if (access.membership.role === 'location_operator' && parsed.data.locationId !== access.membership.locationId) {
      throw new Error('Solo la cuenta del negocio puede mover turnos a otra sede.');
    }

    const [targetLocation] = await tx.select({
      id: locations.id, name: locations.name, address: locations.addressText,
      timezone: locations.timezone, active: locations.isActive,
    }).from(locations).where(and(
      eq(locations.businessId, access.membership.businessId),
      eq(locations.id, parsed.data.locationId),
    )).limit(1);
    if (!targetLocation?.active) throw new Error('La sede elegida no está disponible.');

    const [targetProfessional] = await tx.select({
      id: professionals.id, name: professionals.displayName,
    }).from(professionals)
      .innerJoin(professionalLocations, and(
        eq(professionalLocations.businessId, professionals.businessId),
        eq(professionalLocations.professionalId, professionals.id),
        eq(professionalLocations.locationId, targetLocation.id),
        eq(professionalLocations.isActive, true),
      ))
      .innerJoin(professionalServices, and(
        eq(professionalServices.businessId, professionals.businessId),
        eq(professionalServices.professionalId, professionals.id),
        eq(professionalServices.serviceId, appointment.serviceId),
        eq(professionalServices.isActive, true),
      ))
      .where(and(
        eq(professionals.businessId, access.membership.businessId),
        eq(professionals.id, parsed.data.professionalId),
        eq(professionals.isActive, true),
      )).limit(1);
    if (!targetProfessional) throw new Error('Ese profesional no ofrece el servicio en la sede elegida.');

    let startsAt: Date;
    try { startsAt = localDateTimeToInstant(parsed.data.date, parsed.data.time, targetLocation.timezone); }
    catch (error) { throw error instanceof Error ? error : new Error('Elegí una fecha y hora válidas.'); }
    if (startsAt.getTime() <= Date.now() - 60_000) throw new Error('Elegí un horario futuro.');
    const availableSlots = await getAvailableSlots({
      businessId: access.membership.businessId,
      locationId: targetLocation.id,
      serviceId: appointment.serviceId,
      date: parsed.data.date,
      professionalId: targetProfessional.id,
      excludeAppointmentId: appointment.id,
      durationMinutesOverride: appointment.duration,
      bufferMinutesOverride: appointment.buffer,
      allowInactiveService: true,
    }, tx);
    const localTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: targetLocation.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(startsAt);
    if (!availableSlots.some(slot => slot.time === localTime && slot.startsAt.getTime() === startsAt.getTime())) {
      throw new Error('Ese horario no está disponible dentro del horario configurado de la sede. Elegí otro momento.');
    }
    const endsAt = new Date(startsAt.getTime() + appointment.duration * 60_000);
    const occupiedUntil = new Date(endsAt.getTime() + appointment.buffer * 60_000);
    const [conflict] = await tx.select({ id: calendarOccupancies.id }).from(calendarOccupancies).where(and(
      eq(calendarOccupancies.businessId, access.membership.businessId),
      eq(calendarOccupancies.professionalId, targetProfessional.id),
      eq(calendarOccupancies.isActive, true),
      sql`${calendarOccupancies.appointmentId} is distinct from ${appointment.id}`,
      lt(calendarOccupancies.startsAt, occupiedUntil), gt(calendarOccupancies.endsAt, startsAt),
    )).limit(1);
    if (conflict) throw new Error('Ese horario ya está ocupado para este profesional.');

    const version = appointment.version + 1;
    await tx.execute(sql`select set_config('app.allow_appointment_reschedule', 'on', true)`);
    await tx.update(appointments).set({
      locationId: targetLocation.id,
      professionalId: targetProfessional.id,
      startsAt,
      endsAt,
      timezoneSnapshot: targetLocation.timezone,
      locationNameSnapshot: targetLocation.name,
      locationAddressSnapshot: targetLocation.address,
      professionalNameSnapshot: targetProfessional.name,
      version,
      updatedAt: new Date(),
    }).where(and(
      eq(appointments.businessId, access.membership.businessId), eq(appointments.id, appointment.id),
    ));
    await tx.update(calendarOccupancies).set({
      locationId: targetLocation.id,
      professionalId: targetProfessional.id,
      startsAt,
      endsAt: occupiedUntil,
      updatedAt: new Date(),
    }).where(and(
      eq(calendarOccupancies.businessId, access.membership.businessId),
      eq(calendarOccupancies.appointmentId, appointment.id),
    ));
    await tx.insert(appointmentEvents).values({
      businessId: access.membership.businessId, appointmentId: appointment.id,
      eventType: 'rescheduled', actorType: actorType(access.membership.role), actorUserId: access.user.id,
      appointmentVersion: version,
      changes: {
        from: {
          startsAt: appointment.startsAt.toISOString(),
          locationId: appointment.locationId,
          professionalId: appointment.professionalId,
        },
        to: {
          startsAt: startsAt.toISOString(),
          locationId: targetLocation.id,
          professionalId: targetProfessional.id,
          timezone: targetLocation.timezone,
        },
      },
    });
  }); } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo reprogramar el turno.' };
  }
  try { await refreshAppointmentReminder(parsed.data.appointmentId); }
  catch (error) { console.error('No se pudo actualizar el recordatorio por email del turno.', error); }
  revalidatePath('/dashboard');
  return { success: 'Turno reprogramado.' };
}
