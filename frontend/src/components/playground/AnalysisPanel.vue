<script setup lang="ts">
import type { AnalysisIssue, AnalysisSeverity } from '@shared/types';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  issues: AnalysisIssue[];
  analyzing: boolean;
  analyzed: boolean;
}>();

const emit = defineEmits<{ 'insert-rewrite': [text: string] }>();

const { t } = useI18n();

const SEVERITY_STYLE: Record<AnalysisSeverity, { icon: 'failCircle' | 'alert' | 'info'; color: string; tile: string }> =
  {
    critical: { icon: 'failCircle', color: 'var(--color-error)', tile: 'tile-error' },
    error: { icon: 'failCircle', color: 'var(--color-error)', tile: 'tile-error' },
    warning: { icon: 'alert', color: 'var(--color-warning)', tile: 'tile-warning' },
    info: { icon: 'info', color: 'var(--color-accent-500)', tile: '' },
  };
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="analyzing" class="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
      {{ t('common.loading') }}
    </p>

    <ul v-else-if="issues.length" class="flex flex-col gap-3">
      <li
        v-for="(issue, i) in issues"
        :key="i"
        class="rounded-xl border border-[var(--color-border)] p-3 text-xs"
        :class="SEVERITY_STYLE[issue.severity].tile"
      >
        <div class="flex items-center gap-1.5 font-semibold" :style="{ color: SEVERITY_STYLE[issue.severity].color }">
          <MingcuteIcon :name="SEVERITY_STYLE[issue.severity].icon" class="h-3.5 w-3.5 flex-shrink-0" />
          {{ issue.message }}
          <span class="ml-auto text-[0.65rem] font-normal uppercase text-[var(--color-text-tertiary)]">{{ issue.severity }}</span>
        </div>
        <p class="mt-1.5 text-[var(--color-text-secondary)]">{{ issue.explanation }}</p>

        <div v-if="issue.suggestedRewrite" class="mt-2">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[0.65rem] font-semibold uppercase text-[var(--color-text-tertiary)]">{{ t('playground.suggestedRewrite') }}</span>
            <button
              type="button"
              class="flex items-center gap-1 rounded bg-[var(--color-primary-500)]/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-500)]/25"
              @click="emit('insert-rewrite', issue.suggestedRewrite!)"
            >
              <MingcuteIcon name="externalLink" class="h-3 w-3" />
              {{ t('playground.useFix') }}
            </button>
          </div>
          <pre class="overflow-x-auto whitespace-pre-wrap rounded bg-black/20 p-2 font-mono text-[0.7rem] text-[var(--color-text-secondary)]">{{ issue.suggestedRewrite }}</pre>
        </div>
      </li>
    </ul>

    <p v-else-if="analyzed" class="flex items-center gap-1.5 rounded-xl p-3 text-xs text-[var(--color-success)] tile-success">
      <MingcuteIcon name="successCircle" class="h-3.5 w-3.5" />
      {{ t('playground.noIssues') }}
    </p>

    <p v-else class="text-xs text-[var(--color-text-tertiary)]">{{ t('playground.analysisIdle') }}</p>
  </div>
</template>
