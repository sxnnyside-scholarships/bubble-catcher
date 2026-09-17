<script setup lang="ts">
import LoginForm from '@/components/LoginForm.vue';
import LoginHero from '@/components/LoginHero.vue';
import SxnnysideBranding from '@/components/SxnnysideBranding.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[var(--color-surface)] lg:flex-row">
    <!-- Cutecore Educational Database Hero (Left) -->
    <div class="flex-1 min-h-[440px] lg:min-h-screen">
      <LoginHero />
    </div>

    <!-- Auth Sidebar Panel (Right) -->
    <div
      class="flex w-full flex-col justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] shadow-2xl lg:w-[440px] xl:w-[480px] lg:shrink-0 lg:border-l lg:border-t-0"
    >
      <div class="flex flex-1 items-center">
        <div class="w-full">
          <LoginForm />
        </div>
      </div>
      <div class="pb-6 pt-2">
        <SxnnysideBranding />
      </div>
    </div>
  </div>
</template>
