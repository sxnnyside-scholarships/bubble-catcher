<script setup lang="ts">
import type { PlaygroundShare, SupportedDialect } from '@shared/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { authJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  projectId?: string;
  sql: string;
  dialect: SupportedDialect;
  defaultTitle?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const auth = useAuthStore();

const title = ref(props.defaultTitle || 'Playground Query');
const notes = ref('');
const sharing = ref(false);
const shareUrl = ref<string | null>(null);
const copied = ref(false);
const error = ref<string | null>(null);

async function handleCreateShare() {
  if (!auth.accessToken || !title.value.trim() || !props.sql.trim()) return;

  sharing.value = true;
  error.value = null;

  const res = await authJson<PlaygroundShare>('POST', '/playground/shares', auth.accessToken, {
    title: title.value.trim(),
    notes: notes.value.trim(),
    sql: props.sql,
    dialect: props.dialect,
    projectId: props.projectId,
  });

  sharing.value = false;

  if (res.success) {
    const origin = window.location.origin;
    shareUrl.value = `${origin}/dashboard/playground?share=${res.data.id}`;
  } else {
    error.value = res.error?.message || 'Failed to create share link';
  }
}

async function copyToClipboard() {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch {
    // Fallback if clipboard API not available
    const el = document.createElement('textarea');
    el.value = shareUrl.value;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 3000);
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bubble-surface flex w-full max-w-lg flex-col gap-4 rounded-2xl p-6 shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div class="flex items-center gap-2">
          <MingcuteIcon name="link" class="h-5 w-5 text-[var(--color-primary-500)]" />
          <h3 class="text-base font-bold text-[var(--color-text)]">{{ t('share.modalTitle') }}</h3>
        </div>
        <button type="button" class="btn-bubble-ghost !p-2" @click="emit('close')">
          <MingcuteIcon name="close" class="h-4 w-4" />
        </button>
      </div>

      <!-- If link generated -->
      <div v-if="shareUrl" class="flex flex-col gap-4 py-2">
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
          <div class="flex items-center gap-2 font-bold text-emerald-500 mb-1">
            <MingcuteIcon name="check" class="h-4 w-4" />
            <span>{{ t('share.successNotice') }}</span>
          </div>
          <p class="text-[var(--color-text-secondary)]">{{ t('share.permalinkExplanation') }}</p>
        </div>

        <div class="flex items-center gap-2">
          <input
            :value="shareUrl"
            readonly
            class="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 font-mono text-xs text-[var(--color-text)] outline-none"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button
            type="button"
            class="btn-bubble flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold"
            @click="copyToClipboard"
          >
            <MingcuteIcon :name="copied ? 'check' : 'copy'" class="h-4 w-4" />
            <span>{{ copied ? t('share.copied') : t('share.copyLink') }}</span>
          </button>
        </div>

        <div class="flex justify-end border-t border-[var(--color-border)] pt-3">
          <button type="button" class="btn-bubble-ghost text-xs" @click="emit('close')">
            {{ t('common.close') }}
          </button>
        </div>
      </div>

      <!-- Creation Form -->
      <form v-else class="flex flex-col gap-3" @submit.prevent="handleCreateShare">
        <p class="text-xs text-[var(--color-text-secondary)]">
          {{ t('share.description') }}
        </p>

        <label class="flex flex-col gap-1 text-xs">
          <span class="font-semibold text-[var(--color-text)]">{{ t('share.titleLabel') }}</span>
          <input
            v-model="title"
            type="text"
            required
            :placeholder="t('share.titlePlaceholder')"
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
          />
        </label>

        <label class="flex flex-col gap-1 text-xs">
          <span class="font-semibold text-[var(--color-text)]">{{ t('share.notesLabel') }}</span>
          <textarea
            v-model="notes"
            rows="3"
            :placeholder="t('share.notesPlaceholder')"
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
          />
        </label>

        <div class="flex items-center justify-between rounded-xl bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-secondary)]">
          <span>Engine: <strong class="text-[var(--color-text)] uppercase font-mono">{{ dialect }}</strong></span>
          <span v-if="projectId">Includes persistent schema statements</span>
        </div>

        <div v-if="error" class="rounded-xl bg-rose-500/10 p-2.5 text-xs text-rose-500 font-medium">
          {{ error }}
        </div>

        <div class="mt-2 flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
          <button type="button" class="btn-bubble-ghost text-xs" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn-bubble text-xs" :disabled="sharing || !title.trim()">
            <MingcuteIcon :name="sharing ? 'loading' : 'link'" class="h-4 w-4" :class="{ spin: sharing }" />
            <span>{{ sharing ? t('common.loading') : t('share.generateButton') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
