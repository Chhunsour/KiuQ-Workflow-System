<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay fixed inset-0 z-50 flex items-start justify-center px-4 py-10 overflow-y-auto"
      @click.self="onBackdropClick"
    >
      <div
        class="modal-panel card relative w-full bg-card"
        :class="[sizeClass, panelClass]"
      >
        <header class="modal-header flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
          <div class="min-w-0">
            <h3 class="ui-font text-[0.95rem] font-bold text-text-main">{{ title }}</h3>
            <p v-if="subtitle" class="text-xs text-text-muted mt-0.5">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="btn-ghost h-8 w-8 px-0 flex-shrink-0"
            aria-label="$t('Close')"
            @click="$emit('close')"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div class="modal-body px-5 py-4" :class="bodyClass">
          <slot />
        </div>
        <footer
          v-if="$slots.footer"
          class="modal-footer flex items-center justify-end gap-2 border-t border-border bg-soft/40 px-5 py-3.5 rounded-b-card"
        >
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    subtitle?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    panelClass?: string;
    bodyClass?: string;
    /** When false, clicking the backdrop does NOT close the modal (prevents
     *  accidental loss of unsaved edits). Defaults to true. */
    closeOnBackdrop?: boolean;
  }>(),
  { size: 'md', panelClass: '', bodyClass: '', closeOnBackdrop: true }
);

const emit = defineEmits<{ (e: 'close'): void }>();

const onBackdropClick = () => {
  if (props.closeOnBackdrop) emit('close');
};

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-md';
    case 'lg':
      return 'max-w-3xl';
    case 'xl':
      return 'max-w-5xl';
    case 'xxl':
      return 'max-w-[1700px] w-[95vw]';
    default:
      return 'max-w-xl';
  }
});
</script>

<style scoped>
/* Premium scrim — soft dark + backdrop blur so the modal reads as a
   focused layer floating above a recessed page (Stripe/Linear style). */
.modal-overlay {
  background: color-mix(in srgb, var(--text-main) 32%, transparent);
  -webkit-backdrop-filter: blur(4px) saturate(120%);
  backdrop-filter: blur(4px) saturate(120%);
  animation: modal-fade 160ms ease;
}
:root[data-theme='dark-gray'] .modal-overlay {
  background: rgba(0, 0, 0, 0.55);
}

.modal-panel {
  box-shadow: var(--shadow-lg);
  animation: modal-pop 180ms cubic-bezier(0.34, 1.3, 0.5, 1);
}

@keyframes modal-fade {
  from { opacity: 0; }
}
@keyframes modal-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
}
@media (prefers-reduced-motion: reduce) {
  .modal-overlay, .modal-panel { animation: none; }
}

/* ── Mobile: modal becomes a near-fullscreen sheet with internal scroll ── */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
    align-items: stretch;
  }
  .modal-panel {
    /* Override Tailwind max-w-* utilities for the mobile sheet */
    max-width: 100% !important;
    min-height: 100vh;
    min-height: 100dvh;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    border-top: 0;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    position: sticky;
    top: 0;
    z-index: 2;
    background: rgb(var(--color-card-bg));
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  .modal-body {
    flex: 1 1 auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .modal-footer {
    position: sticky;
    bottom: 0;
    z-index: 2;
    border-radius: 0;
    background: rgb(var(--color-card-bg));
    /* respect iPhone home-indicator safe area */
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    flex-wrap: wrap;
  }
}

/* On larger phones / small tablets keep it floating but cap the height
   so long forms scroll inside instead of pushing the page. */
@media (min-width: 641px) and (max-width: 1024px) {
  .modal-panel {
    max-height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
  }
  .modal-body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
