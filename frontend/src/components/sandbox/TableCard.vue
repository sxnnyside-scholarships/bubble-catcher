<script setup lang="ts">
import type { TableSchema } from '@shared/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{ table: TableSchema; seeding: boolean }>();
const emit = defineEmits<{ delete: []; seed: [count: number] }>();

const { t } = useI18n();
const seedCount = ref(100);

function handleSeed() {
  emit('seed', seedCount.value);
}
</script>

<template>
  <div class="bubble-surface flex flex-col gap-3 rounded-2xl p-4">
    <div class="flex items-center justify-between">
      <h3 class="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
        <MingcuteIcon name="table" class="h-4 w-4 text-[var(--color-primary-500)]" />
        {{ table.name }}
      </h3>
      <button
        type="button"
        class="icon-bubble icon-bubble-sm text-[var(--color-error)]"
        :title="t('sandbox.deleteTable')"
        @click="emit('delete')"
      >
        <MingcuteIcon name="delete" class="h-3.5 w-3.5" />
      </button>
    </div>

    <ul class="flex flex-col gap-1 text-xs">
      <li
        v-for="column in table.columns"
        :key="column.name"
        class="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface-secondary)]/50 px-2 py-1"
      >
        <span class="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
          <MingcuteIcon v-if="column.primaryKey" name="key" class="h-3 w-3 flex-shrink-0 text-[var(--color-warning)]" />
          <MingcuteIcon v-else-if="column.references" name="link" class="h-3 w-3 flex-shrink-0 text-[var(--color-accent-500)]" />
          {{ column.name }}
        </span>
        <span class="font-mono text-[0.65rem] text-[var(--color-text-tertiary)]">
          {{ column.type }}{{ column.nullable ? '?' : '' }}
        </span>
      </li>
    </ul>

    <div class="flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
      <input
        v-model.number="seedCount"
        type="number"
        min="1"
        max="5000"
        class="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2 py-1 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
      />
      <button type="button" class="btn-bubble-ghost flex-1 text-xs" :disabled="seeding" @click="handleSeed">
        {{ seeding ? t('sandbox.generating') : t('sandbox.generate') }}
      </button>
    </div>
  </div>
</template>
