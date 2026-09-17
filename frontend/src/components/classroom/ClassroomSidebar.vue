<script setup lang="ts">
import type { Assignment, Course } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  courses: Course[];
  selectedCourse: Course | null;
  assignments: Assignment[];
  selectedAssignment: Assignment | null;
  isTeacher: boolean;
}>();

const emit = defineEmits<{
  selectCourse: [course: Course];
  selectAssignment: [assignment: Assignment];
  createAssignment: [];
  openMonitor: [assignment: Assignment];
}>();

const { t } = useI18n();
</script>

<template>
  <aside class="bubble-surface flex flex-col gap-5 rounded-2xl p-4 overflow-y-auto">
    <!-- Courses Section -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {{ t('classroom.coursesTab') }}
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <button
          v-for="c in courses"
          :key="c.id"
          type="button"
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all"
          :class="
            selectedCourse?.id === c.id
              ? 'bg-[var(--color-primary-500)] text-white shadow-md'
              : 'text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)]'
          "
          @click="emit('selectCourse', c)"
        >
          <div class="flex flex-col truncate">
            <span class="text-xs font-bold truncate">{{ c.title }}</span>
            <span
              class="text-[0.65rem] font-mono"
              :class="selectedCourse?.id === c.id ? 'text-white/80' : 'text-[var(--color-text-tertiary)]'"
            >
              {{ c.joinCode }}
            </span>
          </div>
          <MingcuteIcon name="right" class="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
        </button>
      </div>
    </div>

    <!-- Assignments Section -->
    <div class="flex flex-col gap-2 border-t border-[var(--color-border)]/70 pt-4">
      <div class="flex items-center justify-between">
        <span class="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {{ t('classroom.assignments') }}
        </span>
        <button
          v-if="isTeacher && selectedCourse"
          type="button"
          class="btn-bubble-ghost !p-1.5"
          :title="t('classroom.createAssignment')"
          @click="emit('createAssignment')"
        >
          <MingcuteIcon name="add" class="h-3.5 w-3.5" />
        </button>
      </div>

      <div v-if="assignments.length === 0" class="py-4 text-center text-xs text-[var(--color-text-tertiary)]">
        {{ t('classroom.noAssignments') }}
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="a in assignments"
          :key="a.id"
          class="flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-all"
          :class="
            selectedAssignment?.id === a.id
              ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 shadow-sm ring-1 ring-[var(--color-primary-500)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)]/70 hover:border-[var(--color-border-hover)]'
          "
          @click="emit('selectAssignment', a)"
        >
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
              <BrandIcon :dialect="a.dialect" size="sm" />
            </div>
            <span class="text-xs font-bold text-[var(--color-text)] truncate">{{ a.title }}</span>
          </div>

          <div class="flex items-center justify-between pt-1 text-[0.65rem] text-[var(--color-text-secondary)]">
            <span class="font-bold uppercase tracking-wider">{{ a.dialect }}</span>
            <button
              v-if="isTeacher"
              type="button"
              class="btn-bubble-ghost !px-2 !py-1 text-[0.65rem] font-semibold"
              :title="t('classroom.viewSubmissions')"
              @click.stop="emit('openMonitor', a)"
            >
              <MingcuteIcon name="file" class="h-3 w-3" />
              <span>{{ t('classroom.monitorButton') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
