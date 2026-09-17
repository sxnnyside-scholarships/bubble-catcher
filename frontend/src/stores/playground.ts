import { defineStore } from 'pinia';

/** Holds the currently open project's title so Breadcrumbs.vue can render it without re-fetching —
 * both PlaygroundProjectView and SandboxProjectView set this once they load the project. */
export const usePlaygroundStore = defineStore('playground', {
  state: () => ({
    currentProjectTitle: null as string | null,
  }),
});
