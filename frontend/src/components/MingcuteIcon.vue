<script setup lang="ts">
import { computed } from 'vue';
import { MINGCUTE_ICONS } from '@/design/mingcute-icons';

/** Offline icon component rendering bundled MingCute SVG paths. */
const props = defineProps<{ name: keyof typeof MINGCUTE_ICONS }>();

const body = computed(() => MINGCUTE_ICONS[props.name]);
</script>

<template>
  <svg viewBox="0 0 24 24" width="1em" height="1em" v-html="body" />
</template>
