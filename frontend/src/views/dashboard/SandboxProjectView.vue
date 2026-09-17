<script setup lang="ts">
import type { CreateTablePayload, Project, ProjectSchema, SeedTableResult } from '@shared/types';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import BrandIcon from '@/components/BrandIcon.vue';
import EmptyState from '@/components/dashboard/EmptyState.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import AddTableModal from '@/components/sandbox/AddTableModal.vue';
import GenerateSchemaModal from '@/components/sandbox/GenerateSchemaModal.vue';
import TableCard from '@/components/sandbox/TableCard.vue';
import { resolveErrorCode } from '@/i18n';
import { authJson, getJson } from '@/lib/api';
import { SCHEMA_TEMPLATES } from '@/lib/schema-templates';
import { useAuthStore } from '@/stores/auth';
import { usePlaygroundStore } from '@/stores/playground';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const playground = usePlaygroundStore();

const project = ref<Project | null>(null);
const schema = ref<ProjectSchema>({ tables: [] });
const loading = ref(true);

const showAddModal = ref(false);
const creating = ref(false);
const createError = ref('');
const addModalRef = ref<{ reset: () => void } | null>(null);

const seedingTable = ref<string | null>(null);
const toast = ref('');

const showGenerateModal = ref(false);
const generatingSchema = ref(false);
const generateProgress = ref<{ current: number; total: number; label: string } | null>(null);

const projectId = computed(() => String(route.params.projectId));

onMounted(async () => {
  if (!auth.accessToken) return;

  const [projectResult, schemaResult] = await Promise.all([
    getJson<Project>(`/projects/${projectId.value}`, auth.accessToken),
    getJson<ProjectSchema>(`/projects/${projectId.value}/schema`, auth.accessToken),
  ]);

  if (projectResult.success) {
    project.value = projectResult.data;
    playground.currentProjectTitle = projectResult.data.title;
  }
  if (schemaResult.success) schema.value = schemaResult.data;

  loading.value = false;
});

onBeforeUnmount(() => {
  playground.currentProjectTitle = null;
});

async function handleCreateTable(payload: CreateTablePayload) {
  if (!auth.accessToken) return;

  creating.value = true;
  createError.value = '';

  const response = await authJson<ProjectSchema>(
    'POST',
    `/projects/${projectId.value}/schema/tables`,
    auth.accessToken,
    payload,
  );

  creating.value = false;

  if (!response.success) {
    createError.value = resolveErrorCode(response.error.code);
    return;
  }

  schema.value = response.data;
  addModalRef.value?.reset();
}

async function handleDeleteTable(tableName: string) {
  if (!auth.accessToken || !confirm(t('sandbox.confirmDeleteTable'))) return;

  const response = await authJson<ProjectSchema>(
    'DELETE',
    `/projects/${projectId.value}/schema/tables/${tableName}`,
    auth.accessToken,
  );
  if (response.success) schema.value = response.data;
}

async function handleSeedTable(tableName: string, count: number) {
  if (!auth.accessToken) return;

  seedingTable.value = tableName;
  toast.value = '';

  const response = await authJson<SeedTableResult>(
    'POST',
    `/projects/${projectId.value}/schema/tables/${tableName}/seed`,
    auth.accessToken,
    { count },
  );

  seedingTable.value = null;

  if (response.success) {
    toast.value = `${tableName}: ${response.data.inserted} ${t('sandbox.rowsGenerated')}`;
  } else {
    toast.value = resolveErrorCode(response.error.code);
  }
}

/** Builds every table in a template, then seeds each with `rowsPerTable` fake rows — orchestrated
 * client-side by calling the same single-table endpoints the manual flow uses. */
async function handleGenerateSchema(templateId: string, rowsPerTable: number) {
  if (!auth.accessToken) return;
  const template = SCHEMA_TEMPLATES.find((tpl) => tpl.id === templateId);
  if (!template) return;

  generatingSchema.value = true;
  const total = template.tables.length * 2;
  let current = 0;

  for (const tablePayload of template.tables) {
    if (schema.value.tables.some((t) => t.name === tablePayload.name)) {
      current += 2;
      continue;
    }

    current++;
    generateProgress.value = { current, total, label: `CREATE ${tablePayload.name}` };
    const createResponse = await authJson<ProjectSchema>(
      'POST',
      `/projects/${projectId.value}/schema/tables`,
      auth.accessToken,
      tablePayload,
    );
    if (!createResponse.success) {
      toast.value = `${tablePayload.name}: ${resolveErrorCode(createResponse.error.code)}`;
      continue;
    }
    schema.value = createResponse.data;

    current++;
    generateProgress.value = { current, total, label: `SEED ${tablePayload.name}` };
    await authJson<SeedTableResult>(
      'POST',
      `/projects/${projectId.value}/schema/tables/${tablePayload.name}/seed`,
      auth.accessToken,
      { count: rowsPerTable },
    );
  }

  generatingSchema.value = false;
  generateProgress.value = null;
  showGenerateModal.value = false;
  toast.value = t('sandbox.schemaGenerated');
}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-24 text-sm text-[var(--color-text-tertiary)]">
    {{ t('common.loading') }}
  </div>

  <div v-else-if="project" class="flex flex-col gap-4">
    <RouterLink
      to="/dashboard/sandbox"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
    >
      <MingcuteIcon name="chevronLeft" class="h-4 w-4" />
      {{ t('nav.sandbox') }}
    </RouterLink>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
          <BrandIcon :dialect="project.dialect" />
        </div>
        <h1 class="text-xl font-bold text-[var(--color-text)]">{{ project.title }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn-bubble-ghost btn-bubble-ghost--lg flex items-center gap-1.5 text-sm" @click="showGenerateModal = true">
          <MingcuteIcon name="rocket" class="h-4 w-4" />
          {{ t('sandbox.generateSchema') }}
        </button>
        <button type="button" class="btn-bubble flex items-center gap-1.5 text-sm" @click="showAddModal = true">
          <MingcuteIcon name="add" class="h-4 w-4" />
          {{ t('sandbox.addTable') }}
        </button>
      </div>
    </div>

    <p v-if="toast" class="text-xs text-[var(--color-success)]">{{ toast }}</p>

    <EmptyState v-if="!schema.tables.length" :message="t('sandbox.noTables')" />

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TableCard
        v-for="table in schema.tables"
        :key="table.name"
        :table="table"
        :seeding="seedingTable === table.name"
        @delete="handleDeleteTable(table.name)"
        @seed="(count) => handleSeedTable(table.name, count)"
      />
    </div>

    <AddTableModal
      ref="addModalRef"
      :open="showAddModal"
      :submitting="creating"
      :error="createError"
      @close="showAddModal = false"
      @submit="handleCreateTable"
    />

    <GenerateSchemaModal
      :open="showGenerateModal"
      :generating="generatingSchema"
      :progress="generateProgress"
      @close="showGenerateModal = false"
      @generate="handleGenerateSchema"
    />
  </div>
</template>
