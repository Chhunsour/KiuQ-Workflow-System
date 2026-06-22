<template>
  <Modal :open="open" :title="editing ? 'Edit Prompt Template' : 'New Prompt Template'" size="md" @close="$emit('close')">
    <div class="ptm-form">
      <div>
        <label class="label">{{ $t('Template Name') }}</label>
        <input
          v-model="form.templateName"
          class="input"
          type="text"
          :placeholder="$t('e.g. Product Review, Buying Guide, Comparison…')"
        />
      </div>
      <div>
        <label class="label">{{ $t('Prompt Content') }}</label>
        <textarea
          v-model="form.promptContent"
          class="input ptm-textarea"
          :placeholder="$t('Create a professional 16:9 blog featured image showing…')"
          rows="6"
        />
        <p class="helper">{{ $t('This is the exact text team members will copy to generate blog featured images.') }}</p>
      </div>
      <div>
        <label class="label">{{ $t('Sort Position') }}</label>
        <input
          v-model.number="form.position"
          class="input"
          type="number"
          min="0"
          placeholder="0"
        />
      </div>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('Cancel') }}</button>
      <button
        type="button"
        class="btn-primary"
        :disabled="!canSave || saving"
        @click="save"
      >
        {{ saving ? 'Saving…' : editing ? 'Update' : 'Create' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import type { BlogImagePrompt } from '@/stores/blogImageCenter';

const props = defineProps<{
  open: boolean;
  websiteId: string;
  prompt?: BlogImagePrompt | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: { id?: string; websiteId: string; templateName: string; promptContent: string; position: number }): void;
}>();

const editing = computed(() => !!props.prompt?.id);

const form = reactive({
  templateName: '',
  promptContent: '',
  position: 0
});

// Reset form when modal opens
watch(
  () => props.open,
  (opened) => {
    if (opened) {
      if (props.prompt) {
        form.templateName = props.prompt.templateName;
        form.promptContent = props.prompt.promptContent;
        form.position = props.prompt.position;
      } else {
        form.templateName = '';
        form.promptContent = '';
        form.position = 0;
      }
    }
  }
);

const canSave = computed(() => form.templateName.trim() && form.promptContent.trim());

const save = () => {
  emit('save', {
    id: props.prompt?.id,
    websiteId: props.websiteId,
    templateName: form.templateName.trim(),
    promptContent: form.promptContent.trim(),
    position: form.position
  });
};
</script>

<style scoped>
.ptm-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ptm-textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.55;
}
</style>
