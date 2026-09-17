<script lang="ts">
  import { t } from '$lib/i18n';
  import type { SavedQuery } from '$shared/types';

  let {
    queries,
    open,
    onInsert,
    onClose,
  }: {
    queries: SavedQuery[];
    open: boolean;
    onInsert: (sql: string) => void;
    onClose: () => void;
  } = $props();

  let search = $state('');

  const filtered = $derived(
    search.trim()
      ? queries.filter(
          (q) =>
            q.title.toLowerCase().includes(search.toLowerCase()) ||
            q.sql.toLowerCase().includes(search.toLowerCase()),
        )
      : queries,
  );

  function handleSelect(query: SavedQuery) {
    onInsert(query.sql);
    onClose();
  }
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
    onclick={onClose}
  >
    <!-- Modal -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Search -->
      <div class="border-b border-[var(--color-border)] p-4">
        <input
          type="text"
          bind:value={search}
          placeholder={$t.editor.searchQueries}
          class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
        />
      </div>

      <!-- Results -->
      <div class="max-h-80 overflow-y-auto">
        {#if filtered.length === 0}
          <p class="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            {$t.projects.noQueries}
          </p>
        {:else}
          {#each filtered as query (query.id)}
            <button
              class="flex w-full flex-col gap-1 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--color-surface-secondary)]"
              onclick={() => handleSelect(query)}
            >
              <span class="text-sm font-medium text-[var(--color-text)]">{query.title}</span>
              <pre class="overflow-x-auto whitespace-pre-wrap text-xs text-[var(--color-text-tertiary)]">{query.sql.slice(0, 150)}{query.sql.length > 150 ? '…' : ''}</pre>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t border-[var(--color-border)] px-4 py-3 text-right">
        <button
          onclick={onClose}
          class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)]"
        >
          {$t.common.close}
        </button>
      </div>
    </div>
  </div>
{/if}
