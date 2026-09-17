<script setup lang="ts">
import { currentLocale, setLocale } from '@/i18n';

const locales = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
] as const;
</script>

<template>
  <div class="btn-bubble-pill" role="group" aria-label="Language">
    <button
      v-for="locale in locales"
      :key="locale.code"
      type="button"
      class="btn-bubble-pill__option"
      :class="{ 'btn-bubble-pill__option--active': currentLocale() === locale.code }"
      @click="setLocale(locale.code)"
    >
      {{ locale.label }}
    </button>
  </div>
</template>
