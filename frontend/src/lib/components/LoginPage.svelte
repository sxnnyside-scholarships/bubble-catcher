<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { t } from '$lib/i18n';
  import ThemeIcon from '$lib/components/ThemeIcon.svelte';


  let email = $state('');
  let password = $state('');
  let isSignUp = $state(false);
  let confirmPassword = $state('');
  let errorMessage = $state('');
  let isSubmitting = $state(false);

  async function handleSubmit() {
    errorMessage = '';
    isSubmitting = true;

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          errorMessage = 'Passwords do not match';
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          errorMessage = error.message;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          errorMessage = error.message;
        }
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
  <div class="w-full max-w-md">
    <!-- Logo & Branding -->
    <div class="mb-8 text-center">
      <div class="mb-4 inline-flex h-34 w-34 items-center justify-center">
        <ThemeIcon size={120} />
      </div>
      <h1 class="text-3xl font-bold gradient-primary-text">{$t.common.appName}</h1>
      <p class="mt-1 text-sm text-[var(--color-text-tertiary)]">{$t.common.byLine}</p>
      <p class="mt-4 text-[var(--color-text-secondary)]">{$t.auth.loginDescription}</p>
    </div>

    <!-- Auth Form -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 shadow-lg">
      <h2 class="mb-6 text-center text-xl font-semibold">
        {isSignUp ? $t.auth.signUp : $t.auth.signIn}
      </h2>

      {#if errorMessage}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="space-y-4">
          <div>
            <label for="email" class="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              {$t.auth.email}
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              required
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              {$t.auth.password}
            </label>
            <input
              id="password"
              type="password"
              bind:value={password}
              required
              minlength="6"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
              placeholder="••••••••"
            />
          </div>

          {#if isSignUp}
            <div>
              <label for="confirmPassword" class="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                {$t.auth.confirmPassword}
              </label>
              <input
                id="confirmPassword"
                type="password"
                bind:value={confirmPassword}
                required
                minlength="6"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
                placeholder="••••••••"
              />
            </div>
          {/if}

          <button
            type="submit"
            disabled={isSubmitting}
            class="w-full rounded-lg px-4 py-2.5 font-medium text-white gradient-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? $t.common.loading : (isSignUp ? $t.auth.signUp : $t.auth.signIn)}
          </button>
        </div>
      </form>

      <div class="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        {#if isSignUp}
          <span>{$t.auth.hasAccount}</span>
          <button onclick={() => { isSignUp = false; errorMessage = ''; }} class="ml-1 font-medium text-[var(--color-primary-500)] hover:underline">
            {$t.auth.signIn}
          </button>
        {:else}
          <span>{$t.auth.noAccount}</span>
          <button onclick={() => { isSignUp = true; errorMessage = ''; }} class="ml-1 font-medium text-[var(--color-primary-500)] hover:underline">
            {$t.auth.signUp}
          </button>
        {/if}
      </div>
    </div>

    <p class="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
      {$t.common.tagline}
    </p>
  </div>
</div>
