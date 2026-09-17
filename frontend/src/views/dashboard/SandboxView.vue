<script setup lang="ts">
import type { PaginatedResponse, Project } from '@shared/types';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleErrorState from '@/components/common/BubbleErrorState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import { getJson } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const projects = ref<Project[]>([]);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

async function loadProjects() {
  if (!auth.accessToken) return;
  loading.value = true;
  errorMessage.value = null;
  const response = await getJson<PaginatedResponse<Project>>('/projects', auth.accessToken);
  if (response.success) {
    projects.value = response.data.items;
  } else {
    errorMessage.value = response.error?.message || t('errors.INTERNAL_ERROR');
  }
  loading.value = false;
}

onMounted(loadProjects);
</script>

<template>
  <div v-if="loading" class="py-4">
    <BubbleSkeleton variant="cards" :count="3" />
  </div>

  <div v-else-if="errorMessage" class="py-4">
    <BubbleErrorState
      :message="errorMessage"
      :retry-label="t('common.retry')"
      @retry="loadProjects"
    />
  </div>

  <div v-else class="flex flex-col gap-6">
    <p class="text-sm text-[var(--color-text-secondary)]">{{ t('sandbox.chooseProject') }}</p>

    <div v-if="!projects.length" class="py-2">
      <BubbleEmptyState
        icon="folder"
        :title="t('sandbox.noProjects')"
        :description="t('sandbox.chooseProject')"
      />
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="project in projects"
        :key="project.id"
        :to="`/dashboard/sandbox/${project.id}`"
        class="bubble-surface flex flex-col gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <BrandIcon :dialect="project.dialect" />
          </div>
          <h3 class="font-semibold text-[var(--color-text)]">{{ project.title }}</h3>
        </div>
        <p class="text-xs capitalize text-[var(--color-text-tertiary)]">{{ project.dialect }}</p>
      </RouterLink>
    </div>
  </div>
</template>
