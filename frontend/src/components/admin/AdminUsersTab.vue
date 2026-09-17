<script setup lang="ts">
import type { UserProfile } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  users: UserProfile[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  kpis: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
}>();

const emit = defineEmits<{
  'update:searchQuery': [val: string];
  'update:statusFilter': [val: string];
  create: [];
  edit: [user: UserProfile];
  resetPassword: [user: UserProfile];
  toggleSuspend: [user: UserProfile];
  forceLogout: [user: UserProfile];
  delete: [user: UserProfile];
  approve: [user: UserProfile];
  reject: [user: UserProfile];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="bubble-surface flex flex-col gap-6 rounded-2xl p-6">
    <!-- Header with KPI Badges -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
          <MingcuteIcon name="user" class="h-5 w-5 text-[var(--color-primary-500)]" />
          {{ t('admin.usersTitle') }}
        </h2>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{{ t('admin.usersSubtitle') }}</p>
      </div>

      <button
        type="button"
        class="btn-bubble flex items-center gap-2 px-4 py-2 text-xs font-semibold shadow-md self-start sm:self-auto"
        @click="emit('create')"
      >
        <MingcuteIcon name="add" class="h-4 w-4" />
        {{ t('admin.createUser') }}
      </button>
    </div>

    <!-- KPIs Row with higher contrast -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 shadow-sm">
        <span class="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {{ t('admin.kpiTotalUsers') }}
        </span>
        <div class="mt-1 text-2xl font-extrabold text-[var(--color-text)]">{{ kpis.total }}</div>
      </div>
      <div class="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 shadow-sm">
        <span class="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          {{ t('admin.kpiActiveUsers') }}
        </span>
        <div class="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{{ kpis.active }}</div>
      </div>
      <div class="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 shadow-sm">
        <span class="text-[0.7rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          {{ t('admin.kpiPendingUsers') }}
        </span>
        <div class="mt-1 text-2xl font-extrabold text-amber-700 dark:text-amber-300">{{ kpis.pending }}</div>
      </div>
      <div class="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 shadow-sm">
        <span class="text-[0.7rem] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          {{ t('admin.kpiSuspendedUsers') }}
        </span>
        <div class="mt-1 text-2xl font-extrabold text-rose-700 dark:text-rose-300">{{ kpis.suspended }}</div>
      </div>
    </div>

    <!-- Filter & Search Controls -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-1.5 rounded-xl bg-[var(--color-surface-secondary)] p-1.5 border border-[var(--color-border)]">
        <button
          v-for="filter in (['all', 'pending_approval', 'active', 'suspended'] as const)"
          :key="filter"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
          :class="
            statusFilter === filter
              ? 'bg-[var(--color-primary-500)] text-white shadow-md'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]'
          "
          @click="emit('update:statusFilter', filter)"
        >
          {{
            filter === 'all'
              ? t('admin.filterAll')
              : filter === 'pending_approval'
                ? `${t('admin.filterPending')} (${kpis.pending})`
                : filter === 'active'
                  ? t('admin.filterActive')
                  : t('admin.filterSuspended')
          }}
        </button>
      </div>

      <div class="relative flex items-center">
        <MingcuteIcon name="search" class="absolute left-3.5 h-4 w-4 text-[var(--color-text-secondary)]" />
        <input
          :value="searchQuery"
          type="text"
          :placeholder="t('admin.searchUsersPlaceholder')"
          class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-2 pl-10 pr-3 text-xs font-medium text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary-500)] focus:ring-1 focus:ring-[var(--color-primary-500)] sm:w-72"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- High Contrast Users Table -->
    <div class="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shadow-sm">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-[var(--color-border)] bg-[var(--color-surface-tertiary)] text-[var(--color-text)]">
            <th class="px-5 py-3.5 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('admin.colName') }}</th>
            <th class="px-5 py-3.5 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('admin.colEmail') }}</th>
            <th class="px-5 py-3.5 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('admin.colRole') }}</th>
            <th class="px-5 py-3.5 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('admin.colStatus') }}</th>
            <th class="px-5 py-3.5 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('admin.colCreatedAt') }}</th>
            <th class="px-5 py-3.5 text-right font-bold uppercase tracking-wider text-[0.7rem]">{{ t('admin.colActions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]/60 bg-[var(--color-surface)]">
          <tr v-if="loading">
            <td colspan="6" class="p-6">
              <BubbleSkeleton variant="lines" :count="5" />
            </td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="6" class="p-8">
              <BubbleEmptyState
                icon="user"
                :title="t('admin.noUsersFound')"
                :description="t('admin.searchUsersPlaceholder')"
              />
            </td>
          </tr>
          <tr
            v-for="user in users"
            :key="user.id"
            class="transition-colors hover:bg-[var(--color-surface-secondary)]"
          >
            <td class="whitespace-nowrap px-5 py-3.5 font-semibold text-[var(--color-text)]">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-500)]/20 font-bold text-[var(--color-primary-500)]">
                  {{ (user.displayName || user.email).charAt(0).toUpperCase() }}
                </div>
                <span>{{ user.displayName || '—' }}</span>
              </div>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 font-medium text-[var(--color-text)]">{{ user.email }}</td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span
                class="rounded-md px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider border"
                :class="user.role === 'admin' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'"
              >
                {{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser') }}
              </span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.7rem] font-bold border"
                :class="
                  user.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : user.status === 'pending_approval'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                "
              >
                <span class="h-1.5 w-1.5 rounded-full bg-current" />
                {{
                  user.status === 'active'
                    ? t('admin.statusActive')
                    : user.status === 'pending_approval'
                      ? t('admin.statusPending')
                      : t('admin.statusSuspended')
                }}
              </span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">
              {{ new Date(user.createdAt).toLocaleDateString() }}
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 text-right">
              <!-- Pending Approval Actions -->
              <div v-if="user.status === 'pending_approval'" class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  @click="emit('approve', user)"
                >
                  {{ t('admin.approveUser') }}
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                  @click="emit('reject', user)"
                >
                  {{ t('admin.rejectUser') }}
                </button>
              </div>

              <!-- Active/Suspended Actions (Generously sized ghost buttons with rich feedback) -->
              <div v-else class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="btn-bubble-ghost !px-2.5 !py-1.5 text-xs"
                  :title="t('admin.editUser')"
                  @click="emit('edit', user)"
                >
                  <MingcuteIcon name="settings" class="h-4 w-4" />
                </button>

                <button
                  type="button"
                  class="btn-bubble-ghost !px-2.5 !py-1.5 text-xs"
                  :title="t('admin.resetPassword')"
                  @click="emit('resetPassword', user)"
                >
                  <MingcuteIcon name="key" class="h-4 w-4" />
                </button>

                <button
                  type="button"
                  class="btn-bubble-ghost !px-2.5 !py-1.5 text-xs"
                  :class="user.status === 'suspended' ? 'text-emerald-500' : 'text-amber-500'"
                  :title="user.status === 'suspended' ? t('admin.activateUser') : t('admin.suspendUser')"
                  @click="emit('toggleSuspend', user)"
                >
                  <MingcuteIcon :name="user.status === 'suspended' ? 'check' : 'close'" class="h-4 w-4" />
                </button>

                <button
                  type="button"
                  class="btn-bubble-ghost !px-2.5 !py-1.5 text-xs text-sky-500"
                  :title="t('admin.forceLogout')"
                  @click="emit('forceLogout', user)"
                >
                  <MingcuteIcon name="exit" class="h-4 w-4" />
                </button>

                <button
                  type="button"
                  class="btn-bubble-ghost !px-2.5 !py-1.5 text-xs text-rose-500 hover:border-rose-500 hover:text-rose-600"
                  :title="t('admin.deleteUser')"
                  @click="emit('delete', user)"
                >
                  <MingcuteIcon name="delete" class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
