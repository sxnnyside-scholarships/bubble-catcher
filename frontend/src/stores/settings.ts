import type { PlatformFeatures, PublicSettingsDto } from '@shared/types';
import { defineStore } from 'pinia';
import { getJson } from '@/lib/api';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    registrationMode: 'open' as PublicSettingsDto['registrationMode'],
    features: {
      sandbox: true,
      playground: true,
      classroom: true,
      competition: true,
    } as PlatformFeatures,
    loaded: false,
  }),

  actions: {
    async fetchPublicSettings() {
      const result = await getJson<PublicSettingsDto>('/settings/public');
      if (result.success) {
        this.registrationMode = result.data.registrationMode;
        this.features = result.data.enabledFeatures;
        this.loaded = true;
      }
    },
    updateFeatures(features: PlatformFeatures) {
      this.features = features;
    },
  },
});
