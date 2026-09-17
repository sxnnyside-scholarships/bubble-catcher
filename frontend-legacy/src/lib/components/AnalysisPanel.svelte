<script lang="ts">
  import { t } from '$lib/i18n';
  import type { AnalysisResult, AnalysisSeverity } from '$shared/types';

  let {
    result,
    isAnalyzing,
    onInsertRewrite,
  }: {
    result: AnalysisResult | null;
    isAnalyzing: boolean;
    onInsertRewrite?: (sql: string) => void;
  } = $props();

  let copiedIndex = $state<number | null>(null);

  async function copyToClipboard(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    copiedIndex = index;
    setTimeout(() => { copiedIndex = null; }, 1500);
  }

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

  /** Resolve localized message for a rule, fall back to raw backend text */
  function ruleMessage(ruleId: string, fallback: string): string {
    return ($t.rules as Record<string, { message: string; explanation: string }>)[ruleId]?.message ?? fallback;
  }
  function ruleExplanation(ruleId: string, fallback: string): string {
    return ($t.rules as Record<string, { message: string; explanation: string }>)[ruleId]?.explanation ?? fallback;
  }
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
      {#each result.issues as issue, i}
        {@const colors = severityColors[issue.severity]}
        <div class="rounded-lg border {colors.border} {colors.bg} p-4">
          <div class="mb-2 flex items-center gap-2">
            <span>{severityIcons[issue.severity]}</span>
            <span class="text-xs font-bold uppercase {colors.text}">
              {$t.analysis.severity[issue.severity]}
            </span>
            <span class="text-xs text-[var(--color-text-tertiary)]">({issue.ruleId})</span>
          </div>

          <p class="mb-2 text-sm font-medium {colors.text}">{ruleMessage(issue.ruleId, issue.message)}</p>

          <div class="mb-2 rounded-md bg-white/60 p-3 text-xs leading-relaxed {colors.text}">
            <p class="mb-1 font-medium">{$t.analysis.explanation}:</p>
            <p>{ruleExplanation(issue.ruleId, issue.explanation)}</p>
          </div>

          {#if issue.suggestedRewrite}
            <div class="rounded-md bg-white/80 p-3">
              <div class="mb-2 flex items-center justify-between">
                <p class="text-xs font-medium {colors.text}">{$t.analysis.suggestedRewrite}:</p>
                <div class="flex gap-1.5">
                  <button
                    type="button"
                    onclick={() => copyToClipboard(issue.suggestedRewrite!, i)}
                    class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors
                      {copiedIndex === i
                        ? 'bg-green-100 text-green-700'
                        : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'}"
                  >
                    {#if copiedIndex === i}
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" /></svg>
                      {$t.analysis.copiedRewrite}
                    {:else}
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {$t.analysis.copyRewrite}
                    {/if}
                  </button>
                  {#if onInsertRewrite}
                    <button
                      type="button"
                      onclick={() => onInsertRewrite(issue.suggestedRewrite!)}
                      class="inline-flex items-center gap-1 rounded bg-[var(--color-primary-500)] px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-[var(--color-primary-600)]"
                    >
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 16l-4-4m0 0l4-4m-4 4h14" /></svg>
                      {$t.analysis.insertRewrite}
                    </button>
                  {/if}
                </div>
              </div>
              <pre class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--color-surface-tertiary)] p-2.5 text-xs leading-relaxed font-mono">{issue.suggestedRewrite}</pre>
            </div>
          {/if}
        </div>
      {/each}
    {/if}

    <!-- Locked premium rules badge section -->
    {#if result.lockedRuleIds && result.lockedRuleIds.length > 0}
      <div class="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
        <div class="mb-3 flex items-center gap-2">
          <span class="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2.5 py-0.5 text-xs font-bold text-white">
            {$t.analysis.premiumBadge}
          </span>
          <span class="text-sm font-medium text-[var(--color-text-secondary)]">{$t.analysis.premiumRules}</span>
        </div>
        <div class="space-y-2">
          {#each result.lockedRuleIds as ruleId}
            {@const ruleLabel = ($t.rules as Record<string, { message: string }>)[ruleId]?.message ?? ruleId}
            <div class="flex items-center gap-2 rounded-md bg-[var(--color-surface-tertiary)] px-3 py-2 opacity-60">
              <svg class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span class="text-xs text-[var(--color-text-secondary)]">{ruleLabel}</span>
            </div>
          {/each}
        </div>
        <a href="/pricing" class="mt-3 block text-center text-xs font-medium text-[var(--color-primary-500)] hover:underline">
          {$t.analysis.upgradeCta}
        </a>
      </div>
    {/if}
  </div>
{/if}
