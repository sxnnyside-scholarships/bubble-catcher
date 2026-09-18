import { createI18n } from 'vue-i18n';
import { en, type Messages } from './en';
import { es } from './es';

export type Locale = 'en' | 'es';

const STORAGE_KEY = 'bubble-catcher-locale';

function detectBrowserLocale(): Locale {
  const languages = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const lang of languages) {
    if (lang.toLowerCase().startsWith('es')) return 'es';
    if (lang.toLowerCase().startsWith('en')) return 'en';
  }
  return 'en';
}

function initialLocale(): Locale {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'en' || saved === 'es') return saved;
  return detectBrowserLocale();
}

export const i18n = createI18n<[Messages], Locale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, es },
});

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, locale);
}

export function currentLocale(): Locale {
  return i18n.global.locale.value as Locale;
}

/** Resolves application error code to localized message string. */
export function resolveErrorCode(code: string): string {
  const messages = i18n.global.messages.value[currentLocale()];
  const errors = messages?.errors as Record<string, string> | undefined;
  return errors?.[code] ?? errors?.INTERNAL_ERROR ?? code;
}
