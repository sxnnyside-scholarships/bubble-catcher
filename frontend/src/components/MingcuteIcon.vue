<script setup lang="ts">
import { computed } from 'vue';
import { MINGCUTE_ICONS } from '@/design/mingcute-icons';

/** Icon bodies are extracted at build time from the MIT-licensed MingCute set (@iconify-json/mingcute) — no runtime fetch, works fully offline. */
const props = defineProps<{ name: keyof typeof MINGCUTE_ICONS }>();

const body = computed(() => MINGCUTE_ICONS[props.name]);
</script>

<template>
  <svg viewBox="0 0 24 24" width="1em" height="1em" v-html="body" />
</template>
