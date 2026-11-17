import { describe, expect, it } from 'vitest';
import { addDays, allSlots, available, baseDate, eligible, initialBookings, initialDate, slots } from '../../src/modules/prototype';

describe('availability by location', () => {
  it('uses today in Rosario as the booking calendar pivot', () => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    expect(baseDate).toBe(`${value.year}-${value.month}-${value.day}`);
    expect([baseDate, addDays(baseDate, 1)]).toContain(initialDate);
    expect(new Date(initialDate + 'T12:00:00Z').getUTCDay()).not.toBe(0);
    expect(initialBookings.every(booking => booking.date === initialDate)).toBe(true);
  });

  it('keeps occupied starts visible but not reservable for a specific professional', () => {
    expect(allSlots(initialDate, 'corte')).toContain('09:00');
    expect(slots(initialDate, 'corte', 'julia', 'urquiza', initialBookings)).not.toContain('09:00');
    expect(slots(initialDate, 'corte', 'renata', 'roca', initialBookings)).toContain('09:00');
    expect(slots(initialDate, 'corte', 'julia', 'roca', initialBookings)).not.toContain('09:00');
    expect(eligible('corte', 'roca').map(p => p.name)).toEqual(['Renata Funes', 'Iván Cabrera']);
  });

  it('only marks a combined slot reserved when every eligible professional is busy', () => {
    const everyone = ['emilia', 'mateo'].map((professional, i) => ({
      ...initialBookings[0], id: `extra-${i}`, professional, location: 'febrero' as const,
    }));
    expect(available(initialDate, '09:00', 'corte', 'any', 'febrero', everyone)).toHaveLength(0);
    expect(available(initialDate, '09:00', 'corte', 'any', 'urquiza', everyone)).toHaveLength(3);
  });

  it('releases a cancelled time without changing the other locations', () => {
    const cancelled = initialBookings.map(booking => booking.id === 'a1' ? { ...booking, status: 'Cancelada' as const } : booking);
    expect(slots(initialDate, 'corte', 'julia', 'urquiza', cancelled)).toContain('09:00');
  });
});
