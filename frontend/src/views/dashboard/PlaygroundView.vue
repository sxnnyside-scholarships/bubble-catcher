<script setup lang="ts">
import type { DialectsResponse, PaginatedResponse, PlaygroundShare, Project, SupportedDialect } from '@shared/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import BrandIcon from '@/components/BrandIcon.vue';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleErrorState from '@/components/common/BubbleErrorState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { resolveErrorCode } from '@/i18n';
import { authJson, getJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const enabledDialects = ref<SupportedDialect[]>([]);
const projects = ref<Project[]>([]);
const creatingDialect = ref<SupportedDialect | null>(null);
const newTitle = ref('');
const submitError = ref('');
const sharedInfo = ref<PlaygroundShare | null>(null);
const loadError = ref<string | null>(null);

const projectByDialect = computed(() => {
  const map = new Map<string, Project>();
  for (const project of projects.value) map.set(project.dialect, project);
  return map;
});

async function checkShareParam() {
  const shareId = route.query.share;
  if (!shareId || !auth.accessToken) return;

  const res = await getJson<PlaygroundShare>(`/playground/shares/${shareId}`, auth.accessToken);
  if (res.success) {
    sharedInfo.value = res.data;
    const existing = projectByDialect.value.get(res.data.dialect);
    if (existing) {
      router.push(`/dashboard/playground/${existing.id}?share=${shareId}`);
    } else {
      creatingDialect.value = res.data.dialect;
      newTitle.value = res.data.title;
    }
  }
}

async function loadData() {
  if (!auth.accessToken) return;
  loading.value = true;
  loadError.value = null;
  const [dialectsResult, projectsResult] = await Promise.all([
    getJson<DialectsResponse>('/execution/dialects', auth.accessToken),
    getJson<PaginatedResponse<Project>>('/projects', auth.accessToken),
  ]);
  if (dialectsResult.success) enabledDialects.value = dialectsResult.data.enabled;
  if (projectsResult.success) projects.value = projectsResult.data.items;
  if (!dialectsResult.success && !projectsResult.success) {
    loadError.value = dialectsResult.error?.message || projectsResult.error?.message || t('errors.INTERNAL_ERROR');
  }
  await checkShareParam();
  loading.value = false;
}

onMounted(loadData);

function startCreate(dialect: SupportedDialect) {
  creatingDialect.value = dialect;
  newTitle.value = '';
  submitError.value = '';
}

function cancelCreate() {
  creatingDialect.value = null;
}

async function submitCreate() {
  if (!auth.accessToken || !creatingDialect.value || !newTitle.value.trim()) return;

  const result = await authJson<Project>('POST', '/projects', auth.accessToken, {
    title: newTitle.value.trim(),
    description: '',
    dialect: creatingDialect.value,
  });

  if (!result.success) {
    submitError.value = resolveErrorCode(result.error.code);
    return;
  }

  projects.value.push(result.data);
  creatingDialect.value = null;
  router.push(`/dashboard/playground/${result.data.id}`);
}

function openProject(project: Project) {
  router.push(`/dashboard/playground/${project.id}`);
}
</script>

<template>
  <div v-if="loading" class="py-4">
    <BubbleSkeleton variant="cards" :count="3" />
  </div>

  <div v-else-if="loadError" class="py-6">
    <BubbleErrorState
      :message="loadError"
      :retry-label="t('common.retry')"
      @retry="loadData"
    />
  </div>

  <div v-else-if="enabledDialects.length === 0" class="py-6">
    <BubbleEmptyState
      icon="playground"
      :title="t('playground.chooseEngine')"
      :description="t('playground.engineOffline')"
    />
  </div>

  <div v-else class="flex flex-col gap-6">
    <p class="text-sm text-[var(--color-text-secondary)]">{{ t('playground.chooseEngine') }}</p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="dialect in enabledDialects" :key="dialect" class="bubble-surface flex flex-col gap-4 rounded-2xl p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm">
            <BrandIcon :dialect="dialect" />
          </div>
          <h3 class="font-semibold capitalize text-[var(--color-text)]">{{ dialect }}</h3>
        </div>

        <button
          v-if="projectByDialect.has(dialect)"
          type="button"
          class="btn-bubble w-full text-sm"
          @click="openProject(projectByDialect.get(dialect)!)"
        >
          {{ t('playground.openProject') }} — {{ projectByDialect.get(dialect)!.title }}
        </button>

        <template v-else>
          <button
            v-if="creatingDialect !== dialect"
            type="button"
            class="btn-bubble-ghost btn-bubble-ghost--lg w-full text-sm"
            @click="startCreate(dialect)"
          >
            {{ t('playground.createProject') }}
          </button>

          <form v-else class="flex flex-col gap-2" @submit.prevent="submitCreate">
            <label class="flex flex-col gap-1 text-xs">
              <span class="font-medium text-[var(--color-text-secondary)]">{{ t('playground.projectTitle') }}</span>
              <input
                v-model="newTitle"
                type="text"
                autofocus
                required
                :placeholder="t('playground.projectTitlePlaceholder')"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              />
            </label>
            <p v-if="submitError" class="text-xs text-[var(--color-error)]">{{ submitError }}</p>
            <div class="flex gap-2">
              <button type="submit" class="btn-bubble flex-1 text-xs">{{ t('playground.createProject') }}</button>
              <button type="button" class="btn-bubble-ghost text-xs p-2 flex items-center justify-center" @click="cancelCreate">
                <MingcuteIcon name="close" class="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
