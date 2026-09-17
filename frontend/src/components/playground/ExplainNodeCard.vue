<script setup lang="ts">
import type { ExplainNode } from '@shared/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

const props = defineProps<{
  node: ExplainNode;
  isBottleneck: boolean;
  totalTimeMs?: number;
}>();

const { t } = useI18n();

const isSeqScan = computed(
  () => props.node.nodeType.toLowerCase().includes('seq') || props.node.nodeType.toLowerCase().includes('table scan'),
);
const isIndex = computed(() => props.node.nodeType.toLowerCase().includes('index'));
const isJoin = computed(
  () => props.node.nodeType.toLowerCase().includes('join') || props.node.nodeType.toLowerCase().includes('loop'),
);

const nodeColorClass = computed(() => {
  if (props.isBottleneck || props.node.costPercent >= 50) {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-500';
  }
  if (props.node.costPercent >= 20) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-500';
  }
  if (isIndex.value) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500';
  }
  if (isJoin.value) {
    return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500';
  }
  return 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)]';
});
</script>

<template>
  <div class="flex flex-col items-center">
    <!-- Node Card -->
    <div
      class="flex w-72 flex-col gap-2.5 rounded-2xl border p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
      :class="[
        nodeColorClass,
        isBottleneck ? 'ring-2 ring-rose-500 shadow-rose-500/20' : '',
      ]"
    >
      <!-- Header: Node Type & Heatmap Badge -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <MingcuteIcon
              :name="isSeqScan ? 'alert' : isIndex ? 'flash' : isJoin ? 'transfer' : 'table'"
              class="h-4 w-4 flex-shrink-0"
            />
            <span class="text-xs font-bold truncate" :title="node.nodeType">
              {{ node.nodeType }}
            </span>
          </div>
          <span v-if="node.relationName" class="mt-0.5 text-[0.7rem] font-mono font-medium opacity-80 truncate">
            on <span class="underline">{{ node.relationName }}</span>
            <span v-if="node.indexName" class="text-[0.65rem] opacity-75"> ({{ node.indexName }})</span>
          </span>
        </div>

        <!-- Heatmap badge -->
        <span
          class="flex-shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold border"
          :class="
            node.costPercent >= 50
              ? 'border-rose-500/50 bg-rose-500 text-white'
              : node.costPercent >= 20
                ? 'border-amber-500/50 bg-amber-500 text-black'
                : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          "
        >
          {{ node.costPercent }}%
        </span>
      </div>

      <!-- Metrics Row -->
      <div class="grid grid-cols-2 gap-2 border-t border-current/15 pt-2 text-[0.7rem]">
        <div>
          <span class="opacity-70">{{ t('explain.timeLabel') }}:</span>
          <span class="ml-1 font-mono font-bold">{{ node.actualTimeMs }} ms</span>
        </div>
        <div>
          <span class="opacity-70">{{ t('explain.costLabel') }}:</span>
          <span class="ml-1 font-mono font-bold">{{ node.totalCost }}</span>
        </div>
        <div>
          <span class="opacity-70">{{ t('explain.rowsLabel') }}:</span>
          <span class="ml-1 font-mono font-semibold">{{ node.actualRows }}</span>
          <span v-if="node.planRows" class="text-[0.6rem] opacity-60"> (est {{ node.planRows }})</span>
        </div>
        <div>
          <span class="opacity-70">{{ t('explain.loopsLabel') }}:</span>
          <span class="ml-1 font-mono font-semibold">{{ node.loops }}</span>
        </div>
      </div>

      <!-- Buffer info if available -->
      <div v-if="(node.buffersHit || 0) + (node.buffersRead || 0) > 0" class="flex items-center gap-2 text-[0.65rem] opacity-75">
        <span>Shared Buffers:</span>
        <span class="font-mono">{{ node.buffersHit }} hit / {{ node.buffersRead }} read</span>
      </div>

      <!-- Filter or Condition -->
      <div v-if="node.filter || node.condition" class="rounded-lg bg-black/10 p-1.5 font-mono text-[0.65rem] break-all leading-tight opacity-90">
        <span class="font-bold">{{ node.filter ? 'Filter: ' : 'Cond: ' }}</span>
        {{ node.filter || node.condition }}
      </div>

      <!-- Bottleneck flag -->
      <div v-if="isBottleneck" class="flex items-center gap-1 text-[0.65rem] font-bold text-rose-500">
        <MingcuteIcon name="alert" class="h-3.5 w-3.5" />
        <span>{{ t('explain.bottleneckAlert') }}</span>
      </div>
    </div>

    <!-- Tree connector line down -->
    <div v-if="node.children.length > 0" class="h-6 w-0.5 bg-[var(--color-border)]" />

    <!-- Children Nodes Container -->
    <div v-if="node.children.length > 0" class="flex items-start justify-center gap-6 pt-1">
      <div v-for="child in node.children" :key="child.id" class="flex flex-col items-center">
        <ExplainNodeCard
          :node="child"
          :is-bottleneck="child.id === node.id"
          :total-time-ms="totalTimeMs"
        />
      </div>
    </div>
  </div>
</template>
