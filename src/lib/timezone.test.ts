import { describe, expect, it } from 'vitest';
import { localDateTimeToInstant, localDayBounds } from './timezone';

describe('agenda timezone conversion', () => {
  it('converts a local appointment time to the correct UTC instant', () => {
    expect(localDateTimeToInstant('2026-11-16', '09:30', 'America/Argentina/Buenos_Aires').toISOString())
      .toBe('2026-11-16T12:30:00.000Z');
  });

  it('builds a calendar day using the location timezone across DST changes', () => {
    const spring = localDayBounds('2026-03-08', 'America/New_York');
    const autumn = localDayBounds('2026-11-01', 'America/New_York');
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    expect((autumn.end.getTime() - autumn.start.getTime()) / 3_600_000).toBe(25);
  });

  it('rejects a local time that does not exist during the spring clock change', () => {
    expect(() => localDateTimeToInstant('2026-03-08', '02:30', 'America/New_York'))
      .toThrow('Ese horario local no existe por el cambio de hora.');
  });
});
