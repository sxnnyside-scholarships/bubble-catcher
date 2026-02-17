<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { session, sessionLoaded, userProfile } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { supabase } from '$lib/supabase';
  import { api } from '$lib/api';
  import ThemeIcon from '$lib/components/ThemeIcon.svelte';
  import BrandingFooter from '$lib/components/BrandingFooter.svelte';

  let { children } = $props();
  let sidebarCollapsed = $state(false);

  /* Guard: redirect unauthenticated users ONLY after session check completes */
  $effect(() => {
    if ($sessionLoaded && !$session) {
      goto('/');
    }
  });

  let profileFetched = false;
  let profileRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  /* Fetch profile once session is confirmed */
  $effect(() => {
    if ($session && !$userProfile && !profileFetched) {
      profileFetched = true;
      api.get<import('$shared/types').UserProfile>('/user/profile')
        .then((result) => {
          if (result.success && result.data) {
            userProfile.set(result.data);
          }
        })
        .catch((err) => {
          console.error('[Profile] Failed to load profile:', err);
          // Allow retry after 5 s cooldown to avoid infinite loop
          if (profileRetryTimeout) clearTimeout(profileRetryTimeout);
          profileRetryTimeout = setTimeout(() => { profileFetched = false; }, 5000);
        });
    }
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    session.set(null);
    userProfile.set(null);
    profileFetched = false;
    goto('/');
  }

  const navItems = $derived([
    { path: '/dashboard', label: $t.nav.dashboard, icon: 'dashboard' },
    { path: '/projects', label: $t.nav.projects, icon: 'projects' },
    { path: '/pricing', label: $t.nav.pricing, icon: 'pricing' },
    { path: '/settings', label: $t.nav.settings, icon: 'settings' },
  ]);
</script>

{#if $session}
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-secondary)] transition-all duration-200 {sidebarCollapsed ? 'w-16' : 'w-64'}"
    >
      <!-- Logo -->
      <div class="flex h-16 items-center border-b border-[var(--color-border)] px-4">
        {#if !sidebarCollapsed}
          <div class="flex items-center gap-3">
            <ThemeIcon size={32} />
            <span class="text-lg font-bold gradient-primary-text">Bubble Catcher</span>
          </div>
        {:else}
          <div class="mx-auto">
            <ThemeIcon size={32} />
          </div>
        {/if}
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-1 p-3">
        {#each navItems as item}
          {@const isActive = $page.url.pathname.startsWith(item.path)}
          <a
            href={item.path}
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              {isActive
                ? 'bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text)]'
              }"
          >
            {#if item.icon === 'dashboard'}
              <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            {:else if item.icon === 'projects'}
              <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            {:else if item.icon === 'pricing'}
              <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else if item.icon === 'settings'}
              <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            {/if}
            {#if !sidebarCollapsed}
              <span>{item.label}</span>
            {/if}
          </a>
        {/each}
      </nav>

      <!-- Sidebar Footer -->
      <div class="border-t border-[var(--color-border)] p-3">
        <button
          onclick={handleLogout}
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {#if !sidebarCollapsed}
            <span>{$t.nav.logout}</span>
          {/if}
        </button>

        <!-- Collapse toggle -->
        <button
          onclick={() => { sidebarCollapsed = !sidebarCollapsed; }}
          class="mt-2 flex w-full items-center justify-center rounded-lg px-3 py-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-tertiary)]"
        >
          <svg class="h-4 w-4 transition-transform {sidebarCollapsed ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex flex-1 flex-col overflow-auto bg-[var(--color-surface)]">
      <div class="flex-1">
        {@render children()}
      </div>
      <BrandingFooter />
    </main>
  </div>
{/if}
