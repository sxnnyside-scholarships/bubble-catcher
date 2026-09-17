<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const href = computed(
  () => `https://sxnnysideproject.com/${locale.value}/realms/sxnnyside-scholarships/#bubble-catcher`,
);
</script>

<template>
  <p class="text-center text-xs text-[var(--color-text-tertiary)]">
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="underline decoration-[var(--color-text-tertiary)]/40 underline-offset-2 transition-colors hover:text-[var(--color-text-secondary)]"
    >
      {{ t('common.byLine') }}
    </a>
  </p>
</template>
