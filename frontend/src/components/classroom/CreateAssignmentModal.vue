<script setup lang="ts">
import type { SupportedDialect } from '@shared/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  courseTitle?: string;
  creating: boolean;
}>();

const emit = defineEmits<{
  close: [];
  create: [
    payload: {
      title: string;
      description: string;
      dialect: SupportedDialect;
      initialSchemaSql: string;
      referenceQuerySql: string;
      maxScore: number;
    },
  ];
}>();

const { t } = useI18n();

const title = ref('');
const description = ref('');
const dialect = ref<SupportedDialect>('postgresql');
const initialSchemaSql = ref('');
const referenceQuerySql = ref('');
const maxScore = ref(100);

function handleSubmit() {
  if (!title.value.trim()) return;
  emit('create', {
    title: title.value.trim(),
    description: description.value.trim(),
    dialect: dialect.value,
    initialSchemaSql: initialSchemaSql.value.trim(),
    referenceQuerySql: referenceQuerySql.value.trim(),
    maxScore: maxScore.value || 100,
  });
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bubble-surface flex w-full max-w-2xl flex-col gap-4 rounded-2xl p-6 shadow-2xl">
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <h3 class="text-base font-bold text-[var(--color-text)]">{{ t('classroom.createAssignment') }}</h3>
          <p v-if="courseTitle" class="text-xs text-[var(--color-text-secondary)]">{{ courseTitle }}</p>
        </div>
        <button type="button" class="btn-bubble-ghost !p-2" @click="emit('close')">
          <MingcuteIcon name="close" class="h-4 w-4" />
        </button>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.assignmentTitle') }}</span>
            <input
              v-model="title"
              type="text"
              required
              :placeholder="t('classroom.assignmentTitlePlaceholder')"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.selectDialect') }}</span>
            <select
              v-model="dialect"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mariadb">MariaDB</option>
              <option value="sqlite">SQLite</option>
              <option value="libsql">LibSQL</option>
              <option value="mssql">Microsoft SQL Server</option>
            </select>
          </label>
        </div>

        <label class="flex flex-col gap-1 text-xs">
          <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.assignmentDescription') }}</span>
          <textarea
            v-model="description"
            rows="2"
            :placeholder="t('classroom.assignmentDescriptionPlaceholder')"
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
          />
        </label>

        <label class="flex flex-col gap-1 text-xs">
          <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.initialSchemaSql') }}</span>
          <span class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ t('classroom.initialSchemaHint') }}</span>
          <textarea
            v-model="initialSchemaSql"
            rows="3"
            placeholder="CREATE TABLE products (id INT, name TEXT, price NUMERIC);&#10;INSERT INTO products VALUES (1, 'Teclado', 45.00);"
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
          />
        </label>

        <label class="flex flex-col gap-1 text-xs">
          <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.referenceQuerySql') }}</span>
          <span class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ t('classroom.referenceQueryHint') }}</span>
          <textarea
            v-model="referenceQuerySql"
            rows="2"
            placeholder="SELECT name, price FROM products WHERE price > 30 ORDER BY price DESC;"
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
          />
        </label>

        <div class="mt-3 flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
          <button type="button" class="btn-bubble-ghost text-xs" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn-bubble text-xs" :disabled="creating || !title.trim()">
            {{ creating ? t('common.loading') : t('classroom.createAssignment') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
