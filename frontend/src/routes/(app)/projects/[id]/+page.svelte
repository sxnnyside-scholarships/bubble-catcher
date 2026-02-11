<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
  import { api } from '$lib/api';
  import { activeProject, session } from '$lib/stores';
  import type { Project, AnalysisResult, ExecutionResult, ExecutionHistoryEntry } from '$shared/types';
  import MonacoEditor from '$lib/components/MonacoEditor.svelte';
  import AnalysisPanel from '$lib/components/AnalysisPanel.svelte';
  import ExecutionPanel from '$lib/components/ExecutionPanel.svelte';

  let project = $state<Project | null>(null);
  let isLoading = $state(true);
  let sqlContent = $state('');

  let analysisResult = $state<AnalysisResult | null>(null);
  let isAnalyzing = $state(false);

  let executionResult = $state<ExecutionResult | null>(null);
  let isExecuting = $state(false);

  let executionHistory = $state<ExecutionHistoryEntry[]>([]);
  let activeTab = $state<'analysis' | 'execution' | 'history'>('analysis');

  const projectId = $derived($page.params['id']);
  let dataLoaded = $state(false);

  /* Only fetch when session is available */
  $effect(() => {
    if ($session && projectId && !dataLoaded) {
      dataLoaded = true;
      api.get<Project>(`/projects/${projectId}`).then((result) => {
        if (result.success && result.data) {
          project = result.data;
          activeProject.set(result.data);
        }
        isLoading = false;
      }).catch((err) => {
        console.error('[Project] Failed to load project:', err);
        isLoading = false;
      });

      api.get<ExecutionHistoryEntry[]>(`/execution/history/${projectId}`).then((historyResult) => {
        if (historyResult.success && historyResult.data) {
          executionHistory = historyResult.data;
        }
      }).catch((err) => {
        console.error('[Project] Failed to load execution history:', err);
      });
    }
  });

  async function handleAnalyze() {
    if (!sqlContent.trim() || !project) return;
    isAnalyzing = true;
    activeTab = 'analysis';

    try {
      const result = await api.post<AnalysisResult>('/analysis/analyze', {
        sql: sqlContent,
        dialect: project.dialect,
      });
      if (result.success && result.data) {
        analysisResult = result.data;
      }
    } finally {
      isAnalyzing = false;
    }
  }

  async function handleExecute() {
    if (!sqlContent.trim() || !project) return;
    isExecuting = true;
    activeTab = 'execution';

    try {
      const result = await api.post<ExecutionResult>('/execution/run', {
        sql: sqlContent,
        dialect: project.dialect,
        projectId: project.id,
      });
      if (result.success && result.data) {
        executionResult = result.data;
      }
    } finally {
      isExecuting = false;
    }
  }

  async function handleSaveQuery() {
    if (!sqlContent.trim() || !project) return;
    const title = prompt($t.editor.queryTitle);
    if (!title) return;

    await api.post(`/projects/${project.id}/queries`, {
      title,
      sql: sqlContent,
    });
  }
</script>

{#if isLoading}
  <div class="flex h-full items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent"></div>
  </div>
{:else if project}
  <div class="flex h-full flex-col">
    <!-- Project Header -->
    <div class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
      <div class="flex items-center gap-4">
        <a href="/projects" class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 class="text-lg font-bold">{project.title}</h1>
          <span class="text-xs text-[var(--color-text-tertiary)]">
            {$t.dialects[project.dialect as keyof typeof $t.dialects]}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={handleSaveQuery}
          disabled={!sqlContent.trim()}
          class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-tertiary)] disabled:opacity-50"
        >
          {$t.editor.saveQuery}
        </button>
        <button
          onclick={handleAnalyze}
          disabled={isAnalyzing || !sqlContent.trim()}
          class="rounded-lg bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isAnalyzing ? $t.common.loading : $t.editor.analyzeQuery}
        </button>
        <button
          onclick={handleExecute}
          disabled={isExecuting || !sqlContent.trim()}
          class="rounded-lg px-4 py-2 text-sm font-medium text-white gradient-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isExecuting ? $t.execution.running : $t.editor.executeQuery}
        </button>
      </div>
    </div>

    <!-- Main Content: Editor + Results -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Editor -->
      <div class="flex-1 border-r border-[var(--color-border)]">
        <MonacoEditor
          bind:value={sqlContent}
          language="sql"
          placeholder={$t.editor.placeholder}
        />
      </div>

      <!-- Results Panel -->
      <div class="flex w-[480px] flex-col">
        <!-- Tab Bar -->
        <div class="flex border-b border-[var(--color-border)]">
          <button
            onclick={() => { activeTab = 'analysis'; }}
            class="px-4 py-3 text-sm font-medium transition-colors
              {activeTab === 'analysis'
                ? 'border-b-2 border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }"
          >
            {$t.analysis.title}
          </button>
          <button
            onclick={() => { activeTab = 'execution'; }}
            class="px-4 py-3 text-sm font-medium transition-colors
              {activeTab === 'execution'
                ? 'border-b-2 border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }"
          >
            {$t.execution.title}
          </button>
          <button
            onclick={() => { activeTab = 'history'; }}
            class="px-4 py-3 text-sm font-medium transition-colors
              {activeTab === 'history'
                ? 'border-b-2 border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }"
          >
            {$t.execution.history}
          </button>
        </div>

        <!-- Panel Content -->
        <div class="flex-1 overflow-auto p-4">
          {#if activeTab === 'analysis'}
            <AnalysisPanel result={analysisResult} {isAnalyzing} />
          {:else if activeTab === 'execution'}
            <ExecutionPanel result={executionResult} {isExecuting} />
          {:else}
            <!-- History -->
            {#if executionHistory.length === 0}
              <p class="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                {$t.execution.noResults}
              </p>
            {:else}
              <div class="space-y-3">
                {#each executionHistory as entry}
                  <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
                    <div class="mb-2 flex items-center justify-between">
                      <span class="rounded px-2 py-0.5 text-xs font-medium
                        {entry.status === 'success' ? 'bg-green-100 text-green-700' : ''}
                        {entry.status === 'error' ? 'bg-red-100 text-red-700' : ''}
                        {entry.status === 'timeout' ? 'bg-amber-100 text-amber-700' : ''}
                        {entry.status === 'killed' ? 'bg-gray-100 text-gray-700' : ''}
                      ">
                        {entry.status.toUpperCase()}
                      </span>
                      <span class="text-xs text-[var(--color-text-tertiary)]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <pre class="overflow-x-auto text-xs text-[var(--color-text-secondary)]">{entry.sql.slice(0, 200)}{entry.sql.length > 200 ? '...' : ''}</pre>
                    {#if entry.resultSummary}
                      <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">{entry.resultSummary}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
