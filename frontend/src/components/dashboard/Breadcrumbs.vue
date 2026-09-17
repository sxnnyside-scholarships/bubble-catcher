<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { findGuideBySlug } from '@/content/guides';
import { usePlaygroundStore } from '@/stores/playground';

const { t, locale } = useI18n();
const route = useRoute();
const playground = usePlaygroundStore();

interface Crumb {
  label: string;
  to: string;
}

const crumbs = computed<Crumb[]>(() => {
  const base = route.matched
    .filter((record) => record.meta.breadcrumb)
    .map((record) => ({ label: t(record.meta.breadcrumb as string), to: record.path }));

  /* Content titles are localized in the guide article */
  if (route.name === 'guide-detail') {
    const article = findGuideBySlug(String(route.params.slug));
    if (article) {
      const lang = locale.value.startsWith('es') ? 'es' : 'en';
      const meta = article[lang] || article.en;
      base.push({ label: meta.title, to: route.path });
    }
  }

  if ((route.name === 'playground-project' || route.name === 'sandbox-project') && playground.currentProjectTitle) {
    base.push({ label: playground.currentProjectTitle, to: route.path });
  }

  return base;
});
</script>

<template>
  <nav v-if="crumbs.length" class="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)]">
    <template v-for="(crumb, index) in crumbs" :key="crumb.to">
      <span v-if="index > 0" class="select-none">/</span>
      <span
        class="font-medium"
        :class="index === crumbs.length - 1 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)]'"
      >
        {{ crumb.label }}
      </span>
    </template>
  </nav>
</template>
