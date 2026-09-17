<script setup lang="ts">
import type { ExecutionHistoryEntry } from '@shared/types';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{ entries: ExecutionHistoryEntry[]; loading: boolean }>();

const { t } = useI18n();

const STATUS_STYLE = {
  success: { icon: 'successCircle', color: 'var(--color-success)' },
  error: { icon: 'failCircle', color: 'var(--color-error)' },
  timeout: { icon: 'alert', color: 'var(--color-warning)' },
  killed: { icon: 'dangerSkull', color: '#b91c1c' },
} as const;
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="loading" class="text-xs text-[var(--color-text-tertiary)]">{{ t('common.loading') }}</p>

    <p v-else-if="!entries.length" class="text-xs text-[var(--color-text-tertiary)]">{{ t('playground.noHistory') }}</p>

    <div
      v-for="entry in entries"
      v-else
      :key="entry.id"
      class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-3 text-xs"
    >
      <div class="mb-1.5 flex items-center justify-between">
        <span class="flex items-center gap-1.5 font-semibold" :style="{ color: STATUS_STYLE[entry.status].color }">
          <MingcuteIcon :name="STATUS_STYLE[entry.status].icon" class="h-3.5 w-3.5" />
          {{ entry.status.toUpperCase() }}
        </span>
        <span class="text-[var(--color-text-tertiary)]">{{ new Date(entry.createdAt).toLocaleString() }}</span>
      </div>
      <pre class="overflow-x-auto whitespace-pre-wrap font-mono text-[var(--color-text-secondary)]">{{
        entry.sql.slice(0, 200)
      }}{{ entry.sql.length > 200 ? '…' : '' }}</pre>
      <p v-if="entry.resultSummary" class="mt-1 text-[var(--color-text-tertiary)]">{{ entry.resultSummary }}</p>
    </div>
  </div>
</template>
