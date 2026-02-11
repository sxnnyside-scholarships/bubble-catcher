<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { session, sessionLoaded, loadTheme, loadLocale } from '$lib/stores';

  let { children } = $props();

  onMount(() => {
    loadTheme();
    loadLocale();

    // Restore session and signal readiness BEFORE children act on it
    supabase.auth.getSession().then(({ data }) => {
      session.set(data.session);
      sessionLoaded.set(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      session.set(newSession);
      // Ensure sessionLoaded is true after any auth state change
      sessionLoaded.set(true);
    });

    return () => subscription.unsubscribe();
  });
</script>

<div class="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
  {@render children()}
</div>
