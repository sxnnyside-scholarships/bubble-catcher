<script lang="ts">
  import { t } from '$lib/i18n';
  import { api } from '$lib/api';
  import { projects, userProfile, session } from '$lib/stores';
  import type { Project } from '$shared/types';

  interface TelemetrySummary {
    totalAnalysis: number;
    totalExecution: number;
    avgExecutionTime: number;
    dialectUsage: Record<string, number>;
    successRate: number;
  }

  let isLoading = $state(true);
  let dashboardLoaded = $state(false);
  let telemetry = $state<TelemetrySummary | null>(null);

  /* Only fetch once when session is available */
  $effect(() => {
    if ($session && !dashboardLoaded) {
      dashboardLoaded = true;

      Promise.all([
        api.get<Project[]>('/projects'),
        api.get<TelemetrySummary>('/telemetry/summary'),
      ]).then(([projResult, telResult]) => {
        if (projResult.success && projResult.data) {
          projects.set(projResult.data);
        }
        if (telResult.success && telResult.data) {
          telemetry = telResult.data;
        }
        isLoading = false;
      }).catch((err) => {
        console.error('[Dashboard] Failed to load data:', err);
        isLoading = false;
      });
    }
  });

  const dialectColors: Record<string, string> = {
    mysql: 'bg-blue-500',
    mariadb: 'bg-sky-500',
    postgresql: 'bg-indigo-500',
    sqlite: 'bg-emerald-500',
    mssql: 'bg-red-500',
    oracle: 'bg-amber-500',
  };

  const totalDialectUsage = $derived(
    telemetry?.dialectUsage
      ? Object.values(telemetry.dialectUsage).reduce((a, b) => a + b, 0)
      : 0
  );
</script>

<div class="p-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold">{$t.dashboard.title}</h1>
    <p class="mt-1 text-[var(--color-text-secondary)]">
      {$t.dashboard.welcome}{$userProfile ? `, ${$userProfile.email}` : ''}
    </p>
  </div>

  <!-- Stats Cards -->
  <div class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
    <!-- Total Projects -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-[var(--color-text-secondary)]">{$t.dashboard.totalProjects}</p>
          <p class="mt-1 text-3xl font-bold gradient-primary-text">{$projects.length}</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-500)]/10">
          <svg class="h-6 w-6 text-[var(--color-primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Queries Analyzed -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-[var(--color-text-secondary)]">{$t.dashboard.totalQueries}</p>
          <p class="mt-1 text-3xl font-bold text-[var(--color-accent-500)]">
            {telemetry?.totalAnalysis ?? '—'}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-500)]/10">
          <svg class="h-6 w-6 text-[var(--color-accent-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Executions -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-[var(--color-text-secondary)]">{$t.dashboard.totalExecutions}</p>
          <p class="mt-1 text-3xl font-bold text-[var(--color-pink-500)]">
            {telemetry?.totalExecution ?? '—'}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-pink-500)]/10">
          <svg class="h-6 w-6 text-[var(--color-pink-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Avg Execution Time -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-[var(--color-text-secondary)]">{$t.dashboard.avgExecutionTime}</p>
          <p class="mt-1 text-3xl font-bold text-[var(--color-primary-400)]">
            {telemetry?.avgExecutionTime != null ? `${telemetry.avgExecutionTime}ms` : '—'}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-400)]/10">
          <svg class="h-6 w-6 text-[var(--color-primary-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Success Rate -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-[var(--color-text-secondary)]">{$t.dashboard.successRate}</p>
          <p class="mt-1 text-3xl font-bold text-emerald-500">
            {telemetry?.successRate != null ? `${telemetry.successRate}%` : '—'}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
          <svg class="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- Dialect Usage -->
  {#if telemetry && Object.keys(telemetry.dialectUsage).length > 0}
    <div class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 class="mb-4 text-lg font-semibold">{$t.dashboard.dialectUsage}</h2>
      <div class="space-y-3">
        {#each Object.entries(telemetry.dialectUsage).sort((a, b) => b[1] - a[1]) as [dialect, count]}
          {@const pct = totalDialectUsage > 0 ? Math.round((count / totalDialectUsage) * 100) : 0}
          <div>
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="font-medium">{dialect.toUpperCase()}</span>
              <span class="text-[var(--color-text-secondary)]">{count} ({pct}%)</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-tertiary)]">
              <div
                class="h-full rounded-full transition-all {dialectColors[dialect] ?? 'bg-gray-500'}"
                style="width: {pct}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Recent Projects -->
  <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
    <div class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
      <h2 class="text-lg font-semibold">{$t.dashboard.recentProjects}</h2>
      <a
        href="/projects"
        class="rounded-lg px-4 py-2 text-sm font-medium text-white gradient-primary transition-opacity hover:opacity-90"
      >
        {$t.dashboard.newProject}
      </a>
    </div>

    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent"></div>
      </div>
    {:else if $projects.length === 0}
      <div class="py-12 text-center text-[var(--color-text-secondary)]">
        <svg class="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p>{$t.dashboard.noProjects}</p>
      </div>
    {:else}
      <div class="divide-y divide-[var(--color-border)]">
        {#each $projects.slice(0, 5) as project}
          <a
            href="/projects/{project.id}"
            class="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--color-surface-tertiary)]"
          >
            <div>
              <h3 class="font-medium">{project.title}</h3>
              <p class="mt-0.5 text-sm text-[var(--color-text-secondary)]">{project.description || '—'}</p>
            </div>
            <span class="rounded-full bg-[var(--color-primary-500)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary-600)]">
              {project.dialect.toUpperCase()}
            </span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
