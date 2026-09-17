<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { useAuthStore } from '@/stores/auth';

defineEmits<{ 'toggle-sidebar': [] }>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

/** Accounts created before the displayName column existed have none — fall back to a name derived from the email. */
const displayName = computed(() => {
  if (auth.user?.displayName) return auth.user.displayName;
  const local = auth.user?.email.split('@')[0] ?? '';
  const words = local.replace(/[._-]+/g, ' ').trim();
  return words.replace(/\b\w/g, (char) => char.toUpperCase()) || auth.user?.email || '';
});

function closeMenu(event: MouseEvent) {
  if (menuRoot.value && !menuRoot.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', closeMenu));
onBeforeUnmount(() => document.removeEventListener('click', closeMenu));

async function handleLogout() {
  menuOpen.value = false;
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="bubble-surface relative z-30 mx-4 mt-4 flex items-center justify-between rounded-2xl px-4 py-3 sm:mx-6">
    <!-- Left zone — brand. Clicking/hovering it visually signals it drives the sidebar (toggle on click). -->
    <button type="button" class="bubble-brand" :title="t('nav.toggleSidebar')" @click="$emit('toggle-sidebar')">
      <img src="/favicon.svg" alt="Bubble Catcher" class="h-8 w-8 object-contain" />
      <span class="gradient-silver-text text-lg font-extrabold tracking-tight">{{ t('common.appName') }}</span>
    </button>

    <!-- Right zone -->
    <div class="flex items-center gap-2">
      <button type="button" class="icon-bubble" :aria-label="t('nav.notifications')">
        <MingcuteIcon name="notification" class="h-5 w-5" />
      </button>

      <div ref="menuRoot" class="relative">
        <button
          type="button"
          class="icon-bubble"
          :aria-label="t('nav.profile')"
          @click="menuOpen = !menuOpen"
        >
          <MingcuteIcon name="user" class="h-5 w-5" />
          <span
            class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary-500)] text-white transition-transform duration-200"
            :class="{ 'rotate-180': menuOpen }"
          >
            <MingcuteIcon name="chevronDown" class="h-2.5 w-2.5" />
          </span>
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="menuOpen"
            class="bubble-surface absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 overflow-hidden rounded-2xl py-1.5"
          >
            <div class="px-4 py-2.5">
              <p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ displayName }}</p>
              <p class="truncate text-xs text-[var(--color-text-tertiary)]">{{ auth.user?.email }}</p>
            </div>
            <div class="my-1 border-t border-[var(--color-border)]" />
            <RouterLink
              to="/dashboard/profile"
              class="block px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary-500)]/10 hover:text-[var(--color-text)]"
              @click="menuOpen = false"
            >
              {{ t('nav.profile') }}
            </RouterLink>
            <RouterLink
              to="/dashboard/settings"
              class="block px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary-500)]/10 hover:text-[var(--color-text)]"
              @click="menuOpen = false"
            >
              {{ t('nav.settings') }}
            </RouterLink>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/10"
              @click="handleLogout"
            >
              {{ t('nav.logout') }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
