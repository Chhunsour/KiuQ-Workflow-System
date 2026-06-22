<template>
  <Transition name="modal-fade">
    <div v-if="isOpen" class="image-preview-overlay" @click.self="onClose" @keydown.esc="onClose" tabindex="-1">
      <div class="image-preview-container">
        <!-- Close button (Absolute top-right of the whole container) -->
        <button class="close-modal-btn" @click="onClose" aria-:label="$t('Close preview')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="preview-content">
          <!-- Left Side: Image -->
          <div class="image-section">
            <div class="image-wrapper">
              <img :src="imageUrl" :alt="taskTitle" class="large-preview-img" />
            </div>
            <div class="image-actions">
              <a :href="imageUrl" target="_blank" rel="noopener" class="btn-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                {{ $t('Open Original') }}
              </a>
              <button @click="downloadImage" class="btn-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                {{ $t('Download') }}
              </button>
            </div>
          </div>

          <!-- Right Side: Info -->
          <div class="info-section">
            <div class="info-header">
              <div class="info-badges">
                <slot name="badges">
                  <span v-if="status" class="preview-badge status">{{ status }}</span>
                  <span v-if="dueDate" class="preview-badge deadline">{{ dueDate }}</span>
                </slot>
              </div>
              <h2 class="preview-title">{{ taskTitle }}</h2>
              <div v-if="assignedMember" class="assigned-row">
                <span class="label">{{ $t('Assigned to:') }}</span>
                <span class="value">{{ assignedMember }}</span>
              </div>
              <div v-if="createdBy" class="assigned-row">
                <span class="label">{{ $t('Created by:') }}</span>
                <span class="value">{{ createdBy }}</span>
              </div>
            </div>

            <div class="info-body scrollbar-custom">
              <h3 class="section-label">{{ $t('Task Description') }}</h3>
              <div class="preview-description">
                <p v-if="description">{{ description }}</p>
                <p v-else class="text-muted italic">{{ $t('No description provided for this task.') }}</p>
              </div>
            </div>

            <div class="info-footer">
              <button class="btn-primary w-full" @click="onClose">{{ $t('Got it') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  imageUrl: string;
  taskTitle: string;
  description?: string;
  assignedMember?: string;
  dueDate?: string;
  status?: string;
  createdBy?: string;
  onClose: () => void;
}>();

const downloadImage = () => {
  const link = document.createElement('a');
  link.href = props.imageUrl;
  link.download = `task-${props.taskTitle.replace(/\s+/g, '-').toLowerCase()}.webp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    props.onClose();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.image-preview-container {
  position: relative;
  width: 90vw;
  max-width: 1300px;
  height: 85vh;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Adjust size for "around 75%" on desktop as requested */
@media (min-width: 1024px) {
  .image-preview-container {
    width: 80vw;
    height: 75vh;
  }
}

.preview-content {
  display: flex;
  height: 100%;
  width: 100%;
}

/* Left Section (Image) */
.image-section {
  flex: 7;
  background: #0f172a; /* Neutral dark background for screenshots */
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.image-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow: hidden;
}

.large-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.image-actions {
  padding: 0.75rem 1.5rem;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  background: rgba(248,251,255,0.1);
  color: #f8fbff;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid rgba(248,251,255,0.1);
}

.btn-action:hover {
  background: rgba(248,251,255,0.2);
  transform: translateY(-1px);
}

/* Right Section (Info) */
.info-section {
  flex: 3;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  background: var(--card-bg);
}

.info-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.preview-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.preview-badge.status {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}

.preview-badge.deadline {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 850;
  color: var(--text-main);
  line-height: 1.3;
  margin-bottom: 1rem;
  font-family: 'Raleway', sans-serif;
}

.assigned-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  margin-top: 0.4rem;
}

.assigned-row .label {
  color: var(--text-muted);
  font-weight: 500;
}

.assigned-row .value {
  color: var(--text-main);
  font-weight: 700;
}

.info-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.preview-description {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-main);
  white-space: pre-wrap;
}

.info-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--soft-bg);
}

.btn-primary {
  background: var(--primary);
  color: #f8fbff;
  padding: 0.75rem;
  border-radius: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(63, 141, 254, 0.3);
}

/* Close Button */
.close-modal-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  color: #f8fbff;
  border: 1px solid rgba(248,251,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-modal-btn:hover {
  background: var(--primary);
  transform: scale(1.1);
  border-color: transparent;
}

/* Scrollbar */
.scrollbar-custom::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-custom::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-custom::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .image-preview-container {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-enter-from .image-preview-container {
  transform: scale(0.9) translateY(20px);
}

/* Mobile Layout */
@media (max-width: 1023px) {
  .preview-content {
    flex-direction: column;
    overflow-y: auto;
  }
  
  .image-preview-container {
    width: 95vw;
    height: 90vh;
  }
  
  .image-section {
    flex: none;
    height: 50%;
  }
  
  .info-section {
    flex: none;
    border-left: none;
    border-top: 1px solid var(--border);
  }
  
  .info-body {
    overflow-y: visible;
  }
  
  .close-modal-btn {
    top: 0.5rem;
    right: 0.5rem;
  }
}

/* Theme support */
:root[data-theme='dark'] .image-preview-container {
  background: #1e1e1e; /* Dark Gray Mode background */
}

:root[data-theme='dark'] .info-section {
  background: #1e1e1e;
}

:root[data-theme='dark'] .image-section {
  background: #000;
}
</style>
