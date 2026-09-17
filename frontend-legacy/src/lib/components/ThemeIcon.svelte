<!--
  Theme-aware logo/icon component.
  Renders the correct favicon variant based on active theme.
  No layout shift — fixed dimensions. No flicker — SSR-safe default.
-->
<script lang="ts">
  import { theme } from '$lib/stores';

  let {
    size = 32,
    class: className = '',
  }: {
    size?: number;
    class?: string;
  } = $props();

  const iconMap = {
    colorful: '/favicon.svg',
    light: '/favicon.svg',
    dark: '/favicon.svg',
  } as const;

  const src = $derived(iconMap[$theme] ?? iconMap.colorful);
</script>

<img
  {src}
  alt="Bubble Catcher"
  width={size}
  height={size}
  class="inline-block shrink-0 {className}"
  style="width: {size}px; height: {size}px;"
/>
