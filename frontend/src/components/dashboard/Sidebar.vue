<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import SxnnysideBranding from '@/components/SxnnysideBranding.vue';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';

defineProps<{ collapsed: boolean }>();
defineEmits<{ toggle: [] }>();

const { t } = useI18n();
const auth = useAuthStore();
const settings = useSettingsStore();

onMounted(() => {
  if (!settings.loaded) {
    settings.fetchPublicSettings();
  }
});

const items = computed(() => {
  const list = [
    { to: '/dashboard', name: 'workspace', icon: 'workspace' as const, label: 'nav.workspace', enabled: true },
    {
      to: '/dashboard/sandbox',
      name: 'sandbox',
      icon: 'sandbox' as const,
      label: 'nav.sandbox',
      enabled: settings.features.sandbox,
    },
    {
      to: '/dashboard/playground',
      name: 'playground',
      icon: 'playground' as const,
      label: 'nav.playground',
      enabled: settings.features.playground,
    },
    {
      to: '/dashboard/classroom',
      name: 'classroom',
      icon: 'mortarboard' as const,
      label: 'nav.classroom',
      enabled: settings.features.classroom,
    },
    {
      to: '/dashboard/competition',
      name: 'competition',
      icon: 'trophy' as const,
      label: 'nav.competition',
      enabled: settings.features.competition,
    },
    { to: '/dashboard/guides', name: 'guides', icon: 'guides' as const, label: 'nav.guides', enabled: true },
  ];
  return list.filter((item) => item.enabled);
});
</script>

<template>
  <aside
    class="bubble-surface relative ml-4 mt-4 flex flex-col rounded-2xl p-3 transition-[width] duration-300 sm:ml-6"
    :class="collapsed ? 'w-[4.5rem]' : 'w-60'"
  >
    <button
      type="button"
      class="icon-bubble icon-bubble-sm icon-bubble-floating right-3 top-3 z-10"
      :title="t('nav.toggleSidebar')"
      :aria-label="t('nav.toggleSidebar')"
      @click="$emit('toggle')"
    >
      <MingcuteIcon :name="collapsed ? 'panelOpen' : 'panelClose'" class="h-3.5 w-3.5" />
    </button>

    <nav class="mt-10 flex flex-1 flex-col gap-1">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        custom
        v-slot="{ href, navigate, isExactActive }"
      >
        <a
          :href="href"
          :title="collapsed ? t(item.label) : undefined"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            isExactActive
              ? 'bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-500)]/10 hover:text-[var(--color-text)]'
          "
          @click="navigate"
        >
          <MingcuteIcon :name="item.icon" class="h-5 w-5 flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ t(item.label) }}</span>
        </a>
      </RouterLink>

      <RouterLink v-if="auth.user?.role === 'admin'" to="/dashboard/admin" custom v-slot="{ href, navigate, isExactActive }">
        <a
          :href="href"
          :title="collapsed ? t('nav.administration') : undefined"
          class="mt-2 flex items-center gap-3 rounded-xl border-t border-[var(--color-border)] px-3 py-2.5 pt-4 text-sm font-medium transition-colors"
          :class="
            isExactActive
              ? 'bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-500)]/10 hover:text-[var(--color-text)]'
          "
          @click="navigate"
        >
          <MingcuteIcon name="admin" class="h-5 w-5 flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ t('nav.administration') }}</span>
        </a>
      </RouterLink>
    </nav>

    <div v-if="!collapsed" class="mt-4 border-t border-[var(--color-border)] pt-3">
      <SxnnysideBranding />
    </div>
  </aside>
</template>
