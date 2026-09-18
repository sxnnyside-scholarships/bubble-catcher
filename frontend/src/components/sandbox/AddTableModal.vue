<script setup lang="ts">
import type { ColumnType, CreateTablePayload, TableColumn } from '@shared/types';
import { COLUMN_TYPES } from '@shared/types';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{ open: boolean; submitting: boolean; error: string }>();
const emit = defineEmits<{ close: []; submit: [payload: CreateTablePayload] }>();

const { t } = useI18n();

const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'sandbox.typeText',
  integer: 'sandbox.typeInteger',
  decimal: 'sandbox.typeDecimal',
  boolean: 'sandbox.typeBoolean',
  date: 'sandbox.typeDate',
  datetime: 'sandbox.typeDatetime',
};

/** Generic SQL type mapping for schema preview. */
const PREVIEW_SQL_TYPE: Record<ColumnType, string> = {
  text: 'TEXT',
  integer: 'INTEGER',
  decimal: 'DECIMAL(10,2)',
  boolean: 'BOOLEAN',
  date: 'DATE',
  datetime: 'DATETIME',
};

interface DraftColumn extends TableColumn {
  refTable: string;
  refColumn: string;
}

function newColumn(): DraftColumn {
  return { name: '', type: 'text', primaryKey: false, nullable: true, references: null, refTable: '', refColumn: '' };
}

const tableName = ref('');
const columns = reactive<DraftColumn[]>([newColumn()]);

const sqlPreview = computed(() => {
  const name = tableName.value.trim() || 'table_name';
  const lines = columns.map((c) => {
    const colName = c.name.trim() || 'column';
    const parts = [colName, PREVIEW_SQL_TYPE[c.type]];
    if (c.primaryKey) parts.push('PRIMARY KEY');
    if (!c.nullable && !c.primaryKey) parts.push('NOT NULL');
    if (c.refTable.trim() && c.refColumn.trim()) parts.push(`REFERENCES ${c.refTable.trim()}(${c.refColumn.trim()})`);
    return `  ${parts.join(' ')}`;
  });
  return `CREATE TABLE ${name} (\n${lines.join(',\n')}\n);`;
});

function addColumn() {
  columns.push(newColumn());
}

function removeColumn(index: number) {
  columns.splice(index, 1);
}

function reset() {
  tableName.value = '';
  columns.splice(0, columns.length, newColumn());
}

function handleClose() {
  reset();
  emit('close');
}

function handleSubmit() {
  const payload: CreateTablePayload = {
    name: tableName.value.trim(),
    columns: columns.map((c) => ({
      name: c.name.trim(),
      type: c.type,
      primaryKey: c.primaryKey,
      nullable: c.nullable,
      references:
        c.refTable.trim() && c.refColumn.trim() ? { table: c.refTable.trim(), column: c.refColumn.trim() } : null,
    })),
  };
  emit('submit', payload);
}

defineExpose({ reset });
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
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" @click.self="handleClose">
      <div class="bubble-surface flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl">
        <div class="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
            <MingcuteIcon name="table" class="h-4 w-4 text-[var(--color-primary-500)]" />
            {{ t('sandbox.addTable') }}
          </h2>
          <button type="button" class="icon-bubble icon-bubble-sm" @click="handleClose">
            <MingcuteIcon name="close" class="h-3.5 w-3.5" />
          </button>
        </div>

        <form class="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[1.3fr_1fr]" @submit.prevent="handleSubmit">
          <!-- Column editor -->
          <div class="flex flex-col gap-3 p-5 lg:border-r lg:border-[var(--color-border)]">
            <label class="flex flex-col gap-1 text-xs">
              <span class="font-mono font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{{ t('sandbox.tableName') }}</span>
              <input
                v-model="tableName"
                type="text"
                required
                pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                placeholder="my_table"
                class="w-full rounded-lg border border-[var(--color-border)] bg-black/20 px-2.5 py-1.5 font-mono text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              />
            </label>

            <div class="flex flex-col gap-1.5">
              <div class="grid grid-cols-[1fr_5.5rem_auto_auto_auto] items-center gap-1.5 px-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <span>{{ t('sandbox.columnName') }}</span>
                <span>{{ t('sandbox.columnType') }}</span>
                <span class="text-center" :title="t('sandbox.primaryKey')">
                  <MingcuteIcon name="key" class="h-3 w-3" />
                </span>
                <span class="text-center" :title="t('sandbox.nullable')">?</span>
                <span></span>
              </div>

              <div
                v-for="(column, index) in columns"
                :key="index"
                class="grid grid-cols-[1fr_5.5rem_auto_auto_auto] items-center gap-1.5 rounded-lg bg-black/20 px-1.5 py-1.5"
              >
                <input
                  v-model="column.name"
                  type="text"
                  required
                  pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                  :placeholder="t('sandbox.columnName')"
                  class="min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)] focus:bg-black/20"
                />
                <select v-model="column.type" class="bubble-select rounded border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]">
                  <option v-for="type in COLUMN_TYPES" :key="type" :value="type">{{ t(TYPE_LABELS[type]) }}</option>
                </select>
                <input v-model="column.primaryKey" type="checkbox" class="bubble-checkbox justify-self-center" />
                <input v-model="column.nullable" type="checkbox" class="bubble-checkbox justify-self-center" />
                <button
                  v-if="columns.length > 1"
                  type="button"
                  class="justify-self-center text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-error)]"
                  @click="removeColumn(index)"
                >
                  <MingcuteIcon name="close" class="h-3.5 w-3.5" />
                </button>
                <span v-else />
              </div>
            </div>

            <button type="button" class="btn-bubble-ghost flex w-full items-center justify-center gap-1.5 text-xs" @click="addColumn">
              <MingcuteIcon name="add" class="h-3.5 w-3.5" />
              {{ t('sandbox.addColumn') }}
            </button>

            <details class="rounded-lg bg-black/10 px-3 py-2 text-xs open:pb-2.5">
              <summary class="cursor-pointer select-none font-medium text-[var(--color-text-secondary)]">
                <MingcuteIcon name="link" class="mr-1 inline h-3 w-3" />{{ t('sandbox.references') }}
              </summary>
              <div class="mt-2 flex flex-col gap-1.5">
                <p class="text-[0.65rem] text-[var(--color-text-tertiary)]">{{ t('sandbox.referencesHint') }}</p>
                <div v-for="(column, index) in columns" :key="index" class="grid grid-cols-[1fr_1fr_1fr] items-center gap-1.5">
                  <span class="truncate font-mono text-[0.7rem] text-[var(--color-text-secondary)]">{{ column.name || '—' }}</span>
                  <input
                    v-model="column.refTable"
                    type="text"
                    placeholder="ref. table"
                    class="rounded border border-[var(--color-border)] bg-black/20 px-1.5 py-1 font-mono text-[0.7rem] text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
                  />
                  <input
                    v-model="column.refColumn"
                    type="text"
                    placeholder="ref. column"
                    class="rounded border border-[var(--color-border)] bg-black/20 px-1.5 py-1 font-mono text-[0.7rem] text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
                  />
                </div>
              </div>
            </details>

            <p v-if="error" class="text-xs text-[var(--color-error)]">{{ error }}</p>

            <div class="mt-1 flex gap-2">
              <button type="submit" class="btn-bubble flex-1 text-sm" :disabled="submitting">
                {{ submitting ? t('sandbox.creating') : t('sandbox.create') }}
              </button>
              <button type="button" class="btn-bubble-ghost btn-bubble-ghost--lg text-sm" @click="handleClose">
                {{ t('sandbox.done') }}
              </button>
            </div>
            <p class="text-center text-[0.65rem] text-[var(--color-text-tertiary)]">{{ t('sandbox.addAnotherHint') }}</p>
          </div>

          <!-- Live SQL preview -->
          <div class="flex flex-col gap-2 bg-black/20 p-5">
            <span class="font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {{ t('sandbox.sqlPreview') }}
            </span>
            <pre class="flex-1 overflow-auto whitespace-pre rounded-xl border border-[var(--color-border)] bg-black/30 p-3 font-mono text-xs leading-relaxed text-[var(--color-accent-500)]"><code>{{ sqlPreview }}</code></pre>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
