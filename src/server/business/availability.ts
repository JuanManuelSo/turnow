import 'server-only';
import { and, eq, gt, inArray, lt, or, isNull, ne } from 'drizzle-orm';
import { localDayBounds } from '@/lib/timezone';
import { getDb } from '@/server/db/client';
import {
  businessSettings, calendarOccupancies, exceptionIntervals, locations,
  professionalLocations, professionalServices, professionals, scheduleExceptions,
  schedules, services, weeklyIntervals,
} from '@/server/db/schema';
import { intervalsForDate, slotsForProfessional, weekdayForDate, type MinuteInterval } from './availability-engine';

export type AvailableSlot = { startsAt: Date; time: string; professionalId: string; professionalName: string; workloadMinutes: number };
type AvailabilityReader = Pick<ReturnType<typeof getDb>, 'select'>;

export async function getAvailableSlots(input: {
  businessId: string;
  locationId: string;
  serviceId: string;
  date: string;
  professionalId?: string | null;
  excludeAppointmentId?: string;
  durationMinutesOverride?: number;
  bufferMinutesOverride?: number;
  allowInactiveService?: boolean;
  now?: Date;
}, db: AvailabilityReader = getDb()): Promise<AvailableSlot[]> {
  const [locationRows, serviceRows, settingRows] = await Promise.all([
    db.select({ id: locations.id, timezone: locations.timezone, active: locations.isActive })
      .from(locations).where(and(eq(locations.businessId, input.businessId), eq(locations.id, input.locationId))).limit(1),
    db.select({ id: services.id, duration: services.durationMinutes, active: services.isActive })
      .from(services).where(and(eq(services.businessId, input.businessId), eq(services.id, input.serviceId))).limit(1),
    db.select({ slotInterval: businessSettings.slotIntervalMinutes, buffer: businessSettings.bufferAfterMinutes,
      minNotice: businessSettings.minBookingNoticeMinutes, horizon: businessSettings.bookingHorizonDays,
      allowAnyProfessional: businessSettings.allowAnyProfessional })
      .from(businessSettings).where(eq(businessSettings.businessId, input.businessId)).limit(1),
  ]);
  const location = locationRows[0];
  const service = serviceRows[0];
  const settings = settingRows[0];
  if (!location?.active || (!input.allowInactiveService && !service?.active) || !service || !settings) return [];
  if (input.professionalId === null && !settings.allowAnyProfessional) return [];

  const assignmentWhere = and(
    eq(professionalLocations.businessId, input.businessId),
    eq(professionalLocations.locationId, input.locationId),
    eq(professionalLocations.isActive, true),
    eq(professionalServices.businessId, input.businessId),
    eq(professionalServices.serviceId, input.serviceId),
    eq(professionalServices.isActive, true),
    eq(professionals.businessId, input.businessId),
    eq(professionals.isActive, true),
    ...(input.professionalId ? [eq(professionals.id, input.professionalId)] : []),
  );
  const candidates = await db.select({ id: professionals.id, name: professionals.displayName })
    .from(professionals)
    .innerJoin(professionalLocations, and(
      eq(professionalLocations.professionalId, professionals.id),
      eq(professionalLocations.businessId, professionals.businessId),
    ))
    .innerJoin(professionalServices, and(
      eq(professionalServices.professionalId, professionals.id),
      eq(professionalServices.businessId, professionals.businessId),
    ))
    .where(assignmentWhere);
  if (!candidates.length) return [];

  const candidateIds = candidates.map(person => person.id);
  const scheduleRows = await db.select({ id: schedules.id, professionalId: schedules.professionalId })
    .from(schedules)
    .where(and(
      eq(schedules.businessId, input.businessId),
      eq(schedules.locationId, input.locationId),
      or(isNull(schedules.professionalId), inArray(schedules.professionalId, candidateIds)),
    ));
  const scheduleIds = scheduleRows.map(schedule => schedule.id);
  if (!scheduleIds.length) return [];

  const [weeklyRows, exceptionRows] = await Promise.all([
    db.select({ scheduleId: weeklyIntervals.scheduleId, weekday: weeklyIntervals.weekday,
      startMinute: weeklyIntervals.startMinute, endMinute: weeklyIntervals.endMinute })
      .from(weeklyIntervals).where(and(
        eq(weeklyIntervals.businessId, input.businessId), inArray(weeklyIntervals.scheduleId, scheduleIds),
      )),
    db.select({ id: scheduleExceptions.id, scheduleId: scheduleExceptions.scheduleId, mode: scheduleExceptions.mode })
      .from(scheduleExceptions).where(and(
        eq(scheduleExceptions.businessId, input.businessId), inArray(scheduleExceptions.scheduleId, scheduleIds),
        eq(scheduleExceptions.localDate, input.date),
      )),
  ]);
  const exceptionIds = exceptionRows.map(exception => exception.id);
  const exceptionIntervalRows = exceptionIds.length ? await db.select({ exceptionId: exceptionIntervals.exceptionId,
    startMinute: exceptionIntervals.startMinute, endMinute: exceptionIntervals.endMinute })
    .from(exceptionIntervals).where(and(
      eq(exceptionIntervals.businessId, input.businessId), inArray(exceptionIntervals.exceptionId, exceptionIds),
    )) : [];
  const weeklyBySchedule = new Map<string, Array<MinuteInterval & { weekday: number }>>();
  for (const row of weeklyRows) weeklyBySchedule.set(row.scheduleId, [...(weeklyBySchedule.get(row.scheduleId) ?? []), row]);
  const exceptionsBySchedule = new Map(exceptionRows.map(exception => [exception.scheduleId, {
    mode: exception.mode,
    intervals: exceptionIntervalRows.filter(interval => interval.exceptionId === exception.id)
      .map(({ startMinute, endMinute }) => ({ startMinute, endMinute })),
  }]));
  const scheduleByProfessional = new Map(scheduleRows.map(schedule => [schedule.professionalId ?? 'location', schedule.id]));
  const weekday = weekdayForDate(input.date);
  const locationScheduleId = scheduleByProfessional.get('location');
  if (!locationScheduleId) return [];
  const locationIntervals = intervalsForDate(weekday, weeklyBySchedule.get(locationScheduleId) ?? [], exceptionsBySchedule.get(locationScheduleId));
  if (!locationIntervals.length) return [];

  const bounds = localDayBounds(input.date, location.timezone);
  const occupancies = await db.select({ professionalId: calendarOccupancies.professionalId,
    startsAt: calendarOccupancies.startsAt, endsAt: calendarOccupancies.endsAt })
    .from(calendarOccupancies).where(and(
      eq(calendarOccupancies.businessId, input.businessId),
      inArray(calendarOccupancies.professionalId, candidateIds),
      eq(calendarOccupancies.isActive, true),
      ...(input.excludeAppointmentId ? [or(
        isNull(calendarOccupancies.appointmentId),
        ne(calendarOccupancies.appointmentId, input.excludeAppointmentId),
      )] : []),
      lt(calendarOccupancies.startsAt, bounds.end), gt(calendarOccupancies.endsAt, bounds.start),
    ));

  const workload = new Map<string, number>();
  for (const period of occupancies) workload.set(period.professionalId,
    (workload.get(period.professionalId) ?? 0) + Math.max(0, period.endsAt.getTime() - period.startsAt.getTime()) / 60_000);

  const slots = candidates.flatMap(person => {
    const scheduleId = scheduleByProfessional.get(person.id);
    // If a professional has no personal schedule, their availability inherits the location schedule.
    const professionalIntervals = scheduleId
      ? intervalsForDate(weekday, weeklyBySchedule.get(scheduleId) ?? [], exceptionsBySchedule.get(scheduleId))
      : locationIntervals;
    return slotsForProfessional({
      date: input.date,
      timezone: location.timezone,
      locationIntervals,
      professionalIntervals,
      durationMinutes: input.durationMinutesOverride ?? service.duration,
      bufferMinutes: input.bufferMinutesOverride ?? settings.buffer,
      slotIntervalMinutes: settings.slotInterval,
      minNoticeMinutes: settings.minNotice,
      horizonDays: settings.horizon,
      occupancies: occupancies.filter(period => period.professionalId === person.id),
      now: input.now,
    }).map(startsAt => ({ startsAt, time: new Intl.DateTimeFormat('en-GB', {
      timeZone: location.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(startsAt), professionalId: person.id, professionalName: person.name,
      workloadMinutes: workload.get(person.id) ?? 0 }));
  });
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    || a.workloadMinutes - b.workloadMinutes || a.professionalName.localeCompare(b.professionalName));
}
