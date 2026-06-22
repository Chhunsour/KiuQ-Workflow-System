<template>
  <div class="wf-guide card card-pad">
    <div class="wf-header">
      <div class="wf-header-left">
        <span class="wf-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </span>
        <h3 class="wf-title">{{ $t('Blog Workflow Guide') }}</h3>
      </div>
      <button v-if="canEdit && !editing" type="button" class="btn-secondary wf-edit-btn" @click="startEdit">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
        </svg>
        {{ $t('Edit') }}
      </button>
    </div>

    <!-- Edit mode -->
    <div v-if="editing" class="wf-edit">
      <textarea
        v-model="draft"
        class="input wf-textarea"
        :placeholder="$t('Enter workflow instructions…') + '\n' + $t('Step 1: Generate image using Prompt Template') + '\n' + $t('Step 2: Use Website Color #FF6B00') + '\n' + $t('Step 3: Export 16:9 JPG') + '\n' + $t('Step 4: Upload to WordPress')"
        rows="8"
      />
      <div class="wf-edit-actions">
        <button type="button" class="btn-secondary" @click="editing = false">{{ $t('Cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Display mode -->
    <div v-else-if="instructions" class="wf-content">
      <ol class="wf-steps">
        <li v-for="(step, i) in parsedSteps" :key="i" class="wf-step">
          <span class="wf-step-num">{{ i + 1 }}</span>
          <span class="wf-step-text">{{ step }}</span>
        </li>
      </ol>
    </div>

    <!-- Empty state -->
    <div v-else class="wf-empty">
      <p class="wf-empty-text">{{ $t('No workflow instructions yet.') }}</p>
      <button v-if="canEdit" type="button" class="btn-primary" @click="startEdit">
        {{ $t('Add Instructions') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  instructions: string;
  canEdit: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', instructions: string): void;
}>();

const editing = ref(false);
const draft = ref('');

const parsedSteps = computed(() =>
  props.instructions
    .split('\n')
    .map((s) => s.replace(/^\d+[.):\-]\s*/, '').trim())
    .filter(Boolean)
);

const startEdit = () => {
  draft.value = props.instructions;
  editing.value = true;
};

const save = () => {
  emit('save', draft.value.trim());
  editing.value = false;
};
</script>

<style scoped>
.wf-guide {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.wf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.wf-header-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.wf-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.05));
  color: #16a34a;
}
:root[data-theme='dark-gray'] .wf-icon {
  color: #4ade80;
}

.wf-title {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-main);
}

.wf-edit-btn {
  font-size: 0.78rem;
  padding: 0.35rem 0.7rem;
  height: auto;
  min-height: auto;
}

.wf-content {
  padding-left: 0.25rem;
}

.wf-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.wf-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.wf-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.wf-step-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-main);
}

.wf-edit {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.wf-textarea {
  min-height: 140px;
  resize: vertical;
  font-size: 0.85rem;
  line-height: 1.5;
}

.wf-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.wf-empty {
  text-align: center;
  padding: 1.5rem 0;
}

.wf-empty-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}
</style>
