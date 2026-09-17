<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div
    class="relative flex h-full min-h-[420px] lg:min-h-screen w-full flex-col justify-end overflow-hidden select-none"
  >
    <!-- Cutecore Educational Database Hero Background (WebP) -->
    <img
      src="/hero-bg.webp"
      alt="Bubble Catcher Database & Knowledge Core"
      class="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out hover:scale-[1.015]"
    />

    <!-- Ambient Cutecore Light Scrims & Tint Overlay -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0e1a]/95 via-[#0c0e1a]/45 to-[#0c0e1a]/20 mix-blend-multiply"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-tr from-purple-900/35 via-transparent to-pink-500/15"
    />

    <!-- Decorative Cutecore Bubbles & Glow Orbs -->
    <div
      class="bubble-orb animate-bubble-float left-[12%] top-[18%] h-24 w-24 opacity-85"
    />
    <div
      class="bubble-orb animate-bubble-float-reverse right-[22%] top-[25%] h-16 w-16 opacity-75"
    />
    <div
      class="bubble-orb animate-bubble-float right-[10%] top-[45%] h-28 w-28 opacity-65"
    />
    <div
      class="bubble-orb animate-bubble-float-reverse left-[38%] top-[12%] h-14 w-14 opacity-80"
    />

    <!-- Sparkle Accents -->
    <div
      class="animate-sparkle pointer-events-none absolute right-[18%] top-[16%] text-xl text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
    >
      ✦
    </div>
    <div
      class="animate-sparkle pointer-events-none absolute left-[28%] top-[28%] text-base text-purple-200 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)] [animation-delay:1.5s]"
    >
      ✦
    </div>
    <div
      class="animate-sparkle pointer-events-none absolute left-[48%] top-[40%] text-sm text-yellow-200 drop-shadow-[0_0_6px_rgba(253,224,71,0.8)] [animation-delay:0.8s]"
    >
      ★
    </div>

    <!-- Bottom Left Corner Branding & Details -->
    <div class="relative z-20 p-6 sm:p-10 lg:p-12 max-w-2xl text-left">
      <!-- Cutecore Academy Pill -->
      <div
        class="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-black/40 px-3.5 py-1.5 backdrop-blur-md text-xs font-semibold text-pink-200 shadow-xl shadow-pink-500/10 mb-4"
      >
        <span class="inline-block h-2 w-2 rounded-full bg-pink-400 animate-pulse"></span>
        <span class="tracking-wide">SQL Learning & Scholarships</span>
      </div>

      <!-- App Name -->
      <h1
        class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
      >
        {{ t('common.appName') }}
      </h1>

      <!-- Tagline -->
      <p
        class="mt-2.5 text-lg sm:text-xl font-semibold text-pink-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      >
        {{ t('common.tagline') }}
      </p>

      <!-- Subtitle / Description -->
      <p
        class="mt-2 max-w-lg text-sm sm:text-base text-slate-200/90 leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      >
        {{ t('auth.loginDescription') }}
      </p>
    </div>
  </div>
</template>
