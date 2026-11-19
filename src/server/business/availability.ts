import 'server-only';
import { and, eq, gt, inArray, isNull, lt, ne, or } from 'drizzle-orm';
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

const DAY_MS = 24 * 60 * 60_000;

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

  // Only candidate professionals may own an occupancy that matters here. The
  // subquery lets the occupancy query run in parallel with the candidate list
  // instead of waiting for another round trip.
  const candidateIds = db.select({ id: professionals.id })
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

  // A conservative UTC window that contains the requested local day in any
  // timezone. The engine still checks exact overlaps; this only avoids a
  // second round trip to read the location timezone before querying.
  const dayStartUtc = new Date(`${input.date}T00:00:00Z`);
  const searchStart = new Date(dayStartUtc.getTime() - DAY_MS);
  const searchEnd = new Date(dayStartUtc.getTime() + 2 * DAY_MS);

  const [configRows, candidates, scheduleRows, exceptionRows, occupancies] = await Promise.all([
    db.select({
      timezone: locations.timezone,
      locationActive: locations.isActive,
      serviceActive: services.isActive,
      serviceDuration: services.durationMinutes,
      slotInterval: businessSettings.slotIntervalMinutes,
      buffer: businessSettings.bufferAfterMinutes,
      minNotice: businessSettings.minBookingNoticeMinutes,
      horizon: businessSettings.bookingHorizonDays,
      allowAnyProfessional: businessSettings.allowAnyProfessional,
    })
      .from(locations)
      .innerJoin(services, and(
        eq(services.businessId, locations.businessId),
        eq(services.id, input.serviceId),
      ))
      .innerJoin(businessSettings, eq(businessSettings.businessId, locations.businessId))
      .where(and(
        eq(locations.businessId, input.businessId),
        eq(locations.id, input.locationId),
      ))
      .limit(1),
    db.select({ id: professionals.id, name: professionals.displayName })
      .from(professionals)
      .innerJoin(professionalLocations, and(
        eq(professionalLocations.professionalId, professionals.id),
        eq(professionalLocations.businessId, professionals.businessId),
      ))
      .innerJoin(professionalServices, and(
        eq(professionalServices.professionalId, professionals.id),
        eq(professionalServices.businessId, professionals.businessId),
      ))
      .where(assignmentWhere),
    db.select({
      id: schedules.id,
      professionalId: schedules.professionalId,
      weekday: weeklyIntervals.weekday,
      startMinute: weeklyIntervals.startMinute,
      endMinute: weeklyIntervals.endMinute,
    })
      .from(schedules)
      .leftJoin(weeklyIntervals, and(
        eq(weeklyIntervals.businessId, schedules.businessId),
        eq(weeklyIntervals.scheduleId, schedules.id),
      ))
      .where(and(
        eq(schedules.businessId, input.businessId),
        eq(schedules.locationId, input.locationId),
      )),
    db.select({
      scheduleId: scheduleExceptions.scheduleId,
      mode: scheduleExceptions.mode,
      startMinute: exceptionIntervals.startMinute,
      endMinute: exceptionIntervals.endMinute,
    })
      .from(scheduleExceptions)
      .innerJoin(schedules, and(
        eq(schedules.businessId, scheduleExceptions.businessId),
        eq(schedules.id, scheduleExceptions.scheduleId),
      ))
      .leftJoin(exceptionIntervals, and(
        eq(exceptionIntervals.businessId, scheduleExceptions.businessId),
        eq(exceptionIntervals.exceptionId, scheduleExceptions.id),
      ))
      .where(and(
        eq(scheduleExceptions.businessId, input.businessId),
        eq(schedules.locationId, input.locationId),
        eq(scheduleExceptions.localDate, input.date),
      )),
    db.select({
      professionalId: calendarOccupancies.professionalId,
      startsAt: calendarOccupancies.startsAt,
      endsAt: calendarOccupancies.endsAt,
    })
      .from(calendarOccupancies)
      .where(and(
        eq(calendarOccupancies.businessId, input.businessId),
        eq(calendarOccupancies.isActive, true),
        inArray(calendarOccupancies.professionalId, candidateIds),
        ...(input.excludeAppointmentId ? [or(
          isNull(calendarOccupancies.appointmentId),
          ne(calendarOccupancies.appointmentId, input.excludeAppointmentId),
        )] : []),
        lt(calendarOccupancies.startsAt, searchEnd),
        gt(calendarOccupancies.endsAt, searchStart),
      )),
  ]);

  const config = configRows[0];
  if (!config || !config.locationActive) return [];
  if (!input.allowInactiveService && !config.serviceActive) return [];
  if (input.professionalId === null && !config.allowAnyProfessional) return [];
  if (!candidates.length) return [];

  const candidateIdsSet = new Set(candidates.map(person => person.id));
  const weeklyBySchedule = new Map<string, Array<MinuteInterval & { weekday: number }>>();
  const scheduleByProfessional = new Map<string, string>();
  let locationScheduleId: string | undefined;

  for (const row of scheduleRows) {
    if (row.professionalId) {
      if (candidateIdsSet.has(row.professionalId)) scheduleByProfessional.set(row.professionalId, row.id);
    } else {
      locationScheduleId ??= row.id;
    }
    if (row.weekday === null || row.startMinute === null || row.endMinute === null) continue;
    weeklyBySchedule.set(row.id, [
      ...(weeklyBySchedule.get(row.id) ?? []),
      { weekday: row.weekday, startMinute: row.startMinute, endMinute: row.endMinute },
    ]);
  }

  if (!locationScheduleId) return [];

  const exceptionsBySchedule = new Map<string, { mode: 'closed' | 'custom'; intervals: MinuteInterval[] }>();
  for (const row of exceptionRows) {
    const exception = exceptionsBySchedule.get(row.scheduleId) ?? { mode: row.mode, intervals: [] };
    if (row.startMinute !== null && row.endMinute !== null) {
      exception.intervals.push({ startMinute: row.startMinute, endMinute: row.endMinute });
    }
    exceptionsBySchedule.set(row.scheduleId, exception);
  }

  const weekday = weekdayForDate(input.date);
  const locationIntervals = intervalsForDate(
    weekday,
    weeklyBySchedule.get(locationScheduleId) ?? [],
    exceptionsBySchedule.get(locationScheduleId),
  );
  if (!locationIntervals.length) return [];

  const bounds = localDayBounds(input.date, config.timezone);
  const workload = new Map<string, number>();
  for (const period of occupancies) {
    if (period.startsAt >= bounds.end || period.endsAt <= bounds.start) continue;
    workload.set(period.professionalId,
      (workload.get(period.professionalId) ?? 0) + Math.max(0, period.endsAt.getTime() - period.startsAt.getTime()) / 60_000);
  }

  const slots = candidates.flatMap(person => {
    const scheduleId = scheduleByProfessional.get(person.id);
    // If a professional has no personal schedule, their availability inherits the location schedule.
    const professionalIntervals = scheduleId
      ? intervalsForDate(weekday, weeklyBySchedule.get(scheduleId) ?? [], exceptionsBySchedule.get(scheduleId))
      : locationIntervals;
    return slotsForProfessional({
      date: input.date,
      timezone: config.timezone,
      locationIntervals,
      professionalIntervals,
      durationMinutes: input.durationMinutesOverride ?? config.serviceDuration,
      bufferMinutes: input.bufferMinutesOverride ?? config.buffer,
      slotIntervalMinutes: config.slotInterval,
      minNoticeMinutes: config.minNotice,
      horizonDays: config.horizon,
      occupancies: occupancies.filter(period => period.professionalId === person.id),
      now: input.now,
    }).map(startsAt => ({ startsAt, time: new Intl.DateTimeFormat('en-GB', {
      timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(startsAt), professionalId: person.id, professionalName: person.name,
      workloadMinutes: workload.get(person.id) ?? 0 }));
  });
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    || a.workloadMinutes - b.workloadMinutes || a.professionalName.localeCompare(b.professionalName));
}
