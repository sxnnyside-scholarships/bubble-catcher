<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BrandIcon from '@/components/BrandIcon.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { ENGINE_ARTICLES, FUNDAMENTALS_ARTICLES, type GuideArticle } from '@/content/guides';

const { t, locale } = useI18n();

const currentLang = computed<'es' | 'en'>(() => (locale.value.startsWith('es') ? 'es' : 'en'));

function getMeta(article: GuideArticle) {
  return article[currentLang.value] || article.en;
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <section>
      <h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <MingcuteIcon name="book2" class="h-4 w-4 text-[var(--color-primary-500)]" />
        {{ t('guides.fundamentals') }}
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="article in FUNDAMENTALS_ARTICLES"
          :key="article.slug"
          :to="`/dashboard/guides/${article.slug}`"
          class="bubble-surface flex flex-col gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-primary-500)] border border-[var(--color-border)] shrink-0"
            >
              <MingcuteIcon :name="(article.icon as any) || 'book2'" class="h-5 w-5" />
            </div>
            <h3 class="font-semibold text-[var(--color-text)] leading-tight">{{ getMeta(article).title }}</h3>
          </div>
          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">{{ getMeta(article).summary }}</p>
        </RouterLink>
      </div>
    </section>

    <section>
      <h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
        <MingcuteIcon name="server" class="h-4 w-4 text-[var(--color-primary-500)]" />
        {{ t('guides.engines') }}
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="article in ENGINE_ARTICLES"
          :key="article.slug"
          :to="`/dashboard/guides/${article.slug}`"
          class="bubble-surface flex flex-col gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] p-2 border border-[var(--color-border)] shrink-0"
            >
              <BrandIcon v-if="article.dialect" :dialect="article.dialect" class="h-5 w-5" />
              <MingcuteIcon v-else name="server" class="h-5 w-5 text-[var(--color-primary-500)]" />
            </div>
            <h3 class="font-semibold text-[var(--color-text)] leading-tight">{{ getMeta(article).title }}</h3>
          </div>
          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">{{ getMeta(article).summary }}</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
