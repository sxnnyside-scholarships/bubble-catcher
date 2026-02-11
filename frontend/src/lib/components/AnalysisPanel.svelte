<script lang="ts">
  import { t } from '$lib/i18n';
  import type { AnalysisResult, AnalysisSeverity } from '$shared/types';

  let {
    result,
    isAnalyzing,
  }: {
    result: AnalysisResult | null;
    isAnalyzing: boolean;
  } = $props();

  const severityColors: Record<AnalysisSeverity, { bg: string; text: string; border: string }> = {
    info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    critical: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  };

  const severityIcons: Record<AnalysisSeverity, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  };
</script>

{#if isAnalyzing}
  <div class="flex items-center justify-center py-12">
    <div class="flex items-center gap-3">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent"></div>
      <span class="text-sm text-[var(--color-text-secondary)]">{$t.common.loading}</span>
    </div>
  </div>
{:else if !result}
  <div class="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
    {$t.analysis.title}
  </div>
{:else}
  <div class="space-y-4">
    {#if !result.parsedSuccessfully && result.parseError}
      <div class="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 class="mb-1 font-medium text-red-800">{$t.analysis.parseError}</h3>
        <p class="text-sm text-red-700">{result.parseError}</p>
      </div>
    {/if}

    {#if result.issues.length === 0 && result.parsedSuccessfully}
      <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <p class="text-sm font-medium text-green-700">✅ {$t.analysis.noIssues}</p>
      </div>
    {:else}
      {#each result.issues as issue}
        {@const colors = severityColors[issue.severity]}
        <div class="rounded-lg border {colors.border} {colors.bg} p-4">
          <div class="mb-2 flex items-center gap-2">
            <span>{severityIcons[issue.severity]}</span>
            <span class="text-xs font-bold uppercase {colors.text}">
              {$t.analysis.severity[issue.severity]}
            </span>
            <span class="text-xs text-[var(--color-text-tertiary)]">({issue.ruleId})</span>
          </div>

          <p class="mb-2 text-sm font-medium {colors.text}">{issue.message}</p>

          <div class="mb-2 rounded-md bg-white/60 p-3 text-xs leading-relaxed {colors.text}">
            <p class="mb-1 font-medium">{$t.analysis.explanation}:</p>
            <p>{issue.explanation}</p>
          </div>

          {#if issue.suggestedRewrite}
            <div class="rounded-md bg-white/80 p-3">
              <p class="mb-1 text-xs font-medium {colors.text}">{$t.analysis.suggestedRewrite}:</p>
              <pre class="overflow-x-auto text-xs font-mono">{issue.suggestedRewrite}</pre>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}
