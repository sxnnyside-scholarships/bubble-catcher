<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { SCHEMA_TEMPLATES } from '@/lib/schema-templates';

defineProps<{
  open: boolean;
  generating: boolean;
  progress: { current: number; total: number; label: string } | null;
}>();
const emit = defineEmits<{ close: []; generate: [templateId: string, rowsPerTable: number] }>();

const { t } = useI18n();

const selectedTemplate = ref(SCHEMA_TEMPLATES[0].id);
const rowsPerTable = ref(50);

function handleSubmit() {
  emit('generate', selectedTemplate.value, rowsPerTable.value);
}
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
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" @click.self="!generating && emit('close')">
      <div class="bubble-surface flex w-full max-w-md flex-col gap-4 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
            <MingcuteIcon name="rocket" class="h-4 w-4 text-[var(--color-primary-500)]" />
            {{ t('sandbox.generateSchema') }}
          </h2>
          <button v-if="!generating" type="button" class="icon-bubble icon-bubble-sm" @click="emit('close')">
            <MingcuteIcon name="close" class="h-3.5 w-3.5" />
          </button>
        </div>

        <template v-if="generating && progress">
          <div class="flex flex-col items-center gap-3 py-6">
            <span class="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
            <p class="text-sm text-[var(--color-text-secondary)]">{{ t('sandbox.generatingSchema') }}</p>
            <p class="font-mono text-xs text-[var(--color-text-tertiary)]">{{ progress.label }} ({{ progress.current }}/{{ progress.total }})</p>
          </div>
        </template>

        <form v-else class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ t('sandbox.schemaTemplate') }}</span>
            <label
              v-for="template in SCHEMA_TEMPLATES"
              :key="template.id"
              class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors"
              :class="
                selectedTemplate === template.id
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary-500)]/50'
              "
            >
              <input v-model="selectedTemplate" type="radio" :value="template.id" class="bubble-checkbox bubble-checkbox--radio" />
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-[var(--color-text)]">{{ t(template.labelKey) }}</span>
                <span class="font-mono text-[0.65rem] text-[var(--color-text-tertiary)]">
                  {{ template.tables.map((tbl) => tbl.name).join(', ') }}
                </span>
              </div>
            </label>
          </div>

          <label class="flex flex-col gap-1 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('sandbox.rowsPerTable') }}</span>
            <input
              v-model.number="rowsPerTable"
              type="number"
              min="1"
              max="5000"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <button type="submit" class="btn-bubble w-full text-sm">{{ t('sandbox.generateAndSeed') }}</button>
        </form>
      </div>
    </div>
  </Transition>
</template>
