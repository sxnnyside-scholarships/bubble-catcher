<script lang="ts">
  import { session } from '$lib/stores';
  import { goto } from '$app/navigation';
  import LoginPage from '$lib/components/LoginPage.svelte';

  /* If authenticated, redirect to dashboard */
  $effect(() => {
    if ($session) {
      goto('/dashboard');
    }
  });
</script>

<LoginPage />
