import { describe, expect, test } from 'bun:test';
import { checkPassword, isValidEmail, isValidPassword } from './validators';

describe('isValidEmail', () => {
  test('accepts valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('student.scholar@domain.org')).toBe(true);
  });

  test('rejects invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('checkPassword and isValidPassword', () => {
  test('validates complete password criteria', () => {
    expect(isValidPassword('Valid123')).toBe(true);
    expect(isValidPassword('P@ssw0rdSecure')).toBe(true);
  });

  test('rejects passwords failing criteria', () => {
    expect(isValidPassword('short1A')).toBe(false);
    expect(isValidPassword('alllowercase1')).toBe(false);
    expect(isValidPassword('ALLUPPERCASE1')).toBe(false);
    expect(isValidPassword('NoNumbersHere')).toBe(false);
  });

  test('reports individual checklist items correctly', () => {
    const check = checkPassword('abc');
    expect(check.minLength).toBe(false);
    expect(check.lowercase).toBe(true);
    expect(check.uppercase).toBe(false);
    expect(check.number).toBe(false);
  });
});
