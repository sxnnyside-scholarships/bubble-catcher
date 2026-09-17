<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import MingcuteIcon from '@/components/MingcuteIcon.vue';
import '@/lib/charts';
import type { MINGCUTE_ICONS } from '@/design/mingcute-icons';

const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    color: string;
    icon: keyof typeof MINGCUTE_ICONS;
    size?: 'md' | 'lg';
  }>(),
  { size: 'md' },
);

const chartData = computed(() => ({
  datasets: [
    {
      data: [props.value, Math.max(0, 100 - props.value)],
      backgroundColor: [props.color, 'rgba(255, 255, 255, 0.08)'],
      borderWidth: 0,
    },
  ],
}));

const chartOptions = {
  cutout: '78%',
  plugins: { tooltip: { enabled: false }, legend: { display: false } },
  animation: { duration: 700, easing: 'easeOutQuint' as const },
};

const ringSize = computed(() => (props.size === 'lg' ? 'h-36 w-36' : 'h-24 w-24'));
const valueTextSize = computed(() => (props.size === 'lg' ? 'text-3xl' : 'text-xl'));
const labelTextSize = computed(() => (props.size === 'lg' ? 'text-sm' : 'text-xs'));
</script>

<template>
  <div class="flex flex-col items-center gap-3 text-center">
    <div class="relative" :class="ringSize">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <MingcuteIcon :name="icon" class="h-4 w-4" :style="{ color }" />
        <span class="font-extrabold" :class="valueTextSize" :style="{ color }">{{ value }}%</span>
      </div>
    </div>
    <span class="font-semibold text-[var(--color-text-secondary)]" :class="labelTextSize">{{ label }}</span>
  </div>
</template>
