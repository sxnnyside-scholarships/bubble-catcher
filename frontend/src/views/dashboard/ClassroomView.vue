<script setup lang="ts">
import type {
  Assignment,
  AssignmentSubmission,
  Course,
  CreateAssignmentPayload,
  TestEvaluationResult,
} from '@shared/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ClassroomMonitorModal from '@/components/classroom/ClassroomMonitorModal.vue';
import ClassroomSidebar from '@/components/classroom/ClassroomSidebar.vue';
import ClassroomWorkspace from '@/components/classroom/ClassroomWorkspace.vue';
import CreateAssignmentModal from '@/components/classroom/CreateAssignmentModal.vue';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { authJson, getJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const isTeacher = computed(() => auth.user?.role === 'admin');

// State
const loading = ref(true);
const courses = ref<Course[]>([]);
const selectedCourse = ref<Course | null>(null);
const assignments = ref<Assignment[]>([]);
const selectedAssignment = ref<Assignment | null>(null);

// Join Course Modal
const showJoinModal = ref(false);
const joinCodeInput = ref('');
const joining = ref(false);

// Create Course Modal
const showCreateCourseModal = ref(false);
const newCourseTitle = ref('');
const newCourseDesc = ref('');
const creatingCourse = ref(false);

// Create Assignment Modal
const showCreateAssignmentModal = ref(false);
const creatingAssignment = ref(false);

// Solver Workspace State
const studentSql = ref('');
const evaluating = ref(false);
const submitting = ref(false);
const evalResult = ref<TestEvaluationResult | null>(null);
const existingSubmission = ref<AssignmentSubmission | null>(null);
const activeSolverTab = ref<'instructions' | 'editor' | 'results'>('instructions');

// Instructor Submissions Monitor
const showMonitorModal = ref(false);
const monitoringAssignment = ref<Assignment | null>(null);
const monitorSubmissions = ref<AssignmentSubmission[]>([]);
const loadingMonitor = ref(false);

// Toast
const toast = ref('');
function showToast(msg: string) {
  toast.value = msg;
  setTimeout(() => {
    toast.value = '';
  }, 4000);
}

// Data fetching
async function loadCourses() {
  if (!auth.accessToken) return;
  loading.value = true;
  const res = await getJson<Course[]>('/classroom/courses', auth.accessToken);
  if (res.success) {
    courses.value = res.data;
    if (courses.value.length > 0 && !selectedCourse.value) {
      selectCourse(courses.value[0]);
    }
  }
  loading.value = false;
}

async function selectCourse(course: Course) {
  selectedCourse.value = course;
  selectedAssignment.value = null;
  evalResult.value = null;
  existingSubmission.value = null;
  if (!auth.accessToken) return;
  const res = await getJson<Assignment[]>(`/classroom/courses/${course.id}/assignments`, auth.accessToken);
  if (res.success) {
    assignments.value = res.data;
  }
}

async function selectAssignment(assignment: Assignment) {
  selectedAssignment.value = assignment;
  studentSql.value = '';
  evalResult.value = null;
  activeSolverTab.value = 'instructions';

  if (!auth.accessToken) return;
  const res = await getJson<AssignmentSubmission | null>(
    `/classroom/assignments/${assignment.id}/my-submission`,
    auth.accessToken,
  );
  if (res.success && res.data) {
    existingSubmission.value = res.data;
    studentSql.value = res.data.submittedSql;
    evalResult.value = {
      execution: {
        success: res.data.passed,
        status: res.data.passed ? 'success' : 'error',
        executionTimeMs: res.data.executionTimeMs,
        executedAt: res.data.createdAt,
      },
      referenceExecution: null,
      gradeBreakdown: res.data.feedback,
    };
  } else {
    existingSubmission.value = null;
  }
}

async function handleJoinCourse() {
  if (!auth.accessToken || !joinCodeInput.value.trim()) return;
  joining.value = true;
  const res = await authJson<Course>('POST', '/classroom/courses/join', auth.accessToken, {
    joinCode: joinCodeInput.value.trim(),
  });
  joining.value = false;
  if (res.success) {
    showJoinModal.value = false;
    joinCodeInput.value = '';
    showToast(t('classroom.enrollSuccess'));
    await loadCourses();
    selectCourse(res.data);
  }
}

async function handleCreateCourse() {
  if (!auth.accessToken || !newCourseTitle.value.trim()) return;
  creatingCourse.value = true;
  const res = await authJson<Course>('POST', '/classroom/courses', auth.accessToken, {
    title: newCourseTitle.value.trim(),
    description: newCourseDesc.value.trim(),
  });
  creatingCourse.value = false;
  if (res.success) {
    showCreateCourseModal.value = false;
    newCourseTitle.value = '';
    newCourseDesc.value = '';
    showToast(t('classroom.courseCreated'));
    await loadCourses();
    selectCourse(res.data);
  }
}

async function handleCreateAssignment(payload: CreateAssignmentPayload) {
  if (!auth.accessToken || !selectedCourse.value) return;
  creatingAssignment.value = true;
  const res = await authJson<Assignment>(
    'POST',
    `/classroom/courses/${selectedCourse.value.id}/assignments`,
    auth.accessToken,
    payload,
  );
  creatingAssignment.value = false;
  if (res.success) {
    showCreateAssignmentModal.value = false;
    showToast(t('classroom.assignmentCreated'));
    selectCourse(selectedCourse.value);
  }
}

async function handleTestQuery() {
  if (!auth.accessToken || !selectedAssignment.value || !studentSql.value.trim()) return;
  evaluating.value = true;
  const res = await authJson<TestEvaluationResult>(
    'POST',
    `/classroom/assignments/${selectedAssignment.value.id}/test`,
    auth.accessToken,
    { sql: studentSql.value },
  );
  evaluating.value = false;
  if (res.success) {
    evalResult.value = res.data;
    activeSolverTab.value = 'results';
  }
}

async function handleSubmitAssignment() {
  if (!auth.accessToken || !selectedAssignment.value || !studentSql.value.trim()) return;
  submitting.value = true;
  const res = await authJson<AssignmentSubmission>(
    'POST',
    `/classroom/assignments/${selectedAssignment.value.id}/submit`,
    auth.accessToken,
    { sql: studentSql.value },
  );
  submitting.value = false;
  if (res.success) {
    existingSubmission.value = res.data;
    evalResult.value = {
      execution: {
        success: res.data.passed,
        status: res.data.passed ? 'success' : 'error',
        executionTimeMs: res.data.executionTimeMs,
        executedAt: res.data.createdAt,
      },
      referenceExecution: null,
      gradeBreakdown: res.data.feedback,
    };
    activeSolverTab.value = 'results';
    showToast(t('classroom.submissionConfirmed'));
  }
}

async function openMonitor(assignment: Assignment) {
  monitoringAssignment.value = assignment;
  showMonitorModal.value = true;
  if (!auth.accessToken) return;
  loadingMonitor.value = true;
  const res = await getJson<AssignmentSubmission[]>(
    `/classroom/assignments/${assignment.id}/submissions`,
    auth.accessToken,
  );
  if (res.success) {
    monitorSubmissions.value = res.data;
  }
  loadingMonitor.value = false;
}

onMounted(() => {
  loadCourses();
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Toast Feedback -->
    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white shadow-xl"
      >
        <MingcuteIcon name="check" class="h-4 w-4" />
        {{ toast }}
      </div>
    </Transition>

    <!-- Header Section with Bubblemorphism -->
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3.5">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)] shadow-sm">
          <MingcuteIcon name="mortarboard" class="h-6 w-6" />
        </div>
        <div>
          <h1 class="text-xl font-extrabold text-[var(--color-text)] tracking-tight">{{ t('classroom.title') }}</h1>
          <p class="text-xs text-[var(--color-text-secondary)]">{{ t('classroom.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button v-if="!isTeacher" type="button" class="btn-bubble-ghost flex items-center gap-2 px-4 py-2 text-xs font-semibold" @click="showJoinModal = true">
          <MingcuteIcon name="add" class="h-4 w-4" />
          <span>{{ t('classroom.joinCourse') }}</span>
        </button>

        <button v-if="isTeacher" type="button" class="btn-bubble flex items-center gap-2 px-5 py-2 text-xs font-semibold shadow-md" @click="showCreateCourseModal = true">
          <MingcuteIcon name="folder" class="h-4 w-4" />
          <span>{{ t('classroom.createCourse') }}</span>
        </button>
      </div>
    </header>

    <!-- Content State: Skeleton Cards -->
    <div v-if="loading" class="py-6">
      <BubbleSkeleton variant="cards" :count="3" />
    </div>

    <!-- Empty Courses State -->
    <div v-else-if="courses.length === 0" class="py-6">
      <BubbleEmptyState
        icon="mortarboard"
        :title="t('classroom.coursesTab')"
        :description="t('classroom.noCourses')"
        :action-label="!isTeacher ? t('classroom.joinCourse') : t('classroom.createCourse')"
        @action="!isTeacher ? (showJoinModal = true) : (showCreateCourseModal = true)"
      />
    </div>

    <!-- Active Classroom Layout -->
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] h-[calc(100vh-190px)] min-h-[580px]">
      <!-- Left Sidebar: Courses & Assignments -->
      <ClassroomSidebar
        :courses="courses"
        :selected-course="selectedCourse"
        :assignments="assignments"
        :selected-assignment="selectedAssignment"
        :is-teacher="isTeacher"
        @select-course="selectCourse"
        @select-assignment="selectAssignment"
        @create-assignment="showCreateAssignmentModal = true"
        @open-monitor="openMonitor"
      />

      <!-- Workspace Area Empty State -->
      <div v-if="!selectedAssignment" class="flex h-full items-center justify-center">
        <BubbleEmptyState
          icon="mortarboard"
          :title="t('classroom.solveAssignment')"
          :description="selectedCourse ? t('classroom.assignments') : t('classroom.noCourses')"
        />
      </div>

      <ClassroomWorkspace
        v-else
        :assignment="selectedAssignment"
        :course-title="selectedCourse?.title"
        :student-sql="studentSql"
        :evaluating="evaluating"
        :submitting="submitting"
        :eval-result="evalResult"
        :existing-submission="existingSubmission"
        :active-tab="activeSolverTab"
        @update:student-sql="studentSql = $event"
        @update:active-tab="activeSolverTab = $event"
        @test="handleTestQuery"
        @submit="handleSubmitAssignment"
      />
    </div>

    <!-- Modals -->
    <!-- 1. Join Course Modal -->
    <div v-if="showJoinModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="showJoinModal = false">
      <div class="bubble-surface flex w-full max-w-sm flex-col gap-4 rounded-2xl p-6 shadow-2xl">
        <h3 class="text-sm font-bold text-[var(--color-text)]">{{ t('classroom.joinCourse') }}</h3>
        <p class="text-xs text-[var(--color-text-secondary)]">{{ t('classroom.joinCodePrompt') }}</p>
        <input
          v-model="joinCodeInput"
          type="text"
          maxlength="6"
          placeholder="ABC123"
          class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-center font-mono text-xl font-extrabold tracking-widest text-[var(--color-primary-500)] uppercase outline-none focus:border-[var(--color-primary-500)]"
        />
        <div class="mt-2 flex justify-end gap-2">
          <button type="button" class="btn-bubble-ghost text-xs" @click="showJoinModal = false">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="btn-bubble text-xs" :disabled="joining || joinCodeInput.trim().length < 4" @click="handleJoinCourse">
            {{ joining ? t('common.loading') : t('classroom.joinCourse') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Create Course Modal -->
    <div v-if="showCreateCourseModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="showCreateCourseModal = false">
      <div class="bubble-surface flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-2xl">
        <h3 class="text-sm font-bold text-[var(--color-text)]">{{ t('classroom.createCourse') }}</h3>
        <form class="flex flex-col gap-3" @submit.prevent="handleCreateCourse">
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.courseTitle') }}</span>
            <input
              v-model="newCourseTitle"
              type="text"
              required
              placeholder="e.g. Base de Datos II - 2026"
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>
          <label class="flex flex-col gap-1 text-xs">
            <span class="font-semibold text-[var(--color-text)]">{{ t('classroom.courseDescription') }}</span>
            <textarea
              v-model="newCourseDesc"
              rows="3"
              placeholder="Descripción y objetivos del aula..."
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>
          <div class="mt-2 flex justify-end gap-2">
            <button type="button" class="btn-bubble-ghost text-xs" @click="showCreateCourseModal = false">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-bubble text-xs" :disabled="creatingCourse || !newCourseTitle.trim()">
              {{ creatingCourse ? t('common.loading') : t('classroom.createCourse') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. Create Assignment Modal -->
    <CreateAssignmentModal
      v-if="showCreateAssignmentModal"
      :course-title="selectedCourse?.title"
      :creating="creatingAssignment"
      @close="showCreateAssignmentModal = false"
      @create="handleCreateAssignment"
    />

    <!-- 4. Submissions Monitor Modal -->
    <ClassroomMonitorModal
      v-if="showMonitorModal"
      :assignment="monitoringAssignment"
      :submissions="monitorSubmissions"
      :loading="loadingMonitor"
      @close="showMonitorModal = false"
    />
  </div>
</template>
