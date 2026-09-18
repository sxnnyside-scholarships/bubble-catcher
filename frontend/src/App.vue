<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import { useSettingsStore } from '@/stores/settings';

/** Display standalone locale switcher only outside dashboard layout. */
const route = useRoute();
const settings = useSettingsStore();

onMounted(() => {
  settings.initTheme();
});

const showFloatingSwitcher = computed(() => !route.path.startsWith('/dashboard'));
</script>

<template>
  <div :data-theme="settings.theme" class="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-200">
    <div v-if="showFloatingSwitcher" class="fixed right-4 top-4 z-50">
      <LocaleSwitcher />
    </div>
    <RouterView />
  </div>
</template>
