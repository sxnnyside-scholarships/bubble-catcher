<script lang="ts">
  import { t } from '$lib/i18n';
  import { theme, locale, applyTheme, applyLocale, userProfile } from '$lib/stores';
  import { api } from '$lib/api';
  import type { UserProfile } from '$shared/types';

  const isPremium = $derived($userProfile?.plan === 'premium');

  async function changeTheme(newTheme: 'colorful' | 'light' | 'dark') {
    applyTheme(newTheme);
    await api.patch<UserProfile>('/user/preferences', { preferredTheme: newTheme });
  }

  async function changeLocale(newLocale: 'en' | 'es') {
    applyLocale(newLocale);
    await api.patch<UserProfile>('/user/preferences', { preferredLocale: newLocale });
  }

  const bugMailto = $derived(
    `mailto:security.sxnnyside@sxnnysideproject.com?subject=${encodeURIComponent('[Bubble Catcher] Bug Report')}&body=${encodeURIComponent(
      'Describe el error:\n\nPasos para reproducir:\n\nDialect:\nQuery utilizada:\n\nCaptura opcional:'
    )}`
  );

  const supportMailto = $derived(
    `mailto:support.sxnnyside@sxnnysideproject.com?subject=${encodeURIComponent('[Bubble Catcher Premium] Support Request')}&body=${encodeURIComponent(
      'Describe tu solicitud:\n\nProyecto:\nDialect:\nDetalles adicionales:'
    )}`
  );
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
          <span class="text-sm font-medium">{$t.settings.languageEs}</span>
        </button>
      </div>
    </div>

    <!-- Account Section -->
    <div class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
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

    <!-- Support & Community -->
    <div class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 class="mb-1 text-lg font-semibold">{$t.settings.supportCommunity}</h2>
      <p class="mb-5 text-sm text-[var(--color-text-secondary)]">{$t.settings.supportCommunityDesc}</p>

      <div class="space-y-3">
        <!-- Patreon -->
        <a
          href="https://www.patreon.com/SxnnysideProject"
          target="_blank"
          rel="noopener noreferrer"
          class="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-tertiary)] px-4 py-3 text-sm font-medium transition-colors hover:border-[#f96854]/50 hover:bg-[#f96854]/5"
        >
          <svg class="h-5 w-5 shrink-0 text-[#f96854]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
          </svg>
          <span>{$t.settings.followPatreon}</span>
          <svg class="ml-auto h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <!-- Report Bug -->
        <a
          href={bugMailto}
          class="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-tertiary)] px-4 py-3 text-sm font-medium transition-colors hover:border-red-400/50 hover:bg-red-500/5"
        >
          <svg class="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{$t.settings.reportBug}</span>
          <svg class="ml-auto h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>

        <!-- Premium Support -->
        {#if isPremium}
          <a
            href={supportMailto}
            class="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-tertiary)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--color-primary-400)]/50 hover:bg-[var(--color-primary-500)]/5"
          >
            <svg class="h-5 w-5 shrink-0 text-[var(--color-primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <span>{$t.settings.requestSupport}</span>
            <svg class="ml-auto h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        {:else}
          <div class="group relative">
            <button
              disabled
              class="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-tertiary)] px-4 py-3 text-sm font-medium opacity-50"
            >
              <svg class="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <span>{$t.settings.requestSupport}</span>
              <span class="ml-auto rounded-full bg-[var(--color-primary-500)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-primary-600)]">
                {$t.settings.premiumOnly}
              </span>
            </button>
            <div class="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {$t.settings.premiumUpgradeHint}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Legal -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 class="mb-4 text-lg font-semibold">{$t.settings.legal}</h2>
      <div class="flex gap-4">
        <a
          href="https://www.notion.so/Bubble-Catcher-Privacy-Policy-3059f9a551d280a3ab2df966bc2d4048?source=copy_link"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]"
        >
          <span>{$t.settings.privacyPolicy}</span>
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href="https://www.notion.so/Bubble-Catcher-Terms-and-Conditions-3059f9a551d2807283c3db263a2fee21?source=copy_link"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]"
        >
          <span>{$t.settings.termsConditions}</span>
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</div>
