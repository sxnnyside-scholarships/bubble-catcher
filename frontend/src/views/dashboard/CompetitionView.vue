<script setup lang="ts">
import type { Challenge, ChallengeLeaderboardEntry, EvaluateGolfResult } from '@shared/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleErrorState from '@/components/common/BubbleErrorState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import CompetitionLeaderboard from '@/components/competition/CompetitionLeaderboard.vue';
import GolfScorecard from '@/components/competition/GolfScorecard.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import SqlEditor from '@/components/playground/SqlEditor.vue';
import { authJson, getJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const challenges = ref<Challenge[]>([]);
const loadingChallenges = ref(true);
const selectedChallengeId = ref<string | null>(null);

const studentSql = ref('');
const testing = ref(false);
const submitting = ref(false);
const evalResult = ref<EvaluateGolfResult | null>(null);
const evalError = ref<string | null>(null);

const leaderboard = ref<ChallengeLeaderboardEntry[]>([]);
const loadingLeaderboard = ref(false);

const activeBottomTab = ref<'scorecard' | 'leaderboard' | 'tuples'>('scorecard');
const showSchema = ref(false);

const currentChallenge = computed(() => {
  return challenges.value.find((c) => c.id === selectedChallengeId.value) || null;
});

const difficultyBadge = computed(() => {
  if (!currentChallenge.value) return { class: '', label: '' };
  switch (currentChallenge.value.difficulty) {
    case 'easy':
      return {
        class: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
        label: t('competition.difficultyEasy'),
      };
    case 'medium':
      return { class: 'border-amber-500/40 bg-amber-500/10 text-amber-400', label: t('competition.difficultyMedium') };
    case 'hard':
    default:
      return { class: 'border-rose-500/40 bg-rose-500/10 text-rose-400', label: t('competition.difficultyHard') };
  }
});

async function loadChallenges() {
  if (!auth.accessToken) return;
  loadingChallenges.value = true;
  const res = await getJson<Challenge[]>('/competition/challenges', auth.accessToken);
  if (res.success) {
    challenges.value = res.data;
    if (res.data.length > 0 && !selectedChallengeId.value) {
      selectChallenge(res.data[0]!.id);
    }
  }
  loadingChallenges.value = false;
}

function selectChallenge(id: string) {
  selectedChallengeId.value = id;
  evalResult.value = null;
  evalError.value = null;
  activeBottomTab.value = 'scorecard';
  studentSql.value = '-- Write your optimized query here\nSELECT ';
  loadLeaderboard(id);
}

async function loadLeaderboard(challengeId: string) {
  if (!auth.accessToken) return;
  loadingLeaderboard.value = true;
  const res = await getJson<ChallengeLeaderboardEntry[]>(
    `/competition/challenges/${challengeId}/leaderboard`,
    auth.accessToken,
  );
  if (res.success) {
    leaderboard.value = res.data;
  }
  loadingLeaderboard.value = false;
}

async function handleTest() {
  if (!auth.accessToken || !selectedChallengeId.value || !studentSql.value.trim()) return;
  testing.value = true;
  evalError.value = null;

  const res = await authJson<EvaluateGolfResult>(
    'POST',
    `/competition/challenges/${selectedChallengeId.value}/test`,
    auth.accessToken,
    { sql: studentSql.value },
  );

  testing.value = false;
  if (res.success) {
    evalResult.value = res.data;
    activeBottomTab.value = 'scorecard';
  } else {
    evalError.value = res.error?.message || 'Execution error during benchmark.';
  }
}

async function handleSubmit() {
  if (!auth.accessToken || !selectedChallengeId.value || !studentSql.value.trim()) return;
  submitting.value = true;
  evalError.value = null;

  const res = await authJson<EvaluateGolfResult>(
    'POST',
    `/competition/challenges/${selectedChallengeId.value}/submit`,
    auth.accessToken,
    { sql: studentSql.value },
  );

  submitting.value = false;
  if (res.success) {
    evalResult.value = res.data;
    activeBottomTab.value = 'scorecard';
    if (selectedChallengeId.value) {
      loadLeaderboard(selectedChallengeId.value);
      loadChallenges(); // refresh best score tags
    }
  } else {
    evalError.value = res.error?.message || 'Submission error.';
  }
}

onMounted(() => {
  loadChallenges();
});
</script>

<template>
  <div class="flex h-full flex-col gap-5 p-6 overflow-y-auto">
    <!-- Header with Golf Theme & Stats -->
    <div class="bubble-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)] border border-[var(--color-primary-500)]/20 shadow-inner">
          <MingcuteIcon name="trophy" class="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 class="text-lg font-extrabold text-[var(--color-text)] tracking-tight">
            {{ t('competition.title') }}
          </h1>
          <p class="text-xs text-[var(--color-text-secondary)]">
            {{ t('competition.subtitle') }}
          </p>
        </div>
      </div>

      <!-- Quick Concept Rules Banner -->
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)]/60 px-3 py-1 text-[var(--color-text-secondary)] font-medium">
          <MingcuteIcon name="flash" class="h-3.5 w-3.5 text-emerald-400" />
          <span>{{ t('competition.ruleBuffers') }}</span>
        </div>
        <div class="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)]/60 px-3 py-1 text-[var(--color-text-secondary)] font-medium">
          <MingcuteIcon name="target" class="h-3.5 w-3.5 text-sky-400" />
          <span>{{ t('competition.ruleTuples') }}</span>
        </div>
      </div>
    </div>

    <!-- Challenges Selector Carousel / Row -->
    <div class="flex flex-col gap-2">
      <h2 class="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
        {{ t('competition.selectChallenge') }}
      </h2>
      <div v-if="loadingChallenges" class="py-2">
        <BubbleSkeleton variant="cards" :count="3" />
      </div>
      <div v-else-if="challenges.length === 0">
        <BubbleEmptyState
          icon="trophy"
          :title="t('competition.noChallengesTitle')"
          :description="t('competition.noChallengesDesc')"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="ch in challenges"
          :key="ch.id"
          type="button"
          class="bubble-surface group flex flex-col justify-between rounded-xl p-4 text-left transition-all hover:border-[var(--color-primary-500)]/60 hover:shadow-md"
          :class="{
            '!border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-500)]/20 shadow-md':
              ch.id === selectedChallengeId,
          }"
          @click="selectChallenge(ch.id)"
        >
          <div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <BrandIcon :dialect="ch.dialect" class="h-4 w-4" />
                <span class="text-[0.65rem] font-bold text-[var(--color-text-tertiary)] uppercase">
                  {{ ch.dialect }}
                </span>
              </div>
              <span
                class="rounded-full border px-2 py-0.2 text-[0.65rem] font-bold"
                :class="
                  ch.difficulty === 'easy'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : ch.difficulty === 'medium'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                "
              >
                {{ ch.difficulty }}
              </span>
            </div>

            <h3 class="mt-2 text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary-500)]">
              {{ ch.title }}
            </h3>
            <p class="mt-1 line-clamp-2 text-[0.7rem] text-[var(--color-text-secondary)]">
              {{ ch.description }}
            </p>
          </div>

          <div class="mt-4 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-2 text-[0.7rem]">
            <span class="text-[var(--color-text-tertiary)]">
              {{ t('competition.parTarget') }}: <span class="font-bold text-[var(--color-text)]">{{ ch.targetBuffersRead }} buf</span>
            </span>
            <span v-if="ch.bestScore !== null && ch.bestScore !== undefined" class="font-bold text-emerald-400">
              {{ t('competition.best') }}: {{ ch.bestScore <= 0 ? (ch.bestScore === 0 ? 'E' : ch.bestScore) : `+${ch.bestScore}` }}
            </span>
            <span v-else class="text-[var(--color-text-tertiary)]">
              {{ t('competition.unattempted') }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Active Challenge Workspace -->
    <div v-if="currentChallenge" class="flex flex-col gap-4">
      <!-- Challenge Info & Par Goals Banner -->
      <div class="bubble-surface flex flex-col gap-3 rounded-2xl p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-full border px-2.5 py-0.5 text-xs font-bold" :class="difficultyBadge.class">
                {{ difficultyBadge.label }}
              </span>
              <span class="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] font-medium">
                <BrandIcon :dialect="currentChallenge.dialect" class="h-3.5 w-3.5" />
                {{ currentChallenge.dialect }}
              </span>
            </div>
            <h2 class="mt-2 text-base font-bold text-[var(--color-text)]">
              {{ currentChallenge.title }}
            </h2>
            <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
              {{ currentChallenge.description }}
            </p>
          </div>

          <!-- Par Benchmarks -->
          <div class="flex items-center gap-3">
            <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-center">
              <span class="text-[0.65rem] font-bold text-emerald-400 uppercase tracking-wider">
                {{ t('competition.parBuffers') }}
              </span>
              <div class="text-sm font-extrabold text-emerald-300">
                ≤ {{ currentChallenge.targetBuffersRead }}
              </div>
            </div>
            <div class="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-center">
              <span class="text-[0.65rem] font-bold text-sky-400 uppercase tracking-wider">
                {{ t('competition.parLatency') }}
              </span>
              <div class="text-sm font-extrabold text-sky-300">
                ≤ {{ currentChallenge.targetExecutionTimeMs }}ms
              </div>
            </div>
          </div>
        </div>

        <!-- Schema preview toggle -->
        <div class="border-t border-[var(--color-border)] pt-2">
          <button
            type="button"
            class="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-500)] hover:underline"
            @click="showSchema = !showSchema"
          >
            <MingcuteIcon :name="showSchema ? 'close' : 'storage'" class="h-3.5 w-3.5" />
            <span>{{ showSchema ? t('competition.hideSchema') : t('competition.viewSchema') }}</span>
          </button>
          <pre
            v-if="showSchema"
            class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 font-mono text-[0.7rem] text-[var(--color-text-secondary)]"
          >{{ currentChallenge.initialSchemaSql }}</pre>
        </div>
      </div>

      <!-- SQL Editor Container -->
      <div class="bubble-surface flex flex-col gap-3 rounded-2xl p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <MingcuteIcon name="code" class="h-4 w-4 text-[var(--color-primary-500)]" />
            <span class="text-xs font-bold text-[var(--color-text)]">
              {{ t('competition.solutionEditor') }}
            </span>
          </div>

          <!-- Action Buttons with btn-bubble-sm -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn-bubble-ghost btn-bubble-sm flex items-center gap-1.5 font-semibold"
              :disabled="testing || submitting || !studentSql.trim()"
              @click="handleTest"
            >
              <MingcuteIcon :name="testing ? 'loading' : 'flash'" class="h-3.5 w-3.5" :class="{ spin: testing }" />
              <span>{{ testing ? t('competition.benchmarking') : t('competition.benchmark') }}</span>
            </button>

            <button
              type="button"
              class="btn-bubble btn-bubble-sm flex items-center gap-1.5 font-semibold shadow-md"
              :disabled="testing || submitting || !studentSql.trim()"
              @click="handleSubmit"
            >
              <MingcuteIcon :name="submitting ? 'loading' : 'trophy'" class="h-3.5 w-3.5 text-amber-200" :class="{ spin: submitting }" />
              <span>{{ submitting ? t('competition.submitting') : t('competition.submitLeaderboard') }}</span>
            </button>
          </div>
        </div>

        <div class="h-56 overflow-hidden rounded-xl border border-[var(--color-border)]">
          <SqlEditor
            v-model="studentSql"
            :dialect="currentChallenge.dialect"
            class="h-full w-full"
          />
        </div>

        <!-- Evaluation Error (if any) -->
        <div v-if="evalError" class="mt-1">
          <BubbleErrorState
            :message="evalError"
            :retry-label="t('competition.benchmark')"
            :retry-loading="testing"
            @retry="handleTest"
          />
        </div>
      </div>

      <!-- Bottom Panel with Tabs (Scorecard, Leaderboard, Sample Tuples) -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
            :class="
              activeBottomTab === 'scorecard'
                ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            "
            @click="activeBottomTab = 'scorecard'"
          >
            {{ t('competition.tabScorecard') }}
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
            :class="
              activeBottomTab === 'leaderboard'
                ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            "
            @click="activeBottomTab = 'leaderboard'"
          >
            {{ t('competition.tabLeaderboard') }}
          </button>
          <button
            v-if="evalResult?.sampleRows && evalResult.sampleRows.length > 0"
            type="button"
            class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
            :class="
              activeBottomTab === 'tuples'
                ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            "
            @click="activeBottomTab = 'tuples'"
          >
            {{ t('competition.tabTuples') }}
          </button>
        </div>

        <!-- Tab 1: Golf Scorecard -->
        <div v-if="activeBottomTab === 'scorecard'">
          <GolfScorecard v-if="evalResult" :result="evalResult" />
          <BubbleEmptyState
            v-else
            icon="trophy"
            :title="t('competition.runBenchmarkPrompt')"
            :description="t('competition.runBenchmarkHint')"
            :action-label="t('competition.benchmark')"
            @action="handleTest"
          />
        </div>

        <!-- Tab 2: Leaderboard -->
        <div v-if="activeBottomTab === 'leaderboard'">
          <CompetitionLeaderboard
            :leaderboard="leaderboard"
            :current-user-id="auth.user?.id"
            :loading="loadingLeaderboard"
          />
        </div>

        <!-- Tab 3: Sample Tuples -->
        <div v-if="activeBottomTab === 'tuples' && evalResult?.sampleRows" class="bubble-surface overflow-x-auto rounded-2xl p-4">
          <table class="w-full text-left text-xs font-mono">
            <thead>
              <tr class="border-b border-[var(--color-border)] text-[0.7rem] text-[var(--color-text-tertiary)] uppercase">
                <th v-for="(col, i) in evalResult.columns" :key="i" class="py-2 px-3">
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]/50">
              <tr v-for="(row, rIdx) in evalResult.sampleRows" :key="rIdx" class="hover:bg-[var(--color-surface-hover)]">
                <td v-for="(cell, cIdx) in row" :key="cIdx" class="py-2 px-3 text-[var(--color-text)]">
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
