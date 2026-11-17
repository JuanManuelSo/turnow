import { localDateTimeToInstant } from '@/lib/timezone';

export type MinuteInterval = { startMinute: number; endMinute: number };
export type OccupiedPeriod = { startsAt: Date; endsAt: Date };
export type SlotCandidate = { time: string; workloadMinutes: number; professionalName: string };
export type AvailabilityInput = {
  date: string;
  timezone: string;
  locationIntervals: MinuteInterval[];
  professionalIntervals: MinuteInterval[];
  durationMinutes: number;
  bufferMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  horizonDays: number;
  occupancies: OccupiedPeriod[];
  now?: Date;
};

function intersect(left: MinuteInterval[], right: MinuteInterval[]): MinuteInterval[] {
  const result: MinuteInterval[] = [];
  for (const a of left) for (const b of right) {
    const startMinute = Math.max(a.startMinute, b.startMinute);
    const endMinute = Math.min(a.endMinute, b.endMinute);
    if (startMinute < endMinute) result.push({ startMinute, endMinute });
  }
  return result.sort((a, b) => a.startMinute - b.startMinute);
}

export function slotsForProfessional(input: AvailabilityInput): Date[] {
  const {
    date, timezone, locationIntervals, professionalIntervals, durationMinutes,
    bufferMinutes, slotIntervalMinutes, minNoticeMinutes, horizonDays,
    occupancies, now = new Date(),
  } = input;
  if (durationMinutes <= 0 || bufferMinutes < 0 || slotIntervalMinutes <= 0 || horizonDays < 1) return [];

  const serviceEnd = durationMinutes + bufferMinutes;
  const minStart = now.getTime() + minNoticeMinutes * 60_000;
  const maxStart = now.getTime() + horizonDays * 24 * 60 * 60_000;
  const windows = intersect(locationIntervals, professionalIntervals);
  const result: Date[] = [];

  for (const window of windows) {
    for (let minute = window.startMinute; minute + serviceEnd <= window.endMinute; minute += slotIntervalMinutes) {
      let startsAt: Date;
      try {
        startsAt = localDateTimeToInstant(date, `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`, timezone);
      } catch {
        // A local time skipped by a timezone transition is not bookable.
        continue;
      }
      const occupiedUntil = startsAt.getTime() + serviceEnd * 60_000;
      if (startsAt.getTime() < minStart || startsAt.getTime() > maxStart) continue;
      if (occupancies.some(period => period.startsAt.getTime() < occupiedUntil && period.endsAt.getTime() > startsAt.getTime())) continue;
      result.push(startsAt);
    }
  }
  return result.sort((a, b) => a.getTime() - b.getTime());
}

export function intervalsForDate(
  weekday: number,
  weekly: Array<MinuteInterval & { weekday: number }>,
  exception?: { mode: 'closed' | 'custom'; intervals: MinuteInterval[] },
): MinuteInterval[] {
  if (exception?.mode === 'closed') return [];
  if (exception?.mode === 'custom') return exception.intervals;
  return weekly.filter(interval => interval.weekday === weekday)
    .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }));
}

export function weekdayForDate(date: string): number {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** Combines equivalent times and deterministically chooses the lightest-loaded professional. */
export function combineAnyProfessionalSlots<T extends SlotCandidate>(slots: T[]): T[] {
  const byTime = new Map<string, T>();
  for (const slot of slots) {
    const previous = byTime.get(slot.time);
    if (!previous || slot.workloadMinutes < previous.workloadMinutes
      || (slot.workloadMinutes === previous.workloadMinutes && slot.professionalName.localeCompare(previous.professionalName) < 0)) {
      byTime.set(slot.time, slot);
    }
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}
