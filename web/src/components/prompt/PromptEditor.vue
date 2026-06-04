<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div class="space-y-5">
      <FormInput v-model="model.title" label="Prompt title" placeholder="Hero Section" />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormSelect
          v-model="model.pageGroup"
          label="Page group"
          :options="pageGroupOptions"
        />
        <FormSelect
          v-if="model.pageGroup === 'topic-pages'"
          v-model="topicTypeValue"
          label="Topic page type"
          placeholder="None"
          :options="topicTypeOptions"
        />
        <FormInput
          v-model="model.sectionType"
          label="Section type"
          placeholder="Hero Section"
          helper="Use for Homepage sections like Hero, Trust, FAQ, CTA, Footer."
        />
        <FormSelect
          v-model="folderValue"
          label="Folder"
          placeholder="No folder"
          :options="folderOptions"
        />
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormSelect
          v-model="model.promptMode"
          label="Prompt mode"
          helper="Section = generates one section. Full Page = generates the whole page."
          :options="promptModeOptions"
        />
        <FormSelect
          v-model="model.promptType"
          label="Prompt type"
          :options="promptTypeOptions"
        />
        <FormSelect
          v-model="model.outputType"
          label="Output type"
          :options="outputTypeOptions"
        />
        <FormInput
          :model-value="String(model.requiresProducts)"
          type="number"
          label="Required products"
          helper="0 = none/optional. 1 = single product. N = multiple."
          @update:model-value="(v) => (model.requiresProducts = Math.max(0, Number(v) || 0))"
        />
      </div>

      <div>
        <label class="label">Compatible website types</label>
        <p class="helper -mt-1 mb-2">
          Pick the website types this prompt is intended for. Leave empty = works with any.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in websiteTypeOptions"
            :key="opt.value"
            type="button"
            class="ui-font rounded-btn border px-3 py-1.5 text-sm font-medium transition"
            :class="
              model.compatibleWebsiteTypes.includes(opt.value)
                ? 'border-primary bg-primary text-white'
                : 'border-border text-text-main hover:bg-soft'
            "
            @click="toggleWebsiteType(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <FormTextarea
        v-model="model.shortDescription"
        label="Short description"
        helper="Shown on prompt cards so the team understands when to use it."
        :rows="2"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormSelect
          v-model="model.status"
          label="Status"
          :options="[
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' }
          ]"
        />
        <FormSelect
          v-model="model.qualityStatus"
          label="Quality"
          helper="Mark Weak/Needs Improvement based on AI output performance."
          :options="[
            { value: 'good', label: 'Good' },
            { value: 'needs_improvement', label: 'Needs Improvement' },
            { value: 'weak', label: 'Weak' },
            { value: 'archived', label: 'Archived (hidden from team)' }
          ]"
        />
        <FormInput :model-value="String(model.version)" label="Version" disabled />
      </div>

      <FormTextarea
        v-model="model.lockedRules"
        label="Locked admin rules"
        helper="Always applied. Team members cannot edit these."
        :rows="4"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormTextarea
          v-model="requiredWebsiteFieldsText"
          label="Required website fields"
          helper="One field per line, such as website_name, primary_color, max_width."
          :rows="5"
        />
        <FormTextarea
          v-model="requiredProductFieldsText"
          label="Required product fields"
          helper="One field per line, such as product_name, product_image_url, product_specs."
          :rows="5"
        />
      </div>

      <EditableFieldsEditor
        :fields="model.editableFields"
        @update:fields="(v) => (model.editableFields = v)"
      />

      <FormTextarea
        v-model="model.templateContent"
        label="Prompt template"
        helper="Use {{key}} placeholders. Long structured prompts are supported."
        :rows="14"
      />

      <details class="rounded-card border border-border">
        <summary class="cursor-pointer px-4 py-3 ui-font text-sm font-semibold text-text-main select-none">
          Available placeholders ({{ knownPlaceholders.length }})
        </summary>
        <div class="grid grid-cols-1 gap-1 px-4 pb-4 pt-2 sm:grid-cols-2">
          <div
            v-for="ph in knownPlaceholders"
            :key="ph.key"
            class="rounded-btn bg-soft/60 px-3 py-2"
          >
            <code class="ui-font text-xs font-semibold text-primary">&#123;&#123;{{ ph.key }}&#125;&#125;</code>
            <p class="mt-0.5 text-xs text-text-muted">{{ ph.description }}</p>
          </div>
        </div>
      </details>

      <FormTextarea v-model="model.notes" label="Internal notes" :rows="3" />
    </div>

    <div class="space-y-5">
      <div class="rounded-card border border-border p-4">
        <FinalPromptPreview
          :prompt="model"
          :website-id="testWebsiteId"
          @update:website-id="(v) => (testWebsiteId = v)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import EditableFieldsEditor from './EditableFieldsEditor.vue';
import FinalPromptPreview from './FinalPromptPreview.vue';
import { useDataStore, type Prompt } from '@/stores/data';
import {
  knownPlaceholders,
  outputTypeOptions,
  pageGroups,
  promptModeOptions,
  promptTypeOptions,
  topicTypes,
  websiteTypeOptions
} from '@/lib/promptLibrary';

const props = defineProps<{ initial: Prompt }>();
defineEmits<{ (e: 'submit', value: Prompt): void }>();

const data = useDataStore();
const testWebsiteId = ref<string | null>(data.websites[0]?.id ?? null);

const model = reactive<Prompt>({
  ...props.initial,
  pageGroup: props.initial.pageGroup || props.initial.category || 'front-page',
  editableFields: props.initial.editableFields.map((f) => ({ ...f })),
  compatibleWebsiteTypes: [...(props.initial.compatibleWebsiteTypes ?? [])],
  requiredWebsiteFields: [...(props.initial.requiredWebsiteFields ?? [])],
  requiredProductFields: [...(props.initial.requiredProductFields ?? [])]
});

watch(
  () => props.initial,
  (next) => {
    Object.assign(model, next);
    model.pageGroup = next.pageGroup || next.category || 'front-page';
    model.editableFields = next.editableFields.map((f) => ({ ...f }));
    model.compatibleWebsiteTypes = [...(next.compatibleWebsiteTypes ?? [])];
    model.requiredWebsiteFields = [...(next.requiredWebsiteFields ?? [])];
    model.requiredProductFields = [...(next.requiredProductFields ?? [])];
  }
);

const folderOptions = computed(() => data.folders.map((f) => ({ value: f.id, label: f.name })));
const pageGroupOptions = computed(() =>
  pageGroups.map((group) => ({ value: group.slug, label: group.label }))
);
const topicTypeOptions = computed(() =>
  topicTypes.map((topic) => ({ value: topic.slug, label: topic.label }))
);
const folderValue = computed({
  get: () => model.folderId ?? '',
  set: (v) => (model.folderId = v || null)
});
const topicTypeValue = computed({
  get: () => model.topicType ?? '',
  set: (v) => (model.topicType = v || null)
});
const parseFieldList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim().replace(/\{\{|\}\}/g, ''))
    .filter(Boolean);
const requiredWebsiteFieldsText = computed({
  get: () => model.requiredWebsiteFields.join('\n'),
  set: (value) => (model.requiredWebsiteFields = parseFieldList(value))
});
const requiredProductFieldsText = computed({
  get: () => model.requiredProductFields.join('\n'),
  set: (value) => (model.requiredProductFields = parseFieldList(value))
});

const toggleWebsiteType = (value: string) => {
  if (model.compatibleWebsiteTypes.includes(value)) {
    model.compatibleWebsiteTypes = model.compatibleWebsiteTypes.filter((v) => v !== value);
  } else {
    model.compatibleWebsiteTypes = [...model.compatibleWebsiteTypes, value];
  }
};

defineExpose({ model });
</script>
