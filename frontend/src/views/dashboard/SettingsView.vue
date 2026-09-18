<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { currentLocale, type Locale, setLocale } from '@/i18n';
import { type BubbleTheme, useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const settings = useSettingsStore();

const activeLocale = computed(() => currentLocale());

function changeLocale(loc: Locale) {
  setLocale(loc);
}

function selectTheme(theme: BubbleTheme) {
  settings.setTheme(theme);
}

const fontSizes = [
  { label: '12px', value: 12, name: 'Compact' },
  { label: '14px', value: 14, name: 'Normal' },
  { label: '16px', value: 16, name: 'Large' },
];
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-black tracking-tight text-[var(--color-text)]">
        {{ t('preferences.title') }}
      </h1>
      <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
        {{ t('preferences.subtitle') }}
      </p>
    </div>

    <!-- 1. Theme & Visual Aesthetics -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center gap-2.5">
        <MingcuteIcon name="palette" class="h-5 w-5 text-[var(--color-primary-500)]" />
        <div>
          <h2 class="text-base font-bold text-[var(--color-text)]">
            {{ t('preferences.themeTitle') }}
          </h2>
          <p class="text-xs text-[var(--color-text-secondary)]">
            {{ t('preferences.themeSubtitle') }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <!-- Theme 1: Colorful (Default Bubblemorphism) -->
        <button
          type="button"
          class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 text-left transition-all duration-200"
          :class="
            settings.theme === 'colorful'
              ? 'border-[var(--color-primary-500)] bg-[var(--color-surface-secondary)] ring-2 ring-[var(--color-primary-500)] shadow-lg shadow-purple-500/10'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary-400)]/60 hover:bg-[var(--color-surface-secondary)]/50'
          "
          @click="selectTheme('colorful')"
        >
          <!-- Preview Canvas -->
          <div class="relative mb-4 h-28 w-full overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#0f1a2e] p-3 shadow-inner">
            <div class="flex items-center justify-between">
              <div class="flex gap-1.5">
                <span class="h-2 w-2 rounded-full bg-rose-500/80" />
                <span class="h-2 w-2 rounded-full bg-amber-500/80" />
                <span class="h-2 w-2 rounded-full bg-emerald-500/80" />
              </div>
              <span class="rounded-full bg-purple-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-purple-300">
                {{ t('preferences.themeColorfulBadge') }}
              </span>
            </div>
            <div class="mt-4 flex flex-col gap-1.5">
              <div class="h-2 w-3/4 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />
              <div class="h-2 w-1/2 rounded-full bg-white/20" />
              <div class="mt-1 flex gap-1">
                <span class="h-4 w-10 rounded-full bg-pink-500/30 border border-pink-400/40" />
                <span class="h-4 w-12 rounded-full bg-purple-500/30 border border-purple-400/40" />
              </div>
            </div>
          </div>

          <!-- Card Content -->
          <div>
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-[var(--color-text)]">
                {{ t('preferences.themeColorful') }}
              </span>
              <span
                v-if="settings.theme === 'colorful'"
                class="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-white"
              >
                <MingcuteIcon name="check" class="h-3 w-3" />
              </span>
            </div>
            <p class="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {{ t('preferences.themeColorfulDesc') }}
            </p>
          </div>
        </button>

        <!-- Theme 2: Light Mode (Modo Claro) -->
        <button
          type="button"
          class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 text-left transition-all duration-200"
          :class="
            settings.theme === 'light'
              ? 'border-indigo-600 bg-white ring-2 ring-indigo-600 shadow-lg shadow-indigo-500/10'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-400/60 hover:bg-[var(--color-surface-secondary)]/50'
          "
          @click="selectTheme('light')"
        >
          <!-- Preview Canvas -->
          <div class="relative mb-4 h-28 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
            <div class="flex items-center justify-between">
              <div class="flex gap-1.5">
                <span class="h-2 w-2 rounded-full bg-slate-300" />
                <span class="h-2 w-2 rounded-full bg-slate-300" />
                <span class="h-2 w-2 rounded-full bg-slate-300" />
              </div>
              <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-bold text-indigo-700">
                {{ t('preferences.themeLightBadge') }}
              </span>
            </div>
            <div class="mt-4 flex flex-col gap-1.5">
              <div class="h-2 w-3/4 rounded-full bg-indigo-600" />
              <div class="h-2 w-1/2 rounded-full bg-slate-300" />
              <div class="mt-1 flex gap-1">
                <span class="h-4 w-10 rounded-full bg-indigo-600 text-[9px] text-white flex items-center justify-center font-bold">SQL</span>
                <span class="h-4 w-12 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>

          <!-- Card Content -->
          <div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <MingcuteIcon name="sun" class="h-4 w-4 text-amber-500" />
                <span class="font-bold text-sm text-[var(--color-text)]">
                  {{ t('preferences.themeLight') }}
                </span>
              </div>
              <span
                v-if="settings.theme === 'light'"
                class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white"
              >
                <MingcuteIcon name="check" class="h-3 w-3" />
              </span>
            </div>
            <p class="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {{ t('preferences.themeLightDesc') }}
            </p>
          </div>
        </button>

        <!-- Theme 3: Dark Mode (Modo Oscuro) -->
        <button
          type="button"
          class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 text-left transition-all duration-200"
          :class="
            settings.theme === 'dark'
              ? 'border-purple-500 bg-[#171923] ring-2 ring-purple-500 shadow-lg shadow-purple-900/30'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-purple-400/60 hover:bg-[var(--color-surface-secondary)]/50'
          "
          @click="selectTheme('dark')"
        >
          <!-- Preview Canvas -->
          <div class="relative mb-4 h-28 w-full overflow-hidden rounded-2xl border border-zinc-700/50 bg-[#0f1117] p-3 shadow-inner">
            <div class="flex items-center justify-between">
              <div class="flex gap-1.5">
                <span class="h-2 w-2 rounded-full bg-zinc-600" />
                <span class="h-2 w-2 rounded-full bg-zinc-600" />
                <span class="h-2 w-2 rounded-full bg-zinc-600" />
              </div>
              <span class="rounded-full bg-purple-950 px-2 py-0.5 text-[0.65rem] font-bold text-purple-300 border border-purple-800">
                {{ t('preferences.themeDarkBadge') }}
              </span>
            </div>
            <div class="mt-4 flex flex-col gap-1.5">
              <div class="h-2 w-3/4 rounded-full bg-purple-500" />
              <div class="h-2 w-1/2 rounded-full bg-zinc-700" />
              <div class="mt-1 flex gap-1">
                <span class="h-4 w-10 rounded-full bg-purple-900/60 border border-purple-700 text-[9px] text-purple-200 flex items-center justify-center font-bold">SQL</span>
                <span class="h-4 w-12 rounded-full bg-zinc-800 border border-zinc-700" />
              </div>
            </div>
          </div>

          <!-- Card Content -->
          <div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <MingcuteIcon name="moon" class="h-4 w-4 text-purple-400" />
                <span class="font-bold text-sm text-[var(--color-text)]">
                  {{ t('preferences.themeDark') }}
                </span>
              </div>
              <span
                v-if="settings.theme === 'dark'"
                class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white"
              >
                <MingcuteIcon name="check" class="h-3 w-3" />
              </span>
            </div>
            <p class="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {{ t('preferences.themeDarkDesc') }}
            </p>
          </div>
        </button>
      </div>
    </section>

    <!-- 2. Interface Preferences Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Language Selector -->
      <section class="bubble-surface flex flex-col justify-between gap-5 rounded-3xl p-6">
        <div>
          <div class="flex items-center gap-2">
            <MingcuteIcon name="web" class="h-5 w-5 text-[var(--color-primary-500)]" />
            <h2 class="text-base font-bold text-[var(--color-text)]">
              {{ t('preferences.languageTitle') }}
            </h2>
          </div>
          <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
            {{ t('preferences.languageSubtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex items-center justify-between rounded-2xl border p-4 text-xs font-bold transition-all"
            :class="
              activeLocale === 'es'
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/15 text-[var(--color-text)] ring-1 ring-[var(--color-primary-500)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="changeLocale('es')"
          >
            <div class="flex flex-col text-left">
              <span class="text-sm">Español</span>
              <span class="text-[0.7rem] font-normal text-[var(--color-text-tertiary)]">Spanish</span>
            </div>
            <span
              v-if="activeLocale === 'es'"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-white"
            >
              <MingcuteIcon name="check" class="h-3 w-3" />
            </span>
          </button>

          <button
            type="button"
            class="flex items-center justify-between rounded-2xl border p-4 text-xs font-bold transition-all"
            :class="
              activeLocale === 'en'
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/15 text-[var(--color-text)] ring-1 ring-[var(--color-primary-500)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="changeLocale('en')"
          >
            <div class="flex flex-col text-left">
              <span class="text-sm">English</span>
              <span class="text-[0.7rem] font-normal text-[var(--color-text-tertiary)]">Inglés</span>
            </div>
            <span
              v-if="activeLocale === 'en'"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-white"
            >
              <MingcuteIcon name="check" class="h-3 w-3" />
            </span>
          </button>
        </div>
      </section>

      <!-- SQL Editor Configuration -->
      <section class="bubble-surface flex flex-col justify-between gap-5 rounded-3xl p-6">
        <div>
          <div class="flex items-center gap-2">
            <MingcuteIcon name="code" class="h-5 w-5 text-emerald-400" />
            <h2 class="text-base font-bold text-[var(--color-text)]">
              {{ t('preferences.editorTitle') }}
            </h2>
          </div>
          <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
            {{ t('preferences.editorSubtitle') }}
          </p>
        </div>

        <div class="flex flex-col gap-4">
          <!-- Font Size Selector -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-[var(--color-text)]">{{ t('preferences.fontSizeLabel') }}</span>
              <p class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('preferences.fontSizeDesc') }}</p>
            </div>
            <div class="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-0.5">
              <button
                v-for="opt in fontSizes"
                :key="opt.value"
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
                :class="
                  settings.editorFontSize === opt.value
                    ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                "
                @click="settings.setEditorFontSize(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Confirm Dangerous Queries Toggle -->
          <div class="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/50">
            <div>
              <span class="text-xs font-semibold text-[var(--color-text)]">{{ t('preferences.confirmDangerousLabel') }}</span>
              <p class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('preferences.confirmDangerousDesc') }}</p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="settings.confirmDangerousQueries ? 'bg-[var(--color-primary-500)]' : 'bg-zinc-600'"
              @click="settings.setConfirmDangerous(!settings.confirmDangerousQueries)"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="settings.confirmDangerousQueries ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Auto Format on Run Toggle -->
          <div class="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/50">
            <div>
              <span class="text-xs font-semibold text-[var(--color-text)]">{{ t('preferences.autoFormatLabel') }}</span>
              <p class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('preferences.autoFormatDesc') }}</p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="settings.autoFormatOnRun ? 'bg-[var(--color-primary-500)]' : 'bg-zinc-600'"
              @click="settings.setAutoFormatOnRun(!settings.autoFormatOnRun)"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="settings.autoFormatOnRun ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- 3. Self-Hosted Runtime Diagnostics -->
    <section class="bubble-surface flex flex-col gap-4 rounded-3xl p-6">
      <div>
        <div class="flex items-center gap-2">
          <MingcuteIcon name="server" class="h-5 w-5 text-cyan-400" />
          <h2 class="text-base font-bold text-[var(--color-text)]">
            {{ t('preferences.diagnosticsTitle') }}
          </h2>
        </div>
        <p class="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {{ t('preferences.diagnosticsSubtitle') }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4">
          <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {{ t('preferences.platformVersion') }}
          </span>
          <p class="mt-1 font-mono text-base font-black text-emerald-400">v2.0.0</p>
          <span class="text-[0.65rem] text-[var(--color-text-tertiary)]">Self-Hosted Production</span>
        </div>

        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4">
          <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {{ t('preferences.engineRuntime') }}
          </span>
          <p class="mt-1 font-mono text-base font-bold text-[var(--color-text)]">Bun 1.4 & Elysia</p>
          <span class="text-[0.65rem] text-[var(--color-text-tertiary)]">High-throughput micro-framework</span>
        </div>

        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4">
          <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {{ t('preferences.sandboxMode') }}
          </span>
          <p class="mt-1 font-mono text-base font-bold text-cyan-400">Docker Proxy</p>
          <span class="text-[0.65rem] text-[var(--color-text-tertiary)]">Strict network & container isolation</span>
        </div>

        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4">
          <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {{ t('preferences.astRulesActive') }}
          </span>
          <p class="mt-1 font-mono text-base font-bold text-purple-400">17 Inspectors</p>
          <span class="text-[0.65rem] text-[var(--color-text-tertiary)]">Full SQL static analysis engine</span>
        </div>
      </div>
    </section>
  </div>
</template>
