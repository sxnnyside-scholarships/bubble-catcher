<script lang="ts">
  import { t } from '$lib/i18n';
  import type { ExecutionResult } from '$shared/types';

  let {
    result,
    isExecuting,
  }: {
    result: ExecutionResult | null;
    isExecuting: boolean;
  } = $props();

  /** Safely extract columns — never crash on malformed data */
  function safeColumns(r: ExecutionResult | null): string[] {
    if (!r || !Array.isArray(r.columns)) return [];
    return r.columns;
  }

  /** Safely extract rows — never crash on malformed data */
  function safeRows(r: ExecutionResult | null): unknown[][] {
    if (!r || !Array.isArray(r.rows)) return [];
    return r.rows;
  }

  function formatDuration(ms: number | undefined): string {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
</script>

{#if isExecuting}
  <div class="flex items-center justify-center py-12">
    <div class="flex items-center gap-3">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent"></div>
      <span class="text-sm text-[var(--color-text-secondary)]">{$t.execution.running}</span>
    </div>
  </div>
{:else if !result}
  <div class="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
    {$t.execution.title}
  </div>
{:else}
  <div class="space-y-4">
    <!-- Status Banner -->
    {#if result.status === 'success'}
      <div class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
        <div class="flex items-center gap-2">
          <span class="text-green-600">✅</span>
          <span class="text-sm font-medium text-green-700 dark:text-green-400">{$t.execution.success}</span>
        </div>
        <div class="mt-1 flex gap-4 text-xs text-green-600 dark:text-green-500">
          <span>{result.rowCount ?? 0} {$t.execution.rows}</span>
          <span>{safeColumns(result).length} {$t.execution.columns}</span>
          <span>{$t.execution.executionTime}: {formatDuration(result.executionTimeMs)}</span>
        </div>
      </div>
    {:else if result.status === 'error'}
      <div class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
        <div class="flex items-center gap-2">
          <span class="text-red-600">❌</span>
          <span class="text-sm font-medium text-red-700 dark:text-red-400">{$t.execution.error}</span>
        </div>
        {#if result.error}
          <pre class="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900 dark:text-red-300">{result.error.message}</pre>
          {#if result.error.code}
            <p class="mt-1 text-xs text-red-500">Code: {result.error.code}</p>
          {/if}
        {/if}
        <p class="mt-1 text-xs text-red-500">{$t.execution.executionTime}: {formatDuration(result.executionTimeMs)}</p>
      </div>
    {:else if result.status === 'timeout'}
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
        <div class="flex items-center gap-2">
          <span class="text-amber-600">⏱</span>
          <span class="text-sm font-medium text-amber-700 dark:text-amber-400">{$t.execution.timeout}</span>
        </div>
        {#if result.error}
          <p class="mt-1 text-xs text-amber-600 dark:text-amber-500">{result.error.message}</p>
        {/if}
        <p class="mt-1 text-xs text-amber-500">{$t.execution.executionTime}: {formatDuration(result.executionTimeMs)}</p>
      </div>
    {:else if result.status === 'killed'}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-center gap-2">
          <span class="text-gray-500">🛑</span>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-400">{$t.execution.killed}</span>
        </div>
        {#if result.error}
          <p class="mt-1 text-xs text-gray-500">{result.error.message}</p>
        {/if}
        <p class="mt-1 text-xs text-gray-400">{$t.execution.executionTime}: {formatDuration(result.executionTimeMs)}</p>
      </div>
    {/if}

    <!-- Results Table -->
    {#if result.status === 'success' && safeRows(result).length > 0}
      <div class="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-[var(--color-border)] bg-[var(--color-surface-tertiary)]">
                {#each safeColumns(result) as col}
                  <th class="whitespace-nowrap px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {col}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each safeRows(result) as row, i}
                <tr class="border-b border-[var(--color-border)] last:border-0 {i % 2 === 1 ? 'bg-[var(--color-surface-secondary)]' : ''}">
                  {#each safeColumns(result) as _, colIdx}
                    <td class="whitespace-nowrap px-4 py-2 text-xs font-mono">
                      {row[colIdx] ?? 'NULL'}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else if result.status === 'success' && safeRows(result).length === 0}
      <p class="py-4 text-center text-sm text-[var(--color-text-secondary)]">{$t.execution.noResults}</p>
    {/if}
  </div>
{/if}
