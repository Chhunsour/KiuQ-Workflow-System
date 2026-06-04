<template>
  <Modal :open="open" title="Quick Capture" size="lg" @close="handleClose">
    <div class="quick-capture-modal flex flex-col gap-5 select-none" @keydown="handleKeyDown">
      
      <!-- Premium Sliding Segmented Control Tab Bar -->
      <div class="relative flex p-1 bg-soft border border-border/60 rounded-xl">
        <!-- Sliding active indicator pill -->
        <div
          class="absolute top-1 bottom-1 bg-card rounded-lg shadow-sm border border-border/40 transition-all duration-200 ease-out"
          :style="indicatorStyle"
        ></div>
        
        <button
          v-for="(t, idx) in tabs"
          :key="t.id"
          type="button"
          class="flex-1 py-2 text-xs sm:text-sm font-semibold text-center relative z-10 transition-colors duration-200"
          :class="[
            activeTab === t.id
              ? 'text-primary font-bold'
              : 'text-text-muted hover:text-text-main'
          ]"
          @click="changeTab(t.id, idx)"
        >
          <span class="flex items-center justify-center gap-1.5">
            <span v-html="t.icon" class="w-4 h-4 flex items-center justify-center"></span>
            {{ t.label }}
          </span>
        </button>
      </div>

      <!-- Content Area with springy horizontal transitions -->
      <div class="relative overflow-hidden">
        <Transition name="tab-slide" mode="out-in">
          <div :key="activeTab" class="flex flex-col gap-4">
            
            <!-- Notion-style Borderless Document Title -->
            <div class="title-container relative border-b border-border/30">
              <input
                v-model="form.title"
                ref="titleInputRef"
                type="text"
                class="title-input text-xl font-bold bg-transparent border-0 focus:ring-0 w-full px-0 py-2.5 placeholder:text-text-soft/40 text-text-main focus:outline-none"
                maxlength="80"
                :placeholder="titlePlaceholder"
                required
              />
              <div class="absolute right-0 bottom-3.5 text-[9px] text-text-soft font-mono select-none">
                {{ form.title.length }}/80
              </div>
            </div>

            <!-- Inline Interactive Metadata Chips Row -->
            <div class="metadata-chips flex flex-wrap gap-2.5 items-center">
              
              <!-- 1. Context Date Chip -->
              <div class="meta-chip flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-full border border-border/60 hover:border-primary/40 focus-within:border-primary/60 transition duration-150">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-text-soft">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span class="text-text-muted text-xs mr-0.5 select-none">{{ activeTab === 'reminder' ? 'Due:' : 'Date:' }}</span>
                <input
                  v-model="metaDate"
                  type="date"
                  class="bg-transparent border-0 p-0 text-xs font-semibold focus:ring-0 cursor-pointer text-text-main focus:outline-none"
                />
              </div>

              <!-- 2. Priority Chip (Reminder only) -->
              <div v-if="activeTab === 'reminder'" class="meta-chip flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-full border border-border/60 hover:border-primary/40 focus-within:border-primary/60 transition duration-150">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-text-soft">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                <span class="text-text-muted text-xs mr-0.5 select-none">Priority:</span>
                <select
                  v-model="form.priority"
                  class="bg-transparent border-0 p-0 text-xs font-semibold focus:ring-0 cursor-pointer text-text-main focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>

              <!-- 3. Status Chip (Idea/Note only) -->
              <div v-if="activeTab === 'idea' || activeTab === 'note'" class="meta-chip flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-full border border-border/60 hover:border-primary/40 focus-within:border-primary/60 transition duration-150">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-text-soft">
                  <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                </svg>
                <span class="text-text-muted text-xs mr-0.5 select-none">Status:</span>
                <select
                  v-model="form.status"
                  class="bg-transparent border-0 p-0 text-xs font-semibold focus:ring-0 cursor-pointer text-text-main focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <!-- Integrated borderless Rich Text Workspace -->
            <div class="editor-wrapper border border-border/60 rounded-xl bg-soft/20 focus-within:bg-soft/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/5 transition duration-150 overflow-hidden">
              <RichEditor
                v-model="form.content"
                :placeholder="contentPlaceholder"
                class="w-full border-0 bg-transparent shadow-none"
              />
            </div>

            <!-- Tags Section (Obsidian-style inline tags bar) -->
            <div class="flex flex-col gap-2 mt-1">
              <div class="tags-bar flex flex-wrap gap-2 items-center bg-soft/20 border border-border/60 p-2.5 rounded-xl">
                <span class="text-xs text-text-soft font-semibold flex items-center gap-1 select-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  Tags:
                </span>

                <!-- Display active tag pills -->
                <span
                  v-for="tag in form.tags"
                  :key="tag"
                  class="badge bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-full"
                >
                  #{{ tag }}
                  <button
                    type="button"
                    class="hover:text-status-needs-fix-fg font-black text-xs ml-0.5 leading-none"
                    @click="removeTag(tag)"
                  >
                    &times;
                  </button>
                </span>

                <!-- Custom inline input -->
                <input
                  v-model="tagInput"
                  type="text"
                  class="bg-transparent border-0 p-0 text-xs focus:ring-0 focus:outline-none w-24 text-text-main placeholder:text-text-soft/40"
                  placeholder="+ Add tag..."
                  @keydown.enter.prevent="addTag"
                  @blur="addTag"
                />
              </div>

              <!-- Suggested tags row -->
              <div class="suggested-tags flex items-center gap-2 text-[10px] text-text-soft px-1.5" v-if="suggestedTags.length">
                <span>Suggested:</span>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-for="st in suggestedTags"
                    :key="st"
                    type="button"
                    class="hover:text-primary hover:underline transition font-semibold"
                    @click="addSuggestedTag(st)"
                  >
                    #{{ st }}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </Transition>
      </div>

      <!-- Error alert -->
      <div
        v-if="errorMessage"
        class="rounded-xl border border-status-needs-fix-bg bg-status-needs-fix-bg/10 px-4 py-3 text-sm text-status-needs-fix-fg flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ errorMessage }}
      </div>
    </div>

    <!-- Footer actions -->
    <template #footer>
      <div class="w-full flex items-center justify-between pt-2">
        <span class="hidden sm:inline-flex items-center gap-1.5 text-xs text-text-soft select-none">
          <kbd class="px-1.5 py-0.5 bg-soft border border-border rounded text-[10px] font-mono shadow-sm">Ctrl</kbd>
          <span>+</span>
          <kbd class="px-1.5 py-0.5 bg-soft border border-border rounded text-[10px] font-mono shadow-sm">Enter</kbd>
          <span>to save</span>
        </span>

        <div class="flex gap-3 ml-auto">
          <button class="btn-ghost px-5 rounded-xl font-medium" type="button" @click="handleClose">
            Cancel
          </button>
          <button
            class="btn-primary min-w-[130px] rounded-xl font-medium shadow-sm hover:shadow"
            type="button"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? 'Saving...' : 'Save Capture' }}
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, nextTick } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import RichEditor from '@/components/ui/RichEditor.vue';
import { useCommandCenterStore, type CommandCenterCategory } from '@/stores/commandCenter';
import { pushToast } from '@/services/realtimeService';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const ccStore = useCommandCenterStore();

const activeTab = ref<CommandCenterCategory>('idea');
const activeIndex = ref(0);
const saving = ref(false);
const errorMessage = ref('');
const tagInput = ref('');
const titleInputRef = ref<HTMLInputElement | null>(null);

const tabs = [
  {
    id: 'idea' as const,
    label: 'Idea',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`
  },
  {
    id: 'note' as const,
    label: 'Note',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
  },
  {
    id: 'reminder' as const,
    label: 'Reminder',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  },
  {
    id: 'decision' as const,
    label: 'Decision',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
  }
];

const form = reactive({
  title: '',
  content: '',
  tags: [] as string[],
  dueDate: new Date().toISOString().substring(0, 10),
  priority: 'normal',
  status: 'active',
  decisionDate: new Date().toISOString().substring(0, 10)
});

const metaDate = computed({
  get() {
    return activeTab.value === 'reminder' ? form.dueDate : form.decisionDate;
  },
  set(val: string) {
    if (activeTab.value === 'reminder') {
      form.dueDate = val;
    } else {
      form.decisionDate = val;
    }
  }
});

const titlePlaceholder = computed(() => {
  if (activeTab.value === 'idea') return 'Capture a spark of inspiration...';
  if (activeTab.value === 'note') return 'What do you want to write down?';
  if (activeTab.value === 'reminder') return 'What needs to be done?';
  if (activeTab.value === 'decision') return 'Document executive resolution...';
  return 'Title';
});

const contentPlaceholder = computed(() => {
  if (activeTab.value === 'idea') return 'Describe your idea, potential benefits, next steps...';
  if (activeTab.value === 'note') return 'Write down your general notes here...';
  if (activeTab.value === 'reminder') return 'Explain details or reminders...';
  if (activeTab.value === 'decision') return 'Provide the context, options weighed, final choice, and outcomes...';
  return 'Write details here...';
});

// Category-based suggested tags list
const suggestedTagsMap: Record<CommandCenterCategory, string[]> = {
  idea: ['strategy', 'growth', 'product', 'ux-ui'],
  note: ['meeting', 'research', 'management', 'cro'],
  reminder: ['urgent', 'followup', 'review', 'delegation'],
  decision: ['executive', 'policy', 'hiring', 'planning'],
  daily_log: [],
  strategy: [],
  meeting_notes: []
};

const suggestedTags = computed(() => {
  return suggestedTagsMap[activeTab.value] || [];
});

const indicatorStyle = computed(() => {
  const width = 100 / tabs.length;
  const leftPosition = width * activeIndex.value;
  return {
    width: `calc(${width}% - 8px)`,
    left: `calc(${leftPosition}% + 4px)`
  };
});

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetForm();
    activeTab.value = 'idea';
    activeIndex.value = 0;
    focusTitleInput();
  }
});

const changeTab = (tabId: CommandCenterCategory, idx: number) => {
  activeTab.value = tabId;
  activeIndex.value = idx;
  focusTitleInput();
};

const focusTitleInput = () => {
  nextTick(() => {
    if (titleInputRef.value) {
      titleInputRef.value.focus();
    }
  });
};

const resetForm = () => {
  form.title = '';
  form.content = '';
  form.tags = [];
  form.dueDate = new Date().toISOString().substring(0, 10);
  form.priority = 'normal';
  form.status = 'active';
  form.decisionDate = new Date().toISOString().substring(0, 10);
  tagInput.value = '';
  errorMessage.value = '';
};

const addTag = () => {
  const clean = tagInput.value.trim().toLowerCase();
  if (clean && !form.tags.includes(clean)) {
    form.tags.push(clean);
  }
  tagInput.value = '';
};

const addSuggestedTag = (tag: string) => {
  if (!form.tags.includes(tag)) {
    form.tags.push(tag);
  }
};

const removeTag = (tag: string) => {
  form.tags = form.tags.filter((t) => t !== tag);
};

const handleClose = () => {
  emit('close');
};

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    void handleSave();
  }
};

const handleSave = async () => {
  if (!form.title.trim()) {
    errorMessage.value = 'Please enter a title.';
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  try {
    const metadata: Record<string, any> = {};
    if (activeTab.value === 'reminder') {
      if (form.dueDate) metadata['due_date'] = form.dueDate;
      metadata['priority'] = form.priority;
    } else if (activeTab.value === 'decision') {
      metadata['decision_date'] = form.decisionDate;
    }

    const created = await ccStore.createEntry(
      activeTab.value,
      form.title.trim(),
      form.content,
      form.tags,
      form.status,
      metadata
    );

    if (created) {
      pushToast(
        'Captured successfully',
        `Successfully logged your new ${activeTab.value} in CommandCenter.`,
        'success'
      );
      emit('success');
      emit('close');
    } else {
      errorMessage.value = ccStore.error || 'Failed to capture entry.';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'An error occurred while saving.';
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.quick-capture-modal {
  min-height: 280px;
}

/* Custom class overrides to make the RichEditor borderless and integrate seamlessly */
.quick-capture-modal :deep(.rich-editor) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  min-height: 140px !important;
}
.quick-capture-modal :deep(.toolbar) {
  background: transparent !important;
  border-bottom: 1px solid var(--border) !important;
  opacity: 0.8;
  padding-left: 0.5rem;
}
.quick-capture-modal :deep(.editor-area) {
  min-height: 100px !important;
  padding: 0.75rem 0.5rem !important;
}

/* Dope slide and fade tab transition */
.tab-slide-enter-active,
.tab-slide-leave-active {
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-slide-enter-from {
  opacity: 0;
  transform: translateX(12px) scale(0.99);
}
.tab-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.99);
}
</style>
