<template>
  <Modal :open="open" title="New Quality Issue" size="md" @close="close">
    <!-- Capture paste anywhere inside the modal. -->
    <div class="ci-body" @paste="onPaste">
      <!-- Issue title — required, focused first -->
      <label class="ci-label">Issue title <span class="ci-req">*</span></label>
      <input
        ref="titleEl"
        v-model="form.title"
        class="ci-input"
        type="text"
        placeholder="e.g. Hero CTA button is broken on mobile"
        @keyup.enter="onTitleEnter"
      />

      <!-- Class folder + Website pickers (only when not opened from a specific website's board) -->
      <template v-if="!props.websiteId">
        <div class="ci-row">
          <div class="ci-col">
            <label class="ci-label">Class folder <span class="ci-req">*</span></label>
            <select v-model="form.classId" class="ci-input">
              <option value="">— Pick a class —</option>
              <option v-for="c in qc.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="ci-col">
            <label class="ci-label">Website <span class="ci-req">*</span></label>
            <select v-model="form.websiteId" class="ci-input" :disabled="!form.classId">
              <option value="">{{ form.classId ? '— Pick a website —' : 'Pick a class first' }}</option>
              <option v-for="w in websitesInClass" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>
        </div>
      </template>

      <!-- Page URL + Assigned member on one row -->
      <div class="ci-row">
        <div class="ci-col">
          <label class="ci-label">Page URL</label>
          <input
            v-model="form.pageUrl"
            class="ci-input"
            type="url"
            placeholder="https://…"
          />
        </div>
        <div class="ci-col">
          <label class="ci-label">Assigned member <span class="ci-req">*</span></label>
          <!-- Members are always the assignee of their own issues — show a
               read-only chip instead of a picker. Admins can still pick. -->
          <div v-if="isMemberFlow" class="ci-assignee-self" :title="selfMember?.email ?? ''">
            <span class="ci-assignee-avatar">
              <img
                v-if="selfMember?.avatarUrl"
                :src="selfMember.avatarUrl"
                :alt="selfMember.fullName ?? selfMember.email ?? ''"
                loading="lazy"
              />
              <span v-else>{{ selfInitials }}</span>
            </span>
            <span class="ci-assignee-name">
              {{ selfMember?.fullName || selfMember?.email || 'You' }}
              <span class="ci-assignee-tag">you</span>
            </span>
          </div>
          <select v-else v-model="form.assignedTo" class="ci-input">
            <option value="">— Pick a member —</option>
            <option v-for="m in members" :key="m.id" :value="m.id">
              {{ m.fullName || m.email }}
            </option>
          </select>
        </div>
      </div>

      <!-- Screenshot drop / paste / upload area -->
      <label class="ci-label">Screenshot (optional)</label>
      <div
        class="ci-screenshot"
        :class="{ 'ci-screenshot--has': !!form.screenshotUrl, 'ci-screenshot--busy': uploading }"
        tabindex="0"
        role="button"
        @click="onShotClick"
        @keydown.enter.prevent="pickFile"
        @keydown.space.prevent="pickFile"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <template v-if="form.screenshotUrl">
          <img :src="form.screenshotUrl" alt="Screenshot preview" class="ci-shot-preview" />
          <button
            type="button"
            class="ci-shot-remove"
            title="Remove screenshot"
            @click.stop="clearShot"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </template>

        <div v-else class="ci-shot-empty" :class="{ 'is-drag': dragOver }">
          <svg v-if="!uploading" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span v-if="uploading" class="ci-shot-spin" />
          <p v-if="uploading">Uploading…</p>
          <template v-else>
            <p class="ci-shot-primary">
              Paste with <kbd>{{ pasteKey }}</kbd> + <kbd>V</kbd>
            </p>
            <p class="ci-shot-secondary">or click to upload · drag &amp; drop</p>
          </template>
        </div>

        <input
          ref="fileEl"
          type="file"
          class="ci-file-input"
          :accept="ACCEPT_TYPES.join(',')"
          @change="onFileInput"
        />
      </div>

      <!-- Optional note -->
      <label class="ci-label">Short note (optional)</label>
      <textarea
        v-model="form.description"
        class="ci-input ci-textarea"
        placeholder="What's wrong? What should be fixed?"
        rows="2"
      />



      <div v-if="err" class="ci-error">{{ err }}</div>
    </div>

    <template #footer>
      <div class="ci-footer">
        <button class="btn-ghost" type="button" @click="close">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving || uploading" @click="save">
          {{ saving ? 'Creating…' : 'Create Issue' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useQualityCheckStore } from '@/stores/qualityCheck';
import { useDataStore, type Member } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { useTaskAlertsStore } from '@/stores/taskAlerts';

const props = defineProps<{
  open: boolean;
  /** When set, the modal targets this website (no class/website picker). */
  websiteId?: string;
  /** Default class to pre-select when opened from a class page. */
  defaultClassId?: string | null;
  members: Member[];
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>();

const qc   = useQualityCheckStore();
const data = useDataStore();
const auth = useAuthStore();

// Members are always the assignee of their own issues — no picker needed.
// Admins can still assign to anyone, so they see the dropdown.
const isMemberFlow = computed(() => !auth.isAdmin);
const selfMember = computed<Member | null>(() => {
  const id = auth.user?.id;
  if (!id) return null;
  return props.members.find((m) => m.id === id) ?? auth.profile ?? null;
});
const selfInitials = computed(() => {
  const name = selfMember.value?.fullName || selfMember.value?.email || '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';
});

const ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_BYTES    = 5 * 1024 * 1024; // 5 MB

interface Form {
  title: string;
  pageUrl: string;
  classId: string;
  websiteId: string;
  assignedTo: string;
  description: string;
  screenshotUrl: string;
}

const blank = (): Form => ({
  title: '',
  pageUrl: '',
  classId: props.defaultClassId ?? '',
  websiteId: '',
  // Auto-select the logged-in user (admin/head or member) creating the issue by default
  assignedTo: auth.user?.id ?? '',
  description: '',
  screenshotUrl: ''
});

const form      = reactive<Form>(blank());
const saving    = ref(false);
const uploading = ref(false);
const dragOver  = ref(false);
const err       = ref('');
const showBanner = ref(true);

const titleEl = ref<HTMLInputElement | null>(null);
const fileEl  = ref<HTMLInputElement | null>(null);

// Mac vs Win/Linux affordance for the paste hint
const pasteKey = computed(() =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl'
);

// Reset whenever the modal opens; focus the title field for keyboard-first entry.
watch(() => props.open, async (o) => {
  if (o) {
    Object.assign(form, blank());
    err.value = '';
    uploading.value = false;
    dragOver.value = false;
    showBanner.value = true;
    await nextTick();
    titleEl.value?.focus();
  }
});

// When user picks a class, clear the website choice (it may not belong to the new class)
watch(() => form.classId, () => {
  form.websiteId = '';
});

const websitesInClass = computed(() =>
  data.websites.filter((w) => w.qualityClassId === form.classId)
);

// ── Screenshot handling ───────────────────────────────────────────────────
const validateFile = (file: File): string | null => {
  if (!ACCEPT_TYPES.includes(file.type)) {
    return 'Please use a PNG, JPG, or WebP image.';
  }
  if (file.size > MAX_BYTES) {
    return 'Screenshot is too large. Please use an image under 5MB.';
  }
  return null;
};

const uploadFile = async (file: File) => {
  err.value = '';
  const v = validateFile(file);
  if (v) { err.value = v; return; }
  uploading.value = true;
  try {
    const url = await qc.uploadIssueScreenshot(file);
    if (!url) {
      err.value = qc.error || 'Could not attach screenshot. Please try again.';
      return;
    }
    form.screenshotUrl = url;
  } catch {
    err.value = 'Could not attach screenshot. Please try again.';
  } finally {
    uploading.value = false;
  }
};

const pickFile = () => fileEl.value?.click();

const onShotClick = (e: MouseEvent) => {
  // Don't re-open the file picker when the user clicks the preview itself.
  if (form.screenshotUrl) return;
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  pickFile();
};

const onFileInput = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file  = input.files?.[0];
  input.value = '';  // allow re-selecting the same file
  if (!file) return;
  await uploadFile(file);
};

const onDrop = async (e: DragEvent) => {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) await uploadFile(file);
};

const clearShot = () => { form.screenshotUrl = ''; };

/**
 * Paste handler attached to the modal body. If clipboard carries an image
 * (full clipboard image or copied <img>), attach it. Otherwise let the
 * default text-paste flow run so users can still paste into the inputs.
 */
const onPaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return;

  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        // Consumed an image — don't also paste text into the focused input.
        e.preventDefault();
        await uploadFile(file);
        return;
      }
    }
  }
  // No image in clipboard — leave text paste alone.
};

// Pressing Enter on the title only submits if the minimum required fields are filled.
const onTitleEnter = () => {
  if (form.title.trim() && form.assignedTo && (props.websiteId || form.websiteId)) save();
};

// ── Save ──────────────────────────────────────────────────────────────────
const close = () => emit('close');

const save = async () => {
  err.value = '';
  if (!form.title.trim())   { err.value = 'Please enter a title.'; return; }
  if (!form.assignedTo)     { err.value = 'Please pick a member to assign.'; return; }

  const targetWebsiteId = props.websiteId || form.websiteId;
  if (!targetWebsiteId) {
    err.value = props.websiteId
      ? 'Missing website.'
      : 'Please pick a class folder and website.';
    return;
  }

  saving.value = true;
  try {
    // Intentionally omit issueType/priority/dueDate — they default server-side
    // to 'other'/'normal'/null. Old rows keep their existing values.
    const issue = await qc.createIssue({
      websiteId:     targetWebsiteId,
      title:         form.title,
      pageUrl:       form.pageUrl,
      assignedTo:    form.assignedTo,
      description:   form.description,
      screenshotUrl: form.screenshotUrl || null,
    });
    if (!issue) {
      err.value = qc.error || 'Could not create issue.';
      return;
    }

    if (showBanner.value && issue && issue.assignedTo) {
      const taskAlertsStore = useTaskAlertsStore();
      const alertPayload = {
        alertId: `qc-alert-${issue.id}`,
        alertType: 'Quality Check' as const,
        title: 'QUALITY ISSUE FOUND',
        message: `A quality issue was reported: "${issue.title.trim()}"\n\nPage: ${issue.pageUrl || 'No page URL'}\nAssigned By: ${auth.profile?.fullName || 'Admin'}\nPriority: High`,
        priority: 'High' as const,
        relatedType: 'quality_check_item' as const,
        relatedId: issue.id,
        status: 'published' as const,
      };
      void taskAlertsStore.createOrUpdateAlert(alertPayload, [issue.assignedTo]);
    }

    emit('created');
    emit('close');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.ci-body { display: flex; flex-direction: column; gap: 0.5rem; }
.ci-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 0.5rem;
}
.ci-req { color: #dc2626; text-transform: none; letter-spacing: 0; }

.ci-input {
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
.ci-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.ci-input:disabled { opacity: 0.6; cursor: not-allowed; }
.ci-textarea { resize: vertical; min-height: 3rem; }

/* Locked self-assignee chip for members */
.ci-assignee-self {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
  padding: 0.45rem 0.7rem;
  color: var(--text-main);
  font-size: 0.88rem;
  font-family: inherit;
}
.ci-assignee-avatar {
  display: inline-flex;
  width: 1.7rem;
  height: 1.7rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 900;
  flex-shrink: 0;
}
.ci-assignee-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ci-assignee-name {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ci-assignee-tag {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}

.ci-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
@media (max-width: 560px) { .ci-row { grid-template-columns: 1fr; } }
.ci-col { display: flex; flex-direction: column; }

/* ── Screenshot dropzone ─────────────────────────────────────────────── */
.ci-screenshot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg));
  min-height: 8.5rem;
  cursor: pointer;
  transition: border-color 140ms, background 140ms;
  overflow: hidden;
}
.ci-screenshot:hover,
.ci-screenshot:focus-visible {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
  outline: none;
}
.ci-screenshot--has { cursor: default; padding: 0; }
.ci-screenshot--has:hover { border-color: var(--border); background: var(--card-bg); }
.ci-screenshot--busy { cursor: wait; }

.ci-shot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem 0.75rem;
  color: var(--text-muted);
  pointer-events: none;
}
.ci-shot-empty svg { color: var(--text-muted); opacity: 0.7; }
.ci-shot-empty.is-drag svg { color: var(--primary); opacity: 1; }
.ci-shot-empty p { margin: 0; line-height: 1.3; }
.ci-shot-primary {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-main);
}
.ci-shot-secondary { font-size: 0.74rem; }
.ci-shot-empty kbd {
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

.ci-shot-preview {
  display: block;
  width: 100%;
  max-height: 14rem;
  object-fit: contain;
  background: #000;
}
.ci-shot-remove {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 140ms;
}
.ci-shot-remove:hover { background: rgba(220, 38, 38, 0.85); }

.ci-shot-spin {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  animation: ci-spin 0.7s linear infinite;
}
@keyframes ci-spin { to { transform: rotate(360deg); } }

.ci-file-input { display: none; }

.ci-error {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 600;
}
.ci-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  width: 100%;
}
</style>
