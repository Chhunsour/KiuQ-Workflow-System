<template>
  <Teleport to="body">
    <Transition name="copy-toast">
      <div v-if="visible" class="copy-toast-wrap" role="status" aria-live="polite">
        <div class="copy-toast">
          <span class="copy-toast-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span class="copy-toast-text">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ message: string; show: boolean }>();
const emit = defineEmits<{ (e: 'done'): void }>();

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.show,
  (val) => {
    if (!val) return;
    visible.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      visible.value = false;
      emit('done');
    }, 2000);
  }
);
</script>

<style scoped>
.copy-toast-wrap {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 9999;
  pointer-events: none;
}

.copy-toast {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.1rem;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border, #e5e7eb);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
  pointer-events: auto;
}

.copy-toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: #dcfce7;
  color: #15803d;
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .copy-toast-icon {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.copy-toast-text {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.copy-toast-enter-active,
.copy-toast-leave-active {
  transition: opacity 240ms ease, transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.copy-toast-enter-from,
.copy-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}
</style>
