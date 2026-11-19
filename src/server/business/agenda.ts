import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, ne } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { localDayBounds } from '@/lib/timezone';
import {
  appointmentPayments, appointments, calendarOccupancies, exceptionIntervals,
  locations, businessSettings, professionalLocations, professionals, scheduleExceptions,
  schedules, services, weeklyIntervals,
} from '@/server/db/schema';
import { intervalsForDate, weekdayForDate } from './availability-engine';
import { getBusinessShell } from './queries';

function localMinuteOfDay(value: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export async function getAgendaData(businessId: string, requestedLocationId: string | undefined, date: string) {
  const db = getDb();
  const [business, locationRows, settingRows] = await Promise.all([
    getBusinessShell(businessId),
    db.select({ id: locations.id, name: locations.name, addressText: locations.addressText, timezone: locations.timezone })
      .from(locations).where(and(eq(locations.businessId, businessId), eq(locations.isActive, true)))
      .orderBy(desc(locations.isPrimary), asc(locations.name)),
    db.select({ allowAnyProfessional: businessSettings.allowAnyProfessional }).from(businessSettings)
      .where(eq(businessSettings.businessId, businessId)).limit(1),
  ]);
  const selectedLocation = locationRows.find(item => item.id === requestedLocationId) ?? locationRows[0] ?? null;
  if (!business || !selectedLocation) return { business: business ?? null, locations: locationRows, selectedLocation: null, professionals: [], services: [], appointments: [], allowAnyProfessional: false };

  const bounds = localDayBounds(date, selectedLocation.timezone);
  const [professionalRows, serviceRows, appointmentRows, scheduleRows] = await Promise.all([db.select({ id: professionals.id, name: professionals.displayName })
    .from(professionals)
    .innerJoin(professionalLocations, and(
      eq(professionalLocations.businessId, professionals.businessId),
      eq(professionalLocations.professionalId, professionals.id),
      eq(professionalLocations.locationId, selectedLocation.id),
      eq(professionalLocations.isActive, true),
    ))
    .where(and(eq(professionals.businessId, businessId), eq(professionals.isActive, true)))
    .orderBy(asc(professionals.sortOrder), asc(professionals.displayName)),
  db.select({ id: services.id, name: services.name, duration: services.durationMinutes, priceMinor: services.priceMinor })
    .from(services).where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name)),
  db.select({
    id: appointments.id, locationId: appointments.locationId,
    startsAt: appointments.startsAt, endsAt: appointments.endsAt,
    customerName: appointments.customerName, customerPhone: appointments.customerPhone,
    serviceName: appointments.serviceNameSnapshot, professionalId: appointments.professionalId,
    professionalName: appointments.professionalNameSnapshot, status: appointments.status,
    priceMinor: appointments.priceMinorSnapshot, currency: appointments.currencySnapshot,
    source: appointments.source, version: appointments.version,
  }).from(appointments).where(and(
    eq(appointments.businessId, businessId),
    eq(appointments.locationId, selectedLocation.id),
    gte(appointments.startsAt, bounds.start), lt(appointments.startsAt, bounds.end),
    ne(appointments.status, 'cancelled'),
  )).orderBy(asc(appointments.startsAt)),
  db.select({
    id: schedules.id, professionalId: schedules.professionalId,
  }).from(schedules).where(and(
    eq(schedules.businessId, businessId),
    eq(schedules.locationId, selectedLocation.id),
  )),
  ]);
  const scheduleIds = scheduleRows.map(schedule => schedule.id);

  const [intervalRows, exceptionRows, blockRows] = await Promise.all([
    scheduleIds.length
      ? db.select({
        scheduleId: weeklyIntervals.scheduleId,
        weekday: weeklyIntervals.weekday,
        startMinute: weeklyIntervals.startMinute,
        endMinute: weeklyIntervals.endMinute,
      }).from(weeklyIntervals).where(and(
        eq(weeklyIntervals.businessId, businessId),
        inArray(weeklyIntervals.scheduleId, scheduleIds),
      ))
      : [],
    scheduleIds.length
      ? db.select({
        scheduleId: scheduleExceptions.scheduleId,
        mode: scheduleExceptions.mode,
        startMinute: exceptionIntervals.startMinute,
        endMinute: exceptionIntervals.endMinute,
      }).from(scheduleExceptions)
        .leftJoin(exceptionIntervals, and(
          eq(exceptionIntervals.businessId, scheduleExceptions.businessId),
          eq(exceptionIntervals.exceptionId, scheduleExceptions.id),
        ))
        .where(and(
          eq(scheduleExceptions.businessId, businessId),
          inArray(scheduleExceptions.scheduleId, scheduleIds),
          eq(scheduleExceptions.localDate, date),
        ))
      : [],
    db.select({
      professionalId: calendarOccupancies.professionalId,
      startsAt: calendarOccupancies.startsAt,
      endsAt: calendarOccupancies.endsAt,
    }).from(calendarOccupancies).where(and(
      eq(calendarOccupancies.businessId, businessId),
      eq(calendarOccupancies.locationId, selectedLocation.id),
      eq(calendarOccupancies.kind, 'block'),
      eq(calendarOccupancies.isActive, true),
      lt(calendarOccupancies.startsAt, bounds.end),
      gte(calendarOccupancies.endsAt, bounds.start),
    )),
  ]);

  const weeklyBySchedule = new Map<string, Array<{ weekday: number; startMinute: number; endMinute: number }>>();
  for (const row of intervalRows) {
    weeklyBySchedule.set(row.scheduleId, [...(weeklyBySchedule.get(row.scheduleId) ?? []), row]);
  }
  const exceptionsBySchedule = new Map<string, { mode: 'closed' | 'custom'; intervals: Array<{ startMinute: number; endMinute: number }> }>();
  for (const row of exceptionRows) {
    const exception = exceptionsBySchedule.get(row.scheduleId) ?? { mode: row.mode, intervals: [] };
    if (row.startMinute !== null && row.endMinute !== null) {
      exception.intervals.push({ startMinute: row.startMinute, endMinute: row.endMinute });
    }
    exceptionsBySchedule.set(row.scheduleId, exception);
  }
  const weekday = weekdayForDate(date);
  const locationSchedule = scheduleRows.find(schedule => schedule.professionalId === null) ?? null;
  const locationIntervals = locationSchedule
    ? intervalsForDate(weekday, weeklyBySchedule.get(locationSchedule.id) ?? [], exceptionsBySchedule.get(locationSchedule.id))
    : [];
  const professionalSchedules = new Map(
    scheduleRows
      .filter(schedule => schedule.professionalId !== null)
      .map(schedule => [schedule.professionalId as string, schedule.id]),
  );
  const fitsIntervals = (startMinute: number, endMinute: number, intervals: Array<{ startMinute: number; endMinute: number }>) =>
    endMinute > startMinute && intervals.some(interval => startMinute >= interval.startMinute && endMinute <= interval.endMinute);

  const paymentRows = appointmentRows.length ? await db.select({
    id: appointmentPayments.id, appointmentId: appointmentPayments.appointmentId,
    amountMinor: appointmentPayments.amountMinor, currency: appointmentPayments.currency,
    method: appointmentPayments.method, recordedAt: appointmentPayments.recordedAt,
    note: appointmentPayments.note, reversedAt: appointmentPayments.reversedAt,
    reversalReason: appointmentPayments.reversalReason,
  }).from(appointmentPayments).where(and(
    eq(appointmentPayments.businessId, businessId),
    inArray(appointmentPayments.appointmentId, appointmentRows.map(row => row.id)),
  )) : [];
  const visiblePayments = paymentRows.filter(payment => appointmentRows.some(row => row.id === payment.appointmentId));
  const paymentsByAppointment = new Map<string, typeof visiblePayments>();
  for (const payment of visiblePayments) paymentsByAppointment.set(payment.appointmentId, [...(paymentsByAppointment.get(payment.appointmentId) ?? []), payment]);

  return {
    business,
    locations: locationRows,
    selectedLocation,
    professionals: professionalRows,
    services: serviceRows,
    allowAnyProfessional: settingRows[0]?.allowAnyProfessional ?? false,
    appointments: appointmentRows.map(appointment => {
      const payments = paymentsByAppointment.get(appointment.id) ?? [];
      const startMinute = localMinuteOfDay(appointment.startsAt, selectedLocation.timezone);
      const endMinute = localMinuteOfDay(appointment.endsAt, selectedLocation.timezone);
      const personalScheduleId = professionalSchedules.get(appointment.professionalId);
      const personalIntervals = personalScheduleId
        ? intervalsForDate(weekday, weeklyBySchedule.get(personalScheduleId) ?? [], exceptionsBySchedule.get(personalScheduleId))
        : locationIntervals;
      const blocked = blockRows.some(block =>
        block.professionalId === appointment.professionalId
        && block.startsAt < appointment.endsAt
        && block.endsAt > appointment.startsAt);
      const outsideSchedule = !fitsIntervals(startMinute, endMinute, locationIntervals)
        || !fitsIntervals(startMinute, endMinute, personalIntervals)
        || blocked;
      return {
        ...appointment,
        payments,
        paidMinor: payments.filter(payment => !payment.reversedAt).reduce((sum, payment) => sum + payment.amountMinor, 0),
        outsideSchedule,
      };
    }),
  };
}
