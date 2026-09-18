import { defineStore } from 'pinia';

/** Global state for the active project context. */
export const usePlaygroundStore = defineStore('playground', {
  state: () => ({
    currentProjectTitle: null as string | null,
  }),
});
