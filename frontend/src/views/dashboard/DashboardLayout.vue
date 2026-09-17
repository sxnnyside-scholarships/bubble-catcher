<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Breadcrumbs from '@/components/dashboard/Breadcrumbs.vue';
import Sidebar from '@/components/dashboard/Sidebar.vue';
import TopBar from '@/components/dashboard/TopBar.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const sidebarCollapsed = ref(false);

onMounted(() => {
  if (!auth.user) auth.fetchProfile();
});
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <TopBar @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />

    <div class="flex flex-1 gap-0 overflow-hidden">
      <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <Breadcrumbs />
        <RouterView />
      </main>
    </div>
  </div>
</template>
