<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

withDefaults(
  defineProps<{
    title?: string;
    message: string;
    retryLabel?: string;
    retryLoading?: boolean;
  }>(),
  {
    title: '',
    retryLabel: '',
    retryLoading: false,
  },
);

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="bubble-surface flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center shadow-sm">
    <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-inner">
      <MingcuteIcon name="alert" class="h-6 w-6" />
    </div>

    <div class="max-w-md">
      <h3 class="text-sm font-bold text-rose-400">
        {{ title || t('common.error') }}
      </h3>
      <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
        {{ message }}
      </p>
    </div>

    <div v-if="retryLabel" class="mt-1">
      <button
        type="button"
        class="btn-bubble-ghost btn-bubble-sm flex items-center gap-1.5 font-semibold text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
        :disabled="retryLoading"
        @click="emit('retry')"
      >
        <MingcuteIcon
          name="refresh"
          class="h-3.5 w-3.5"
          :class="{ spin: retryLoading }"
        />
        <span>{{ retryLabel }}</span>
      </button>
    </div>
  </div>
</template>
