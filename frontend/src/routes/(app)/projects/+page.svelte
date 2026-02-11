<script lang="ts">
  import { t } from '$lib/i18n';
  import { api } from '$lib/api';
  import { projects, session } from '$lib/stores';
  import type { Project, CreateProjectPayload } from '$shared/types';
  import { SUPPORTED_DIALECTS } from '$shared/types/dialect';

  let isLoading = $state(true);
  let showCreateModal = $state(false);
  let createError = $state('');
  let isCreating = $state(false);

  let newTitle = $state('');
  let newDescription = $state('');
  let newDialect = $state<string>('postgresql');
  let projectsLoaded = $state(false);

  /* Only fetch when session is available */
  $effect(() => {
    if ($session && !projectsLoaded) {
      projectsLoaded = true;
      api.get<Project[]>('/projects').then((result) => {
        if (result.success && result.data) {
          projects.set(result.data);
        }
        isLoading = false;
      }).catch((err) => {
        console.error('[Projects] Failed to load projects:', err);
        isLoading = false;
      });
    }
  });

  async function handleCreate() {
    createError = '';
    isCreating = true;

    try {
      const payload: CreateProjectPayload = {
        title: newTitle,
        description: newDescription,
        dialect: newDialect as CreateProjectPayload['dialect'],
      };

      const result = await api.post<Project>('/projects', payload);
      if (result.success && result.data) {
        projects.update((p) => [result.data!, ...p]);
        showCreateModal = false;
        newTitle = '';
        newDescription = '';
        newDialect = 'postgresql';
      } else if (!result.success && result.error) {
        createError = result.error.message;
      }
    } finally {
      isCreating = false;
    }
  }

  async function handleDelete(projectId: string) {
    const result = await api.delete('/projects/' + projectId);
    if (result.success) {
      projects.update((p) => p.filter((proj) => proj.id !== projectId));
    }
  }
</script>

<div class="p-8">
  <!-- Header -->
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">{$t.projects.title}</h1>
      <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
        {$projects.length}/3 {$t.dashboard.totalProjects.toLowerCase()}
      </p>
    </div>
    <button
      onclick={() => { showCreateModal = true; }}
      disabled={$projects.length >= 3}
      class="rounded-lg px-5 py-2.5 text-sm font-medium text-white gradient-primary transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {$t.projects.create}
    </button>
  </div>

  {#if $projects.length >= 3}
    <div class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <p class="font-medium">{$t.projects.limitReached}</p>
      <p class="mt-1">{$t.projects.upgradePrompt}</p>
    </div>
  {/if}

  <!-- Projects Grid -->
  {#if isLoading}
    <div class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent"></div>
    </div>
  {:else if $projects.length === 0}
    <div class="py-20 text-center">
      <svg class="mx-auto mb-4 h-16 w-16 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <p class="text-lg text-[var(--color-text-secondary)]">{$t.dashboard.noProjects}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each $projects as project}
        <div class="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6 transition-all hover:border-[var(--color-primary-400)] hover:shadow-lg">
          <div class="mb-4 flex items-start justify-between">
            <span class="rounded-full bg-[var(--color-primary-500)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary-600)]">
              {project.dialect.toUpperCase()}
            </span>
            <button
              onclick={() => handleDelete(project.id)}
              class="rounded-lg p-1.5 text-[var(--color-text-tertiary)] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title={$t.projects.deleteProject}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <a href="/projects/{project.id}" class="block">
            <h3 class="text-lg font-semibold">{project.title}</h3>
            <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
              {project.description || '—'}
            </p>
          </a>

          <div class="mt-4 text-xs text-[var(--color-text-tertiary)]">
            {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Project Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
    <div class="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-2xl">
      <h2 class="mb-6 text-xl font-bold">{$t.projects.create}</h2>

      {#if createError}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {createError}
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
        <div class="space-y-4">
          <div>
            <label for="title" class="mb-1 block text-sm font-medium">{$t.projects.projectTitle}</label>
            <input
              id="title"
              type="text"
              bind:value={newTitle}
              required
              maxlength="100"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2.5 outline-none focus:border-[var(--color-primary-500)]"
            />
          </div>

          <div>
            <label for="description" class="mb-1 block text-sm font-medium">{$t.projects.projectDescription}</label>
            <textarea
              id="description"
              bind:value={newDescription}
              maxlength="500"
              rows="3"
              class="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2.5 outline-none focus:border-[var(--color-primary-500)]"
            ></textarea>
          </div>

          <div>
            <label for="dialect" class="mb-1 block text-sm font-medium">{$t.projects.projectDialect}</label>
            <select
              id="dialect"
              bind:value={newDialect}
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2.5 outline-none focus:border-[var(--color-primary-500)]"
            >
              {#each SUPPORTED_DIALECTS as dialect}
                <option value={dialect}>{$t.dialects[dialect]}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onclick={() => { showCreateModal = false; createError = ''; }}
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-tertiary)]"
          >
            {$t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={isCreating || !newTitle}
            class="rounded-lg px-4 py-2 text-sm font-medium text-white gradient-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isCreating ? $t.common.loading : $t.common.create}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
