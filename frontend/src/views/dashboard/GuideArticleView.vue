<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import BrandIcon from '@/components/BrandIcon.vue';
import MarkdownViewer from '@/components/MarkdownViewer.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { findGuideBySlug, getGuideContent } from '@/content/guides';

const { t, locale } = useI18n();
const route = useRoute();

const currentLang = computed<'es' | 'en'>(() => (locale.value.startsWith('es') ? 'es' : 'en'));

const slug = computed(() => String(route.params.slug));
const article = computed(() => findGuideBySlug(slug.value));

const localizedMeta = computed(() => {
  if (!article.value) return { title: '', summary: '' };
  return article.value[currentLang.value] || article.value.en;
});

const markdownBody = computed(() => {
  return getGuideContent(slug.value, locale.value);
});
</script>

<template>
  <div v-if="article" class="flex flex-col gap-6">
    <RouterLink
      to="/dashboard/guides"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
    >
      <MingcuteIcon name="chevronLeft" class="h-4 w-4" />
      {{ t('guides.backToGuides') }}
    </RouterLink>

    <article class="bubble-surface rounded-3xl p-6 sm:p-10 shadow-xl border border-[var(--color-border)]">
      <!-- Header -->
      <header class="border-b border-[var(--color-border)] pb-6">
        <div class="flex items-center gap-3.5">
          <div
            v-if="article.dialect"
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] p-2.5 border border-[var(--color-border)] shadow-sm shrink-0"
          >
            <BrandIcon :dialect="article.dialect" class="h-6 w-6" />
          </div>
          <div
            v-else-if="article.icon"
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-[var(--color-primary-500)] border border-[var(--color-border)] shadow-sm shrink-0"
          >
            <MingcuteIcon :name="(article.icon as any)" class="h-6 w-6" />
          </div>
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-text)]">
            {{ localizedMeta.title }}
          </h1>
        </div>
        <p class="mt-3 text-base text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
          {{ localizedMeta.summary }}
        </p>

        <!-- External reference links -->
        <div v-if="article.links.length" class="mt-5 flex flex-wrap gap-2">
          <a
            v-for="link in article.links"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-bubble-ghost flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-full"
          >
            <MingcuteIcon :name="link.icon" class="h-3.5 w-3.5" />
            {{ link.label }}
            <MingcuteIcon name="externalLink" class="h-3 w-3 opacity-60" />
          </a>
        </div>
      </header>

      <!-- Rendered Markdown Content -->
      <main class="pt-6">
        <MarkdownViewer :content="markdownBody" />
      </main>
    </article>
  </div>

  <div v-else class="bubble-surface rounded-2xl p-12 text-center text-[var(--color-text-secondary)]">
    <p class="text-lg font-medium">Artículo no encontrado / Article not found</p>
    <RouterLink to="/dashboard/guides" class="btn-bubble mt-4 inline-block">
      {{ t('guides.backToGuides') }}
    </RouterLink>
  </div>
</template>
