<script lang="ts">
  import { t } from '$lib/i18n';
  import type { SavedQuery } from '$shared/types';

  let {
    queries,
    onInsert,
    onShowAll,
  }: {
    queries: SavedQuery[];
    onInsert: (sql: string) => void;
    onShowAll: () => void;
  } = $props();

  let hoveredId = $state<string | null>(null);
</script>

{#if queries.length > 0}
  <div class="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2">
    <span class="shrink-0 text-xs font-medium text-[var(--color-text-tertiary)]">
      {$t.editor.recentQueries}:
    </span>
    <div class="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-thin">
      {#each queries as query (query.id)}
        <div class="relative">
          <button
            class="shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]"
            onclick={() => onInsert(query.sql)}
            onmouseenter={() => { hoveredId = query.id; }}
            onmouseleave={() => { hoveredId = null; }}
            title={query.sql.slice(0, 120)}
          >
            {query.title}
          </button>
          {#if hoveredId === query.id}
            <div class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg">
              <pre class="overflow-x-auto whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{query.sql.slice(0, 200)}{query.sql.length > 200 ? '…' : ''}</pre>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <button
      onclick={onShowAll}
      class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-primary-600)] transition-colors hover:bg-[var(--color-surface-tertiary)]"
    >
      {$t.editor.viewAll}
    </button>
  </div>
{/if}
