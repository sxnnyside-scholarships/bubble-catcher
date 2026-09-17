<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';

/** The dashboard shell has its own topbar — the floating switcher is only needed outside it (e.g. the login screen). */
const route = useRoute();
const showFloatingSwitcher = computed(() => !route.path.startsWith('/dashboard'));
</script>

<template>
  <div data-theme="colorful" class="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
    <div v-if="showFloatingSwitcher" class="fixed right-4 top-4 z-50">
      <LocaleSwitcher />
    </div>
    <RouterView />
  </div>
</template>
