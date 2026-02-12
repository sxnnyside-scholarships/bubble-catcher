import { derived, get } from 'svelte/store';
import { locale } from '$lib/stores';
import { en } from './en';
import { es } from './es';
import type { Translations } from './types';

const translations: Record<string, Translations> = { en, es };

/** Reactive translation store — automatically updates when locale changes */
export const t = derived(locale, ($locale): Translations => {
  return translations[$locale] ?? translations['en'];
});

/** Resolve an error code to a localized message string */
export function resolveErrorCode(code: string): string {
  const currentTranslations = translations[get(locale)] ?? translations['en'];
  return currentTranslations.errors[code] ?? currentTranslations.errors['INTERNAL_ERROR'] ?? code;
}

export type { Translations } from './types';
