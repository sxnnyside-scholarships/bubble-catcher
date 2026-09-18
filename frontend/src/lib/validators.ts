/**
 * Client-side format validation helpers for immediate user feedback.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordChecklist {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function checkPassword(value: string): PasswordChecklist {
  return {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
  };
}

export function isValidPassword(value: string): boolean {
  const checks = checkPassword(value);
  return checks.minLength && checks.uppercase && checks.lowercase && checks.number;
}
