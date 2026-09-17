<script setup lang="ts">
import type { EvaluateGolfResult } from '@shared/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

const props = defineProps<{
  result: EvaluateGolfResult;
}>();

const { t } = useI18n();

const parBadgeClass = computed(() => {
  switch (props.result.parStatus) {
    case 'hole_in_one':
      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400';
    case 'eagle':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'birdie':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-400';
    case 'par':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'bogey':
    default:
      return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
  }
});

const parLabel = computed(() => {
  switch (props.result.parStatus) {
    case 'hole_in_one':
      return t('competition.parHoleInOne');
    case 'eagle':
      return t('competition.parEagle');
    case 'birdie':
      return t('competition.parBirdie');
    case 'par':
      return t('competition.parPar');
    case 'bogey':
    default:
      return t('competition.parBogey');
  }
});

const bufferRatio = computed(() => {
  if (props.result.targetBuffers <= 0) return 1;
  return Math.min(2, props.result.buffersRead / props.result.targetBuffers);
});

const bufferColorClass = computed(() => {
  if (bufferRatio.value <= 0.85) return 'text-emerald-400';
  if (bufferRatio.value <= 1.1) return 'text-sky-400';
  if (bufferRatio.value <= 1.3) return 'text-amber-400';
  return 'text-rose-400';
});
</script>

<template>
  <div class="bubble-surface flex flex-col gap-4 rounded-2xl p-5">
    <!-- Top Summary Banner -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-bold shadow-inner"
          :class="parBadgeClass"
        >
          <span v-if="result.golfScore <= 0">{{ result.golfScore === 0 ? 'E' : result.golfScore }}</span>
          <span v-else>+{{ result.golfScore }}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-full border px-2.5 py-0.5 text-xs font-bold" :class="parBadgeClass">
              {{ parLabel }}
            </span>
            <span
              v-if="result.tupleMatch"
              class="flex items-center gap-1 text-xs font-semibold text-emerald-400"
            >
              <MingcuteIcon name="check" class="h-3.5 w-3.5" />
              {{ t('competition.tuplesMatched') }}
            </span>
            <span v-else class="flex items-center gap-1 text-xs font-semibold text-rose-400">
              <MingcuteIcon name="close" class="h-3.5 w-3.5" />
              {{ t('competition.tuplesMismatched') }}
            </span>
          </div>
          <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{{ result.feedback }}</p>
        </div>
      </div>

      <div v-if="result.submission" class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
        {{ t('competition.submissionSaved') }}
      </div>
    </div>

    <!-- Golf Metrics Grid -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <!-- Buffers Read -->
      <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/40 p-3">
        <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {{ t('competition.buffersRead') }}
        </span>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span class="text-xl font-extrabold" :class="bufferColorClass">
            {{ result.buffersRead }}
          </span>
          <span class="text-xs text-[var(--color-text-tertiary)]">
            / {{ t('competition.parTarget') }} {{ result.targetBuffers }}
          </span>
        </div>
      </div>

      <!-- Execution Time -->
      <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/40 p-3">
        <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {{ t('competition.executionTime') }}
        </span>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span class="text-xl font-extrabold text-[var(--color-text)]">
            {{ result.executionTimeMs.toFixed(2) }}<span class="text-xs font-normal">ms</span>
          </span>
          <span class="text-xs text-[var(--color-text-tertiary)]">
            / {{ result.targetTimeMs }}ms
          </span>
        </div>
      </div>

      <!-- Query Length (Golf Chars) -->
      <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/40 p-3">
        <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {{ t('competition.queryChars') }}
        </span>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-xl font-extrabold text-[var(--color-text)]">
            {{ result.queryLength }}
          </span>
          <span class="text-xs text-[var(--color-text-tertiary)]">chars</span>
        </div>
      </div>

      <!-- AST Health -->
      <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/40 p-3">
        <span class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {{ t('competition.astHealth') }}
        </span>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span
            class="text-xl font-extrabold"
            :class="result.astIssues.length === 0 ? 'text-emerald-400' : 'text-amber-400'"
          >
            {{ result.astIssues.length === 0 ? '0' : result.astIssues.length }}
          </span>
          <span class="text-xs text-[var(--color-text-tertiary)]">
            {{ result.astIssues.length === 0 ? t('competition.astClean') : t('competition.astIssuesCount') }}
          </span>
        </div>
      </div>
    </div>

    <!-- AST Anti-Pattern Warnings (if any) -->
    <div v-if="result.astIssues.length > 0" class="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
      <div class="flex items-center gap-1.5 font-bold text-amber-400">
        <MingcuteIcon name="alert" class="h-4 w-4" />
        <span>{{ t('competition.astWarningsTitle') }}</span>
      </div>
      <ul class="list-disc pl-5 space-y-1 text-amber-200/90">
        <li v-for="issue in result.astIssues" :key="issue.ruleId">
          <span class="font-semibold">{{ issue.ruleId }}:</span> {{ issue.message }}
        </li>
      </ul>
    </div>
  </div>
</template>
