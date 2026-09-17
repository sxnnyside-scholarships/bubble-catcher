<script setup lang="ts">
import type { ChallengeLeaderboardEntry } from '@shared/types';
import { useI18n } from 'vue-i18n';
import BubbleEmptyState from '@/components/common/BubbleEmptyState.vue';
import BubbleSkeleton from '@/components/common/BubbleSkeleton.vue';
import MingcuteIcon from '@/components/MingcuteIcon.vue';

defineProps<{
  leaderboard: ChallengeLeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
}>();

const { t } = useI18n();

function getMedalColor(rank: number): { text: string; bg: string; border: string } | null {
  if (rank === 1) return { text: 'text-amber-400', bg: 'bg-amber-400/15', border: 'border-amber-400/30' };
  if (rank === 2) return { text: 'text-slate-300', bg: 'bg-slate-300/15', border: 'border-slate-300/30' };
  if (rank === 3) return { text: 'text-amber-600', bg: 'bg-amber-600/15', border: 'border-amber-600/30' };
  return null;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="bubble-surface flex flex-col gap-3 rounded-2xl p-5">
    <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div class="flex items-center gap-2">
        <MingcuteIcon name="trophy" class="h-5 w-5 text-amber-400" />
        <h3 class="text-sm font-bold text-[var(--color-text)]">
          {{ t('competition.leaderboardTitle') }}
        </h3>
      </div>
      <span class="text-xs text-[var(--color-text-tertiary)]">
        {{ t('competition.rankedByBuffers') }}
      </span>
    </div>

    <!-- Loading State with Table Skeleton -->
    <div v-if="loading" class="py-2">
      <BubbleSkeleton variant="table" :count="5" />
    </div>

    <!-- Empty State -->
    <div v-else-if="leaderboard.length === 0">
      <BubbleEmptyState
        icon="trophy"
        :title="t('competition.noSubmissionsYet')"
        :description="t('competition.beFirstToSolve')"
      />
    </div>

    <!-- Leaderboard Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-[var(--color-border)] text-[0.7rem] text-[var(--color-text-tertiary)] uppercase tracking-wider">
            <th class="py-2.5 pl-3 pr-2 w-14">{{ t('competition.rank') }}</th>
            <th class="py-2.5 px-3">{{ t('competition.student') }}</th>
            <th class="py-2.5 px-3 text-right">{{ t('competition.buffers') }}</th>
            <th class="py-2.5 px-3 text-right">{{ t('competition.latency') }}</th>
            <th class="py-2.5 px-3 text-right">{{ t('competition.chars') }}</th>
            <th class="py-2.5 px-3 text-center">{{ t('competition.score') }}</th>
            <th class="py-2.5 pr-3 pl-2 text-right hidden sm:table-cell">{{ t('competition.date') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]/50">
          <tr
            v-for="entry in leaderboard"
            :key="entry.id"
            class="transition-colors hover:bg-[var(--color-surface-hover)]/60"
            :class="{
              'bg-[var(--color-primary-500)]/10 font-medium': entry.userId === currentUserId,
            }"
          >
            <!-- Rank & Medal SVG -->
            <td class="py-3 pl-3 pr-2 font-bold">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="getMedalColor(entry.rank)"
                  class="flex h-5 w-5 items-center justify-center rounded-full border shadow-sm"
                  :class="[getMedalColor(entry.rank)?.bg, getMedalColor(entry.rank)?.border, getMedalColor(entry.rank)?.text]"
                  :title="`Podium #${entry.rank}`"
                >
                  <MingcuteIcon :name="entry.rank === 1 ? 'trophy' : 'medal'" class="h-3 w-3" />
                </span>
                <span :class="entry.rank <= 3 ? 'font-extrabold text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)]'">
                  #{{ entry.rank }}
                </span>
              </div>
            </td>

            <!-- Student Name -->
            <td class="py-3 px-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-[var(--color-text)]">{{ entry.userName }}</span>
                <span v-if="entry.userId === currentUserId" class="rounded-full bg-[var(--color-primary-500)]/20 px-1.5 py-0.2 text-[0.65rem] font-bold text-[var(--color-primary-400)]">
                  {{ t('competition.you') }}
                </span>
              </div>
            </td>

            <!-- Buffers Read -->
            <td class="py-3 px-3 text-right font-extrabold text-emerald-400">
              {{ entry.buffersRead }}
            </td>

            <!-- Execution Time -->
            <td class="py-3 px-3 text-right font-mono text-[var(--color-text)]">
              {{ entry.executionTimeMs.toFixed(2) }}ms
            </td>

            <!-- Query Chars -->
            <td class="py-3 px-3 text-right font-mono text-[var(--color-text-secondary)]">
              {{ entry.queryLength }}
            </td>

            <!-- Golf Score Badge -->
            <td class="py-3 px-3 text-center">
              <span
                class="inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-extrabold uppercase"
                :class="{
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': entry.golfScore < 0,
                  'bg-sky-500/20 text-sky-400 border border-sky-500/30': entry.golfScore === 0,
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30': entry.golfScore > 0,
                }"
              >
                {{ entry.golfScore <= 0 ? (entry.golfScore === 0 ? 'E' : entry.golfScore) : `+${entry.golfScore}` }}
              </span>
            </td>

            <!-- Date -->
            <td class="py-3 pr-3 pl-2 text-right text-[0.7rem] text-[var(--color-text-tertiary)] hidden sm:table-cell">
              {{ formatDate(entry.createdAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
