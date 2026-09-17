/**
 * Client-side feedback only — the backend is the real authority (email
 * format via Elysia's `t.String({format:'email'})`, password via
 * `minLength: 8`). These regexes exist purely to give the user immediate
 * inline feedback before they submit.
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
