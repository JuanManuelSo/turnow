import { describe, expect, it } from 'vitest';
import { combineAnyProfessionalSlots, intervalsForDate, slotsForProfessional, weekdayForDate } from './availability-engine';

const now = new Date('2030-06-10T10:00:00.000Z');
const base = {
  date: '2030-06-10',
  timezone: 'America/Argentina/Buenos_Aires',
  locationIntervals: [{ startMinute: 9 * 60, endMinute: 13 * 60 }, { startMinute: 14 * 60, endMinute: 18 * 60 }],
  professionalIntervals: [{ startMinute: 10 * 60, endMinute: 12 * 60 }, { startMinute: 15 * 60, endMinute: 17 * 60 }],
  durationMinutes: 30,
  bufferMinutes: 15,
  slotIntervalMinutes: 30,
  minNoticeMinutes: 0,
  horizonDays: 60,
  occupancies: [],
  now,
};

describe('availability engine', () => {
  it('intersects location and professional split shifts and fits service plus buffer', () => {
    const slots = slotsForProfessional(base);
    expect(slots.map(slot => slot.toISOString())).toEqual([
      '2030-06-10T13:00:00.000Z',
      '2030-06-10T13:30:00.000Z',
      '2030-06-10T14:00:00.000Z',
      '2030-06-10T18:00:00.000Z',
      '2030-06-10T18:30:00.000Z',
      '2030-06-10T19:00:00.000Z',
    ]);
  });

  it('excludes overlaps including the post-service buffer', () => {
    const slots = slotsForProfessional({
      ...base,
      occupancies: [{ startsAt: new Date('2030-06-10T13:45:00Z'), endsAt: new Date('2030-06-10T14:30:00Z') }],
    });
    expect(slots.map(slot => slot.toISOString())).not.toContain('2030-06-10T13:30:00.000Z');
  });

  it('applies notice and booking horizon boundaries', () => {
    const slots = slotsForProfessional({
      ...base,
      minNoticeMinutes: 90,
      horizonDays: 1,
      now: new Date('2030-06-10T13:00:00Z'),
    });
    expect(slots.every(slot => slot.getTime() >= Date.parse('2030-06-10T14:30:00Z'))).toBe(true);
  });

  it('rejects a slot that crosses the closing time or lands on a DST gap', () => {
    expect(slotsForProfessional({
      ...base,
      locationIntervals: [{ startMinute: 9 * 60, endMinute: 10 * 60 + 20 }],
      professionalIntervals: [{ startMinute: 9 * 60, endMinute: 10 * 60 + 20 }],
      durationMinutes: 60,
      bufferMinutes: 0,
    })).toHaveLength(1);

    expect(slotsForProfessional({
      ...base,
      date: '2030-03-10',
      timezone: 'America/New_York',
      locationIntervals: [{ startMinute: 120, endMinute: 180 }],
      professionalIntervals: [{ startMinute: 120, endMinute: 180 }],
      durationMinutes: 30,
      bufferMinutes: 0,
      now: new Date('2030-03-09T00:00:00Z'),
    })).toEqual([]);
  });

  it('uses closed and custom exceptions instead of the weekly schedule', () => {
    const weekly = [{ weekday: 1, startMinute: 9 * 60, endMinute: 17 * 60 }];
    expect(intervalsForDate(1, weekly, { mode: 'closed', intervals: [] })).toEqual([]);
    expect(intervalsForDate(1, weekly, { mode: 'custom', intervals: [{ startMinute: 11 * 60, endMinute: 13 * 60 }] }))
      .toEqual([{ startMinute: 11 * 60, endMinute: 13 * 60 }]);
    expect(weekdayForDate('2030-06-10')).toBe(1);
  });

  it('deduplicates any-professional times and picks the lowest daily workload', () => {
    const slots = combineAnyProfessionalSlots([
      { time: '10:00', professionalId: 'a', professionalName: 'Ana', workloadMinutes: 90 },
      { time: '10:00', professionalId: 'b', professionalName: 'Belén', workloadMinutes: 30 },
      { time: '10:30', professionalId: 'a', professionalName: 'Ana', workloadMinutes: 90 },
      { time: '10:30', professionalId: 'b', professionalName: 'Belén', workloadMinutes: 90 },
    ]);
    expect(slots.map(slot => [slot.time, slot.professionalId])).toEqual([
      ['10:00', 'b'], ['10:30', 'a'],
    ]);
  });

  it('skips nonexistent local wall-clock times and rejects invalid configuration', () => {
    expect(slotsForProfessional({
      ...base,
      date: '2030-06-10',
      locationIntervals: [{ startMinute: 9 * 60, endMinute: 11 * 60 }],
      professionalIntervals: [{ startMinute: 9 * 60, endMinute: 11 * 60 }],
      durationMinutes: 0,
    })).toEqual([]);
  });
});
