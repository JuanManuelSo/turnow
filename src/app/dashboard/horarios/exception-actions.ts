'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { requireSession } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { lockBusinessSchedule } from '@/server/db/locks';
import { localDateTimeToInstant, localDayBounds } from '@/lib/timezone';
import {
  appointments, calendarOccupancies, exceptionIntervals, locations,
  professionalLocations, professionals, scheduleExceptions, schedules,
} from '@/server/db/schema';
import { formBoolean, formString } from '@/server/business/form-data';
import {
  professionalBlockInputSchema, scheduleExceptionInputSchema,
} from '@/server/business/validation';
import type { PanelActionState } from '../action-state';

export type ExceptionActionState = PanelActionState & {
  success?: string;
  needsConfirmation?: { count: number; message: string };
};

function canManageLocation(role: string, membershipLocationId: string | null, locationId: string) {
  return role === 'owner' || membershipLocationId === locationId;
}

function localMinuteOfDay(value: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value).map(part => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function parseRanges(payload: string) {
  try {
    const value = JSON.parse(payload || '[]');
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function confirmationMessage(count: number, scope: string) {
  return `Hay ${count} ${count === 1 ? 'turno confirmado' : 'turnos confirmados'} ${scope}. Si guardás igual, van a quedar marcados como fuera de horario en la agenda.`;
}

export async function saveScheduleExceptionAction(
  _previous: ExceptionActionState,
  formData: FormData,
): Promise<ExceptionActionState> {
  const access = await requireSession();
  const locationId = formString(formData, 'locationId');
  if (!canManageLocation(access.membership.role, access.membership.locationId, locationId)) {
    return { error: 'No tenés permiso para modificar los horarios de otra sede.' };
  }

  const ranges = parseRanges(formString(formData, 'ranges'));
  if (!ranges) return { error: 'No pudimos leer los tramos. Recargá la página e intentá de nuevo.' };

  const parsed = scheduleExceptionInputSchema.safeParse({
    locationId,
    localDate: formString(formData, 'localDate'),
    mode: formString(formData, 'mode'),
    reason: formString(formData, 'reason'),
    ranges,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisá la fecha y los tramos.' };
  }

  const input = parsed.data;
  const db = getDb();
  const [location] = await db.select({
    id: locations.id, name: locations.name, timezone: locations.timezone, isActive: locations.isActive,
  }).from(locations).where(and(
    eq(locations.businessId, access.membership.businessId),
    eq(locations.id, input.locationId),
  )).limit(1);
  if (!location || !location.isActive) return { error: 'La sede elegida no está disponible.' };

  const intervals = input.mode === 'custom'
    ? input.ranges.map(range => {
      const [startHour, startMinute] = range.start.split(':').map(Number);
      const [endHour, endMinute] = range.end.split(':').map(Number);
      return { startMinute: startHour * 60 + startMinute, endMinute: endHour * 60 + endMinute };
    })
    : [];

  const bounds = localDayBounds(input.localDate, location.timezone);
  const dayAppointments = await db.select({
    id: appointments.id, startsAt: appointments.startsAt, endsAt: appointments.endsAt,
  }).from(appointments).where(and(
    eq(appointments.businessId, access.membership.businessId),
    eq(appointments.locationId, input.locationId),
    eq(appointments.status, 'confirmed'),
    gt(appointments.startsAt, bounds.start),
    lt(appointments.startsAt, bounds.end),
  ));

  const affected = dayAppointments.filter(appointment => {
    if (!intervals.length) return true;
    const startMinute = localMinuteOfDay(appointment.startsAt, location.timezone);
    const endMinute = localMinuteOfDay(appointment.endsAt, location.timezone);
    if (endMinute <= startMinute) return true;
    return !intervals.some(interval => startMinute >= interval.startMinute && endMinute <= interval.endMinute);
  }).length;

  if (affected > 0 && formString(formData, 'confirm') !== '1') {
    return {
      needsConfirmation: {
        count: affected,
        message: confirmationMessage(affected, `ese día en ${location.name}`),
      },
    };
  }

  try {
    await db.transaction(async tx => {
      let [schedule] = await tx.select({ id: schedules.id }).from(schedules).where(and(
        eq(schedules.businessId, access.membership.businessId),
        eq(schedules.locationId, input.locationId),
        isNull(schedules.professionalId),
      )).limit(1);

      if (!schedule) {
        [schedule] = await tx.insert(schedules).values({
          businessId: access.membership.businessId,
          locationId: input.locationId,
          professionalId: null,
        }).returning({ id: schedules.id });
      }

      let [exception] = await tx.select({ id: scheduleExceptions.id }).from(scheduleExceptions).where(and(
        eq(scheduleExceptions.businessId, access.membership.businessId),
        eq(scheduleExceptions.scheduleId, schedule.id),
        eq(scheduleExceptions.localDate, input.localDate),
      )).limit(1);

      if (exception) {
        await tx.update(scheduleExceptions).set({
          mode: input.mode,
          reason: input.reason || null,
          updatedAt: new Date(),
        }).where(and(
          eq(scheduleExceptions.businessId, access.membership.businessId),
          eq(scheduleExceptions.id, exception.id),
        ));
      } else {
        [exception] = await tx.insert(scheduleExceptions).values({
          businessId: access.membership.businessId,
          scheduleId: schedule.id,
          localDate: input.localDate,
          mode: input.mode,
          reason: input.reason || null,
        }).returning({ id: scheduleExceptions.id });
      }

      await tx.delete(exceptionIntervals).where(and(
        eq(exceptionIntervals.businessId, access.membership.businessId),
        eq(exceptionIntervals.exceptionId, exception.id),
      ));
      if (intervals.length) {
        await tx.insert(exceptionIntervals).values(intervals.map(interval => ({
          businessId: access.membership.businessId,
          exceptionId: exception.id,
          startMinute: interval.startMinute,
          endMinute: interval.endMinute,
        })));
      }
    });
  } catch {
    return { error: 'No pudimos guardar la excepción. Intentá de nuevo.' };
  }

  revalidatePath('/dashboard/horarios');
  revalidatePath('/dashboard');
  return {
    success: input.mode === 'closed'
      ? 'Cierre guardado. La agenda ya no ofrece turnos ese día.'
      : 'Horario especial guardado para esa fecha.',
  };
}

export async function deleteScheduleExceptionAction(formData: FormData) {
  const access = await requireSession();
  const id = formString(formData, 'id');
  const locationId = formString(formData, 'locationId');
  if (!canManageLocation(access.membership.role, access.membership.locationId, locationId)) {
    redirect('/dashboard');
  }

  const db = getDb();
  const [row] = await db.select({ id: scheduleExceptions.id, locationId: schedules.locationId })
    .from(scheduleExceptions)
    .innerJoin(schedules, and(
      eq(schedules.businessId, scheduleExceptions.businessId),
      eq(schedules.id, scheduleExceptions.scheduleId),
    ))
    .where(and(
      eq(scheduleExceptions.businessId, access.membership.businessId),
      eq(scheduleExceptions.id, id),
      eq(schedules.locationId, locationId),
    )).limit(1);
  if (!row) redirect(`/dashboard/horarios?sede=${locationId}&vista=excepciones`);

  await db.transaction(async tx => {
    await tx.delete(exceptionIntervals).where(and(
      eq(exceptionIntervals.businessId, access.membership.businessId),
      eq(exceptionIntervals.exceptionId, row.id),
    ));
    await tx.delete(scheduleExceptions).where(and(
      eq(scheduleExceptions.businessId, access.membership.businessId),
      eq(scheduleExceptions.id, row.id),
    ));
  });

  revalidatePath('/dashboard/horarios');
  revalidatePath('/dashboard');
  redirect(`/dashboard/horarios?sede=${locationId}&vista=excepciones&eliminado=1&v=${Date.now()}`);
}

export async function saveProfessionalBlockAction(
  _previous: ExceptionActionState,
  formData: FormData,
): Promise<ExceptionActionState> {
  const access = await requireSession();
  const locationId = formString(formData, 'locationId');
  if (!canManageLocation(access.membership.role, access.membership.locationId, locationId)) {
    return { error: 'No tenés permiso para modificar la agenda de otra sede.' };
  }

  const parsed = professionalBlockInputSchema.safeParse({
    locationId,
    professionalId: formString(formData, 'professionalId'),
    localDate: formString(formData, 'localDate'),
    allDay: formBoolean(formData, 'allDay'),
    start: formString(formData, 'start'),
    end: formString(formData, 'end'),
    reason: formString(formData, 'reason'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisá el bloqueo.' };
  }

  const input = parsed.data;
  const db = getDb();
  const [assignment] = await db.select({
    timezone: locations.timezone,
    locationActive: locations.isActive,
    professionalName: professionals.displayName,
    professionalActive: professionals.isActive,
  }).from(professionals)
    .innerJoin(professionalLocations, and(
      eq(professionalLocations.businessId, professionals.businessId),
      eq(professionalLocations.professionalId, professionals.id),
    ))
    .innerJoin(locations, and(
      eq(locations.businessId, professionalLocations.businessId),
      eq(locations.id, professionalLocations.locationId),
    ))
    .where(and(
      eq(professionals.businessId, access.membership.businessId),
      eq(professionals.id, input.professionalId),
      eq(professionalLocations.locationId, input.locationId),
      eq(professionalLocations.isActive, true),
    )).limit(1);
  if (!assignment || !assignment.locationActive || !assignment.professionalActive) {
    return { error: 'Ese profesional no está disponible en la sede elegida.' };
  }

  let startsAt: Date;
  let endsAt: Date;
  try {
    if (input.allDay) {
      const bounds = localDayBounds(input.localDate, assignment.timezone);
      startsAt = bounds.start;
      endsAt = bounds.end;
    } else {
      startsAt = localDateTimeToInstant(input.localDate, input.start, assignment.timezone);
      endsAt = localDateTimeToInstant(input.localDate, input.end, assignment.timezone);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Elegí una fecha y un horario válidos.' };
  }
  if (endsAt.getTime() <= startsAt.getTime()) return { error: 'El bloqueo debe terminar después de empezar.' };

  let needsConfirmation = 0;
  try {
    await db.transaction(async tx => {
      await lockBusinessSchedule(tx, access.membership.businessId);
      const overlapping = await tx.select({ id: appointments.id }).from(appointments).where(and(
        eq(appointments.businessId, access.membership.businessId),
        eq(appointments.professionalId, input.professionalId),
        eq(appointments.status, 'confirmed'),
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
      ));
      if (overlapping.length > 0 && formString(formData, 'confirm') !== '1') {
        needsConfirmation = overlapping.length;
        return;
      }

      await tx.insert(calendarOccupancies).values({
        businessId: access.membership.businessId,
        locationId: input.locationId,
        professionalId: input.professionalId,
        appointmentId: null,
        kind: 'block',
        startsAt,
        endsAt,
        reason: input.reason || null,
        createdByUserId: access.user.id,
      });
    });
  } catch {
    return { error: 'No pudimos guardar el bloqueo. Intentá de nuevo.' };
  }

  if (needsConfirmation > 0) {
    return {
      needsConfirmation: {
        count: needsConfirmation,
        message: confirmationMessage(needsConfirmation, `asignados a ${assignment.professionalName} en ese rango`),
      },
    };
  }

  revalidatePath('/dashboard/horarios');
  revalidatePath('/dashboard');
  return { success: `Bloqueo guardado para ${assignment.professionalName}.` };
}

export async function deleteProfessionalBlockAction(formData: FormData) {
  const access = await requireSession();
  const id = formString(formData, 'id');
  const locationId = formString(formData, 'locationId');
  if (!canManageLocation(access.membership.role, access.membership.locationId, locationId)) {
    redirect('/dashboard');
  }

  await getDb().update(calendarOccupancies).set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(calendarOccupancies.businessId, access.membership.businessId),
      eq(calendarOccupancies.id, id),
      eq(calendarOccupancies.locationId, locationId),
      eq(calendarOccupancies.kind, 'block'),
    ));

  revalidatePath('/dashboard/horarios');
  revalidatePath('/dashboard');
  redirect(`/dashboard/horarios?sede=${locationId}&vista=excepciones&bloqueEliminado=1&v=${Date.now()}`);
}
