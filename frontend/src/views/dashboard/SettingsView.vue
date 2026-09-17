<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { currentLocale, type Locale, setLocale } from '@/i18n';

const { t } = useI18n();

const activeLocale = computed(() => currentLocale());

function changeLocale(loc: Locale) {
  setLocale(loc);
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-6 p-6">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-[var(--color-text)]">{{ t('nav.settings') }}</h1>
      <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
        Personalize your interface preferences and view system environment configuration.
      </p>
    </div>

    <!-- Preferences Bento -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Language Selector -->
      <div class="bubble-surface flex flex-col justify-between gap-4 rounded-2xl p-5">
        <div>
          <div class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
            <MingcuteIcon name="web" class="h-4 w-4 text-[var(--color-primary-500)]" />
            <span>Language / Idioma</span>
          </div>
          <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
            Select your preferred interface and documentation language.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all"
            :class="
              activeLocale === 'es'
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)] shadow-sm ring-1 ring-[var(--color-primary-500)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="changeLocale('es')"
          >
            <MingcuteIcon v-if="activeLocale === 'es'" name="check" class="h-3.5 w-3.5" />
            <span>Español</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all"
            :class="
              activeLocale === 'en'
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)] shadow-sm ring-1 ring-[var(--color-primary-500)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="changeLocale('en')"
          >
            <MingcuteIcon v-if="activeLocale === 'en'" name="check" class="h-3.5 w-3.5" />
            <span>English</span>
          </button>
        </div>
      </div>

      <!-- Environment & Architecture Info -->
      <div class="bubble-surface flex flex-col justify-between gap-4 rounded-2xl p-5">
        <div>
          <div class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
            <MingcuteIcon name="server" class="h-4 w-4 text-emerald-400" />
            <span>Self-Hosted Architecture</span>
          </div>
          <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
            Production-grade educational deployment specifications.
          </p>
        </div>

        <div class="divide-y divide-[var(--color-border)]/50 text-xs">
          <div class="flex justify-between py-2">
            <span class="text-[var(--color-text-tertiary)]">Platform Version</span>
            <span class="font-mono font-bold text-emerald-400">v2.0.0</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-[var(--color-text-tertiary)]">Runtime Engine</span>
            <span class="font-medium text-[var(--color-text)]">Bun & Elysia</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-[var(--color-text-tertiary)]">Sandbox Security</span>
            <span class="font-medium text-[var(--color-text)]">Restricted Docker Proxy</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-[var(--color-text-tertiary)]">AST Rules</span>
            <span class="font-medium text-[var(--color-text)]">17 Active Inspectors</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
