<script setup lang="ts">
import type { PlatformFeatures, RegistrationMode, SmtpSettings } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  registrationMode: RegistrationMode;
  features: PlatformFeatures;
  smtp: SmtpSettings;
  loading: boolean;
  saving: boolean;
  testingSmtp: boolean;
}>();

const emit = defineEmits<{
  'update:registrationMode': [val: RegistrationMode];
  'update:features': [val: PlatformFeatures];
  'update:smtp': [val: SmtpSettings];
  save: [];
  testSmtp: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="bubble-surface flex flex-col gap-6 rounded-2xl p-6">
    <div v-if="loading" class="py-4">
      <BubbleSkeleton variant="lines" :count="6" />
    </div>

    <div v-else class="flex flex-col gap-6">
      <!-- Section A: Registration Mode -->
      <div class="flex flex-col gap-3">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('admin.registrationGovernance') }}
          </label>
          <p class="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{{ t('admin.registrationModeHint') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <!-- Open -->
          <div
            class="flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all"
            :class="
              registrationMode === 'open'
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 shadow-sm ring-1 ring-[var(--color-primary-500)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="emit('update:registrationMode', 'open')"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.registrationModeOpen') }}</span>
              <MingcuteIcon
                :name="registrationMode === 'open' ? 'check' : 'user'"
                class="h-4 w-4"
                :class="registrationMode === 'open' ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-tertiary)]'"
              />
            </div>
            <p class="mt-2 text-[0.7rem] text-[var(--color-text-tertiary)] leading-relaxed">
              {{ t('admin.registrationModeOpenDesc') }}
            </p>
          </div>

          <!-- Approval Required -->
          <div
            class="flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all"
            :class="
              registrationMode === 'approval_required'
                ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="emit('update:registrationMode', 'approval_required')"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.registrationModeApproval') }}</span>
              <MingcuteIcon
                :name="registrationMode === 'approval_required' ? 'check' : 'time'"
                class="h-4 w-4"
                :class="registrationMode === 'approval_required' ? 'text-amber-500' : 'text-[var(--color-text-tertiary)]'"
              />
            </div>
            <p class="mt-2 text-[0.7rem] text-[var(--color-text-tertiary)] leading-relaxed">
              {{ t('admin.registrationModeApprovalDesc') }}
            </p>
          </div>

          <!-- Invite Only -->
          <div
            class="flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all"
            :class="
              registrationMode === 'invite_only'
                ? 'border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-hover)]'
            "
            @click="emit('update:registrationMode', 'invite_only')"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.registrationModeInvite') }}</span>
              <MingcuteIcon
                :name="registrationMode === 'invite_only' ? 'check' : 'lock'"
                class="h-4 w-4"
                :class="registrationMode === 'invite_only' ? 'text-purple-500' : 'text-[var(--color-text-tertiary)]'"
              />
            </div>
            <p class="mt-2 text-[0.7rem] text-[var(--color-text-tertiary)] leading-relaxed">
              {{ t('admin.registrationModeInviteDesc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Section B: Feature Flags -->
      <div class="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('admin.platformFeatures') }}
          </label>
          <p class="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{{ t('admin.platformFeaturesHint') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <!-- Sandbox -->
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                <MingcuteIcon name="storage" class="h-5 w-5" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.featureSandbox') }}</h4>
                <p class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ t('admin.featureSandboxDesc') }}</p>
              </div>
            </div>
            <input
              type="checkbox"
              :checked="features.sandbox"
              class="h-4 w-4 rounded accent-[var(--color-primary-500)]"
              @change="emit('update:features', { ...features, sandbox: ($event.target as HTMLInputElement).checked })"
            />
          </div>

          <!-- Playground -->
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
                <MingcuteIcon name="code" class="h-5 w-5" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.featurePlayground') }}</h4>
                <p class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ t('admin.featurePlaygroundDesc') }}</p>
              </div>
            </div>
            <input
              type="checkbox"
              :checked="features.playground"
              class="h-4 w-4 rounded accent-[var(--color-primary-500)]"
              @change="emit('update:features', { ...features, playground: ($event.target as HTMLInputElement).checked })"
            />
          </div>

          <!-- Classroom Mode (NEW) -->
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <MingcuteIcon name="mortarboard" class="h-5 w-5" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.featureClassroom') }}</h4>
                <p class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ t('admin.featureClassroomDesc') }}</p>
              </div>
            </div>
            <input
              type="checkbox"
              :checked="features.classroom"
              class="h-4 w-4 rounded accent-[var(--color-primary-500)]"
              @change="emit('update:features', { ...features, classroom: ($event.target as HTMLInputElement).checked })"
            />
          </div>

          <!-- Competition Mode (NEW) -->
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <MingcuteIcon name="target" class="h-5 w-5" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-[var(--color-text)]">{{ t('admin.featureCompetition') }}</h4>
                <p class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ t('admin.featureCompetitionDesc') }}</p>
              </div>
            </div>
            <input
              type="checkbox"
              :checked="features.competition"
              class="h-4 w-4 rounded accent-[var(--color-primary-500)]"
              @change="emit('update:features', { ...features, competition: ($event.target as HTMLInputElement).checked })"
            />
          </div>
        </div>
      </div>

      <!-- Section C: Outbound SMTP -->
      <div class="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {{ t('admin.smtpTitle') }}
          </label>
          <p class="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{{ t('admin.smtpSubtitle') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('admin.smtpHost') }}</span>
            <input
              :value="smtp.host"
              type="text"
              placeholder="smtp.campus.edu"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              @input="emit('update:smtp', { ...smtp, host: ($event.target as HTMLInputElement).value })"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('admin.smtpPort') }}</span>
            <input
              :value="smtp.port"
              type="number"
              placeholder="587"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              @input="emit('update:smtp', { ...smtp, port: Number(($event.target as HTMLInputElement).value) || 587 })"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('admin.smtpUser') }}</span>
            <input
              :value="smtp.user"
              type="text"
              placeholder="notifications@campus.edu"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              @input="emit('update:smtp', { ...smtp, user: ($event.target as HTMLInputElement).value })"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('admin.smtpPassword') }}</span>
            <input
              :value="smtp.password"
              type="password"
              placeholder="••••••••"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              @input="emit('update:smtp', { ...smtp, password: ($event.target as HTMLInputElement).value })"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs sm:col-span-2">
            <span class="font-semibold text-[var(--color-text)]">{{ t('admin.smtpFrom') }}</span>
            <input
              :value="smtp.from"
              type="text"
              placeholder="Bubble Catcher Campus <noreply@campus.edu>"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              @input="emit('update:smtp', { ...smtp, from: ($event.target as HTMLInputElement).value })"
            />
          </label>

          <label class="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)] sm:col-span-2">
            <input
              type="checkbox"
              :checked="smtp.secure"
              class="h-4 w-4 rounded accent-[var(--color-primary-500)]"
              @change="emit('update:smtp', { ...smtp, secure: ($event.target as HTMLInputElement).checked })"
            />
            {{ t('admin.smtpSecure') }}
          </label>
        </div>
      </div>

      <!-- Action Buttons with Test SMTP functionality -->
      <div class="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <button
          type="button"
          class="btn-bubble-ghost flex items-center gap-2 px-6 py-2.5 text-xs font-semibold"
          :disabled="testingSmtp || !smtp.host.trim()"
          @click="emit('testSmtp')"
        >
          <MingcuteIcon :name="testingSmtp ? 'loading' : 'send'" class="h-4 w-4" :class="{ spin: testingSmtp }" />
          <span>{{ testingSmtp ? t('admin.testingSmtp') : t('admin.testSmtp') }}</span>
        </button>

        <button
          type="button"
          class="btn-bubble flex items-center gap-2 px-6 py-2.5 text-xs font-semibold shadow-md"
          :disabled="saving"
          @click="emit('save')"
        >
          <MingcuteIcon :name="saving ? 'loading' : 'check'" class="h-4 w-4" :class="{ spin: saving }" />
          <span>{{ saving ? t('admin.savingSettings') : t('admin.saveSettings') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
