<script setup lang="ts">
import type { SavedQuery } from '@shared/types';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{ open: boolean; queries: SavedQuery[] }>();
const emit = defineEmits<{ close: []; insert: [sql: string] }>();

const { t } = useI18n();
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="emit('close')">
      <div class="bubble-surface flex max-h-[70vh] w-full max-w-lg flex-col rounded-2xl p-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-bold text-[var(--color-text)]">{{ t('playground.viewAllQueries') }}</h2>
          <button type="button" class="icon-bubble icon-bubble-sm" @click="emit('close')">✕</button>
        </div>

        <p v-if="!queries.length" class="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
          {{ t('playground.noSavedQueries') }}
        </p>

        <ul v-else class="flex flex-col gap-2 overflow-y-auto">
          <li v-for="query in queries" :key="query.id">
            <button
              type="button"
              class="flex w-full flex-col gap-1 rounded-xl border border-[var(--color-border)] p-3 text-left transition-colors hover:border-[var(--color-primary-500)]"
              @click="emit('insert', query.sql)"
            >
              <span class="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                <MingcuteIcon name="fileCode" class="h-3.5 w-3.5 text-[var(--color-primary-500)]" />
                {{ query.title }}
              </span>
              <pre class="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[var(--color-text-tertiary)]">{{ query.sql.slice(0, 200) }}</pre>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>
