import { describe, expect, it } from 'vitest';
import { fieldErrorsFromIssues, loginEmailSchema, loginFormSchema, loginPasswordSchema, recoveryFormSchema } from './validation';

describe('login form validation', () => {
  it('trims email whitespace and returns the normalized email', () => {
    expect(loginEmailSchema.parse('  owner@example.com  ')).toBe('owner@example.com');
  });

  it('rejects empty, malformed and overlong emails with useful messages', () => {
    expect(loginEmailSchema.safeParse('').error?.issues[0].message).toBe('Ingresá tu email.');
    expect(loginEmailSchema.safeParse('not-an-email').error?.issues[0].message).toBe('Ingresá un email válido.');
    expect(loginEmailSchema.safeParse(`${'a'.repeat(245)}@example.com`).success).toBe(false);
  });

  it('requires a password but does not trim its characters', () => {
    expect(loginPasswordSchema.safeParse('').success).toBe(false);
    expect(loginPasswordSchema.parse('  ')).toBe('  ');
    expect(loginPasswordSchema.safeParse('x'.repeat(257)).success).toBe(false);
  });

  it('allows an owner account without a location', () => {
    expect(loginFormSchema.safeParse({
      email: 'owner@example.com',
      password: 'secret',
      accountType: 'owner',
    }).success).toBe(true);
  });

  it('requires a valid location for an operational account', () => {
    const missing = loginFormSchema.safeParse({
      email: 'staff@example.com',
      password: 'secret',
      accountType: 'location',
    });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(fieldErrorsFromIssues(missing.error.issues).location).toBe('Elegí una sede válida.');

    expect(loginFormSchema.safeParse({
      email: 'staff@example.com',
      password: 'secret',
      accountType: 'location',
      location: 'urquiza',
    }).success).toBe(true);
    expect(loginFormSchema.safeParse({
      email: 'staff@example.com',
      password: 'secret',
      accountType: 'location',
      location: 'unknown',
    }).success).toBe(false);
  });

  it('uses the same email rules for password recovery', () => {
    expect(recoveryFormSchema.safeParse({ email: 'owner@example.com' }).success).toBe(true);
    expect(recoveryFormSchema.safeParse({ email: '' }).success).toBe(false);
  });
});
