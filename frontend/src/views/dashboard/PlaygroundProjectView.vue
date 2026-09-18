<script setup lang="ts">
import type {
  AnalysisIssue,
  AnalysisResult,
  ExecutionHistoryEntry,
  ExecutionResult,
  ExplainPlanResult,
  PaginatedResponse,
  PlaygroundShare,
  Project,
  SavedQuery,
} from '@shared/types';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import BrandIcon from '@/components/BrandIcon.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import AnalysisPanel from '@/components/playground/AnalysisPanel.vue';
import ExecutionPanel from '@/components/playground/ExecutionPanel.vue';
import ExplainPlanView from '@/components/playground/ExplainPlanView.vue';
import HistoryPanel from '@/components/playground/HistoryPanel.vue';
import SavedQueryModal from '@/components/playground/SavedQueryModal.vue';
import SharePlaygroundModal from '@/components/playground/SharePlaygroundModal.vue';
import SnippetBar from '@/components/playground/SnippetBar.vue';
import SqlEditor from '@/components/playground/SqlEditor.vue';
import { resolveErrorCode } from '@/i18n';
import { authJson, getJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { usePlaygroundStore } from '@/stores/playground';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const playground = usePlaygroundStore();

const project = ref<Project | null>(null);
const loading = ref(true);
const sql = ref('');
const running = ref(false);
const result = ref<ExecutionResult | null>(null);
const runError = ref('');

const explainPlan = ref<ExplainPlanResult | null>(null);
const explaining = ref(false);
const explainError = ref('');
const showShareModal = ref(false);
const sharedData = ref<PlaygroundShare | null>(null);

const issues = ref<AnalysisIssue[]>([]);
const analyzing = ref(false);
const analyzed = ref(false);

const recentQueries = ref<SavedQuery[]>([]);
const allQueries = ref<SavedQuery[]>([]);
const showQueryModal = ref(false);
const savingQuery = ref(false);
const showSavePopover = ref(false);
const saveTitle = ref('');

const history = ref<ExecutionHistoryEntry[]>([]);
const historyLoading = ref(false);

const activeTab = ref<'analysis' | 'execution' | 'explain' | 'history'>('analysis');

const editorRef = ref<{ insertAtCursor: (text: string, pos?: number) => void } | null>(null);
const projectId = computed(() => String(route.params.projectId));

onMounted(async () => {
  if (!auth.accessToken) return;
  const response = await getJson<Project>(`/projects/${projectId.value}`, auth.accessToken);
  if (response.success) {
    project.value = response.data;
    playground.currentProjectTitle = response.data.title;
  }
  loading.value = false;

  loadRecentQueries();
  loadHistory();
  checkShare();
});

onBeforeUnmount(() => {
  playground.currentProjectTitle = null;
});

async function loadRecentQueries() {
  if (!auth.accessToken) return;
  const response = await getJson<SavedQuery[]>(`/projects/${projectId.value}/queries/recent`, auth.accessToken);
  if (response.success) recentQueries.value = response.data;
}

async function loadHistory() {
  if (!auth.accessToken) return;
  historyLoading.value = true;
  const response = await getJson<PaginatedResponse<ExecutionHistoryEntry>>(
    `/execution/history/${projectId.value}`,
    auth.accessToken,
  );
  if (response.success) history.value = response.data.items;
  historyLoading.value = false;
}

async function openQueryModal() {
  showQueryModal.value = true;
  if (!auth.accessToken) return;
  const response = await getJson<SavedQuery[]>(`/projects/${projectId.value}/queries`, auth.accessToken);
  if (response.success) allQueries.value = response.data;
}

function insertText(text: string) {
  if (editorRef.value) {
    editorRef.value.insertAtCursor(text);
  } else {
    sql.value = sql.value ? `${sql.value}\n${text}` : text;
  }
}

function insertFromModal(text: string) {
  insertText(text);
  showQueryModal.value = false;
}

function replaceQuery(text: string) {
  sql.value = text;
}

async function confirmSaveQuery() {
  if (!auth.accessToken || !project.value || !sql.value.trim() || !saveTitle.value.trim()) return;

  savingQuery.value = true;
  await authJson('POST', `/projects/${project.value.id}/queries`, auth.accessToken, {
    title: saveTitle.value.trim(),
    sql: sql.value,
  });
  savingQuery.value = false;
  showSavePopover.value = false;
  saveTitle.value = '';
  loadRecentQueries();
}

async function runQuery() {
  if (!auth.accessToken || !project.value || !sql.value.trim()) return;

  running.value = true;
  runError.value = '';
  result.value = null;
  activeTab.value = 'execution';

  const response = await authJson<ExecutionResult>('POST', '/execution/run', auth.accessToken, {
    sql: sql.value,
    dialect: project.value.dialect,
    projectId: project.value.id,
  });

  if (!response.success) {
    runError.value = resolveErrorCode(response.error.code);
  } else {
    result.value = response.data;
    loadHistory();
  }

  running.value = false;
}

async function explainQuery() {
  if (!auth.accessToken || !project.value || !sql.value.trim()) return;

  explaining.value = true;
  explainError.value = '';
  explainPlan.value = null;
  activeTab.value = 'explain';

  const response = await authJson<ExplainPlanResult>('POST', '/execution/explain', auth.accessToken, {
    sql: sql.value,
    dialect: project.value.dialect,
    projectId: project.value.id,
  });

  if (!response.success) {
    explainError.value = resolveErrorCode(response.error.code) || response.error.message;
  } else {
    explainPlan.value = response.data;
  }

  explaining.value = false;
}

const shareId = computed(() => (route.query.share ? String(route.query.share) : null));

async function checkShare() {
  if (!shareId.value || !auth.accessToken) return;
  const res = await getJson<PlaygroundShare>(`/playground/shares/${shareId.value}`, auth.accessToken);
  if (res.success) {
    sharedData.value = res.data;
    if (!sql.value.trim()) {
      sql.value = res.data.sql;
    }
  }
}

/* Debounced live AST analysis on query input changes. */
let debounceHandle: ReturnType<typeof setTimeout> | undefined;

async function runAnalysis() {
  if (!auth.accessToken || !project.value || !sql.value.trim()) {
    issues.value = [];
    analyzed.value = false;
    return;
  }

  analyzing.value = true;
  const response = await authJson<AnalysisResult>('POST', '/analysis/analyze', auth.accessToken, {
    sql: sql.value,
    dialect: project.value.dialect,
  });

  if (response.success) {
    issues.value = response.data.issues;
    analyzed.value = true;
  }
  analyzing.value = false;
}

watch(sql, () => {
  clearTimeout(debounceHandle);
  debounceHandle = setTimeout(runAnalysis, 600);
});

onBeforeUnmount(() => clearTimeout(debounceHandle));

const TABS = [
  { key: 'analysis', label: 'playground.tabAnalysis', icon: 'alert' },
  { key: 'execution', label: 'playground.tabExecution', icon: 'flash' },
  { key: 'explain', label: 'playground.tabExplain', icon: 'chartLine' },
  { key: 'history', label: 'playground.tabHistory', icon: 'clock' },
] as const;
</script>

<template>
  <div v-if="loading" class="flex justify-center py-24 text-sm text-[var(--color-text-tertiary)]">
    {{ t('common.loading') }}
  </div>

  <div v-else-if="project" class="flex h-[calc(100vh-11rem)] min-h-[36rem] flex-col gap-3">
    <!-- Shared Permalink Banner -->
    <div
      v-if="sharedData"
      class="flex flex-col gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 sm:flex-row sm:items-center sm:justify-between text-xs"
    >
      <div class="flex items-center gap-2.5">
        <MingcuteIcon name="link" class="h-4 w-4 text-purple-400 flex-shrink-0" />
        <div>
          <span class="font-bold text-[var(--color-text)]">{{ sharedData.title }}</span>
          <span v-if="sharedData.authorName" class="text-[var(--color-text-secondary)] ml-1.5">
            — {{ t('share.sharedBy', { author: sharedData.authorName }) }}
          </span>
          <p v-if="sharedData.notes" class="text-[0.7rem] text-[var(--color-text-tertiary)] italic mt-0.5">
            "{{ sharedData.notes }}"
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          class="btn-bubble-ghost text-xs !px-3 !py-1"
          @click="sql = sharedData.sql"
        >
          {{ t('share.loadSql') }}
        </button>
      </div>
    </div>

    <!-- Header toolbar -->
    <div class="bubble-surface relative z-30 flex flex-shrink-0 items-center justify-between rounded-2xl px-4 py-3">
      <div class="flex items-center gap-3">
        <RouterLink
          to="/dashboard/playground"
          class="icon-bubble icon-bubble-sm"
          :title="t('playground.backToPlayground')"
        >
          <MingcuteIcon name="chevronLeft" class="h-4 w-4" />
        </RouterLink>
        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
          <BrandIcon :dialect="project.dialect" />
        </div>
        <h1 class="text-base font-bold text-[var(--color-text)]">{{ project.title }}</h1>
      </div>

      <div class="relative flex items-center gap-2">
        <!-- Share button -->
        <button
          type="button"
          class="btn-bubble-ghost btn-bubble-sm flex items-center gap-1.5 font-semibold"
          :title="t('share.shareButton')"
          :disabled="!sql.trim()"
          @click="showShareModal = true"
        >
          <MingcuteIcon name="link" class="h-4 w-4 text-[var(--color-primary-500)]" />
          <span>{{ t('share.shareButton') }}</span>
        </button>

        <!-- Explain Plan button -->
        <button
          type="button"
          class="btn-bubble-ghost btn-bubble-sm flex items-center gap-1.5 font-semibold"
          :disabled="explaining || !sql.trim()"
          @click="explainQuery"
        >
          <MingcuteIcon :name="explaining ? 'loading' : 'chartLine'" class="h-4 w-4" :class="{ spin: explaining }" />
          <span>{{ explaining ? t('playground.explaining') : t('playground.explainQuery') }}</span>
        </button>

        <button
          type="button"
          class="btn-bubble-ghost btn-bubble-sm font-semibold"
          :disabled="!sql.trim()"
          @click="showSavePopover = !showSavePopover"
        >
          {{ t('playground.saveQuery') }}
        </button>
        <button
          type="button"
          class="btn-bubble btn-bubble-sm font-semibold"
          :disabled="running || !sql.trim()"
          @click="runQuery"
        >
          {{ running ? t('playground.running') : t('playground.runQuery') }}
        </button>

        <div
          v-if="showSavePopover"
          class="bubble-surface absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-xl p-3"
        >
          <label class="flex flex-col gap-1.5 text-xs">
            <span class="font-medium text-[var(--color-text-secondary)]">{{ t('playground.queryTitlePrompt') }}</span>
            <input
              v-model="saveTitle"
              type="text"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
              @keyup.enter="confirmSaveQuery"
            />
          </label>
          <button
            type="button"
            class="btn-bubble mt-2 w-full text-xs"
            :disabled="!saveTitle.trim() || savingQuery"
            @click="confirmSaveQuery"
          >
            {{ savingQuery ? t('playground.savingQuery') : t('playground.saveQuery') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main split: editor | tabs -->
    <div class="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <div class="bubble-surface flex min-h-0 flex-1 flex-col gap-3 rounded-2xl p-4">
        <SnippetBar :recent-queries="recentQueries" @insert="insertText" @show-all="openQueryModal" />
        <SqlEditor ref="editorRef" v-model="sql" :dialect="project.dialect" class="min-h-0 flex-1" @run="runQuery" />
      </div>

      <div
        class="bubble-surface flex min-h-0 flex-shrink-0 flex-col rounded-2xl transition-all"
        :class="activeTab === 'explain' ? 'lg:w-[32rem]' : 'lg:w-96'"
      >
        <div class="flex flex-shrink-0 border-b border-[var(--color-border)]">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors"
            :class="
              activeTab === tab.key
                ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            "
            @click="activeTab = tab.key"
          >
            <MingcuteIcon :name="tab.icon" class="h-3.5 w-3.5" />
            {{ t(tab.label) }}
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <AnalysisPanel
            v-if="activeTab === 'analysis'"
            :issues="issues"
            :analyzing="analyzing"
            :analyzed="analyzed"
            @insert-rewrite="replaceQuery"
          />
          <ExecutionPanel v-else-if="activeTab === 'execution'" :result="result" :running="running" :dialect="project?.dialect" />
          <ExplainPlanView
            v-else-if="activeTab === 'explain'"
            :plan="explainPlan"
            :loading="explaining"
            :error="explainError"
            @explain="explainQuery"
          />
          <HistoryPanel v-else :entries="history" :loading="historyLoading" />
        </div>
      </div>
    </div>

    <p v-if="runError" class="flex-shrink-0 text-xs text-[var(--color-error)]">{{ runError }}</p>

    <SavedQueryModal :open="showQueryModal" :queries="allQueries" @close="showQueryModal = false" @insert="insertFromModal" />

    <!-- Share Playground Modal -->
    <SharePlaygroundModal
      v-if="showShareModal"
      :project-id="project.id"
      :sql="sql"
      :dialect="project.dialect"
      :default-title="project.title"
      @close="showShareModal = false"
    />
  </div>
</template>

