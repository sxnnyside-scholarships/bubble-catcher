import type { PlatformFeatures, PublicSettingsDto } from '@shared/types';
import { defineStore } from 'pinia';
import { getJson, patchJson } from '@/lib/api';

export type BubbleTheme = 'colorful' | 'light' | 'dark';

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const savedTheme =
      (typeof localStorage !== 'undefined' && (localStorage.getItem('bubble_theme') as BubbleTheme)) || 'colorful';
    const savedFontSize =
      typeof localStorage !== 'undefined' ? Number(localStorage.getItem('bubble_editor_font_size')) || 14 : 14;
    const savedConfirm =
      typeof localStorage !== 'undefined' ? localStorage.getItem('bubble_confirm_dangerous') !== 'false' : true;
    const savedFormat =
      typeof localStorage !== 'undefined' ? localStorage.getItem('bubble_format_on_run') === 'true' : false;

    return {
      theme: savedTheme as BubbleTheme,
      editorFontSize: savedFontSize,
      confirmDangerousQueries: savedConfirm,
      autoFormatOnRun: savedFormat,
      registrationMode: 'open' as PublicSettingsDto['registrationMode'],
      features: {
        sandbox: true,
        playground: true,
        classroom: true,
        competition: true,
      } as PlatformFeatures,
      loaded: false,
    };
  },

  actions: {
    setTheme(newTheme: BubbleTheme, syncBackend = true) {
      this.theme = newTheme;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bubble_theme', newTheme);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      if (syncBackend) {
        // Best effort sync with backend preferences
        try {
          const token = localStorage.getItem('bubble_access_token');
          if (token) {
            patchJson('/user/preferences', token, { preferredTheme: newTheme }).catch(() => {});
          }
        } catch {}
      }
    },

    setEditorFontSize(size: number) {
      this.editorFontSize = size;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bubble_editor_font_size', String(size));
      }
    },

    setConfirmDangerous(enabled: boolean) {
      this.confirmDangerousQueries = enabled;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bubble_confirm_dangerous', String(enabled));
      }
    },

    setAutoFormatOnRun(enabled: boolean) {
      this.autoFormatOnRun = enabled;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bubble_format_on_run', String(enabled));
      }
    },

    initTheme() {
      const savedTheme =
        (typeof localStorage !== 'undefined' && (localStorage.getItem('bubble_theme') as BubbleTheme)) ||
        this.theme ||
        'colorful';
      this.theme = savedTheme;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    },

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
