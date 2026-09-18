<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';

defineEmits<{ 'toggle-sidebar': [] }>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const notificationsStore = useNotificationsStore();

const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);
const notificationsOpen = ref(false);
const notificationsRoot = ref<HTMLElement | null>(null);

/** User display name with fallback to email handle. */
const displayName = computed(() => {
  if (auth.user?.displayName) return auth.user.displayName;
  const local = auth.user?.email.split('@')[0] ?? '';
  const words = local.replace(/[._-]+/g, ' ').trim();
  return words.replace(/\b\w/g, (char) => char.toUpperCase()) || auth.user?.email || '';
});

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return t('notifications.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getNotificationIcon(type: string, target?: string): string {
  if (type === 'engine_started') return 'server';
  if (type === 'engine_stopped') return 'power';
  if (type === 'mode_enabled' || type === 'mode_disabled') {
    if (target === 'classroom') return 'mortarboard';
    if (target === 'competition') return 'trophy';
    return 'rocket';
  }
  return 'notification';
}

function getNotificationBadgeStyle(type: string): string {
  if (type === 'engine_started') return 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';
  if (type === 'engine_stopped') return 'text-rose-500 bg-rose-500/15 border-rose-500/30';
  if (type === 'mode_enabled')
    return 'text-[var(--color-primary-500)] bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/30';
  if (type === 'mode_disabled') return 'text-amber-500 bg-amber-500/15 border-amber-500/30';
  return 'text-[var(--color-accent-500)] bg-[var(--color-accent-500)]/15 border-[var(--color-accent-500)]/30';
}

function closeMenu(event: MouseEvent) {
  if (menuRoot.value && !menuRoot.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
  if (notificationsRoot.value && !notificationsRoot.value.contains(event.target as Node)) {
    notificationsOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenu);
  notificationsStore.fetchNotifications();
});

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
      <!-- Notifications Popover Root -->
      <div ref="notificationsRoot" class="relative">
        <button
          type="button"
          class="icon-bubble relative"
          :aria-label="t('nav.notifications')"
          @click="notificationsOpen = !notificationsOpen"
        >
          <MingcuteIcon name="notification" class="h-5 w-5" />
          <span
            v-if="notificationsStore.unreadCount > 0"
            class="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.62rem] font-black text-white shadow-md ring-2 ring-[var(--color-surface)]"
          >
            {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
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
            v-if="notificationsOpen"
            class="bubble-surface absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 sm:w-96 overflow-hidden rounded-2xl border border-[var(--color-border)] p-4 shadow-2xl"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div class="flex items-center gap-2">
                <MingcuteIcon name="notification" class="h-4 w-4 text-[var(--color-primary-500)]" />
                <span class="text-sm font-bold text-[var(--color-text)]">{{ t('notifications.title') }}</span>
                <span
                  v-if="notificationsStore.unreadCount > 0"
                  class="rounded-full bg-[var(--color-primary-500)]/15 px-2 py-0.5 text-[0.65rem] font-extrabold text-[var(--color-primary-500)]"
                >
                  {{ t('notifications.newBadge', { count: notificationsStore.unreadCount }) }}
                </span>
              </div>
              <button
                v-if="notificationsStore.unreadCount > 0"
                type="button"
                class="text-xs font-semibold text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-400)] hover:underline"
                @click="notificationsStore.markAllAsRead"
              >
                {{ t('notifications.markAllRead') }}
              </button>
            </div>

            <!-- List -->
            <div class="flex max-h-80 flex-col gap-2 overflow-y-auto py-2.5">
              <div
                v-for="item in notificationsStore.items"
                :key="item.id"
                class="flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-all"
                :class="
                  item.read
                    ? 'border-transparent bg-transparent opacity-75 hover:bg-[var(--color-surface-secondary)]/50'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] shadow-sm hover:border-[var(--color-primary-500)]/40'
                "
                @click="notificationsStore.markAsRead(item.id)"
              >
                <div
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border"
                  :class="getNotificationBadgeStyle(item.type)"
                >
                  <MingcuteIcon :name="getNotificationIcon(item.type, item.target)" class="h-4 w-4" />
                </div>
                <div class="flex min-w-0 flex-1 flex-col">
                  <div class="flex items-center justify-between gap-1">
                    <span class="truncate text-xs font-bold text-[var(--color-text)]">
                      {{ item.title }}
                    </span>
                    <span class="flex-shrink-0 font-mono text-[0.65rem] text-[var(--color-text-tertiary)]">
                      {{ formatRelativeTime(item.timestamp) }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-[0.72rem] leading-snug text-[var(--color-text-secondary)]">
                    {{ item.message }}
                  </p>
                </div>
                <span
                  v-if="!item.read"
                  class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-primary-500)] animate-pulse shadow-sm"
                />
              </div>

              <!-- Empty state -->
              <div v-if="notificationsStore.items.length === 0" class="flex flex-col items-center justify-center py-6 text-center">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
                  <MingcuteIcon name="notification" class="h-5 w-5" />
                </div>
                <p class="mt-2 text-xs font-bold text-[var(--color-text)]">{{ t('notifications.empty') }}</p>
                <p class="mt-0.5 max-w-[200px] text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('notifications.emptySubtitle') }}</p>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="notificationsStore.items.length > 0" class="border-t border-[var(--color-border)] pt-2 text-right">
              <button
                type="button"
                class="text-[0.7rem] font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
                @click="notificationsStore.clearAll"
              >
                {{ t('notifications.clearAll') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Profile Menu -->
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
            class="bubble-surface absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 overflow-hidden rounded-2xl py-1.5 shadow-2xl border border-[var(--color-border)]"
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

