<script setup lang="ts">
import { computed } from 'vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import { BRAND_ICONS } from '@/design/brand-icons';

/** Official brand marks from simple-icons, extracted at build time — see design/brand-icons.ts. */
const props = defineProps<{ dialect: string }>();

const brand = computed(() => BRAND_ICONS[props.dialect]);
</script>

<template>
  <svg v-if="brand" viewBox="0 0 24 24" role="img" :aria-label="brand.title" class="h-full w-full">
    <path :d="brand.path" :fill="brand.hex" />
  </svg>
  <MingcuteIcon v-else name="server" class="h-full w-full text-slate-700" />
</template>
