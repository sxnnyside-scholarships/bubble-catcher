<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
  import { session, sessionLoaded, userProfile, loadTheme, loadLocale } from '$lib/stores';
  import BrandingFooter from '$lib/components/BrandingFooter.svelte';

  let { children } = $props();

  onMount(() => {
    loadTheme();
    loadLocale();

    // Restore session and signal readiness BEFORE children act on it
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      session.set(data.session);
      sessionLoaded.set(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
      session.set(newSession);
      sessionLoaded.set(true);

      /* Clear user state on sign-out or token expiry */
      if (event === 'SIGNED_OUT' || !newSession) {
        userProfile.set(null);
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<div class="flex min-h-screen flex-col bg-[var(--color-surface)] text-[var(--color-text)]">
  <div class="flex-1">
    {@render children()}
  </div>
  <BrandingFooter />
</div>
