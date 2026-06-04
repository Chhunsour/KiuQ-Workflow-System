<template>
  <Modal :open="open" title="Assign Task" subtitle="Create and assign a new task to your team" size="lg" @close="$emit('close')">
    <div class="task-create-flow" @paste="handleTaskPaste" @dragover.prevent @drop.prevent="handleTaskDrop">
      <div v-if="taskToast" class="task-toast mb-3 text-sm font-medium text-primary flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="animate-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
        {{ taskToast }}
      </div>

      <!-- 2-Column Grid Layout -->
      <div class="task-grid">
        <!-- Left Column -->
        <div class="task-col flex flex-col gap-4" style="--stagger: 0">
          <div class="form-group">
            <label class="label text-sm font-semibold text-text-main mb-1.5">Task title <span class="text-status-needs-fix-fg">*</span></label>
            <input v-model="newTask.title" class="input rounded-xl border-border/80 focus:ring-2 focus:ring-primary/20 transition-all px-4 py-2.5" placeholder="Example: Update hero section copy" />
          </div>

          <div class="form-group">
            <label class="label text-sm font-semibold text-text-main mb-1.5">Assign to members <span class="text-status-needs-fix-fg">*</span></label>
            <MemberMultiSelect v-model="newTask.memberIds" />
          </div>

          <div class="form-group">
            <label class="label text-sm font-semibold text-text-main mb-1.5">Task description <span class="text-status-needs-fix-fg">*</span></label>
            <textarea
              v-model="newTask.description"
              class="input rounded-xl border-border/80 focus:ring-2 focus:ring-primary/20 transition-all px-4 py-3 task-textarea"
              placeholder="Explain what needs to be done..."
            />
          </div>
        </div>

        <!-- Right Column -->
        <div class="task-col flex flex-col gap-4" style="--stagger: 1">
          <div class="form-group">
            <label class="label text-sm font-semibold text-text-main mb-1.5 flex justify-between items-center">
              <span>Deadline: {{ dueMonthYearStr }} <span class="text-status-needs-fix-fg">*</span></span>
              <button type="button" class="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1" @click="showMonthChanger = !showMonthChanger">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ showMonthChanger ? 'Done' : 'Change' }}
              </button>
            </label>
            
            <div v-if="showMonthChanger" class="flex gap-2 mb-2 p-2.5 bg-soft/50 rounded-xl border border-border/40 month-picker-enter">
              <div class="flex-1">
                <label class="text-[10px] text-text-muted mb-0.5 block font-medium uppercase tracking-wider">Month</label>
                <select v-model="newTask.dueMonthNum" class="input rounded-lg border-border/80 text-sm py-1.5 px-2">
                  <option v-for="(name, index) in monthNamesFull" :key="index" :value="index + 1">{{ name }}</option>
                </select>
              </div>
              <div class="w-20">
                <label class="text-[10px] text-text-muted mb-0.5 block font-medium uppercase tracking-wider">Year</label>
                <input v-model="newTask.dueYearNum" type="number" class="input rounded-lg border-border/80 text-sm py-1.5 px-2" />
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <div class="flex-1 relative">
                <select v-model="newTask.dueDay" class="input rounded-xl border-border/80 focus:ring-2 focus:ring-primary/20 transition-all px-4 py-2.5">
                  <option value="" disabled>Day</option>
                  <option v-for="d in dueDaysInMonth" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="flex-1 relative">
                <input v-model="newTask.dueTime" type="time" class="input rounded-xl border-border/80 focus:ring-2 focus:ring-primary/20 transition-all px-4 py-2.5" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="label text-sm font-semibold text-text-main mb-1.5">Image / Screenshot <span class="text-text-soft font-normal text-xs">(Optional)</span></label>
            <label class="drop-zone border-2 border-dashed border-border/60 hover:border-primary/50 bg-soft/20 hover:bg-soft/50 rounded-xl transition-all cursor-pointer flex items-center gap-3 py-3 px-4">
              <input type="file" multiple accept="image/*" @change="uploadNewTaskInput" class="hidden" />
              <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <strong class="text-xs font-semibold text-text-main block">{{ attachmentUploading ? 'Uploading...' : 'Upload, drag, or paste' }}</strong>
                <span class="text-[10px] text-text-muted block mt-0.5">⌘V to paste a screenshot</span>
              </div>
            </label>
            <div v-if="newTask.attachments.length" class="attachment-grid mt-2.5">
                <article v-for="attachment in newTask.attachments" :key="attachment.id" class="attachment-card rounded-xl border border-border bg-card p-2 flex gap-3 items-center">
                  <button v-if="isImageAttachment(attachment) && attachmentPreview(attachment)" class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" type="button" @click="previewImage(attachmentPreview(attachment))">
                    <img :src="attachmentPreview(attachment)" :alt="attachment.fileName" class="w-full h-full object-cover" />
                  </button>
                  <div v-else class="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-xs font-medium text-text-muted flex-shrink-0">{{ attachment.fileType || 'File' }}</div>
                  <div class="flex-1 min-w-0">
                    <strong class="text-xs font-medium text-text-main truncate block">{{ attachment.fileName }}</strong>
                    <div v-if="attachment.optimizedSize" class="text-[10px] text-text-muted mt-0.5 flex gap-1.5 items-center">
                      <span class="line-through opacity-60">{{ formatFileSize(attachment.originalSize) }}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      <span class="text-primary font-bold">{{ formatFileSize(attachment.optimizedSize) }}</span>
                      <span class="bg-primary/10 text-primary px-1 rounded font-black">Saved {{ attachment.compressionRatio }}%</span>
                    </div>
                    <div v-else class="text-[10px] text-text-muted mt-0.5">{{ formatFileSize(attachment.fileSize) }}</div>
                  </div>
                  <button class="btn-secondary h-7 px-2.5 text-[10px] rounded-lg flex-shrink-0" type="button" @click="removeNewAttachment(attachment.id)">Remove</button>
                </article>
            </div>
          </div>
        </div>
      </div>

      <div v-if="addTaskError" class="rounded-xl border border-status-needs-fix-bg bg-status-needs-fix-bg/10 px-4 py-2.5 text-sm text-status-needs-fix-fg mt-3 font-medium flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ addTaskError }}
      </div>
    </div>

    <template #footer>
      <div class="w-full flex items-center justify-between gap-3">
        <span class="text-[10px] text-text-soft font-mono hidden sm:inline-flex items-center gap-1.5">
          <kbd class="bg-soft border border-border rounded px-1.5 py-0.5 text-[9px] font-bold">⌘ Enter</kbd>
          to submit
        </span>
        <div class="flex items-center gap-2 ml-auto">
          <button class="btn-ghost px-4 rounded-xl font-medium text-sm" type="button" @click="$emit('close')">Cancel</button>
          <button
            class="btn-primary px-5 rounded-xl font-medium text-sm shadow-sm hover:shadow flex items-center gap-2"
            type="button"
            :disabled="creatingTask"
            @click="createTaskCard()"
          >
            <svg v-if="creatingTask" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="animate-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
            {{ creatingTask ? 'Creating...' : 'Create Task' }}
          </button>
        </div>
      </div>
    </template>
    
    <Modal :open="!!imagePreviewUrl" title="Image preview" size="lg" @close="imagePreviewUrl = ''">
      <img v-if="imagePreviewUrl" class="preview-image" :src="imagePreviewUrl" alt="Task preview" />
    </Modal>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import MemberMultiSelect from '@/components/board/MemberMultiSelect.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { pushToast } from '@/services/realtimeService';
import { useNotificationsStore } from '@/stores/notifications';
import { optimizeImage, formatFileSize } from '@/utils/imageOptimizer';

const props = defineProps<{
  open: boolean;
  initialColumnKey?: string;
  initialMemberIds?: string[];
  boardMonth?: string; // 'YYYY-MM' — stamped on new tasks
}>();

const emit = defineEmits(['close', 'success']);

const auth = useAuthStore();
const data = useDataStore();
const notifs = useNotificationsStore();

const creatingTask = ref(false);
const addTaskError = ref('');
const attachmentUploading = ref(false);
const imagePreviewUrl = ref('');
const taskToast = ref('');
const showMonthChanger = ref(false);

const newTask = reactive({
  title: '',
  description: '',
  memberIds: props.initialMemberIds || [] as string[],
  dueDay: '',
  dueTime: '17:00',
  dueYearNum: new Date().getFullYear(),
  dueMonthNum: new Date().getMonth() + 1,
  attachments: [] as any[]
});

const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.initialMemberIds) {
      newTask.memberIds = [...props.initialMemberIds];
    }
  }
});

const dueMonthYearStr = computed(() => {
  if (!newTask.dueYearNum || !newTask.dueMonthNum) return '';
  return `${monthNamesFull[newTask.dueMonthNum - 1]} ${newTask.dueYearNum}`;
});

const dueDaysInMonth = computed(() => {
  if (!newTask.dueYearNum || !newTask.dueMonthNum) return 31;
  return new Date(newTask.dueYearNum, newTask.dueMonthNum, 0).getDate();
});

const filteredAssignMembers = computed(() => data.members.filter(m => m.status === 'active' && m.role !== 'admin'));

const initials = (name: string, email: string) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const isImageUrl = (url: string) => {
  if (!url) return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null || url.startsWith('data:image/');
};

const isImageAttachment = (attachment: any) =>
  attachment.fileType.startsWith('image/') ||
  attachment.fileType === 'image' ||
  isImageUrl(attachment.fileUrl || attachment.fileName);

const attachmentPreviewUrls = ref<Record<string, string>>({});
const attachmentPreview = (attachment: any) =>
  attachment.fileUrl || attachmentPreviewUrls.value[attachment.id] || '';

const previewImage = (url: string) => {
  imagePreviewUrl.value = url;
};

const removeNewAttachment = (id: string) => {
  newTask.attachments = newTask.attachments.filter((a) => a.id !== id);
};

const makeId = () => Math.random().toString(36).slice(2, 11);

const uploadNewTaskFiles = async (files: FileList | File[]) => {
  const list = Array.from(files);
  if (!list.length) return;
  attachmentUploading.value = true;
  addTaskError.value = '';
  
  try {
    for (const file of list) {
      let fileToUpload = file;
      let optimizationMeta = {};

      if (file.type.startsWith('image/')) {
        if (file.size > 15 * 1024 * 1024) {
          addTaskError.value = 'This image is too large. Please use an image under 15MB.';
          continue;
        }

        try {
          taskToast.value = 'Optimizing image...';
          const optimized = await optimizeImage(file);
          fileToUpload = optimized.file;
          optimizationMeta = {
            originalSize: optimized.originalSize,
            optimizedSize: optimized.optimizedSize,
            compressionRatio: optimized.compressionRatio,
            width: optimized.width,
            height: optimized.height
          };
          taskToast.value = '';
        } catch (err) {
          console.error('[image-optimization] failed', err);
          addTaskError.value = 'Could not optimize image. Please try another image.';
          continue;
        }
      }

      const uploaded = await data.uploadResourceFile(fileToUpload);
      if (!uploaded) continue;
      
      const attachment = {
        id: makeId(),
        fileName: uploaded.name,
        fileUrl: '',
        filePath: uploaded.path,
        fileType: uploaded.type,
        fileSize: uploaded.size,
        caption: '',
        uploadedBy: auth.user?.id || '',
        createdAt: new Date().toISOString(),
        ...optimizationMeta
      };
      
      if (isImageAttachment(attachment)) {
        const preview = await data.getResourceDownloadUrl(uploaded.path);
        if (preview) attachmentPreviewUrls.value = { ...attachmentPreviewUrls.value, [attachment.id]: preview };
      }
      newTask.attachments.push(attachment);
    }
  } finally {
    attachmentUploading.value = false;
    if (taskToast.value === 'Optimizing image...') taskToast.value = '';
  }
};

const uploadNewTaskInput = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) await uploadNewTaskFiles(input.files);
  input.value = '';
};

const handleTaskPaste = async (event: ClipboardEvent) => {
  if (!props.open || !event.clipboardData) return;
  const itemFiles = Array.from(event.clipboardData.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => !!file);
  if (itemFiles.length) {
    event.preventDefault();
    await uploadNewTaskFiles(itemFiles);
  }
};

const handleTaskDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (files?.length) await uploadNewTaskFiles(files);
};

const createTaskCard = async () => {
  if (!auth.isAdmin) return;
  addTaskError.value = '';
  if (!newTask.title.trim()) {
    addTaskError.value = 'Please enter a task title.';
    return;
  }
  if (newTask.memberIds.length === 0) {
    addTaskError.value = 'Please select at least one team member.';
    return;
  }
  if (!newTask.dueDay) {
    addTaskError.value = 'Please select a deadline day.';
    return;
  }
  if (!newTask.description.trim()) {
    addTaskError.value = 'Please enter task description.';
    return;
  }

  creatingTask.value = true;
  try {
    const promptId = await data.ensureBoardTaskPrompt();
    if (!promptId) {
      addTaskError.value = data.errors.prompts || 'Could not prepare the default task prompt.';
      return;
    }

    const mm = String(newTask.dueMonthNum).padStart(2, '0');
    const dd = String(newTask.dueDay).padStart(2, '0');
    const dueDate = `${newTask.dueYearNum}-${mm}-${dd}`;

    const systemKeys = {
      column: '__board_column',
      taskType: '__board_task_type',
      assignmentMode: '__board_assignment_mode',
      pageSection: '__board_page_section',
      title: '__board_title',
      shortDescription: '__board_short_description',
      instructions: '__board_instructions',
      description: '__board_description',
      startDate: '__board_start_date',
      cover: '__board_cover_image_url',
      attachments: '__board_attachments',
      links: '__board_links',
      checklist: '__board_checklist',
      labels: '__board_labels',
      comments: '__board_comments',
      collaborators: '__board_collaborators',
      reviewer: '__board_reviewer_id',
      dueTime: '__board_due_time',
      month: '__board_month'
    };

    const effectiveMonth = props.boardMonth || new Date().toISOString().slice(0, 7);
    const firstImage = newTask.attachments.find((a) => isImageAttachment(a));
    const filledValues = {
      [systemKeys.column]: props.initialColumnKey || 'to_do',
      [systemKeys.taskType]: 'fix_section',
      [systemKeys.assignmentMode]: 'duplicate',
      [systemKeys.title]: newTask.title.trim(),
      [systemKeys.instructions]: newTask.description.trim(),
      [systemKeys.description]: newTask.description.trim(),
      [systemKeys.cover]: firstImage ? firstImage.fileUrl || '' : '',
      [systemKeys.attachments]: JSON.stringify(newTask.attachments),
      [systemKeys.dueTime]: newTask.dueTime,
      [systemKeys.links]: JSON.stringify([]),
      [systemKeys.checklist]: JSON.stringify([]),
      [systemKeys.labels]: JSON.stringify([]),
      [systemKeys.comments]: JSON.stringify([]),
      [systemKeys.pageSection]: '',
      [systemKeys.shortDescription]: '',
      [systemKeys.collaborators]: JSON.stringify([]),
      [systemKeys.startDate]: '',
      [systemKeys.reviewer]: '',
      [systemKeys.month]: effectiveMonth
    };

    const assignments = newTask.memberIds.map(memberId => ({
      promptId,
      projectId: null,
      websiteId: null,
      assignedMemberId: memberId,
      status: 'pending' as any,
      filledValues,
      pastedResult: '',
      dueDate,
      priority: 'normal' as any,
      adminNote: '',
      startedAt: '',
      completedAt: '',
      assignedAt: new Date().toISOString().slice(0, 10),
      assignedBy: auth.user?.id ?? null,
      updatedAt: new Date().toISOString().slice(0, 10)
    }));

    const result = await data.bulkCreateAssignments(assignments);

    if (result.created > 0) {
      const msg = result.created === 1
        ? 'Task assigned successfully.'
        : `Task assigned to ${result.created} members successfully.`;
      pushToast('Task assigned', msg, 'success');

      // Fire notifications for each assigned member — never blocks task creation
      void notifs.createNotificationForMany(newTask.memberIds, {
        actorId:     auth.user?.id,
        type:        'task_assigned',
        title:       'New task assigned',
        message:     `${auth.profile?.fullName || 'Admin'} assigned you a task: "${newTask.title.trim()}"`,
        relatedType: 'task',
        taskId:      undefined, // assignment IDs not returned from bulk; task opens via work-board
      });

      emit('success');
      emit('close');
    } else {
      addTaskError.value = result.errors[0] || 'Could not create task. Please try again.';
    }
  } catch (err) {
    console.error('[quick-add-task] failed', err);
    addTaskError.value = 'An unexpected error occurred.';
  } finally {
    creatingTask.value = false;
  }
};

onMounted(() => {
  if (data.members.length === 0) {
    void data.fetchMembers();
  }
});
</script>

<style scoped>
.task-create-flow {
  display: flex;
  flex-direction: column;
}

/* ── 2-Column Responsive Grid ── */
.task-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .task-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

/* ── Staggered Entrance Animations ── */
.task-col {
  animation: taskColSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--stagger, 0) * 80ms);
}

@keyframes taskColSlide {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  animation: formGroupFade 0.3s ease both;
  animation-delay: calc(var(--stagger, 0) * 80ms + 60ms);
}

@keyframes formGroupFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ── Month picker slide-in ── */
.month-picker-enter {
  animation: monthSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes monthSlide {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    max-height: 120px;
    transform: translateY(0);
  }
}

/* ── Compact textarea ── */
.task-textarea {
  min-height: 100px;
  max-height: 160px;
  resize: vertical;
}

/* ── Upload drop zone ── */
.drop-zone {
  width: 100%;
  transition: all 0.2s ease;
}

.drop-zone:hover {
  transform: translateY(-1px);
}

/* ── Toast animation ── */
.task-toast {
  animation: toastPulse 1.2s ease-in-out infinite alternate;
}

@keyframes toastPulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.label {
  display: block;
}

.input {
  width: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

/* ── Keyboard shortcut badge ── */
kbd {
  font-family: 'SF Mono', 'Fira Code', monospace;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .task-col,
  .form-group,
  .month-picker-enter,
  .task-toast {
    animation: none;
  }
}
</style>
