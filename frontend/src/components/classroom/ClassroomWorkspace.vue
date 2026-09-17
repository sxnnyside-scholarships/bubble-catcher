<script setup lang="ts">
import type { Assignment, AssignmentSubmission, TestEvaluationResult } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import SqlEditor from '@/components/playground/SqlEditor.vue';

defineProps<{
  assignment: Assignment;
  courseTitle?: string;
  studentSql: string;
  evaluating: boolean;
  submitting: boolean;
  evalResult: TestEvaluationResult | null;
  existingSubmission: AssignmentSubmission | null;
  activeTab: 'instructions' | 'editor' | 'results';
}>();

const emit = defineEmits<{
  'update:studentSql': [val: string];
  'update:activeTab': [val: 'instructions' | 'editor' | 'results'];
  test: [];
  submit: [];
}>();

const { t } = useI18n();
</script>

<template>
  <main class="bubble-surface flex flex-col rounded-2xl overflow-hidden">
    <!-- Top Action Bar -->
    <div class="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
          <BrandIcon :dialect="assignment.dialect" size="md" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-[var(--color-text)]">{{ assignment.title }}</h2>
          <div class="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span v-if="courseTitle">{{ courseTitle }}</span>
            <span>•</span>
            <span class="font-medium">Max: {{ assignment.maxScore }} pts</span>
            <span
              v-if="existingSubmission"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold border"
              :class="
                existingSubmission.passed
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              "
            >
              {{ existingSubmission.passed ? t('classroom.passedBadge') : t('classroom.needsWorkBadge') }} ({{ existingSubmission.score }}/{{ assignment.maxScore }})
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          class="btn-bubble-ghost flex items-center gap-1.5 px-5 py-2 text-xs font-semibold"
          :disabled="evaluating || submitting || !studentSql.trim()"
          @click="emit('test')"
        >
          <MingcuteIcon :name="evaluating ? 'loading' : 'play'" class="h-4 w-4" :class="{ spin: evaluating }" />
          <span>{{ evaluating ? t('classroom.testingQuery') : t('classroom.testQuery') }}</span>
        </button>

        <button
          type="button"
          class="btn-bubble flex items-center gap-1.5 px-5 py-2 text-xs font-semibold shadow-md"
          :disabled="evaluating || submitting || !studentSql.trim()"
          @click="emit('submit')"
        >
          <MingcuteIcon :name="submitting ? 'loading' : 'check'" class="h-4 w-4" :class="{ spin: submitting }" />
          <span>{{ submitting ? t('classroom.submittingAssignment') : t('classroom.submitAssignment') }}</span>
        </button>
      </div>
    </div>

    <!-- Sub-navigation Tabs -->
    <div class="flex border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4">
      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all"
        :class="
          activeTab === 'instructions'
            ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        "
        @click="emit('update:activeTab', 'instructions')"
      >
        <MingcuteIcon name="info" class="h-4 w-4" />
        <span>{{ t('classroom.instructionsTab') }}</span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all"
        :class="
          activeTab === 'editor'
            ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        "
        @click="emit('update:activeTab', 'editor')"
      >
        <MingcuteIcon name="code" class="h-4 w-4" />
        <span>{{ t('classroom.editorTab') }}</span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all"
        :class="
          activeTab === 'results'
            ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        "
        @click="emit('update:activeTab', 'results')"
      >
        <MingcuteIcon name="table" class="h-4 w-4" />
        <span>{{ t('classroom.resultsTab') }}</span>
        <span
          v-if="evalResult"
          class="h-2 w-2 rounded-full"
          :class="evalResult.gradeBreakdown.tupleMatchPassed && evalResult.gradeBreakdown.astPassed ? 'bg-emerald-500' : 'bg-amber-500'"
        />
      </button>
    </div>

    <!-- Workspace Tab Content -->
    <div class="flex-1 overflow-y-auto p-5">
      <!-- 1. Instructions & Schema Tab -->
      <div v-show="activeTab === 'instructions'" class="flex flex-col gap-4">
        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            {{ t('classroom.labInstructions') }}
          </h3>
          <p class="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">
            {{ assignment.description }}
          </p>
        </div>

        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            {{ t('classroom.initialSchemaSection') }}
          </h3>
          <pre class="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-tertiary)] p-3 font-mono text-xs text-[var(--color-text)] leading-relaxed"><code>{{ assignment.initialSchemaSql }}</code></pre>
        </div>
      </div>

      <!-- 2. SQL Editor Tab -->
      <div v-show="activeTab === 'editor'" class="h-[460px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden shadow-sm">
        <SqlEditor
          :model-value="studentSql"
          :dialect="assignment.dialect"
          @update:model-value="emit('update:studentSql', $event)"
          @run="emit('test')"
        />
      </div>

      <!-- 3. Automated Grading Report Tab -->
      <div v-show="activeTab === 'results'" class="flex flex-col gap-4">
        <div v-if="!evalResult" class="py-16 text-center text-sm text-[var(--color-text-secondary)]">
          <MingcuteIcon name="table" class="mx-auto mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
          <p>{{ t('classroom.testOrSubmitNotice') }}</p>
        </div>

        <div v-else class="flex flex-col gap-4">
          <!-- Summary Grade Card -->
          <div
            class="flex items-center gap-4 rounded-2xl border p-5 shadow-sm"
            :class="
              evalResult.gradeBreakdown.tupleMatchPassed && evalResult.gradeBreakdown.astPassed
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-amber-500/30 bg-amber-500/10'
            "
          >
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-extrabold text-[var(--color-text)]">
                {{ evalResult.gradeBreakdown.tupleMatchScore + evalResult.gradeBreakdown.astScore + evalResult.gradeBreakdown.performanceScore }}
              </span>
              <span class="text-xs font-semibold text-[var(--color-text-secondary)]">/ {{ assignment.maxScore }}</span>
            </div>
            <div>
              <h4 class="text-sm font-bold text-[var(--color-text)]">
                {{ evalResult.gradeBreakdown.tupleMatchPassed && evalResult.gradeBreakdown.astPassed ? t('classroom.excellentWork') : t('classroom.evaluationCompleted') }}
              </h4>
              <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">{{ evalResult.gradeBreakdown.summaryFeedback }}</p>
            </div>
          </div>

          <!-- 3 Pillars Grid -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <!-- Pillar 1: Tuples -->
            <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
              <div class="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)] mb-2">
                <span>{{ t('classroom.tupleMatchResult') }}</span>
                <span>{{ evalResult.gradeBreakdown.tupleMatchScore }} / {{ evalResult.gradeBreakdown.tupleMatchMax }}</span>
              </div>
              <span
                class="inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-bold border"
                :class="evalResult.gradeBreakdown.tupleMatchPassed ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border-rose-500/30'"
              >
                {{ evalResult.gradeBreakdown.tupleMatchPassed ? t('classroom.tuplesIdentical') : t('classroom.tuplesMismatch') }}
              </span>
              <p class="mt-2 text-[0.7rem] text-[var(--color-text-secondary)]">
                {{ t('classroom.returnedRowsComparison', { returned: evalResult.gradeBreakdown.studentRowCount, expected: evalResult.gradeBreakdown.referenceRowCount }) }}
              </p>
            </div>

            <!-- Pillar 2: AST Analysis -->
            <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
              <div class="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)] mb-2">
                <span>{{ t('classroom.astValidationResult') }}</span>
                <span>{{ evalResult.gradeBreakdown.astScore }} / {{ evalResult.gradeBreakdown.astMax }}</span>
              </div>
              <span
                class="inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-bold border"
                :class="evalResult.gradeBreakdown.astPassed ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border-rose-500/30'"
              >
                {{ evalResult.gradeBreakdown.astPassed ? t('classroom.zeroAntiPatterns') : t('classroom.astViolationsCount', { count: evalResult.gradeBreakdown.astIssues.length }) }}
              </span>
              <div v-if="evalResult.gradeBreakdown.astIssues.length > 0" class="mt-2 flex flex-col gap-1 text-[0.7rem] text-rose-500">
                <div v-for="(iss, idx) in evalResult.gradeBreakdown.astIssues" :key="idx">
                  <span class="font-bold font-mono">{{ iss.ruleId }}:</span> {{ iss.message }}
                </div>
              </div>
            </div>

            <!-- Pillar 3: Latency -->
            <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
              <div class="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)] mb-2">
                <span>{{ t('classroom.performanceResult') }}</span>
                <span>{{ evalResult.gradeBreakdown.performanceScore }} / {{ evalResult.gradeBreakdown.performanceMax }}</span>
              </div>
              <span class="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.7rem] font-bold text-emerald-500 border border-emerald-500/30">
                {{ evalResult.gradeBreakdown.executionTimeMs }} ms
              </span>
              <p class="mt-2 text-[0.7rem] text-[var(--color-text-secondary)]">
                {{ t('classroom.referenceTeacherTime', { time: evalResult.gradeBreakdown.referenceTimeMs }) }}
              </p>
            </div>
          </div>

          <!-- Rows Preview Table -->
          <div v-if="evalResult.execution.rows && evalResult.execution.rows.length > 0" class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              {{ t('classroom.returnedRowsPreview') }}
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    <th v-for="col in evalResult.execution.columns" :key="col" class="py-2 pr-4 font-bold">{{ col }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border)]/60 text-[var(--color-text)]">
                  <tr v-for="(row, rIdx) in evalResult.execution.rows.slice(0, 10)" :key="rIdx">
                    <td v-for="(c, cIdx) in row" :key="cIdx" class="py-2 pr-4 font-mono">{{ c }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
