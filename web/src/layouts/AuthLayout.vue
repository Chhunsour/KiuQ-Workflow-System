<template>
  <div class="min-h-screen" :class="isLogin ? 'kiuq-auth-bg' : 'bg-bg'">
    <main class="auth-main flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div class="w-full" :class="isLogin ? 'max-w-[920px]' : 'max-w-[480px]'">
        <div v-if="!isLogin" class="auth-hero mb-8 flex flex-col items-center justify-center gap-3">
          <img
            src="/kiuq-logo.png"
            alt="KiuQ Website System"
            class="h-auto w-full max-w-[180px] object-contain"
          />
          <div class="text-[10px] uppercase tracking-wider text-text-muted opacity-80">KiuQ Website System</div>
        </div>
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isLogin = computed(() => route.name === 'login');
</script>

<style scoped>
.kiuq-auth-bg {
  background: #242424;
}

:global(:root[data-theme='dark-gray']) .kiuq-auth-bg {
  background: #242424;
}

/* Mobile: tighten outer padding so auth cards use ~94% viewport width.
   Tailwind `px-4 py-8` gives ~16px/32px; we shrink to 12px/16px. */
@media (max-width: 480px) {
  .auth-main {
    padding-left: 0.75rem !important;
    padding-right: 0.75rem !important;
    padding-top: 1rem !important;
    padding-bottom: 1rem !important;
  }
  /* Register hero: smaller logo and tighter margin so the form starts
     higher on the page. The card below already carries the brand. */
  .auth-hero { margin-bottom: 1.1rem !important; gap: 0.4rem !important; }
  .auth-hero img { max-width: 130px !important; }
}
</style>
