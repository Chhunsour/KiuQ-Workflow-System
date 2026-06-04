<template>
  <!--
    Coming-soon lock shown inside the CMS pages for any role that
    isn't admin-class. Quality Checker is blocked earlier (sidebar
    + route guard), so this screen is what Team Members and
    Assistant Heads see when they click the CMS nav entry.
  -->
  <div class="cms-lock card card-pad">
    <div class="cms-lock-icon" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>

    <div class="cms-lock-badge">{{ badge }}</div>

    <h2 class="cms-lock-title">{{ title }}</h2>

    <p class="cms-lock-sub" v-html="description"></p>

    <p v-if="hint" class="cms-lock-hint">
      {{ hint }}
    </p>

    <RouterLink to="/" class="btn-secondary cms-lock-cta">Back to Dashboard</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

withDefaults(defineProps<{
  badge?: string;
  title?: string;
  description?: string;
  hint?: string | null;
}>(), {
  badge: 'Coming Soon',
  title: 'CMS access is being prepared',
  description: 'The Product CMS is currently available only to <strong>Head</strong> and <strong>Supervisor</strong> accounts. Editor access for the rest of the team will roll out soon.',
  hint: 'Need access sooner? Ask a Head or Supervisor to grant it.'
});
</script>

<style scoped>
.cms-lock {
  max-width: 30rem;
  margin: 2rem auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.7rem;
  padding: 2.1rem 1.6rem 1.6rem;
}

.cms-lock-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}

.cms-lock-badge {
  display: inline-flex;
  align-items: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
}

.cms-lock-title {
  margin: 0.1rem 0 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.2rem;
  font-weight: 850;
  color: var(--text-main);
  line-height: 1.3;
}

.cms-lock-sub {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-muted);
}

.cms-lock-hint {
  margin: 0.4rem 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.cms-lock-cta {
  margin-top: 0.6rem;
}

@media (max-width: 480px) {
  .cms-lock { padding: 1.6rem 1.2rem 1.3rem; margin: 1rem 0; }
  .cms-lock-title { font-size: 1.08rem; }
}
</style>
