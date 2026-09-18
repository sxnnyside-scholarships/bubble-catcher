<script setup lang="ts">
import type { TelemetrySummary, WorkspaceSummary } from '@shared/types';
import { computed, onMounted, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import EmptyState from '@/components/dashboard/EmptyState.vue';
import RadialKpi from '@/components/dashboard/RadialKpi.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { getJson } from '@/lib/api';
import { CHART_COLORS, DIALECT_COLORS } from '@/lib/charts';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const workspace = ref<WorkspaceSummary | null>(null);
const summary = ref<TelemetrySummary | null>(null);
const loading = ref(true);

onMounted(async () => {
  if (!auth.accessToken) return;
  const [workspaceResult, summaryResult] = await Promise.all([
    getJson<WorkspaceSummary>('/telemetry/workspace', auth.accessToken),
    getJson<TelemetrySummary>('/telemetry/summary', auth.accessToken),
  ]);
  if (workspaceResult.success) workspace.value = workspaceResult.data;
  if (summaryResult.success) summary.value = summaryResult.data;
  loading.value = false;
});

const health = computed(
  () => workspace.value?.health ?? { successfulPct: 0, failedPct: 0, dangerousPct: 0, improvablePct: 0, totalRuns: 0 },
);

/** Dialect usage breakdown sorted by query frequency. */
const dialectEntries = computed(() => Object.entries(summary.value?.dialectUsage ?? {}).sort(([, a], [, b]) => b - a));
const hasDialectData = computed(() => dialectEntries.value.length > 0);
const dialectTotal = computed(() => dialectEntries.value.reduce((sum, [, count]) => sum + count, 0));
function dialectPct(count: number) {
  return dialectTotal.value > 0 ? Math.round((count / dialectTotal.value) * 100) : 0;
}

const trendPoints = computed(() => workspace.value?.trend ?? []);
const hasTrendData = computed(() => trendPoints.value.some((point) => point.count > 0));

const trendChartData = computed(() => ({
  labels: trendPoints.value.map((point) =>
    new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' }),
  ),
  datasets: [
    {
      label: t('workspace.usageTrend'),
      data: trendPoints.value.map((point) => point.count),
      borderColor: CHART_COLORS.primary,
      backgroundColor: 'rgba(139, 92, 246, 0.18)',
      pointBackgroundColor: CHART_COLORS.primary,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.4,
      fill: true,
    },
  ],
}));

const trendChartOptions = {
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: CHART_COLORS.textSecondary }, grid: { display: false } },
    y: { ticks: { color: CHART_COLORS.textSecondary, precision: 0 }, grid: { color: CHART_COLORS.border } },
  },
};
</script>

<template>
  <!-- Skeleton — mirrors the final bento shape so nothing jumps around once data lands -->
  <div v-if="loading" class="workspace-bento">
    <div class="skeleton area-hero" />
    <div class="skeleton area-improvable" />
    <div class="skeleton area-failed" />
    <div class="skeleton area-dangerous" />
    <div class="skeleton area-engines" />
    <div class="skeleton area-actions" />
    <div class="skeleton area-stat1" />
    <div class="skeleton area-stat2" />
    <div class="skeleton area-trend" />
  </div>

  <div v-else class="workspace-bento">
    <!-- Hero KPI — Successful -->
    <div class="bubble-surface tile-success area-hero flex flex-col items-center justify-center gap-2 rounded-2xl p-6">
      <RadialKpi
        size="lg"
        :label="t('workspace.kpiSuccessful')"
        :value="health.successfulPct"
        :color="CHART_COLORS.success"
        icon="successCircle"
      />
      <p class="text-xs text-[var(--color-text-tertiary)]">{{ t('workspace.kpiSuccessfulHint') }}</p>
    </div>

    <!-- Improvable -->
    <div class="bubble-surface tile-warning area-improvable flex flex-col items-center justify-center gap-1 rounded-2xl p-4">
      <RadialKpi :label="t('workspace.kpiImprovable')" :value="health.improvablePct" :color="CHART_COLORS.warning" icon="trendUp" />
      <p class="text-[0.65rem] text-[var(--color-text-tertiary)]">{{ t('workspace.kpiImprovableHint') }}</p>
    </div>

    <!-- Failed -->
    <div class="bubble-surface tile-error area-failed flex flex-col items-center justify-center gap-1 rounded-2xl p-4">
      <RadialKpi :label="t('workspace.kpiFailed')" :value="health.failedPct" :color="CHART_COLORS.error" icon="failCircle" />
      <p class="text-[0.65rem] text-[var(--color-text-tertiary)]">{{ t('workspace.kpiFailedHint') }}</p>
    </div>

    <!-- Dangerous — tall, alarm-tinted -->
    <div class="bubble-surface tile-dangerous area-dangerous flex flex-col items-center justify-center gap-2 rounded-2xl p-4">
      <RadialKpi size="lg" :label="t('workspace.kpiDangerous')" :value="health.dangerousPct" :color="CHART_COLORS.dangerous" icon="dangerSkull" />
      <p class="text-xs text-[var(--color-text-tertiary)]">{{ t('workspace.kpiDangerousHint') }}</p>
    </div>

    <!-- SQL engines usage -->
    <div class="bubble-surface area-engines rounded-2xl p-5">
      <h2 class="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <MingcuteIcon name="server" class="h-4 w-4 text-[var(--color-primary-500)]" />
        {{ t('workspace.sqlEngines') }}
      </h2>
      <div v-if="hasDialectData" class="flex flex-col gap-3">
        <div v-for="[dialect, count] in dialectEntries" :key="dialect" class="flex items-center gap-3">
          <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
            <BrandIcon :dialect="dialect" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex items-center justify-between text-xs">
              <span class="truncate font-medium capitalize text-[var(--color-text)]">{{ dialect }}</span>
              <span class="flex-shrink-0 text-[var(--color-text-tertiary)]">{{ count }} · {{ dialectPct(count) }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
              <div
                class="h-full rounded-full transition-[width] duration-500"
                :style="{ width: `${dialectPct(count)}%`, background: DIALECT_COLORS[dialect] ?? CHART_COLORS.textSecondary }"
              />
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else :message="t('workspace.noData')" />
    </div>

    <!-- Quick actions -->
    <div class="bubble-surface area-actions flex flex-col gap-3 rounded-2xl p-5">
      <h2 class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <MingcuteIcon name="rocket" class="h-4 w-4 text-[var(--color-primary-500)]" />
        {{ t('workspace.quickActions') }}
      </h2>
      <RouterLink to="/dashboard/sandbox" class="btn-bubble flex w-full items-center justify-center gap-2 text-sm">
        <MingcuteIcon name="sandbox" class="h-4 w-4" />
        {{ t('workspace.actionSandbox') }}
      </RouterLink>
      <RouterLink to="/dashboard/playground" class="btn-bubble flex w-full items-center justify-center gap-2 text-sm">
        <MingcuteIcon name="playground" class="h-4 w-4" />
        {{ t('workspace.actionPlayground') }}
      </RouterLink>
      <RouterLink to="/dashboard/guides" class="btn-bubble-ghost btn-bubble-ghost--lg flex w-full items-center justify-center gap-2 text-sm">
        <MingcuteIcon name="guides" class="h-4 w-4" />
        {{ t('workspace.actionGuides') }}
      </RouterLink>
    </div>

    <!-- Stat mini-cards -->
    <div class="bubble-surface area-stat1 flex items-center gap-3 rounded-2xl p-5">
      <div
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-primary-500)]"
        style="background: color-mix(in srgb, var(--color-primary-500) 14%, transparent)"
      >
        <MingcuteIcon name="flash" class="h-5 w-5" />
      </div>
      <div class="flex flex-col">
        <span class="text-2xl font-extrabold leading-none text-[var(--color-text)]">{{ health.totalRuns }}</span>
        <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ t('workspace.totalRuns') }}</span>
      </div>
    </div>
    <div class="bubble-surface area-stat2 flex items-center gap-3 rounded-2xl p-5">
      <div
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-accent-500)]"
        style="background: color-mix(in srgb, var(--color-accent-500) 14%, transparent)"
      >
        <MingcuteIcon name="clock" class="h-5 w-5" />
      </div>
      <div class="flex flex-col">
        <span class="text-2xl font-extrabold leading-none text-[var(--color-text)]">{{ summary?.avgExecutionTime ?? 0 }}ms</span>
        <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ t('workspace.avgExecutionTime') }}</span>
      </div>
    </div>

    <!-- Usage trend -->
    <div class="bubble-surface area-trend rounded-2xl p-5">
      <h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <MingcuteIcon name="chartLine" class="h-4 w-4 text-[var(--color-primary-500)]" />
        {{ t('workspace.usageTrend') }}
      </h2>
      <div v-if="hasTrendData" class="h-40">
        <Line :data="trendChartData" :options="trendChartOptions" />
      </div>
      <EmptyState v-else :message="t('workspace.noData')" />
    </div>
  </div>
</template>

<style scoped>
.workspace-bento {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.workspace-bento > * {
  min-height: 8rem;
}

@media (min-width: 1024px) {
  .workspace-bento {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, minmax(7.5rem, auto)) minmax(11rem, auto);
    grid-template-areas:
      'hero hero improvable dangerous'
      'hero hero failed dangerous'
      'engines engines actions stat1'
      'engines engines actions stat2'
      'trend trend trend trend';
  }

  .area-hero {
    grid-area: hero;
  }
  .area-improvable {
    grid-area: improvable;
  }
  .area-failed {
    grid-area: failed;
  }
  .area-dangerous {
    grid-area: dangerous;
  }
  .area-engines {
    grid-area: engines;
  }
  .area-actions {
    grid-area: actions;
  }
  .area-stat1 {
    grid-area: stat1;
  }
  .area-stat2 {
    grid-area: stat2;
  }
  .area-trend {
    grid-area: trend;
  }
}
</style>
