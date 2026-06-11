<template>
  <!--
    Full-screen first-paint loading state. Shown by App.vue while auth +
    profile are being initialized. App.vue already has a 10-second fallback
    timer that flips this into an error+retry screen, so this component
    never has to manage its own infinite-loading guard.
  -->
  <div class="kls-screen" role="status" aria-live="polite" aria-label="Loading KiuQ Website System">
    <div class="kls-stack">
      <!-- Logo with soft glow + gentle scale pulse -->
      <div class="kls-logo-wrap">
        <span class="kls-logo-glow" aria-hidden="true" />
        <img
          src="/kiuq-logo.png"
          alt="KiuQ"
          class="kls-logo"
          width="220"
          height="220"
        />
      </div>

      <h1 class="kls-title">Loading KiuQ Website System</h1>
      <p class="kls-subtitle">Preparing your workspace…</p>

      <!-- Animated loading dots -->
      <div class="kls-dots" aria-hidden="true">
        <span class="kls-dot" />
        <span class="kls-dot" />
        <span class="kls-dot" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No props, no state — visibility is controlled by the parent (App.vue).
</script>

<style scoped>
.kls-screen {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #242424;
  /* Subtle radial highlight so the dark gray doesn't feel flat */
  background-image: radial-gradient(
    circle at 50% 38%,
    rgba(21, 214, 194, 0.10),
    rgba(21, 214, 194, 0) 55%
  );
  color: #f1f5f9;
  /* Entire screen fades in on first paint */
  animation: kls-screen-in 360ms ease-out both;
}

.kls-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
  max-width: 22rem;
  text-align: center;
}

/* ── Logo ─────────────────────────────────────────────────────────── */
.kls-logo-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 220px;
}

.kls-logo-glow {
  position: absolute;
  inset: -14%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(21, 214, 194, 0.32) 0%,
    rgba(21, 214, 194, 0.12) 32%,
    rgba(21, 214, 194, 0) 70%
  );
  filter: blur(6px);
  animation: kls-glow 3.2s ease-in-out infinite;
}

.kls-logo {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Fade + scale in on first render, then gentle continuous pulse */
  animation:
    kls-logo-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both,
    kls-logo-pulse 3.2s ease-in-out 700ms infinite;
}

/* ── Text ─────────────────────────────────────────────────────────── */
.kls-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', 'Google Sans', system-ui, sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.005em;
  color: #f1f5f9;
  animation: kls-text-in 600ms 220ms ease-out both;
}

.kls-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
  animation: kls-text-in 600ms 360ms ease-out both;
}

/* ── Dots ─────────────────────────────────────────────────────────── */
.kls-dots {
  display: inline-flex;
  gap: 0.4rem;
  margin-top: 0.25rem;
  animation: kls-text-in 600ms 500ms ease-out both;
}
.kls-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #15D6C2;
  opacity: 0.35;
  animation: kls-dot 1.2s ease-in-out infinite;
}
.kls-dot:nth-child(2) { animation-delay: 0.15s; }
.kls-dot:nth-child(3) { animation-delay: 0.30s; }

/* ── Keyframes ────────────────────────────────────────────────────── */
@keyframes kls-screen-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes kls-logo-in {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes kls-logo-pulse {
  0%, 100% { transform: scale(1);     }
  50%      { transform: scale(1.035); }
}

@keyframes kls-glow {
  0%, 100% { opacity: 0.55; transform: scale(1);    }
  50%      { opacity: 1;    transform: scale(1.06); }
}

@keyframes kls-text-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0);   }
}

@keyframes kls-dot {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40%           { opacity: 1;    transform: translateY(-3px); }
}

/* ── Mobile polish ───────────────────────────────────────────────── */
@media (max-width: 600px) {
  .kls-logo-wrap { width: 160px; height: 160px; }
  .kls-title { font-size: 0.98rem; }
  .kls-subtitle { font-size: 0.82rem; }
}
@media (max-width: 380px) {
  .kls-logo-wrap { width: 140px; height: 140px; }
}

/* Respect users who don't want motion */
@media (prefers-reduced-motion: reduce) {
  .kls-screen,
  .kls-logo,
  .kls-logo-glow,
  .kls-title,
  .kls-subtitle,
  .kls-dots,
  .kls-dot {
    animation: none !important;
  }
  .kls-dot { opacity: 0.7; }
}
</style>
