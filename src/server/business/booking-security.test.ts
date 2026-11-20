import { afterEach, describe, expect, it } from 'vitest';
import {
  createCancellationCode, decryptCancellationCode, encryptCancellationCode,
  hashBookingRequest, hashCancellationCode, isWithinCancellationWindow,
} from './booking-security';

const previousKey = process.env.BOOKING_CODE_ENCRYPTION_KEY;
afterEach(() => {
  if (previousKey === undefined) delete process.env.BOOKING_CODE_ENCRYPTION_KEY;
  else process.env.BOOKING_CODE_ENCRYPTION_KEY = previousKey;
});

describe('booking security', () => {
  it('generates a private high-entropy code and hashes it case-insensitively', () => {
    const first = createCancellationCode();
    const second = createCancellationCode();
    expect(first).toMatch(/^[A-Z0-9_-]{32}$/);
    expect(first).not.toBe(second);
    expect(hashCancellationCode(first)).toBe(hashCancellationCode(first.toLowerCase()));
    expect(hashCancellationCode(first)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('encrypts codes for safe idempotent confirmation recovery', () => {
    process.env.BOOKING_CODE_ENCRYPTION_KEY = '11'.repeat(32);
    const code = createCancellationCode();
    const encrypted = encryptCancellationCode(code);
    expect(encrypted.keyVersion).toBe(1);
    expect(encrypted.ciphertext).not.toContain(code);
    expect(decryptCancellationCode(encrypted.ciphertext, encrypted.keyVersion)).toBe(code);
    expect(() => decryptCancellationCode(encrypted.ciphertext, 2)).toThrow();
  });

  it('hashes a canonical booking payload deterministically', () => {
    const payload = { locationId: 'a', date: '2030-06-10', time: '10:00', customerEmail: 'cliente@example.com' };
    expect(hashBookingRequest(payload)).toBe(hashBookingRequest(payload));
    expect(hashBookingRequest(payload)).not.toBe(hashBookingRequest({ ...payload, time: '10:15' }));
    expect(hashBookingRequest(payload)).not.toBe(hashBookingRequest({ ...payload, customerEmail: 'otro@example.com' }));
  });

  it('allows public cancellation only strictly before the saved notice cutoff', () => {
    const startsAt = new Date('2030-06-10T12:00:00Z');
    const cutoff = new Date('2030-06-10T10:00:00Z');
    expect(isWithinCancellationWindow(startsAt, 120, new Date(cutoff.getTime() - 1))).toBe(true);
    expect(isWithinCancellationWindow(startsAt, 120, cutoff)).toBe(false);
    expect(isWithinCancellationWindow(startsAt, 0, startsAt)).toBe(false);
  });
});
