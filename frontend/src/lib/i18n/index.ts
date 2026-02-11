import { derived } from 'svelte/store';
import { locale } from '$lib/stores';
import { en } from './en';
import { es } from './es';
import type { Translations } from './types';

const translations: Record<string, Translations> = { en, es };

/** Reactive translation store — automatically updates when locale changes */
export const t = derived(locale, ($locale): Translations => {
  return translations[$locale] ?? translations['en'];
});

export type { Translations } from './types';
