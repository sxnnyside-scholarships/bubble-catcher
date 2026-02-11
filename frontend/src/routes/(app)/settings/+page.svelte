<script lang="ts">
  import { t } from '$lib/i18n';
  import { theme, locale, applyTheme, applyLocale, userProfile } from '$lib/stores';
  import { api } from '$lib/api';
  import type { UserProfile } from '$shared/types';

  async function changeTheme(newTheme: 'colorful' | 'light' | 'dark') {
    applyTheme(newTheme);
    await api.patch<UserProfile>('/user/preferences', { preferredTheme: newTheme });
  }

  async function changeLocale(newLocale: 'en' | 'es') {
    applyLocale(newLocale);
    await api.patch<UserProfile>('/user/preferences', { preferredLocale: newLocale });
  }
</script>

<div class="p-8">
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-8 text-3xl font-bold">{$t.settings.title}</h1>

    <!-- Theme Section -->
    <div class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 class="mb-4 text-lg font-semibold">{$t.settings.theme}</h2>
      <div class="grid grid-cols-3 gap-4">
        <button
          onclick={() => changeTheme('colorful')}
          class="rounded-xl border-2 p-4 text-center transition-all
            {$theme === 'colorful'
              ? 'border-[var(--color-primary-500)] shadow-md shadow-[var(--color-primary-500)]/20'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
            }"
        >
          <div class="mx-auto mb-3 h-12 w-12 rounded-xl gradient-primary"></div>
          <span class="text-sm font-medium">{$t.settings.themeColorful}</span>
        </button>

        <button
          onclick={() => changeTheme('light')}
          class="rounded-xl border-2 p-4 text-center transition-all
            {$theme === 'light'
              ? 'border-[var(--color-primary-500)] shadow-md shadow-[var(--color-primary-500)]/20'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
            }"
        >
          <div class="mx-auto mb-3 h-12 w-12 rounded-xl border border-gray-200 bg-gray-50"></div>
          <span class="text-sm font-medium">{$t.settings.themeLight}</span>
        </button>

        <button
          onclick={() => changeTheme('dark')}
          class="rounded-xl border-2 p-4 text-center transition-all
            {$theme === 'dark'
              ? 'border-[var(--color-primary-500)] shadow-md shadow-[var(--color-primary-500)]/20'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
            }"
        >
          <div class="mx-auto mb-3 h-12 w-12 rounded-xl bg-gray-800"></div>
          <span class="text-sm font-medium">{$t.settings.themeDark}</span>
        </button>
      </div>
    </div>

    <!-- Language Section -->
    <div class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 class="mb-4 text-lg font-semibold">{$t.settings.language}</h2>
      <div class="grid grid-cols-2 gap-4">
        <button
          onclick={() => changeLocale('en')}
          class="rounded-xl border-2 p-4 text-center transition-all
            {$locale === 'en'
              ? 'border-[var(--color-primary-500)] shadow-md shadow-[var(--color-primary-500)]/20'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
            }"
        >
          <span class="mb-2 block text-2xl">🇺🇸</span>
          <span class="text-sm font-medium">{$t.settings.languageEn}</span>
        </button>

        <button
          onclick={() => changeLocale('es')}
          class="rounded-xl border-2 p-4 text-center transition-all
            {$locale === 'es'
              ? 'border-[var(--color-primary-500)] shadow-md shadow-[var(--color-primary-500)]/20'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
            }"
        >
          <span class="mb-2 block text-2xl">🇲🇽</span>
          <span class="text-sm font-medium">{$t.settings.languageEs}</span>
        </button>
      </div>
    </div>

    <!-- Account Section -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 class="mb-4 text-lg font-semibold">{$t.settings.account}</h2>
      {#if $userProfile}
        <div class="space-y-3">
          <div class="flex items-center justify-between rounded-lg bg-[var(--color-surface-tertiary)] p-3">
            <span class="text-sm text-[var(--color-text-secondary)]">{$t.auth.email}</span>
            <span class="text-sm font-medium">{$userProfile.email}</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-[var(--color-surface-tertiary)] p-3">
            <span class="text-sm text-[var(--color-text-secondary)]">{$t.settings.plan}</span>
            <span class="rounded-full bg-[var(--color-primary-500)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary-600)]">
              {$userProfile.plan.toUpperCase()}
            </span>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
