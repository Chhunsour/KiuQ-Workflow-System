<template>
  <Modal :open="open && !!issue" title="Edit Issue" size="md" @close="close">
    <div v-if="issue" class="ei-body" @paste="onPaste">
      <label class="ei-label">Issue title</label>
      <input
        ref="titleEl"
        v-model="form.title"
        class="ei-input"
        type="text"
        placeholder="Issue title"
        @keyup.enter="save"
      />

      <div class="ei-row">
        <div class="ei-col">
          <label class="ei-label">Page URL</label>
          <input
            v-model="form.pageUrl"
            class="ei-input"
            type="url"
            placeholder="https://..."
          />
        </div>
        <div v-if="canEditStatus" class="ei-col">
          <label class="ei-label">Status</label>
          <select v-model="form.status" class="ei-input">
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="isManager" class="ei-col">
        <label class="ei-label">Assigned member</label>
        <select v-model="form.assignedTo" class="ei-input">
          <option value="">Unassigned</option>
          <option v-for="m in members" :key="m.id" :value="m.id">
            {{ m.fullName || m.email }}
          </option>
        </select>
      </div>

      <label class="ei-label">Screenshot</label>
      <div
        class="ei-screenshot"
        :class="{ 'ei-screenshot--has': !!shotPreview, 'ei-screenshot--busy': uploading }"
        tabindex="0"
        role="button"
        @click="onShotClick"
        @keydown.enter.prevent="pickFile"
        @keydown.space.prevent="pickFile"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <template v-if="shotPreview">
          <img :src="shotPreview" alt="Screenshot preview" class="ei-shot-preview" />
          <div class="ei-shot-actions">
            <button type="button" class="ei-shot-btn" :disabled="uploading" @click.stop="pickFile">
              Replace
            </button>
            <button type="button" class="ei-shot-btn ei-shot-btn--danger" :disabled="uploading" @click.stop="clearShot">
              Remove
            </button>
          </div>
        </template>

        <div v-else class="ei-shot-empty" :class="{ 'is-drag': dragOver }">
          <svg v-if="!uploading" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span v-if="uploading" class="ei-shot-spin" />
          <p v-if="uploading">Uploading...</p>
          <template v-else>
            <p class="ei-shot-primary">
              Paste with <kbd>{{ pasteKey }}</kbd> + <kbd>V</kbd>
            </p>
            <p class="ei-shot-secondary">or click to upload / drag &amp; drop</p>
          </template>
        </div>

        <input
          ref="fileEl"
          type="file"
          class="ei-file-input"
          :accept="ACCEPT_TYPES.join(',')"
          @change="onFileInput"
        />
      </div>

      <label class="ei-label">Short note</label>
      <textarea
        v-model="form.description"
        class="ei-input ei-textarea"
        placeholder="What's wrong? What should be fixed?"
        rows="3"
      />

      <div v-if="err" class="ei-error">{{ err }}</div>
    </div>

    <template #footer>
      <div class="ei-footer">
        <button class="btn-ghost" type="button" :disabled="saving" @click="close">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving || uploading || !canEdit" @click="save">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useAuthStore } from '@/stores/auth';
import { useQualityCheckStore, type QualityIssueStatus } from '@/stores/qualityCheck';
import type { Member } from '@/stores/data';
import { optimizeImage } from '@/utils/imageOptimizer';
import { useTaskAlertsStore } from '@/stores/taskAlerts';

const props = defineProps<{
  open: boolean;
  issueId: string | null;
  members: Member[];
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const auth = useAuthStore();
const qc = useQualityCheckStore();
const taskAlertsStore = useTaskAlertsStore();

const ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const issue = computed(() =>
  props.issueId ? qc.issues.find((i) => i.id === props.issueId) ?? null : null
);
const isManager = computed(() =>
  ['admin', 'owner', 'head', 'supervisor'].includes(auth.currentRole || '')
);
const canApprove = computed(() => isManager.value);
const canEdit = computed(() => isManager.value);
const canEditStatus = computed(() => canEdit.value);

const statusOptions = computed<{ value: QualityIssueStatus; label: string }[]>(() => {
  const base: { value: QualityIssueStatus; label: string }[] = [
    { value: 'in_progress',  label: 'Progress' },
    { value: 'needs_review', label: 'Review' }
  ];
  if (canApprove.value) {
    base.push({ value: 'approved', label: 'Completed' });
  }
  return base;
});

const form = reactive<{
  title: string;
  pageUrl: string;
  description: string;
  screenshotUrl: string;
  assignedTo: string;
  status: QualityIssueStatus;
}>({
  title: '',
  pageUrl: '',
  description: '',
  screenshotUrl: '',
  assignedTo: '',
  status: 'new_issue'
});

const titleEl = ref<HTMLInputElement | null>(null);
const fileEl = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const uploading = ref(false);
const dragOver = ref(false);
const err = ref('');
const localPreviewUrl = ref('');

const shotPreview = computed(() => localPreviewUrl.value || form.screenshotUrl);
const pasteKey = computed(() =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? 'Command' : 'Ctrl'
);

const revokePreview = () => {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  localPreviewUrl.value = '';
};

const loadIssue = async () => {
  const current = issue.value;
  if (!current) return;
  revokePreview();
  form.title = current.title;
  form.pageUrl = current.pageUrl ?? '';
  form.description = current.description ?? '';
  form.screenshotUrl = current.screenshotUrl ?? '';
  form.assignedTo = current.assignedTo ?? '';
  // Use the actual status — no mapping needed now that all statuses
  // have their own dropdown option including in_progress and needs_review.
  form.status = current.status;
  err.value = canEdit.value ? '' : 'You do not have permission to edit this issue.';
  dragOver.value = false;
  await nextTick();
  titleEl.value?.focus();
};

watch(() => [props.open, props.issueId], async () => {
  if (props.open) await loadIssue();
});

onBeforeUnmount(revokePreview);

const close = () => {
  revokePreview();
  emit('close');
};

const validateFile = (file: File): string | null => {
  if (!ACCEPT_TYPES.includes(file.type)) return 'Please use a PNG, JPG, or WebP image.';
  if (file.size > MAX_BYTES) return 'Screenshot is too large. Please use an image under 5MB.';
  return null;
};

const uploadFile = async (file: File) => {
  err.value = '';
  const validation = validateFile(file);
  if (validation) { err.value = validation; return; }

  revokePreview();
  localPreviewUrl.value = URL.createObjectURL(file);
  uploading.value = true;
  try {
    let uploadFile = file;
    try {
      const optimized = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetSizeKB: 180,
        maxSizeKB: 350
      });
      uploadFile = optimized.file;
    } catch (optErr) {
      console.warn('[qualityCheck] edit screenshot optimization skipped', optErr);
    }

    const url = await qc.uploadIssueScreenshot(uploadFile);
    if (!url) {
      revokePreview();
      err.value = qc.error || 'Could not attach screenshot. Please try again.';
      return;
    }
    form.screenshotUrl = url;
    revokePreview();
  } catch {
    revokePreview();
    err.value = 'Could not attach screenshot. Please try again.';
  } finally {
    uploading.value = false;
  }
};

const pickFile = () => fileEl.value?.click();
const onShotClick = (e: MouseEvent) => {
  if (shotPreview.value) return;
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  pickFile();
};
const onFileInput = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) await uploadFile(file);
};
const onDrop = async (e: DragEvent) => {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) await uploadFile(file);
};
const onPaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      await uploadFile(file);
      return;
    }
  }
};
const clearShot = () => {
  revokePreview();
  form.screenshotUrl = '';
};

const save = async () => {
  const current = issue.value;
  if (!current || !canEdit.value) return;
  err.value = '';
  if (!form.title.trim()) { err.value = 'Please enter an issue title.'; return; }

  // Only admins + assistant heads may approve; others cannot save with status 'approved'.
  const nextStatus = form.status === 'approved' && !canApprove.value ? current.status : form.status;
  const previousAssignee = current.assignedTo;
  saving.value = true;
  try {
    const ok = await qc.updateIssue(current.id, {
      title: form.title.trim(),
      pageUrl: form.pageUrl.trim(),
      description: form.description,
      screenshotUrl: form.screenshotUrl || null,
      ...(isManager.value ? { assignedTo: form.assignedTo || null } : {}),
      ...(canEditStatus.value ? { status: nextStatus } : {})
    });
    if (!ok) {
      console.warn('[qualityCheck] updateIssue failed', qc.error);
      err.value = 'Could not update issue. Please try again.';
      return;
    }

    // Auto alert trigger on reassignment
    if (isManager.value && form.assignedTo && form.assignedTo !== previousAssignee) {
      const sendAlert = window.confirm('Send Alert To Assignee?');
      if (sendAlert) {
        const alertPayload = {
          alertId: `qc-reassign-${current.id}-${Date.now()}`,
          alertType: 'Urgent Fix' as const,
          title: 'QUALITY ISSUE REASSIGNED',
          message: `A quality issue has been reassigned to you: "${form.title.trim()}"\n\nPage: ${form.pageUrl || 'No page URL'}\nAssigned By: ${auth.profile?.fullName || 'Admin'}\nPriority: High`,
          priority: 'High' as const,
          relatedType: 'quality_check_item' as const,
          relatedId: current.id,
          status: 'published' as const,
          requireAck: true
        };
        void taskAlertsStore.createOrUpdateAlert(alertPayload, [form.assignedTo]);
      }
    }

    emit('saved');
    close();
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.ei-body { display: flex; flex-direction: column; gap: 0.5rem; }
.ei-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 0.5rem;
}
.ei-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.55rem 0.75rem;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.ei-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.ei-row {
  display: grid;
  grid-template-columns: 1fr 0.65fr;
  gap: 0.65rem;
}
.ei-col { display: flex; flex-direction: column; }
.ei-textarea { resize: vertical; min-height: 4.5rem; }
@media (max-width: 560px) { .ei-row { grid-template-columns: 1fr; } }

.ei-screenshot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 8.5rem;
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg));
  overflow: hidden;
  cursor: pointer;
  transition: border-color 140ms, background 140ms;
}
.ei-screenshot:hover,
.ei-screenshot:focus-visible {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
  outline: none;
}
.ei-screenshot--has { cursor: default; background: var(--card-bg); }
.ei-screenshot--busy { cursor: wait; }
.ei-shot-preview {
  display: block;
  width: 100%;
  max-height: 14rem;
  object-fit: contain;
  background: #000;
}
.ei-shot-actions {
  position: absolute;
  right: 0.45rem;
  bottom: 0.45rem;
  display: inline-flex;
  gap: 0.35rem;
}
.ei-shot-btn {
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.64);
  color: #fff;
  padding: 0.32rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
}
.ei-shot-btn:hover { background: var(--primary); }
.ei-shot-btn--danger:hover { background: #dc2626; }
.ei-shot-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ei-shot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem 0.75rem;
  color: var(--text-muted);
  pointer-events: none;
}
.ei-shot-empty svg { color: var(--text-muted); opacity: 0.7; }
.ei-shot-empty.is-drag svg { color: var(--primary); opacity: 1; }
.ei-shot-empty p { margin: 0; line-height: 1.3; }
.ei-shot-primary {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-main);
}
.ei-shot-secondary { font-size: 0.74rem; }
.ei-shot-empty kbd {
  display: inline-block;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  background: var(--card-bg);
  color: var(--text-main);
  border-radius: 6px;
  padding: 0.05rem 0.4rem;
  margin: 0 0.1rem;
}
.ei-shot-spin {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  animation: ei-spin 0.7s linear infinite;
}
@keyframes ei-spin { to { transform: rotate(360deg); } }
.ei-file-input { display: none; }
.ei-error {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 600;
}
.ei-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  width: 100%;
}
</style>
