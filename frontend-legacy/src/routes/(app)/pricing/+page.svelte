<script lang="ts">
  import { t } from '$lib/i18n';
</script>

<div class="p-8">
  <div class="mx-auto max-w-5xl">
    <!-- Header -->
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-bold gradient-primary-text">{$t.pricing.title}</h1>
      <p class="mt-3 text-lg text-[var(--color-text-secondary)]">{$t.pricing.subtitle}</p>
    </div>

    <!-- Plans Grid -->
    <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
      <!-- Free Plan -->
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8">
        <h3 class="text-xl font-bold">{$t.pricing.free.name}</h3>
        <div class="mt-4 flex items-baseline gap-1">
          <span class="text-4xl font-bold">{$t.pricing.free.price}</span>
          <span class="text-[var(--color-text-secondary)]">{$t.pricing.free.period}</span>
        </div>
        <ul class="mt-8 space-y-3">
          {#each $t.pricing.free.features as feature}
            <li class="flex items-center gap-3 text-sm">
              <svg class="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </li>
          {/each}
        </ul>
        <button
          disabled
          class="mt-8 w-full rounded-xl border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          {$t.pricing.free.cta}
        </button>
      </div>

      <!-- Premium Plan (Featured) -->
      <div class="relative rounded-2xl border-2 border-[var(--color-primary-500)] bg-[var(--color-surface-secondary)] p-8 shadow-xl shadow-[var(--color-primary-500)]/10">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white gradient-primary">
          POPULAR
        </div>
        <h3 class="text-xl font-bold gradient-primary-text">{$t.pricing.premium.name}</h3>
        <div class="mt-4 flex items-baseline gap-1">
          <span class="text-4xl font-bold">{$t.pricing.premium.price}</span>
          <span class="text-[var(--color-text-secondary)]">{$t.pricing.premium.period}</span>
        </div>
        <ul class="mt-8 space-y-3">
          {#each $t.pricing.premium.features as feature}
            <li class="flex items-center gap-3 text-sm">
              <svg class="h-5 w-5 shrink-0 text-[var(--color-primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </li>
          {/each}
        </ul>
        <button
          disabled
          class="mt-8 w-full rounded-xl px-6 py-3 text-sm font-semibold text-white gradient-primary opacity-75"
        >
          {$t.pricing.premium.cta}
        </button>
      </div>

      <!-- Enterprise Plan -->
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8">
        <h3 class="text-xl font-bold">{$t.pricing.enterprise.name}</h3>
        <div class="mt-4 flex items-baseline gap-1">
          <span class="text-4xl font-bold">{$t.pricing.enterprise.price}</span>
          <span class="text-[var(--color-text-secondary)]">{$t.pricing.enterprise.period}</span>
        </div>
        <ul class="mt-8 space-y-3">
          {#each $t.pricing.enterprise.features as feature}
            <li class="flex items-center gap-3 text-sm">
              <svg class="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </li>
          {/each}
        </ul>
        <button
          disabled
          class="mt-8 w-full rounded-xl border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          {$t.pricing.enterprise.cta}
        </button>
      </div>
    </div>
  </div>
</div>
