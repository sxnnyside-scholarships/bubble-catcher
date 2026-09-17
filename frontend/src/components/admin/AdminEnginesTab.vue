<script setup lang="ts">
import type { EngineState, ServerBasedDialect } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  engines: EngineState[];
  loading: boolean;
  pendingDialect: ServerBasedDialect | null;
  errorByDialect: Record<string, string>;
}>();

const emit = defineEmits<{
  toggle: [engine: EngineState];
  refresh: [];
}>();

const { t } = useI18n();

function formatUptime(startedAt: string | null): string {
  if (!startedAt) return '';
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
</script>

<template>
  <div class="bubble-surface flex flex-col gap-4 rounded-2xl p-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
          <MingcuteIcon name="server" class="h-5 w-5 text-[var(--color-primary-500)]" />
          {{ t('admin.sandboxEngines') }}
        </h2>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{{ t('admin.sandboxEnginesHint') }}</p>
      </div>

      <button
        type="button"
        class="btn-bubble-ghost btn-bubble-sm flex items-center gap-1.5 font-semibold"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <MingcuteIcon :name="loading ? 'loading' : 'refresh'" class="h-4 w-4" :class="{ spin: loading }" />
        <span>{{ t('common.loading') }}</span>
      </button>
    </div>

    <div v-if="loading" class="py-2">
      <BubbleSkeleton variant="cards" :count="3" />
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="engine in engines"
        :key="engine.dialect"
        class="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4 transition-all hover:border-[var(--color-primary-500)]/40 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm">
              <BrandIcon :dialect="engine.dialect" size="md" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)] capitalize">{{ engine.dialect }}</h3>
              <p class="text-[0.7rem] font-mono text-[var(--color-text-secondary)]">
                Persistent Sandbox Engine
              </p>
            </div>
          </div>

          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold"
            :class="
              engine.status === 'running'
                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                : engine.status === 'starting'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]'
            "
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current" :class="{ 'animate-pulse': engine.status === 'running' }" />
            {{ engine.status === 'running' ? t('admin.engineStatusRunning') : t('admin.engineStatusStopped') }}
          </span>
        </div>

        <div v-if="errorByDialect[engine.dialect]" class="rounded-lg bg-rose-500/10 p-2 text-[0.7rem] text-rose-500 font-medium border border-rose-500/20">
          {{ errorByDialect[engine.dialect] }}
        </div>

        <div class="flex items-center justify-between border-t border-[var(--color-border)]/70 pt-3">
          <span class="text-[0.7rem] text-[var(--color-text-tertiary)] font-medium">
            <template v-if="engine.status === 'running' && engine.startedAt">
              Uptime: {{ formatUptime(engine.startedAt) }}
            </template>
            <template v-else>
              {{ t('admin.engineStatusStopped') }}
            </template>
          </span>

          <button
            type="button"
            class="btn-bubble-sm flex items-center justify-center font-semibold"
            :class="engine.status === 'running' ? 'btn-bubble-ghost text-rose-500 border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-600' : 'btn-bubble'"
            :disabled="pendingDialect === engine.dialect"
            @click="emit('toggle', engine)"
          >
            <MingcuteIcon
              v-if="pendingDialect === engine.dialect"
              name="loading"
              class="spin -ml-1 mr-1 inline h-3.5 w-3.5"
            />
            {{
              pendingDialect === engine.dialect
                ? engine.status === 'running'
                  ? t('admin.engineStopping')
                  : t('admin.engineStarting')
                : engine.status === 'running'
                  ? t('admin.engineStop')
                  : t('admin.engineStart')
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
