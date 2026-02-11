import { writable, derived } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile, Project } from '$shared/types';

/** Current Supabase session */
export const session = writable<Session | null>(null);

/** Whether the initial session check has completed */
export const sessionLoaded = writable(false);

/** Whether the user is authenticated */
export const isAuthenticated = derived(session, ($session) => !!$session);

/** Current user profile from our backend */
export const userProfile = writable<UserProfile | null>(null);

/** Active projects list */
export const projects = writable<Project[]>([]);

/** Currently selected project */
export const activeProject = writable<Project | null>(null);

/** Current theme */
export const theme = writable<'colorful' | 'light' | 'dark'>('colorful');

/** Current locale */
export const locale = writable<'en' | 'es'>('en');

/** Global loading state */
export const isLoading = writable(false);

/** Apply theme to DOM */
export function applyTheme(newTheme: 'colorful' | 'light' | 'dark'): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('bubble-catcher-theme', newTheme);
  }
  theme.set(newTheme);
}

/** Load theme from storage */
export function loadTheme(): void {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('bubble-catcher-theme') as 'colorful' | 'light' | 'dark' | null;
    if (saved) {
      applyTheme(saved);
    }
  }
}

/** Apply locale */
export function applyLocale(newLocale: 'en' | 'es'): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('bubble-catcher-locale', newLocale);
  }
  locale.set(newLocale);
}

/** Load locale from storage */
export function loadLocale(): void {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('bubble-catcher-locale') as 'en' | 'es' | null;
    if (saved) {
      applyLocale(saved);
    }
  }
}
