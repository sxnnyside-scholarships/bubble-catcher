<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'cards' | 'table' | 'lines' | 'metrics';
    count?: number;
  }>(),
  {
    variant: 'lines',
    count: 3,
  },
);
</script>

<template>
  <div class="w-full animate-pulse">
    <!-- Variant: Cards -->
    <div v-if="variant === 'cards'" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in count"
        :key="i"
        class="bubble-surface flex h-32 flex-col justify-between rounded-2xl p-4 border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50"
      >
        <div class="flex items-center justify-between">
          <div class="h-4 w-20 rounded-full bg-[var(--color-border)]/70" />
          <div class="h-4 w-12 rounded-full bg-[var(--color-border)]/50" />
        </div>
        <div class="space-y-2">
          <div class="h-4 w-3/4 rounded-md bg-[var(--color-border)]/80" />
          <div class="h-3 w-full rounded-md bg-[var(--color-border)]/40" />
        </div>
        <div class="flex items-center justify-between border-t border-[var(--color-border)]/40 pt-2">
          <div class="h-3 w-16 rounded bg-[var(--color-border)]/50" />
          <div class="h-3 w-10 rounded bg-[var(--color-border)]/50" />
        </div>
      </div>
    </div>

    <!-- Variant: Metrics Grid -->
    <div v-else-if="variant === 'metrics'" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="i in count"
        :key="i"
        class="rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-hover)]/30 p-3"
      >
        <div class="h-2.5 w-16 rounded bg-[var(--color-border)]/60" />
        <div class="mt-2 h-6 w-24 rounded bg-[var(--color-border)]/80" />
      </div>
    </div>

    <!-- Variant: Table Rows -->
    <div v-else-if="variant === 'table'" class="bubble-surface flex flex-col gap-2 rounded-2xl p-4 border border-[var(--color-border)]/60">
      <div class="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-3">
        <div class="h-4 w-32 rounded-full bg-[var(--color-border)]/70" />
        <div class="h-3 w-20 rounded bg-[var(--color-border)]/40" />
      </div>
      <div v-for="i in count" :key="i" class="flex items-center justify-between py-2.5">
        <div class="flex items-center gap-3">
          <div class="h-6 w-6 rounded-full bg-[var(--color-border)]/60" />
          <div class="h-3.5 w-28 rounded bg-[var(--color-border)]/70" />
        </div>
        <div class="flex items-center gap-4">
          <div class="h-3.5 w-16 rounded bg-[var(--color-border)]/50" />
          <div class="h-3.5 w-14 rounded bg-[var(--color-border)]/50" />
          <div class="h-4 w-10 rounded-full bg-[var(--color-border)]/60" />
        </div>
      </div>
    </div>

    <!-- Variant: Generic Text Lines -->
    <div v-else class="space-y-2.5">
      <div
        v-for="i in count"
        :key="i"
        class="h-3.5 rounded-md bg-[var(--color-border)]/60"
        :style="{ width: `${Math.max(45, 100 - (i * 15))}%` }"
      />
    </div>
  </div>
</template>
