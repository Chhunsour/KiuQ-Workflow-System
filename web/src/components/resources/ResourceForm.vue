<template>
  <form class="space-y-5" @submit.prevent="$emit('submit', model)">
    <FormSelect
      v-model="model.type"
      label="Resource type"
      helper="Pick how this resource will be stored."
      :options="resourceTypeSelectOptions"
    />

    <FormInput
      v-model="model.title"
      label="Title"
      placeholder="What should we call this resource?"
    />
    <FormTextarea
      v-model="model.description"
      label="Description (optional)"
      :rows="3"
      helper="Tell the team what this is for."
    />

    <!-- Type-specific input -->
    <FileUploadField
      v-if="isFile"
      :model-value="fileFieldValue"
      :label="model.type === 'screenshot' ? 'Screenshot / image' : 'File'"
      :accept="acceptForType"
      helper="Stored privately in Supabase Storage. Max 25 MB."
      @update:model-value="onFileUpdate"
      @uploading="(v) => $emit('uploading', v)"
    />

    <LinkPreviewField
      v-if="isLink"
      v-model="model.externalUrl"
      label="URL"
      helper="External links open in a new tab."
    />

    <FormTextarea
      v-if="isText"
      v-model="model.textContent"
      :label="model.type === 'document' ? 'Document content' : 'Note content'"
      :rows="model.type === 'document' ? 10 : 6"
    />

    <!-- Organization -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormSelect
        v-model="folderValue"
        label="Folder (optional)"
        placeholder="No folder"
        :options="folderOptions"
      />
      <FormSelect
        v-model="projectValue"
        label="Project (optional)"
        placeholder="None"
        :options="projectOptions"
      />
      <FormSelect
        v-model="websiteValue"
        label="Website (optional)"
        placeholder="None"
        :options="websiteOptions"
      />
      <FormSelect
        v-model="taskValue"
        label="Task (optional)"
        placeholder="None"
        :options="taskOptions"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormSelect
        v-model="model.visibility"
        label="Visibility"
        :options="visibilityOptions"
        helper="Private = only you. Team Visible = whole team."
      />
      <FormSelect
        v-model="model.status"
        label="Status"
        :options="statusSelectOptions"
        helper="Draft = work in progress. Published = ready to share."
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import FileUploadField, { type FileUploadValue } from './FileUploadField.vue';
import LinkPreviewField from './LinkPreviewField.vue';
import {
  isFileType,
  isLinkType,
  isTextType,
  resourceTypeSelectOptions,
  statusSelectOptions,
  visibilitySelectOptions
} from './resourceMeta';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Resource } from '@/stores/data';

const props = defineProps<{ initial: Resource }>();
defineEmits<{
  (e: 'submit', value: Resource): void;
  (e: 'uploading', uploading: boolean): void;
}>();

const auth = useAuthStore();
const data = useDataStore();

const model = reactive<Resource>({ ...props.initial });

watch(
  () => props.initial,
  (next) => Object.assign(model, next)
);

const isFile = computed(() => isFileType(model.type));
const isLink = computed(() => isLinkType(model.type));
const isText = computed(() => isTextType(model.type));

const acceptForType = computed(() => {
  if (model.type === 'screenshot') return 'image/png,image/jpeg,image/webp,image/gif';
  return '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif,.zip';
});

const fileFieldValue = computed<FileUploadValue>(() => ({
  path: model.filePath,
  name: model.fileName,
  type: model.fileType,
  size: model.fileSize
}));
const onFileUpdate = (v: FileUploadValue) => {
  model.filePath = v.path;
  model.fileName = v.name;
  model.fileType = v.type;
  model.fileSize = v.size;
  if (!model.title.trim() && v.name) model.title = v.name;
};

// Switching between input modes — clear stale fields so we don't carry old values
// (e.g. switching link → note shouldn't persist a URL).
watch(
  () => model.type,
  (next, prev) => {
    if (next === prev) return;
    if (!isFileType(next)) {
      model.filePath = '';
      model.fileName = '';
      model.fileType = '';
      model.fileSize = 0;
    }
    if (!isLinkType(next)) {
      model.externalUrl = '';
    }
    if (!isTextType(next)) {
      model.textContent = '';
    }
  }
);

const folderValue = computed({
  get: () => model.folderId ?? '',
  set: (v) => (model.folderId = v || null)
});
const projectValue = computed({
  get: () => model.projectId ?? '',
  set: (v) => (model.projectId = v || null)
});
const websiteValue = computed({
  get: () => model.websiteId ?? '',
  set: (v) => (model.websiteId = v || null)
});
const taskValue = computed({
  get: () => model.taskId ?? '',
  set: (v) => (model.taskId = v || null)
});

const folderOptions = computed(() => data.folders.map((f) => ({ value: f.id, label: f.name })));
const projectOptions = computed(() => data.projects.map((p) => ({ value: p.id, label: p.name })));
const websiteOptions = computed(() => data.websites.map((w) => ({ value: w.id, label: w.name })));
const taskOptions = computed(() =>
  data.sectionTasks.map((t) => ({
    value: t.id,
    label: t.projectName ? `${t.projectName} — ${t.name}` : t.name
  }))
);

const visibilityOptions = computed(() => visibilitySelectOptions(auth.isAdmin));

defineExpose({ model });
</script>
