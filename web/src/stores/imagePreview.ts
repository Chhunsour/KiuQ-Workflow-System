import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface PreviewPayload {
  avatarUrl: string;
  fullName: string;
  email?: string;
  role?: string;
}

export const useImagePreviewStore = defineStore('imagePreview', () => {
  const isOpen = ref(false);
  const payload = ref<PreviewPayload | null>(null);

  const triggerPreview = (data: PreviewPayload) => {
    payload.value = data;
    isOpen.value = true;
  };

  const closePreview = () => {
    isOpen.value = false;
    payload.value = null;
  };

  return {
    isOpen,
    payload,
    triggerPreview,
    closePreview,
  };
});
