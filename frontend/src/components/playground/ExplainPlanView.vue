<script setup lang="ts">
import type { ExplainPlanResult } from '@shared/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import ExplainNodeCard from './ExplainNodeCard.vue';

const props = defineProps<{
  plan: ExplainPlanResult | null;
  loading: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  explain: [];
}>();

const { t } = useI18n();
const viewMode = ref<'tree' | 'raw'>('tree');
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header with KPI Banner and View Mode Switch -->
    <div v-if="plan" class="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
        <div>
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('explain.executionTime') }}
          </span>
          <div class="text-sm font-extrabold text-[var(--color-text)] font-mono">
            {{ plan.executionTimeMs }} ms
          </div>
        </div>

        <div v-if="plan.planningTimeMs">
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('explain.planningTime') }}
          </span>
          <div class="text-sm font-extrabold text-[var(--color-text)] font-mono">
            {{ plan.planningTimeMs }} ms
          </div>
        </div>

        <div v-if="plan.totalCost">
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('explain.totalCost') }}
          </span>
          <div class="text-sm font-extrabold text-[var(--color-text)] font-mono">
            {{ plan.totalCost }}
          </div>
        </div>

        <div>
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('explain.rootOperation') }}
          </span>
          <div class="text-xs font-bold text-[var(--color-primary-500)] truncate">
            {{ plan.root.nodeType }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <!-- View Mode Switch -->
        <div class="flex items-center rounded-xl bg-[var(--color-surface-tertiary)] p-1 border border-[var(--color-border)] text-xs">
          <button
            type="button"
            class="rounded-lg px-3 py-1 font-semibold transition-all"
            :class="viewMode === 'tree' ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
            @click="viewMode = 'tree'"
          >
            {{ t('explain.viewTree') }}
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1 font-semibold transition-all"
            :class="viewMode === 'raw' ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
            @click="viewMode = 'raw'"
          >
            {{ t('explain.viewRaw') }}
          </button>
        </div>

        <button
          type="button"
          class="btn-bubble-ghost !p-2"
          :title="t('explain.reRun')"
          :disabled="loading"
          @click="emit('explain')"
        >
          <MingcuteIcon :name="loading ? 'loading' : 'refresh'" class="h-4 w-4" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <!-- Heatmap Legend -->
    <div v-if="plan && viewMode === 'tree'" class="flex flex-wrap items-center gap-4 text-[0.7rem] text-[var(--color-text-secondary)] px-2">
      <span class="font-bold uppercase tracking-wider">{{ t('explain.heatmapLegend') }}:</span>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-rose-500" />
        <span>&gt; 50% {{ t('explain.hotBottleneck') }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <span>20% - 50% {{ t('explain.moderateCost') }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span>&lt; 20% {{ t('explain.optimalCost') }}</span>
      </div>
    </div>

    <!-- Content State: Loading -->
    <div v-if="loading" class="py-16 text-center text-sm text-[var(--color-text-tertiary)]">
      <MingcuteIcon name="loading" class="spin inline-block h-8 w-8 text-[var(--color-primary-500)] mb-2" />
      <p>{{ t('explain.analyzingPlan') }}</p>
    </div>

    <!-- Content State: Error -->
    <div v-else-if="error" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-500 text-xs font-mono">
      <div class="flex items-center gap-2 font-bold mb-1">
        <MingcuteIcon name="alert" class="h-4 w-4" />
        <span>{{ t('explain.errorTitle') }}</span>
      </div>
      <p class="whitespace-pre-line">{{ error }}</p>
    </div>

    <!-- Content State: Empty -->
    <div v-else-if="!plan" class="py-16 text-center text-sm text-[var(--color-text-secondary)]">
      <MingcuteIcon name="chartLine" class="mx-auto mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
      <p>{{ t('explain.emptyStatePrompt') }}</p>
      <button
        type="button"
        class="btn-bubble mt-4 inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold shadow-md"
        @click="emit('explain')"
      >
        <MingcuteIcon name="play" class="h-4 w-4" />
        <span>{{ t('explain.explainButton') }}</span>
      </button>
    </div>

    <!-- Content State: Visual Tree View -->
    <div
      v-else-if="viewMode === 'tree'"
      class="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-6 min-h-[400px] flex justify-center"
    >
      <ExplainNodeCard
        :node="plan.root"
        :is-bottleneck="plan.root.id === plan.bottleneckNodeId"
        :total-time-ms="plan.executionTimeMs"
      />
    </div>

    <!-- Content State: Raw Text View -->
    <div v-else class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
      <pre class="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-tertiary)] p-4 font-mono text-xs text-[var(--color-text)] leading-relaxed"><code>{{ plan.rawOutput }}</code></pre>
    </div>
  </div>
</template>
