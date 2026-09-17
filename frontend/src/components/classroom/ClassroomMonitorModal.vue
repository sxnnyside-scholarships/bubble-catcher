<script setup lang="ts">
import type { Assignment, AssignmentSubmission } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  assignment: Assignment | null;
  submissions: AssignmentSubmission[];
  loading: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bubble-surface flex w-full max-w-4xl flex-col gap-4 rounded-2xl p-6 shadow-2xl">
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <h3 class="text-base font-bold text-[var(--color-text)]">{{ t('classroom.waitingRoom') }}</h3>
          <p class="text-xs text-[var(--color-text-secondary)]">{{ assignment?.title }} ({{ t('classroom.submissionsCount', { count: submissions.length }) }})</p>
        </div>
        <button type="button" class="btn-bubble-ghost !p-2" @click="emit('close')">
          <MingcuteIcon name="close" class="h-4 w-4" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-4">
        <BubbleSkeleton variant="table" :count="4" />
      </div>

      <!-- Empty Submissions State -->
      <div v-else-if="submissions.length === 0" class="py-4">
        <BubbleEmptyState
          icon="mortarboard"
          :title="t('classroom.noSubmissions')"
          :description="t('classroom.awaitingSubmissions')"
        />
      </div>

      <div v-else class="max-h-[500px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-[var(--color-border)] bg-[var(--color-surface-tertiary)] text-[var(--color-text)]">
              <th class="px-4 py-3 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('classroom.studentCol') }}</th>
              <th class="px-4 py-3 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('classroom.scoreCol') }}</th>
              <th class="px-4 py-3 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('classroom.tupleCheckCol') }}</th>
              <th class="px-4 py-3 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('classroom.astCheckCol') }}</th>
              <th class="px-4 py-3 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('classroom.latencyCol') }}</th>
              <th class="px-4 py-3 font-bold uppercase tracking-wider text-[0.7rem]">{{ t('classroom.dateCol') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]/60 bg-[var(--color-surface)]">
            <tr v-for="sub in submissions" :key="sub.id" class="hover:bg-[var(--color-surface-secondary)]">
              <td class="whitespace-nowrap px-4 py-3">
                <div class="font-bold text-[var(--color-text)]">{{ sub.studentName || t('classroom.defaultStudent') }}</div>
                <div class="text-[0.7rem] text-[var(--color-text-secondary)]">{{ sub.studentEmail }}</div>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span class="font-extrabold text-sm" :class="sub.passed ? 'text-emerald-500' : 'text-amber-500'">
                  {{ sub.score }} pts
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="rounded-md px-2 py-0.5 text-[0.7rem] font-bold border"
                  :class="sub.tupleMatchPassed ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border-rose-500/30'"
                >
                  {{ sub.tupleMatchPassed ? t('classroom.tuplePassedBadge') : t('classroom.tupleFailedBadge') }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="rounded-md px-2 py-0.5 text-[0.7rem] font-bold border"
                  :class="sub.astViolationsCount === 0 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border-rose-500/30'"
                >
                  {{ sub.astViolationsCount === 0 ? t('classroom.cleanBadge') : t('classroom.failuresBadge', { count: sub.astViolationsCount }) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 font-mono text-[var(--color-text-secondary)]">{{ sub.executionTimeMs }} ms</td>
              <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-secondary)]">{{ new Date(sub.createdAt).toLocaleTimeString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
