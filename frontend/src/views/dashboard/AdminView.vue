<script setup lang="ts">
import type {
  EngineState,
  PaginatedResponse,
  PlatformFeatures,
  RegistrationMode,
  ServerBasedDialect,
  SmtpSettings,
  SystemSettingsDto,
  UserProfile,
} from '@shared/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AdminEnginesTab from '@/components/admin/AdminEnginesTab.vue';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab.vue';
import AdminUsersTab from '@/components/admin/AdminUsersTab.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { resolveErrorCode } from '@/i18n';
import { authJson, getJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const auth = useAuthStore();
const settingsStore = useSettingsStore();
const notificationsStore = useNotificationsStore();

type ActiveTab = 'engines' | 'users' | 'settings';
const currentTab = ref<ActiveTab>('engines');

/* ── Notification Toast ────────────────────────────────────────── */
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 4000);
}

/* ── Tab 1: Sandbox Engines ────────────────────────────────────── */
const engines = ref<EngineState[]>([]);
const enginesLoading = ref(true);
const pendingDialect = ref<ServerBasedDialect | null>(null);
const errorByDialect = ref<Record<string, string>>({});

async function loadEngines() {
  if (!auth.accessToken) return;
  enginesLoading.value = true;
  const response = await getJson<{ engines: EngineState[] }>('/admin/sandbox/engines', auth.accessToken);
  if (response.success) engines.value = response.data.engines;
  enginesLoading.value = false;
}

async function toggleEngine(engine: EngineState) {
  if (!auth.accessToken) return;
  pendingDialect.value = engine.dialect;
  errorByDialect.value = { ...errorByDialect.value, [engine.dialect]: '' };

  const action = engine.status === 'running' ? 'stop' : 'start';
  const response = await authJson<EngineState>(
    'POST',
    `/admin/sandbox/engines/${engine.dialect}/${action}`,
    auth.accessToken,
  );
  pendingDialect.value = null;

  if (response.success) {
    engines.value = engines.value.map((e) => (e.dialect === engine.dialect ? response.data : e));
    notificationsStore.notifyEngineStatus(engine.dialect, action);
  } else {
    errorByDialect.value = {
      ...errorByDialect.value,
      [engine.dialect]: resolveErrorCode(response.error.code),
    };
  }
}

/* ── Tab 2: Users & Approvals ──────────────────────────────────── */
const users = ref<UserProfile[]>([]);
const usersLoading = ref(true);
const searchQuery = ref('');
const statusFilter = ref<string>('all');

async function loadUsers() {
  if (!auth.accessToken) return;
  usersLoading.value = true;
  const url =
    statusFilter.value === 'all'
      ? '/admin/users?pageSize=100'
      : `/admin/users?pageSize=100&status=${statusFilter.value}`;
  const response = await getJson<PaginatedResponse<UserProfile>>(url, auth.accessToken);
  if (response.success) {
    users.value = response.data.items;
  }
  usersLoading.value = false;
}

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return users.value.filter((u) => {
    const nameMatch = u.displayName ? u.displayName.toLowerCase().includes(q) : false;
    const matchesSearch = !q || nameMatch || u.email.toLowerCase().includes(q);
    const matchesFilter = statusFilter.value === 'all' || u.status === statusFilter.value;
    return matchesSearch && matchesFilter;
  });
});

const kpis = computed(() => {
  const total = users.value.length;
  const active = users.value.filter((u) => u.status === 'active').length;
  const pending = users.value.filter((u) => u.status === 'pending_approval').length;
  const suspended = users.value.filter((u) => u.status === 'suspended').length;
  return { total, active, pending, suspended };
});

/* User Action Handlers */
async function approveUser(user: UserProfile) {
  if (!auth.accessToken) return;
  const res = await authJson<UserProfile>('POST', `/admin/users/${user.id}/approve`, auth.accessToken);
  if (res.success) {
    showToast(t('admin.userApproved'));
    await loadUsers();
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

async function rejectUser(user: UserProfile) {
  if (!auth.accessToken) return;
  const res = await authJson<{ rejected: boolean }>('POST', `/admin/users/${user.id}/reject`, auth.accessToken);
  if (res.success) {
    showToast(t('admin.userRejected'));
    await loadUsers();
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

async function toggleUserSuspension(user: UserProfile) {
  if (!auth.accessToken) return;
  const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
  const res = await authJson<UserProfile>('PATCH', `/admin/users/${user.id}`, auth.accessToken, {
    status: nextStatus,
  });
  if (res.success) {
    showToast(nextStatus === 'active' ? t('admin.userApproved') : t('admin.userDeleted'));
    await loadUsers();
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

async function forceLogout(user: UserProfile) {
  if (!auth.accessToken) return;
  const res = await authJson<{ revoked: boolean }>('POST', `/admin/users/${user.id}/force-logout`, auth.accessToken);
  if (res.success) {
    showToast(t('admin.userForceLoggedOut'));
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

/* User Modals State */
const showCreateModal = ref(false);
const newName = ref('');
const newEmail = ref('');
const newPassword = ref('');
const newRole = ref<'user' | 'admin'>('user');
const createSubmitting = ref(false);

async function submitCreateUser() {
  if (!auth.accessToken) return;
  createSubmitting.value = true;
  const res = await authJson<UserProfile>('POST', '/admin/users', auth.accessToken, {
    name: newName.value.trim(),
    email: newEmail.value.trim().toLowerCase(),
    password: newPassword.value,
    role: newRole.value,
  });
  createSubmitting.value = false;
  if (res.success) {
    showToast(t('admin.userCreated'));
    showCreateModal.value = false;
    newName.value = '';
    newEmail.value = '';
    newPassword.value = '';
    newRole.value = 'user';
    await loadUsers();
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

const editingUser = ref<UserProfile | null>(null);
const editName = ref('');
const editEmail = ref('');
const editRole = ref<'user' | 'admin'>('user');
const editSubmitting = ref(false);

function openEditUser(user: UserProfile) {
  editingUser.value = user;
  editName.value = user.displayName || '';
  editEmail.value = user.email;
  editRole.value = user.role;
}

async function submitEditUser() {
  if (!auth.accessToken || !editingUser.value) return;
  editSubmitting.value = true;
  const res = await authJson<UserProfile>('PATCH', `/admin/users/${editingUser.value.id}`, auth.accessToken, {
    name: editName.value.trim(),
    email: editEmail.value.trim(),
    role: editRole.value,
  });
  editSubmitting.value = false;
  if (res.success) {
    showToast(t('admin.userUpdated'));
    editingUser.value = null;
    await loadUsers();
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

const passwordUser = ref<UserProfile | null>(null);
const resetPasswordVal = ref('');
const resetPasswordSubmitting = ref(false);

function openResetPassword(user: UserProfile) {
  passwordUser.value = user;
  resetPasswordVal.value = '';
}

async function submitResetPassword() {
  if (!auth.accessToken || !passwordUser.value || !resetPasswordVal.value) return;
  resetPasswordSubmitting.value = true;
  const res = await authJson<{ reset: boolean }>(
    'POST',
    `/admin/users/${passwordUser.value.id}/password`,
    auth.accessToken,
    { password: resetPasswordVal.value },
  );
  resetPasswordSubmitting.value = false;
  if (res.success) {
    showToast(t('admin.passwordResetSuccess'));
    passwordUser.value = null;
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

const deletingUser = ref<UserProfile | null>(null);
const deleteSubmitting = ref(false);

function openDeleteUser(user: UserProfile) {
  deletingUser.value = user;
}

async function submitDeleteUser() {
  if (!auth.accessToken || !deletingUser.value) return;
  deleteSubmitting.value = true;
  const res = await authJson<{ deleted: boolean }>('DELETE', `/admin/users/${deletingUser.value.id}`, auth.accessToken);
  deleteSubmitting.value = false;
  if (res.success) {
    showToast(t('admin.userDeleted'));
    deletingUser.value = null;
    await loadUsers();
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

/* ── Tab 3: Platform Settings ──────────────────────────────────── */
const settingsLoading = ref(true);
const settingsSaving = ref(false);
const registrationMode = ref<RegistrationMode>('open');
const features = ref<PlatformFeatures>({
  sandbox: true,
  playground: true,
  classroom: true,
  competition: true,
});
const smtp = ref<SmtpSettings>({
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  from: 'notifications@campus.edu',
});
const smtpTesting = ref(false);

async function loadSettings() {
  if (!auth.accessToken) return;
  settingsLoading.value = true;
  const res = await getJson<SystemSettingsDto>('/admin/settings', auth.accessToken);
  if (res.success) {
    registrationMode.value = res.data.registrationMode;
    features.value = { ...features.value, ...res.data.enabledFeatures };
    if (res.data.smtpConfig) {
      smtp.value = {
        host: res.data.smtpConfig.host || '',
        port: res.data.smtpConfig.port || 587,
        secure: Boolean(res.data.smtpConfig.secure),
        user: res.data.smtpConfig.user || '',
        password: res.data.smtpConfig.password || '',
        from: res.data.smtpConfig.from || 'notifications@campus.edu',
      };
    }
  }
  settingsLoading.value = false;
}

async function testSmtpConnection() {
  if (!auth.accessToken) return;
  if (!smtp.value.host.trim()) {
    showToast('Please enter an SMTP host.', 'error');
    return;
  }
  smtpTesting.value = true;
  const res = await authJson<{ valid: boolean; message: string }>(
    'POST',
    '/admin/settings/test-smtp',
    auth.accessToken,
    {
      host: smtp.value.host.trim(),
      port: Number(smtp.value.port) || 587,
      secure: smtp.value.secure,
      user: smtp.value.user.trim(),
      password: smtp.value.password || undefined,
      from: smtp.value.from.trim(),
    },
  );
  smtpTesting.value = false;
  if (res.success) {
    showToast(t('admin.smtpTestSuccess'), 'success');
  } else {
    showToast(t('admin.smtpTestFailed'), 'error');
  }
}

async function saveSettings() {
  if (!auth.accessToken) return;
  settingsSaving.value = true;
  const res = await authJson<SystemSettingsDto>('PATCH', '/admin/settings', auth.accessToken, {
    registrationMode: registrationMode.value,
    enabledFeatures: features.value,
    smtpConfig: smtp.value.host.trim()
      ? {
          host: smtp.value.host.trim(),
          port: Number(smtp.value.port) || 587,
          secure: smtp.value.secure,
          user: smtp.value.user.trim(),
          password: smtp.value.password ? smtp.value.password : undefined,
          from: smtp.value.from.trim(),
        }
      : null,
  });
  settingsSaving.value = false;
  if (res.success) {
    showToast(t('admin.settingsSaved'));
    for (const [key, enabled] of Object.entries(res.data.enabledFeatures)) {
      if (enabled !== undefined) {
        notificationsStore.notifyModeChange(key, enabled);
      }
    }
    settingsStore.updateFeatures(res.data.enabledFeatures);
  } else {
    showToast(resolveErrorCode(res.error.code), 'error');
  }
}

onMounted(() => {
  loadEngines();
  loadUsers();
  loadSettings();
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Toast Feedback -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-semibold text-white shadow-xl"
        :class="toastType === 'success' ? 'bg-emerald-600' : 'bg-rose-600'"
      >
        <MingcuteIcon :name="toastType === 'success' ? 'check' : 'close'" class="h-4 w-4" />
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- Top Navigation Tabs -->
    <div class="flex items-center gap-2 rounded-2xl bg-[var(--color-surface-secondary)]/80 p-1.5 border border-[var(--color-border)] shadow-sm self-start">
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200"
        :class="
          currentTab === 'engines'
            ? 'bg-[var(--color-primary-500)] text-white shadow-md'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]'
        "
        @click="currentTab = 'engines'"
      >
        <MingcuteIcon name="server" class="h-4 w-4" />
        {{ t('admin.tabEngines') }}
      </button>

      <button
        type="button"
        class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200"
        :class="
          currentTab === 'users'
            ? 'bg-[var(--color-primary-500)] text-white shadow-md'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]'
        "
        @click="currentTab = 'users'"
      >
        <MingcuteIcon name="user" class="h-4 w-4" />
        {{ t('admin.tabUsers') }}
        <span
          v-if="kpis.pending > 0"
          class="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[0.65rem] font-bold text-white shadow-sm"
        >
          {{ kpis.pending }}
        </span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200"
        :class="
          currentTab === 'settings'
            ? 'bg-[var(--color-primary-500)] text-white shadow-md'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]'
        "
        @click="currentTab = 'settings'"
      >
        <MingcuteIcon name="settings" class="h-4 w-4" />
        {{ t('admin.tabSettings') }}
      </button>
    </div>

    <!-- Active Tab Component -->
    <AdminEnginesTab
      v-if="currentTab === 'engines'"
      :engines="engines"
      :loading="enginesLoading"
      :pending-dialect="pendingDialect"
      :error-by-dialect="errorByDialect"
      @toggle="toggleEngine"
      @refresh="loadEngines"
    />

    <AdminUsersTab
      v-else-if="currentTab === 'users'"
      :users="filteredUsers"
      :loading="usersLoading"
      :search-query="searchQuery"
      :status-filter="statusFilter"
      :kpis="kpis"
      @update:search-query="searchQuery = $event"
      @update:status-filter="statusFilter = $event; loadUsers()"
      @create="showCreateModal = true"
      @edit="openEditUser"
      @reset-password="openResetPassword"
      @toggle-suspend="toggleUserSuspension"
      @force-logout="forceLogout"
      @delete="openDeleteUser"
      @approve="approveUser"
      @reject="rejectUser"
    />

    <AdminSettingsTab
      v-else-if="currentTab === 'settings'"
      :registration-mode="registrationMode"
      :features="features"
      :smtp="smtp"
      :loading="settingsLoading"
      :saving="settingsSaving"
      :testing-smtp="smtpTesting"
      @update:registration-mode="registrationMode = $event"
      @update:features="features = $event"
      @update:smtp="smtp = $event"
      @save="saveSettings"
      @test-smtp="testSmtpConnection"
    />

    <!-- Modals -->
    <!-- Create User Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="showCreateModal = false"
    >
      <div class="bubble-surface flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-[var(--color-text)]">{{ t('admin.createNewUser') }}</h3>
          <button type="button" class="btn-bubble-ghost !p-2" @click="showCreateModal = false">
            <MingcuteIcon name="close" class="h-4 w-4" />
          </button>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="submitCreateUser">
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userName') }}</span>
            <input
              v-model="newName"
              type="text"
              required
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userEmail') }}</span>
            <input
              v-model="newEmail"
              type="email"
              required
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userPassword') }}</span>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="8"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userRole') }}</span>
            <select
              v-model="newRole"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            >
              <option value="user">{{ t('admin.roleUser') }}</option>
              <option value="admin">{{ t('admin.roleAdmin') }}</option>
            </select>
          </label>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="btn-bubble-ghost text-xs" @click="showCreateModal = false">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-bubble text-xs" :disabled="createSubmitting">
              {{ t('admin.createUser') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div
      v-if="editingUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="editingUser = null"
    >
      <div class="bubble-surface flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-[var(--color-text)]">{{ t('admin.editUser') }}</h3>
          <button type="button" class="btn-bubble-ghost !p-2" @click="editingUser = null">
            <MingcuteIcon name="close" class="h-4 w-4" />
          </button>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="submitEditUser">
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userName') }}</span>
            <input
              v-model="editName"
              type="text"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userEmail') }}</span>
            <input
              v-model="editEmail"
              type="email"
              required
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.userRole') }}</span>
            <select
              v-model="editRole"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            >
              <option value="user">{{ t('admin.roleUser') }}</option>
              <option value="admin">{{ t('admin.roleAdmin') }}</option>
            </select>
          </label>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="btn-bubble-ghost text-xs" @click="editingUser = null">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-bubble text-xs" :disabled="editSubmitting">
              {{ t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div
      v-if="passwordUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="passwordUser = null"
    >
      <div class="bubble-surface flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-[var(--color-text)]">{{ t('admin.resetPassword') }}</h3>
            <p class="text-xs text-[var(--color-text-tertiary)]">{{ passwordUser.email }}</p>
          </div>
          <button type="button" class="btn-bubble-ghost !p-2" @click="passwordUser = null">
            <MingcuteIcon name="close" class="h-4 w-4" />
          </button>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="submitResetPassword">
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('admin.newPassword') }}</span>
            <input
              v-model="resetPasswordVal"
              type="password"
              required
              minlength="8"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="btn-bubble-ghost text-xs" @click="passwordUser = null">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-bubble text-xs" :disabled="resetPasswordSubmitting">
              {{ t('admin.resetPassword') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div
      v-if="deletingUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="deletingUser = null"
    >
      <div class="bubble-surface flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
            <MingcuteIcon name="delete" class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-[var(--color-text)]">{{ t('admin.deleteUser') }}</h3>
            <p class="text-xs text-[var(--color-text-tertiary)]">{{ deletingUser.displayName }} ({{ deletingUser.email }})</p>
          </div>
        </div>

        <p class="text-xs leading-relaxed text-[var(--color-text-secondary)]">
          {{ t('admin.deleteUserConfirm') }}
        </p>

        <div class="mt-2 flex justify-end gap-2">
          <button type="button" class="btn-bubble-ghost text-xs" @click="deletingUser = null">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-rose-700"
            :disabled="deleteSubmitting"
            @click="submitDeleteUser"
          >
            {{ t('admin.deleteUser') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
