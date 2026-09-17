<script setup lang="ts">
import type { ExecutionResult, SupportedDialect } from '@shared/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  result: ExecutionResult | null;
  running: boolean;
  dialect?: SupportedDialect;
}>();

const { t } = useI18n();
const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'admin');
const isOffline = computed(() => props.result?.error?.code === 'SANDBOX_OFFLINE');

const STATUS_STYLE = {
  success: {
    icon: 'successCircle',
    color: 'var(--color-success)',
    tile: 'tile-success',
    label: 'playground.statusSuccess',
  },
  error: { icon: 'failCircle', color: 'var(--color-error)', tile: 'tile-error', label: 'playground.statusError' },
  timeout: { icon: 'alert', color: 'var(--color-warning)', tile: 'tile-warning', label: 'playground.statusTimeout' },
  killed: { icon: 'dangerSkull', color: '#b91c1c', tile: 'tile-dangerous', label: 'playground.statusKilled' },
} as const;

const status = computed(() => (props.result ? STATUS_STYLE[props.result.status] : null));

function formatDuration(ms: number | undefined): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="running" class="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
      {{ t('playground.running') }}
    </p>

    <template v-else-if="result && status">
      <div class="rounded-xl border border-[var(--color-border)] p-3 text-xs" :class="status.tile">
        <div class="flex items-center gap-1.5 font-semibold" :style="{ color: status.color }">
          <MingcuteIcon :name="status.icon" class="h-3.5 w-3.5 flex-shrink-0" />
          {{ t(status.label) }}
        </div>
        <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[var(--color-text-tertiary)]">
          <span v-if="result.status === 'success'">{{ result.rowCount ?? 0 }} {{ t('playground.rowsReturned') }}</span>
          <span>{{ t('playground.executionTime') }}: {{ formatDuration(result.executionTimeMs) }}</span>
        </div>
        <pre
          v-if="result.error"
          class="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-black/20 p-2 font-mono text-[0.7rem] text-[var(--color-text-secondary)]"
          >{{ result.error.message }}</pre
        >

        <div
          v-if="isOffline"
          class="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200"
        >
          <div class="flex items-center gap-2">
            <MingcuteIcon name="server" class="h-4 w-4 flex-shrink-0 text-amber-400" />
            <span>{{ t('playground.engineOffline') }}</span>
          </div>
          <RouterLink
            v-if="isAdmin"
            to="/dashboard/admin"
            class="btn-bubble btn-bubble-sm inline-flex items-center gap-1.5 whitespace-nowrap !py-1 !px-2.5 text-xs font-medium"
          >
            <MingcuteIcon name="power" class="h-3.5 w-3.5" />
            {{ t('playground.goToAdmin') }}
          </RouterLink>
        </div>
      </div>

      <div v-if="result.status === 'success' && result.columns?.length" class="overflow-hidden overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
              <th v-for="col in result.columns" :key="col" class="whitespace-nowrap px-3 py-2 font-semibold">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in result.rows"
              :key="i"
              class="border-b border-[var(--color-border)]/50 last:border-0"
              :class="i % 2 === 1 ? 'bg-[var(--color-surface-secondary)]/40' : ''"
            >
              <td v-for="(cell, j) in row" :key="j" class="whitespace-nowrap px-3 py-2 font-mono text-[var(--color-text-secondary)]">
                {{ cell === null ? 'NULL' : String(cell) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="result.status === 'success'" class="text-xs text-[var(--color-text-secondary)]">{{ t('playground.noResultsYet') }}</p>
    </template>

    <p v-else class="text-xs text-[var(--color-text-tertiary)]">{{ t('playground.queryEmptyState') }}</p>
  </div>
</template>
