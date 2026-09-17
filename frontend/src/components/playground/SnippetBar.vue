<script setup lang="ts">
import type { SavedQuery } from '@shared/types';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{ recentQueries: SavedQuery[] }>();
const emit = defineEmits<{ insert: [text: string]; 'show-all': [] }>();

const { t } = useI18n();

const SNIPPETS = [
  { label: 'SELECT', text: 'SELECT column_list\nFROM table_name\nWHERE condition;' },
  { label: 'JOIN', text: 'SELECT a.*, b.*\nFROM table_a a\nJOIN table_b b ON a.id = b.a_id;' },
  { label: 'INSERT', text: 'INSERT INTO table_name (column_list)\nVALUES (value_list);' },
  { label: 'UPDATE', text: 'UPDATE table_name\nSET column = value\nWHERE condition;' },
  { label: 'DELETE', text: 'DELETE FROM table_name\nWHERE condition;' },
  { label: 'CREATE TABLE', text: 'CREATE TABLE table_name (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);' },
  { label: 'GROUP BY', text: 'SELECT column, COUNT(*)\nFROM table_name\nGROUP BY column\nHAVING COUNT(*) > 1;' },
  { label: 'ORDER BY', text: 'SELECT *\nFROM table_name\nORDER BY column DESC\nLIMIT 10;' },
];

function handleDragStart(event: DragEvent, text: string) {
  event.dataTransfer?.setData('text/plain', text);
  event.dataTransfer!.effectAllowed = 'copy';
}
</script>

<template>
  <div class="flex flex-col gap-2 border-b border-[var(--color-border)] pb-3">
    <!-- Canned syntax snippets — drag onto the editor, or click to insert at the cursor -->
    <div class="flex items-center gap-1.5 overflow-x-auto">
      <span class="flex-shrink-0 text-xs font-medium text-[var(--color-text-tertiary)]">{{ t('playground.snippets') }}:</span>
      <button
        v-for="snippet in SNIPPETS"
        :key="snippet.label"
        type="button"
        draggable="true"
        class="flex-shrink-0 cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-500)] hover:text-[var(--color-text)] active:cursor-grabbing"
        :title="t('playground.snippetHint')"
        @dragstart="handleDragStart($event, snippet.text)"
        @click="emit('insert', snippet.text)"
      >
        {{ snippet.label }}
      </button>
    </div>

    <!-- User's own recent saved queries -->
    <div v-if="recentQueries.length" class="flex items-center gap-1.5 overflow-x-auto">
      <span class="flex-shrink-0 text-xs font-medium text-[var(--color-text-tertiary)]">{{ t('playground.recentQueries') }}:</span>
      <button
        v-for="query in recentQueries"
        :key="query.id"
        type="button"
        :title="query.sql.slice(0, 120)"
        class="flex-shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-500)] hover:text-[var(--color-text)]"
        @click="emit('insert', query.sql)"
      >
        {{ query.title }}
      </button>
      <button
        type="button"
        class="flex-shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)]/10"
        @click="emit('show-all')"
      >
        <MingcuteIcon name="fileCode" class="h-3 w-3" />
        {{ t('playground.viewAllQueries') }}
      </button>
    </div>
  </div>
</template>
