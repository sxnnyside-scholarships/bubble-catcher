<script setup lang="ts">
import MingcuteIcon from '@/components/MingcuteIcon.vue';

withDefaults(
  defineProps<{
    message: string;
    title?: string;
    icon?: string;
    actionLabel?: string;
  }>(),
  {
    title: '',
    icon: 'ghost',
    actionLabel: '',
  },
);

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="bubble-surface flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center shadow-sm">
    <div class="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-primary-500)]/25 bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)] shadow-inner">
      <MingcuteIcon :name="icon" class="animate-bubble-float h-7 w-7" />
    </div>

    <div class="max-w-md">
      <h3 v-if="title" class="text-sm font-bold text-[var(--color-text)]">
        {{ title }}
      </h3>
      <p class="text-xs text-[var(--color-text-secondary)]" :class="{ 'mt-1': title }">
        {{ message }}
      </p>
    </div>

    <div v-if="actionLabel" class="mt-2">
      <button
        type="button"
        class="btn-bubble btn-bubble-sm font-semibold shadow-md"
        @click="emit('action')"
      >
        {{ actionLabel }}
      </button>
    </div>

    <slot />
  </div>
</template>
