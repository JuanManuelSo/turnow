import { describe, expect, it } from 'vitest';
import { allSlots, available, baseDate, eligible, initialBookings, slots } from '../../src/modules/prototype';

describe('availability by location', () => {
  it('keeps occupied starts visible but not reservable for a specific professional', () => {
    expect(allSlots(baseDate, 'corte')).toContain('09:00');
    expect(slots(baseDate, 'corte', 'julia', 'urquiza', initialBookings)).not.toContain('09:00');
    expect(slots(baseDate, 'corte', 'renata', 'roca', initialBookings)).toContain('09:00');
    expect(slots(baseDate, 'corte', 'julia', 'roca', initialBookings)).not.toContain('09:00');
    expect(eligible('corte', 'roca').map(p => p.name)).toEqual(['Renata Funes', 'Iván Cabrera']);
  });

  it('only marks a combined slot reserved when every eligible professional is busy', () => {
    const everyone = ['emilia', 'mateo'].map((professional, i) => ({
      ...initialBookings[0], id: `extra-${i}`, professional, location: 'febrero' as const,
    }));
    expect(available(baseDate, '09:00', 'corte', 'any', 'febrero', everyone)).toHaveLength(0);
    expect(available(baseDate, '09:00', 'corte', 'any', 'urquiza', everyone)).toHaveLength(3);
  });

  it('releases a cancelled time without changing the other locations', () => {
    const cancelled = initialBookings.map(booking => booking.id === 'a1' ? { ...booking, status: 'Cancelada' as const } : booking);
    expect(slots(baseDate, 'corte', 'julia', 'urquiza', cancelled)).toContain('09:00');
  });
});
