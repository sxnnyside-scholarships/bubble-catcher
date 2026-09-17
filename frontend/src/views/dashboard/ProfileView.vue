<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const displayName = computed(() => {
  if (auth.user?.displayName) return auth.user.displayName;
  const local = auth.user?.email.split('@')[0] ?? '';
  const words = local.replace(/[._-]+/g, ' ').trim();
  return words.replace(/\b\w/g, (char) => char.toUpperCase()) || auth.user?.email || '';
});

const userInitial = computed(() => {
  return (displayName.value || auth.user?.email || 'U').charAt(0).toUpperCase();
});

const formattedDate = computed(() => {
  if (!auth.user?.createdAt) return '—';
  try {
    return new Date(auth.user.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return auth.user.createdAt;
  }
});

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-6 p-6">
    <!-- Header Card -->
    <div class="bubble-surface flex flex-wrap items-center justify-between gap-6 rounded-3xl p-6 shadow-sm">
      <div class="flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-500)]/20 text-2xl font-extrabold text-[var(--color-primary-500)] border border-[var(--color-primary-500)]/30 shadow-inner">
          {{ userInitial }}
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-xl font-bold text-[var(--color-text)]">{{ displayName }}</h1>
            <span
              class="rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
              :class="auth.user?.role === 'admin' ? 'border-purple-500/30 bg-purple-500/15 text-purple-400' : 'border-blue-500/30 bg-blue-500/15 text-blue-400'"
            >
              {{ auth.user?.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser') }}
            </span>
          </div>
          <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">{{ auth.user?.email }}</p>
        </div>
      </div>

      <button
        type="button"
        class="btn-bubble-ghost btn-bubble-sm flex items-center gap-1.5 font-semibold text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
        @click="handleLogout"
      >
        <MingcuteIcon name="logout" class="h-4 w-4" />
        <span>{{ t('nav.logout') }}</span>
      </button>
    </div>

    <!-- Details Bento -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Account Info -->
      <div class="bubble-surface flex flex-col gap-4 rounded-2xl p-5">
        <div class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
          <MingcuteIcon name="user" class="h-4 w-4 text-[var(--color-primary-500)]" />
          <span>{{ t('nav.profile') }}</span>
        </div>

        <div class="divide-y divide-[var(--color-border)]/50 text-xs">
          <div class="flex justify-between py-2.5">
            <span class="text-[var(--color-text-tertiary)]">{{ t('admin.userName') }}</span>
            <span class="font-medium text-[var(--color-text)]">{{ displayName }}</span>
          </div>
          <div class="flex justify-between py-2.5">
            <span class="text-[var(--color-text-tertiary)]">{{ t('admin.userEmail') }}</span>
            <span class="font-mono text-[var(--color-text)]">{{ auth.user?.email }}</span>
          </div>
          <div class="flex justify-between py-2.5">
            <span class="text-[var(--color-text-tertiary)]">{{ t('admin.userRole') }}</span>
            <span class="font-medium capitalize text-[var(--color-text)]">{{ auth.user?.role }}</span>
          </div>
          <div class="flex justify-between py-2.5">
            <span class="text-[var(--color-text-tertiary)]">{{ t('admin.colCreatedAt') }}</span>
            <span class="text-[var(--color-text-secondary)]">{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Security & Permissions -->
      <div class="bubble-surface flex flex-col gap-4 rounded-2xl p-5">
        <div class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
          <MingcuteIcon name="shield" class="h-4 w-4 text-emerald-400" />
          <span>{{ t('admin.tabSettings') }}</span>
        </div>

        <div class="flex flex-col gap-3 text-xs">
          <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
            <div class="flex items-center gap-2 font-bold text-emerald-400">
              <MingcuteIcon name="check" class="h-4 w-4" />
              <span>{{ t('admin.statusActive') }}</span>
            </div>
            <p class="mt-1 text-[0.7rem] text-[var(--color-text-secondary)]">
              JWT session active. High-entropy token authenticated.
            </p>
          </div>

          <div v-if="auth.user?.role === 'admin'" class="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3.5">
            <div class="flex items-center gap-2 font-bold text-purple-400">
              <MingcuteIcon name="admin" class="h-4 w-4" />
              <span>{{ t('admin.roleAdmin') }}</span>
            </div>
            <p class="mt-1 text-[0.7rem] text-[var(--color-text-secondary)]">
              Full administrative privileges enabled (Engines, Users, SMTP, Modes).
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
