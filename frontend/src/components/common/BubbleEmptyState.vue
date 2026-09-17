<script setup lang="ts">
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import type { MINGCUTE_ICONS } from '@/design/mingcute-icons';

withDefaults(
  defineProps<{
    icon?: keyof typeof MINGCUTE_ICONS;
    title: string;
    description?: string;
    actionLabel?: string;
  }>(),
  {
    icon: 'ghost',
    description: '',
    actionLabel: '',
  },
);

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="bubble-surface flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center shadow-sm">
    <!-- Glowing Icon Bubble -->
    <div class="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-primary-500)]/25 bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)] shadow-inner">
      <MingcuteIcon :name="icon" class="animate-bubble-float h-7 w-7" />
    </div>

    <div class="max-w-md">
      <h3 class="text-sm font-bold text-[var(--color-text)]">
        {{ title }}
      </h3>
      <p v-if="description" class="mt-1 text-xs text-[var(--color-text-secondary)]">
        {{ description }}
      </p>
    </div>

    <!-- Optional Action Button -->
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
