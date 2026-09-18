<script setup lang="ts">
import type { TelemetrySummary, WorkspaceSummary } from '@shared/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import BrandIcon from '@/components/BrandIcon.vue';
import BubbleErrorState from '@/components/common/BubbleErrorState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { currentLocale } from '@/i18n';
import { getJson, patchJson } from '@/lib/api';
import { DIALECT_COLORS } from '@/lib/charts';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const error = ref<string | null>(null);

const workspace = ref<WorkspaceSummary | null>(null);
const summary = ref<TelemetrySummary | null>(null);

// Password change modal state
const showPasswordModal = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const passwordLoading = ref(false);
const passwordError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);

// Copy feedback
const copiedId = ref(false);

async function loadData() {
  if (!auth.accessToken) return;
  loading.value = true;
  error.value = null;

  try {
    const [wsRes, sumRes] = await Promise.all([
      getJson<WorkspaceSummary>('/telemetry/workspace', auth.accessToken),
      getJson<TelemetrySummary>('/telemetry/summary', auth.accessToken),
    ]);

    if (wsRes.success) workspace.value = wsRes.data;
    if (sumRes.success) summary.value = sumRes.data;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to load profile metrics';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

const displayName = computed(() => {
  if (auth.user?.displayName) return auth.user.displayName;
  const local = auth.user?.email.split('@')[0] ?? '';
  const words = local.replace(/[._-]+/g, ' ').trim();
  return words.replace(/\b\w/g, (char) => char.toUpperCase()) || auth.user?.email || 'Learner';
});

const userInitial = computed(() => {
  return (displayName.value || auth.user?.email || 'U').charAt(0).toUpperCase();
});

/** Format registration date localized to active language. */
const formattedDate = computed(() => {
  if (!auth.user?.createdAt) return '—';
  try {
    const localeCode = currentLocale() === 'es' ? 'es-ES' : 'en-US';
    return new Date(auth.user.createdAt).toLocaleDateString(localeCode, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return auth.user.createdAt;
  }
});

const health = computed(
  () => workspace.value?.health ?? { successfulPct: 0, failedPct: 0, dangerousPct: 0, improvablePct: 0, totalRuns: 0 },
);

const dialectEntries = computed(() => Object.entries(summary.value?.dialectUsage ?? {}).sort(([, a], [, b]) => b - a));
const dialectTotal = computed(() => dialectEntries.value.reduce((sum, [, count]) => sum + count, 0));

function dialectPct(count: number) {
  return dialectTotal.value > 0 ? Math.round((count / dialectTotal.value) * 100) : 0;
}

const trendPoints = computed(() => workspace.value?.trend ?? []);
const maxTrendCount = computed(() => Math.max(1, ...trendPoints.value.map((p) => p.count)));

function copyUserId() {
  if (!auth.user?.id) return;
  navigator.clipboard.writeText(auth.user.id);
  copiedId.value = true;
  setTimeout(() => {
    copiedId.value = false;
  }, 2000);
}

// Password rules live checks
const isLengthValid = computed(() => newPassword.value.length >= 8);
const isMatchValid = computed(() => newPassword.value.length > 0 && newPassword.value === confirmPassword.value);
const canSubmitPassword = computed(() => isLengthValid.value && isMatchValid.value && currentPassword.value.length > 0);

function openPasswordModal() {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  showCurrentPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
  passwordError.value = null;
  showPasswordModal.value = true;
}

function closePasswordModal() {
  showPasswordModal.value = false;
  passwordError.value = null;
}

function triggerToast(msg: string) {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = null;
  }, 3500);
}

async function handlePasswordChange() {
  passwordError.value = null;

  if (!currentPassword.value) {
    passwordError.value = 'Please enter your current password.';
    return;
  }
  if (!isLengthValid.value) {
    passwordError.value = t('profile.ruleMinLength');
    return;
  }
  if (!isMatchValid.value) {
    passwordError.value = t('profile.passwordMismatch');
    return;
  }

  if (!auth.accessToken) return;
  passwordLoading.value = true;
  try {
    const res = await patchJson<{ changed: boolean }>('/user/password', auth.accessToken, {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    if (res.success) {
      closePasswordModal();
      triggerToast(t('profile.passwordSuccess'));
    } else {
      passwordError.value = res.error?.message || 'Failed to change password.';
    }
  } catch {
    passwordError.value = 'Network error while updating password.';
  } finally {
    passwordLoading.value = false;
  }
}

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Feedback Toast -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white shadow-xl"
      >
        <MingcuteIcon name="check" class="h-4 w-4" />
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="flex flex-col gap-6">
      <BubbleSkeleton variant="lines" :count="2" />
      <BubbleSkeleton variant="metrics" :count="4" />
      <BubbleSkeleton variant="cards" :count="2" />
    </div>

    <!-- Error State -->
    <BubbleErrorState
      v-else-if="error"
      title="Unable to load profile telemetry"
      :message="error"
      @retry="loadData"
    />

    <template v-else>
      <!-- Hero Header Profile Card -->
      <section class="bubble-surface relative flex flex-wrap items-center justify-between gap-6 rounded-3xl p-6 shadow-sm">
        <div class="flex flex-wrap items-center gap-5 sm:gap-6">
          <!-- Avatar with Gradient Ring -->
          <div class="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary-500)]/30 to-[var(--color-accent-500)]/20 text-3xl font-black text-[var(--color-primary-500)] border border-[var(--color-primary-500)]/40 shadow-inner">
            {{ userInitial }}
            <span
              class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-emerald-500 text-white"
              title="Active Account"
            >
              <MingcuteIcon name="check" class="h-3 w-3" />
            </span>
          </div>

          <!-- User Info Details -->
          <div class="flex flex-col">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-black tracking-tight text-[var(--color-text)]">
                {{ displayName }}
              </h1>

              <!-- Role Badge -->
              <span
                class="rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider shadow-sm"
                :class="
                  auth.user?.role === 'admin'
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-400'
                    : 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                "
              >
                {{ auth.user?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleUser') }}
              </span>

              <!-- Status Badge -->
              <span
                class="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                :class="
                  auth.user?.emailVerified
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                "
              >
                {{ auth.user?.emailVerified ? t('profile.verifiedBadge') : t('profile.unverifiedBadge') }}
              </span>
            </div>

            <!-- Email, Localized Date & ID -->
            <div class="mt-1 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
              <span class="font-mono text-[var(--color-text)]">{{ auth.user?.email }}</span>
              <span>•</span>
              <span>Member since {{ formattedDate }}</span>
              <span>•</span>
              <!-- Copyable ID -->
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[0.7rem] font-mono transition-colors hover:bg-[var(--color-surface-secondary)]"
                @click="copyUserId"
              >
                <MingcuteIcon :name="copiedId ? 'check' : 'copy'" class="h-3 w-3 text-[var(--color-primary-500)]" />
                <span>{{ copiedId ? 'Copied ID' : 'ID: ' + auth.user?.id.slice(0, 8) + '...' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Logout Action -->
        <button
          type="button"
          class="btn-bubble-ghost btn-bubble-sm flex items-center gap-2 font-semibold text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
          @click="handleLogout"
        >
          <MingcuteIcon name="logout" class="h-4 w-4" />
          <span>{{ t('nav.logout') }}</span>
        </button>
      </section>

      <!-- Telemetry & Performance KPI Bento -->
      <section class="flex flex-col gap-4">
        <div>
          <h2 class="text-base font-bold text-[var(--color-text)]">
            {{ t('profile.metricsTitle') }}
          </h2>
          <p class="text-xs text-[var(--color-text-secondary)]">
            {{ t('profile.metricsSubtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <!-- Total Executions -->
          <div class="bubble-surface flex flex-col justify-between rounded-2xl p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--color-text-secondary)]">
                {{ t('profile.totalQueries') }}
              </span>
              <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <MingcuteIcon name="play" class="h-4 w-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="font-mono text-2xl font-black text-[var(--color-text)]">
                {{ summary?.totalExecution ?? 0 }}
              </span>
              <span class="ml-1 text-xs text-[var(--color-text-tertiary)]">runs</span>
            </div>
          </div>

          <!-- AST Analyses -->
          <div class="bubble-surface flex flex-col justify-between rounded-2xl p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--color-text-secondary)]">
                {{ t('profile.totalAnalyses') }}
              </span>
              <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <MingcuteIcon name="code" class="h-4 w-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="font-mono text-2xl font-black text-[var(--color-text)]">
                {{ summary?.totalAnalysis ?? 0 }}
              </span>
              <span class="ml-1 text-xs text-[var(--color-text-tertiary)]">scanned</span>
            </div>
          </div>

          <!-- Success Rate -->
          <div class="bubble-surface flex flex-col justify-between rounded-2xl p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--color-text-secondary)]">
                {{ t('profile.successRate') }}
              </span>
              <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <MingcuteIcon name="check" class="h-4 w-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="font-mono text-2xl font-black text-emerald-400">
                {{ summary?.successRate ? Math.round(summary.successRate) : 100 }}%
              </span>
              <span class="ml-1 text-xs text-[var(--color-text-tertiary)]">passed</span>
            </div>
          </div>

          <!-- Average Execution Time -->
          <div class="bubble-surface flex flex-col justify-between rounded-2xl p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--color-text-secondary)]">
                {{ t('profile.avgExecutionTime') }}
              </span>
              <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <MingcuteIcon name="clock" class="h-4 w-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="font-mono text-2xl font-black text-[var(--color-text)]">
                {{ summary?.avgExecutionTime ? summary.avgExecutionTime.toFixed(1) : '0.0' }}
              </span>
              <span class="ml-1 text-xs text-[var(--color-text-tertiary)]">ms</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Execution Quality & AST Safety Breakdown -->
      <section class="bubble-surface flex flex-col gap-4 rounded-3xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-[var(--color-text)]">
              {{ t('profile.healthBreakdown') }}
            </h2>
            <p class="text-xs text-[var(--color-text-secondary)]">
              AST rule adherence and runtime guard statistics.
            </p>
          </div>
          <span class="font-mono text-xs font-bold text-[var(--color-text-tertiary)]">
            {{ health.totalRuns }} total runs evaluated
          </span>
        </div>

        <!-- Multi-segment visual bar -->
        <div class="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/50">
          <div
            class="bg-emerald-500 transition-all duration-500"
            :style="{ width: `${health.successfulPct}%` }"
            :title="`Optimal: ${health.successfulPct}%`"
          />
          <div
            class="bg-purple-500 transition-all duration-500"
            :style="{ width: `${health.improvablePct}%` }"
            :title="`Improvable: ${health.improvablePct}%`"
          />
          <div
            class="bg-amber-500 transition-all duration-500"
            :style="{ width: `${health.dangerousPct}%` }"
            :title="`Dangerous: ${health.dangerousPct}%`"
          />
          <div
            class="bg-rose-500 transition-all duration-500"
            :style="{ width: `${health.failedPct}%` }"
            :title="`Failed: ${health.failedPct}%`"
          />
        </div>

        <!-- 4 Sub-metrics indicators -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-emerald-500" />
            <div class="flex flex-col">
              <span class="font-bold text-[var(--color-text)]">{{ health.successfulPct }}%</span>
              <span class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('profile.cleanRuns') }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-purple-500" />
            <div class="flex flex-col">
              <span class="font-bold text-[var(--color-text)]">{{ health.improvablePct }}%</span>
              <span class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('profile.improvableRuns') }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-amber-500" />
            <div class="flex flex-col">
              <span class="font-bold text-[var(--color-text)]">{{ health.dangerousPct }}%</span>
              <span class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('profile.guardedRuns') }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-rose-500" />
            <div class="flex flex-col">
              <span class="font-bold text-[var(--color-text)]">{{ health.failedPct }}%</span>
              <span class="text-[0.7rem] text-[var(--color-text-tertiary)]">{{ t('profile.failedRuns') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Two Column: Engine Distribution & 7-Day Activity -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Engine Distribution -->
        <section class="bubble-surface flex flex-col justify-between gap-4 rounded-3xl p-6">
          <div>
            <div class="flex items-center gap-2">
              <MingcuteIcon name="server" class="h-5 w-5 text-indigo-400" />
              <h2 class="text-base font-bold text-[var(--color-text)]">
                {{ t('profile.engineBreakdown') }}
              </h2>
            </div>
            <p class="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Sandbox execution counts across database engines.
            </p>
          </div>

          <div v-if="dialectEntries.length === 0" class="py-8 text-center text-xs text-[var(--color-text-tertiary)]">
            No queries executed yet. Run queries in Sandbox or Playground to see engine distribution.
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="[dialect, count] in dialectEntries"
              :key="dialect"
              class="flex flex-col gap-1.5"
            >
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <div class="h-4 w-4">
                    <BrandIcon :dialect="dialect" />
                  </div>
                  <span class="font-semibold capitalize text-[var(--color-text)]">{{ dialect }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-[var(--color-text-secondary)]">{{ count }} queries</span>
                  <span class="font-mono font-bold text-[var(--color-text)]">{{ dialectPct(count) }}%</span>
                </div>
              </div>
              <!-- Progress Bar -->
              <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${dialectPct(count)}%`,
                    backgroundColor: DIALECT_COLORS[dialect] || 'var(--color-primary-500)',
                  }"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- 7-Day Activity Sparkline -->
        <section class="bubble-surface flex flex-col justify-between gap-4 rounded-3xl p-6">
          <div>
            <div class="flex items-center gap-2">
              <MingcuteIcon name="pulse" class="h-5 w-5 text-emerald-400" />
              <h2 class="text-base font-bold text-[var(--color-text)]">
                {{ t('profile.recentActivity') }}
              </h2>
            </div>
            <p class="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Execution frequency over the past 7 days.
            </p>
          </div>

          <div v-if="trendPoints.length === 0" class="py-8 text-center text-xs text-[var(--color-text-tertiary)]">
            No activity trend data available.
          </div>

          <div v-else class="flex h-36 items-end justify-between gap-2 pt-6">
            <div
              v-for="point in trendPoints"
              :key="point.date"
              class="group flex flex-1 flex-col items-center gap-2"
            >
              <span class="opacity-0 transition-opacity group-hover:opacity-100 font-mono text-[0.65rem] font-bold text-[var(--color-text)]">
                {{ point.count }}
              </span>
              <div class="flex h-24 w-full items-end justify-center rounded-xl bg-[var(--color-surface-secondary)] p-1">
                <div
                  class="w-full rounded-lg bg-gradient-to-t from-[var(--color-primary-500)] to-cyan-400 transition-all duration-300 group-hover:brightness-125"
                  :style="{
                    height: point.count > 0 ? `${Math.max(12, Math.round((point.count / maxTrendCount) * 100))}%` : '4px',
                    opacity: point.count > 0 ? 1 : 0.25,
                  }"
                />
              </div>
              <span class="text-[0.65rem] font-medium text-[var(--color-text-tertiary)]">
                {{ new Date(`${point.date}T00:00:00Z`).toLocaleDateString(currentLocale() === 'es' ? 'es-ES' : 'en-US', { weekday: 'narrow' }) }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- Security & Password Management Card (Clean UX without technical jargon) -->
      <section class="bubble-surface flex flex-col gap-6 rounded-3xl p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <MingcuteIcon name="shield" class="h-5 w-5 text-emerald-400" />
              <h2 class="text-base font-bold text-[var(--color-text)]">
                {{ t('profile.securityTitle') }}
              </h2>
            </div>
            <p class="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {{ t('profile.securitySubtitle') }}
            </p>
          </div>

          <!-- Open Password Modal Action -->
          <button
            type="button"
            class="btn-bubble btn-bubble-sm flex items-center gap-2 font-bold"
            @click="openPasswordModal"
          >
            <MingcuteIcon name="key" class="h-4 w-4" />
            <span>{{ t('profile.changePasswordButton') }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Password Row -->
          <div class="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-4">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-[var(--color-text)]">Password</span>
              <span class="font-mono text-sm tracking-widest text-[var(--color-text-tertiary)]">••••••••••••</span>
              <span class="text-[0.65rem] text-[var(--color-text-tertiary)] mt-0.5">{{ t('profile.securityLastUpdated') }}</span>
            </div>
            <span class="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-emerald-400">
              <MingcuteIcon name="check" class="h-3 w-3" />
              {{ t('profile.securityStatusProtected') }}
            </span>
          </div>

          <!-- Session Status Row -->
          <div class="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-4">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-[var(--color-text)]">{{ t('profile.sessionStatus') }}</span>
              <span class="text-xs text-[var(--color-text-secondary)] mt-0.5">{{ t('profile.sessionDetails') }}</span>
            </div>
            <span class="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-emerald-400">
              <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </section>

      <!-- Password Change Dialog / Modal (Top UX with Show/Hide & Live Validation) -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showPasswordModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          @click.self="closePasswordModal"
        >
          <div class="bubble-surface flex w-full max-w-md flex-col rounded-3xl p-6 shadow-2xl border border-[var(--color-border)]">
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)]">
                  <MingcuteIcon name="key" class="h-5 w-5" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-[var(--color-text)]">
                    {{ t('profile.passwordModalTitle') }}
                  </h3>
                  <p class="text-[0.7rem] text-[var(--color-text-secondary)]">
                    {{ t('profile.passwordModalSubtitle') }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="icon-bubble icon-bubble-sm"
                @click="closePasswordModal"
              >
                <MingcuteIcon name="close" class="h-4 w-4" />
              </button>
            </div>

            <!-- Modal Form -->
            <form class="mt-4 flex flex-col gap-4" @submit.prevent="handlePasswordChange">
              <!-- Error Alert -->
              <div
                v-if="passwordError"
                class="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs font-medium text-rose-400"
              >
                {{ passwordError }}
              </div>

              <!-- Current Password -->
              <div>
                <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  {{ t('profile.currentPasswordLabel') }}
                </label>
                <div class="relative">
                  <input
                    v-model="currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    required
                    class="bubble-input w-full rounded-xl pr-10 p-2.5 text-xs font-mono"
                    :placeholder="t('profile.currentPasswordPlaceholder')"
                  />
                  <button
                    type="button"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
                    tabindex="-1"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <MingcuteIcon :name="showCurrentPassword ? 'eyeClose' : 'eye'" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- New Password -->
              <div>
                <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  {{ t('profile.newPasswordLabel') }}
                </label>
                <div class="relative">
                  <input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    required
                    minlength="8"
                    class="bubble-input w-full rounded-xl pr-10 p-2.5 text-xs font-mono"
                    :placeholder="t('profile.newPasswordPlaceholder')"
                  />
                  <button
                    type="button"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
                    tabindex="-1"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <MingcuteIcon :name="showNewPassword ? 'eyeClose' : 'eye'" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Confirm Password -->
              <div>
                <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  {{ t('profile.confirmPasswordLabel') }}
                </label>
                <div class="relative">
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    required
                    class="bubble-input w-full rounded-xl pr-10 p-2.5 text-xs font-mono"
                    :placeholder="t('profile.confirmPasswordPlaceholder')"
                  />
                  <button
                    type="button"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
                    tabindex="-1"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <MingcuteIcon :name="showConfirmPassword ? 'eyeClose' : 'eye'" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Live Validation Checklist -->
              <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-3 text-xs space-y-1.5">
                <div class="flex items-center gap-2" :class="isLengthValid ? 'text-emerald-400 font-semibold' : 'text-[var(--color-text-tertiary)]'">
                  <MingcuteIcon :name="isLengthValid ? 'check' : 'close'" class="h-3.5 w-3.5" />
                  <span>{{ t('profile.ruleMinLength') }}</span>
                </div>
                <div class="flex items-center gap-2" :class="isMatchValid ? 'text-emerald-400 font-semibold' : 'text-[var(--color-text-tertiary)]'">
                  <MingcuteIcon :name="isMatchValid ? 'check' : 'close'" class="h-3.5 w-3.5" />
                  <span>{{ t('profile.ruleMatch') }}</span>
                </div>
              </div>

              <!-- Modal Actions -->
              <div class="mt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                <button
                  type="button"
                  class="btn-bubble-ghost btn-bubble-sm font-semibold"
                  @click="closePasswordModal"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  type="submit"
                  class="btn-bubble btn-bubble-sm flex items-center gap-2 font-bold"
                  :disabled="!canSubmitPassword || passwordLoading"
                >
                  <MingcuteIcon v-if="passwordLoading" name="loading" class="h-3.5 w-3.5 animate-spin" />
                  <span>{{ passwordLoading ? t('profile.updatingPassword') : t('profile.changePasswordButton') }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>
