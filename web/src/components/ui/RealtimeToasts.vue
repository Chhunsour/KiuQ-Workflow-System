<template>
  <div class="rt-stack" role="region" aria-:label="$t('Notifications')">
    <TransitionGroup name="rt">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="rt-toast"
        :class="`rt-toast--${toast.tone}`"
        role="status"
      >
        <span class="rt-accent" aria-hidden="true" />

        <span class="rt-icon" :class="`rt-icon--${variant(toast)}`" v-html="iconSvg(toast)" />

        <div class="rt-body">
          <div class="rt-title">{{ toast.title }}</div>
          <div v-if="toast.message" class="rt-message">{{ toast.message }}</div>
          <div v-if="toast.link" class="rt-actions">
            <button type="button" class="rt-open" @click="open(toast)">{{ $t('Open') }}</button>
          </div>
        </div>

        <button
          type="button"
          class="rt-close"
          aria-:label="$t('Dismiss')"
          @click="removeToast(toast.id)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useRealtimeService, type RealtimeToast } from '@/services/realtimeService';
import { notificationIconSvg, notificationVariant } from '@/lib/notificationDisplay';
import type { NotificationType } from '@/stores/notifications';

const { toasts, removeToast } = useRealtimeService();
const router = useRouter();

const BELL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

const iconSvg = (toast: RealtimeToast): string =>
  toast.type ? notificationIconSvg(toast.type as NotificationType, 15) : BELL;

const variant = (toast: RealtimeToast): string => {
  if (toast.type) return notificationVariant(toast.type as NotificationType);
  if (toast.tone === 'success') return 'success';
  if (toast.tone === 'warning') return 'warning';
  return 'primary';
};

const open = (toast: RealtimeToast) => {
  if (toast.link) router.push(toast.link);
  removeToast(toast.id);
};
</script>

<style scoped>
.rt-stack {
  position: fixed;
  right: 1.1rem;
  top: 4.75rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: min(360px, calc(100vw - 1.5rem));
  pointer-events: none;
}

/* Solid card — no gradient. Reads on both light + dark-gray themes. */
.rt-toast {
  position: relative;
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.8rem 0.85rem 0.8rem 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* Left accent line — the only "color" cue, kept subtle. */
.rt-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--primary);
}
.rt-toast--success .rt-accent { background: #16a34a; }
.rt-toast--warning .rt-accent { background: #dc2626; }

.rt-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9px;
}
.rt-icon--primary { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.rt-icon--success { background: rgba(34, 197, 94, 0.14); color: #16a34a; }
.rt-icon--warning { background: rgba(239, 68, 68, 0.14); color: #dc2626; }
.rt-icon--purple  { background: rgba(124, 58, 237, 0.14); color: #7c3aed; }
.rt-icon--cyan    { background: rgba(6, 182, 212, 0.14); color: #0891b2; }
.rt-icon--red     { background: rgba(239, 68, 68, 0.14); color: #ef4444; }
.rt-icon--neutral { background: var(--soft-bg); color: var(--text-muted); }
:root[data-theme='dark-gray'] .rt-icon--success { color: #4ade80; }
:root[data-theme='dark-gray'] .rt-icon--warning { color: #f87171; }
:root[data-theme='dark-gray'] .rt-icon--purple  { color: #a78bfa; }
:root[data-theme='dark-gray'] .rt-icon--cyan    { color: #22d3ee; }

.rt-body { flex: 1; min-width: 0; }

.rt-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.25;
}
.rt-message {
  margin-top: 0.15rem;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rt-actions { margin-top: 0.5rem; }
.rt-open {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  border-radius: 8px;
  padding: 0.28rem 0.7rem;
  cursor: pointer;
  transition: background 130ms ease;
}
.rt-open:hover { background: color-mix(in srgb, var(--primary) 20%, transparent); }

.rt-close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: background 130ms ease, color 130ms ease;
}
.rt-close:hover { background: var(--soft-bg); color: var(--text-main); }

/* Slide in from the right, fade out */
.rt-enter-active { transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease; }
.rt-leave-active { transition: transform 180ms ease, opacity 180ms ease; position: absolute; right: 0; width: 100%; }
.rt-enter-from { transform: translateX(20px); opacity: 0; }
.rt-leave-to { transform: translateX(20px); opacity: 0; }
.rt-move { transition: transform 220ms ease; }

@media (prefers-reduced-motion: reduce) {
  .rt-enter-active, .rt-leave-active, .rt-move { transition: none; }
}

@media (max-width: 640px) {
  .rt-stack { right: 0.6rem; left: 0.6rem; width: auto; top: 4rem; }
}
</style>
