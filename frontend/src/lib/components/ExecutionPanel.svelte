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
      <div class="rounded-lg border border-green-200 bg-green-50 p-3">
        <div class="flex items-center gap-2">
          <span class="text-green-600">✅</span>
          <span class="text-sm font-medium text-green-700">{$t.execution.success}</span>
        </div>
        {#if result.data}
          <div class="mt-1 flex gap-4 text-xs text-green-600">
            <span>{result.data.rowCount} {$t.execution.rows}</span>
            <span>{result.data.columns.length} {$t.execution.columns}</span>
            <span>{$t.execution.executionTime}: {result.data.executionTimeMs}ms</span>
          </div>
        {/if}
      </div>
    {:else if result.status === 'error'}
      <div class="rounded-lg border border-red-200 bg-red-50 p-3">
        <div class="flex items-center gap-2">
          <span class="text-red-600">❌</span>
          <span class="text-sm font-medium text-red-700">{$t.execution.error}</span>
        </div>
        {#if result.error}
          <pre class="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-800">{result.error}</pre>
        {/if}
      </div>
    {:else if result.status === 'timeout'}
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div class="flex items-center gap-2">
          <span class="text-amber-600">⏱</span>
          <span class="text-sm font-medium text-amber-700">{$t.execution.timeout}</span>
        </div>
        {#if result.error}
          <p class="mt-1 text-xs text-amber-600">{result.error}</p>
        {/if}
      </div>
    {/if}

    <!-- Results Table -->
    {#if result.data && result.data.rows.length > 0}
      <div class="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-[var(--color-border)] bg-[var(--color-surface-tertiary)]">
                {#each result.data.columns as col}
                  <th class="whitespace-nowrap px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {col.name}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each result.data.rows as row, i}
                <tr class="border-b border-[var(--color-border)] last:border-0 {i % 2 === 1 ? 'bg-[var(--color-surface-secondary)]' : ''}">
                  {#each result.data.columns as col}
                    <td class="whitespace-nowrap px-4 py-2 text-xs font-mono">
                      {row[col.name] ?? 'NULL'}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else if result.data && result.data.rows.length === 0}
      <p class="py-4 text-center text-sm text-[var(--color-text-secondary)]">{$t.execution.noResults}</p>
    {/if}
  </div>
{/if}
