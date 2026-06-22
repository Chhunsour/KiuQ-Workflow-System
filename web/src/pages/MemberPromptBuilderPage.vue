<template>
  <div>
    <PageHeader
      :title="$t('Prompt Builder')"
      subtitle="Select website, choose prompt, fill fields, copy final prompt."
    />

    <div v-if="!assignmentId && !directPromptId" class="card card-pad">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="section-title">{{ $t('Choose an assigned prompt') }}</h3>
          <p class="mt-1 text-sm text-text-muted">{{ $t('Pick one task or open the website-first Prompt Library.') }}</p>
        </div>
        <RouterLink to="/prompt-library" class="btn-primary">{{ $t('Open Prompt Library') }}</RouterLink>
      </div>
      <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <RouterLink
          v-for="assignment in data.myAssignments"
          :key="assignment.id"
          :to="`/prompt-builder/${assignment.id}`"
          class="rounded-card border border-border p-4 hover:bg-soft"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="ui-font text-sm font-medium text-text-main">{{ promptTitle(assignment.promptId) }}</div>
              <div class="mt-1 text-xs text-text-muted">{{ projectName(assignment.projectId) }} · {{ websiteNameForAssignment(assignment) }}</div>
            </div>
            <StatusBadge :status="assignment.status === 'pending' ? 'assigned' : assignment.status" />
          </div>
        </RouterLink>
      </div>
      <div v-if="data.myAssignments.length === 0" class="mt-6 text-center text-sm text-text-muted">
        {{ $t('Your admin has not assigned work yet.') }}
        <div class="mt-3">
          <RouterLink to="/prompt-library" class="btn-primary">{{ $t('Open Prompt Library') }}</RouterLink>
        </div>
      </div>
    </div>

    <LoadingBlock v-else-if="loadingCurrent" :loading="true" :error="null" :retry="loadPageData" />

    <div v-else-if="!selectedPrompt || !promptAllowed" class="card card-pad text-center text-sm text-text-muted">
      {{ $t('This prompt was not found or is not available to your account.') }}
      <div class="mt-3">
        <RouterLink to="/prompt-library" class="btn-primary">{{ $t('Back to Prompt Library') }}</RouterLink>
      </div>
    </div>

    <div v-else>
      <div class="mb-5 card card-pad">
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="step in steps"
            :key="step.id"
            class="rounded-btn px-3 py-2 text-center ui-font text-xs font-semibold"
            :class="stepClass(step.id)"
          >
            {{ step.label }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div class="space-y-5">
          <div class="card card-pad">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="ui-font text-xs font-semibold uppercase text-primary">{{ $t('Step 1: Choose') }}</div>
                <h3 class="mt-1 section-title">{{ selectedPrompt.title }}</h3>
                <p class="mt-1 text-sm text-text-muted">
                  {{ promptPageGroupLabel(selectedPrompt) }} · {{ promptModeLabel(selectedPrompt.promptMode) }}
                </p>
              </div>
              <StatusBadge v-if="selectedAssignment" :status="selectedAssignment.status === 'pending' ? 'assigned' : selectedAssignment.status" />
              <StatusBadge v-else :status="selectedPrompt.status" />
            </div>

            <div class="mt-5 rounded-card border border-border bg-soft/40 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="ui-font text-sm font-semibold text-text-main">{{ $t('Selected Website Profile') }}</div>
                  <p class="mt-1 text-xs text-text-muted">
                    {{ selectedWebsite ? `Final prompt will use ${selectedWebsite.name}.` : 'Choose a website profile to build the final prompt.' }}
                  </p>
                </div>
                <RouterLink v-if="!selectedAssignment" to="/prompt-library" class="btn-secondary h-8 px-3 text-xs">
                  {{ $t('Change Website') }}
                </RouterLink>
              </div>

              <FormSelect
                v-if="!selectedAssignment"
                v-model="selectedWebsiteId"
                class="mt-4"
                :label="$t('Website profile')"
                :placeholder="$t('Select website')"
                :options="websiteOptions"
              />

              <div v-if="selectedWebsite" class="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                <Info :label="$t('Website')" :value="selectedWebsite.name" />
                <Info :label="$t('Domain')" :value="selectedWebsite.domain || '—'" />
                <Info :label="$t('Type')" :value="websiteTypeLabel(selectedWebsite.websiteType)" />
                <Info :label="$t('Industry')" :value="selectedWebsite.industry || '—'" />
                <Info :label="$t('Goal')" :value="selectedWebsite.websiteGoal || '—'" />
                <Info :label="$t('Main keyword')" :value="selectedWebsite.mainKeyword || '—'" />
                <Info :label="$t('Primary')" :value="selectedWebsite.primaryColor || '—'" />
                <Info :label="$t('Font')" :value="selectedWebsite.fontFamily || '—'" />
                <Info :label="$t('Max width')" :value="selectedWebsite.maxWidth || '—'" />
                <Info :label="$t('Phone')" :value="selectedWebsite.phoneNumber || '—'" />
                <Info :label="$t('Email')" :value="selectedWebsite.email || '—'" />
                <Info :label="$t('Country')" :value="selectedWebsite.targetCountry || '—'" />
              </div>
            </div>

            <div
              v-if="promptNeedsProduct"
              class="mt-5 rounded-card border border-border bg-soft/40 p-4"
            >
              <div class="ui-font text-sm font-semibold text-text-main">{{ $t('Product selector') }}</div>
              <p class="mt-1 text-xs text-text-muted">
                {{ $t('This prompt needs product data. Select the product details to include in the final prompt.') }}
              </p>
              <div v-if="selectedWebsite?.products.length" class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  v-for="product in selectedWebsite.products"
                  :key="product.id"
                  class="flex cursor-pointer items-start gap-2 rounded-btn border border-border bg-card p-3 text-sm"
                >
                  <input
                    class="mt-1"
                    type="checkbox"
                    :checked="selectedProductIds.includes(product.id)"
                    @change="toggleProduct(product.id)"
                  />
                  <span>
                    <span class="ui-font font-semibold text-text-main">{{ product.name || 'Unnamed product' }}</span>
                    <span class="mt-1 block text-xs text-text-muted">{{ product.category || product.keySpecs || product.url || 'No product details' }}</span>
                  </span>
                </label>
              </div>
              <div v-else class="mt-3 rounded-card border border-dashed border-border p-4 text-center text-sm text-text-muted">
                {{ $t('No product details are saved for this website yet.') }}
              </div>
            </div>

            <div
              v-if="missingRequirementMessages.length"
              class="mt-5 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/20 p-4 text-sm text-status-needs-fix-fg"
            >
              <div class="ui-font font-semibold">{{ $t('Missing required data') }}</div>
              <ul class="mt-2 list-disc space-y-1 pl-5">
                <li v-for="message in missingRequirementMessages" :key="message">{{ message }}</li>
              </ul>
            </div>
          </div>

          <div class="card card-pad space-y-4">
            <div>
              <div class="ui-font text-xs font-semibold uppercase text-primary">{{ $t('Step 2: Fill') }}</div>
              <h3 class="mt-1 section-title">{{ $t('Fill allowed fields') }}</h3>
              <p class="mt-1 text-sm text-text-muted">{{ $t('Locked admin rules and master template text cannot be edited.') }}</p>
            </div>

            <div v-if="selectedPrompt.editableFields.length === 0" class="rounded-card border border-dashed border-border bg-soft/40 p-4 text-center text-sm text-text-muted">
              {{ $t('This prompt has no editable fields.') }}
            </div>

            <div v-for="field in selectedPrompt.editableFields" :key="field.id">
              <FormInput
                v-if="field.type === 'text'"
                :model-value="filled[field.key] ?? ''"
                :label="field.label || field.key"
                :helper="field.helper"
                @update:model-value="(v) => updateField(field.key, v)"
              />
              <FormTextarea
                v-else-if="field.type === 'textarea'"
                :model-value="filled[field.key] ?? ''"
                :label="field.label || field.key"
                :helper="field.helper"
                :rows="4"
                @update:model-value="(v) => updateField(field.key, v)"
              />
              <FormSelect
                v-else
                :model-value="filled[field.key] ?? ''"
                :label="field.label || field.key"
                :helper="field.helper"
                :options="field.options ?? []"
                :placeholder="$t('Select...')"
                @update:model-value="(v) => updateField(field.key, v)"
              />
            </div>

            <div v-if="selectedAssignment" class="flex justify-end gap-2">
              <button class="btn-secondary" type="button" :disabled="saving" @click="saveProgress">
                {{ saving ? 'Saving...' : 'Save Progress' }}
              </button>
            </div>
          </div>

          <div v-if="selectedAssignment" class="card card-pad space-y-4">
            <div>
              <div class="ui-font text-xs font-semibold uppercase text-primary">{{ $t('Step 4: Submit') }}</div>
              <h3 class="mt-1 section-title">{{ $t('Paste AI output') }}</h3>
              <p class="mt-1 text-sm text-text-muted">{{ $t('Use ChatGPT, Claude, Gemini, or Codex manually, then paste the result here.') }}</p>
            </div>
            <FormTextarea v-model="pastedResult" :label="$t('AI output / code')" :rows="10" />
            <FormInput v-model="screenshotUrl" :label="$t('Screenshot link (optional)')" placeholder="https://..." />
            <div v-if="data.errors.submissions" class="text-sm text-status-needs-fix-fg">
              {{ data.errors.submissions }}
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn-primary" type="button" :disabled="submitting" @click="submit">
                {{ submitting ? 'Submitting...' : 'Submit for Review' }}
              </button>
            </div>
          </div>
        </div>

        <div class="card card-pad">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="ui-font text-xs font-semibold uppercase text-primary">{{ $t('Step 3: Copy') }}</div>
              <h3 class="mt-1 section-title">{{ $t('Final prompt') }}</h3>
              <p class="mt-1 text-sm text-text-muted">{{ $t('Copy this prompt into your AI tool.') }}</p>
            </div>
            <button class="btn-secondary h-9 px-3 text-xs" type="button" :disabled="!selectedWebsite" @click="copyPrompt">
              {{ copied ? 'Copied!' : 'Copy Prompt' }}
            </button>
          </div>
          <pre class="mt-4 max-h-[760px] overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ finalPrompt }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type PromptAssignment } from '@/stores/data';
import {
  buildFinalPrompt,
  fieldDefaults,
  missingRequiredProductFields,
  missingRequiredWebsiteFields,
  promptModeLabel,
  promptPageGroupLabel,
  websiteTypeLabel
} from '@/lib/promptLibrary';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const data = useDataStore();

const filled = reactive<Record<string, string>>({});
const selectedWebsiteId = ref('');
const selectedProductIds = ref<string[]>([]);
const pastedResult = ref('');
const screenshotUrl = ref('');
const copied = ref(false);
const saving = ref(false);
const submitting = ref(false);
const hasCopied = ref(false);

const assignmentId = computed(() =>
  typeof route.params.assignmentId === 'string' ? route.params.assignmentId : ''
);
const directPromptId = computed(() =>
  typeof route.params.promptId === 'string' ? route.params.promptId : ''
);
const selectedAssignment = computed(() =>
  assignmentId.value
    ? (auth.isAdmin ? data.assignments : data.myAssignments).find((assignment) => assignment.id === assignmentId.value)
    : undefined
);
const directPrompt = computed(() =>
  directPromptId.value ? data.promptById(directPromptId.value) : undefined
);
const selectedPrompt = computed(() =>
  selectedAssignment.value ? data.promptById(selectedAssignment.value.promptId) : directPrompt.value
);

const assignedPromptIds = computed(() => new Set(data.myAssignments.map((assignment) => assignment.promptId)));
const assignedWebsiteIds = computed(() => {
  const ids = new Set<string>();
  data.myAssignments.forEach((assignment) => {
    if (assignment.websiteId) ids.add(assignment.websiteId);
    const projectWebsiteId = data.projectById(assignment.projectId)?.websiteId;
    if (projectWebsiteId) ids.add(projectWebsiteId);
  });
  data.mySectionTasks.forEach((task) => {
    const projectWebsiteId = data.projectById(task.projectId)?.websiteId;
    if (projectWebsiteId) ids.add(projectWebsiteId);
  });
  return ids;
});

const availableWebsites = computed(() =>
  auth.isAdmin ? data.websites : data.websites.filter((website) => assignedWebsiteIds.value.has(website.id))
);
const assignmentWebsiteId = computed(() => {
  if (!selectedAssignment.value) return '';
  return selectedAssignment.value.websiteId || data.projectById(selectedAssignment.value.projectId)?.websiteId || '';
});
const selectedWebsite = computed(() => {
  const id = selectedAssignment.value ? assignmentWebsiteId.value : selectedWebsiteId.value;
  if (!id) return undefined;
  const pool = auth.isAdmin ? data.websites : availableWebsites.value;
  return pool.find((website) => website.id === id);
});
const selectedProducts = computed(() =>
  selectedWebsite.value?.products.filter((product) => selectedProductIds.value.includes(product.id)) ?? []
);
const promptNeedsProduct = computed(() => {
  const prompt = selectedPrompt.value;
  return !!prompt && (prompt.requiresProducts > 0 || prompt.requiredProductFields.length > 0);
});
const missingWebsiteFields = computed(() =>
  selectedPrompt.value ? missingRequiredWebsiteFields(selectedPrompt.value, selectedWebsite.value) : []
);
const missingProductFields = computed(() =>
  selectedPrompt.value ? missingRequiredProductFields(selectedPrompt.value, selectedProducts.value) : []
);
const missingRequirementMessages = computed(() => [
  ...(promptNeedsProduct.value && selectedProducts.value.length === 0
    ? ['Select a product so product placeholders can be filled.']
    : []),
  ...missingWebsiteFields.value.map((field) => `Website profile is missing ${field}.`),
  ...missingProductFields.value.map((field) => `Selected product is missing ${field}.`)
]);
const promptAllowed = computed(() => {
  const prompt = selectedPrompt.value;
  if (!prompt) return false;
  if (auth.isAdmin) return true;
  return prompt.status === 'approved' || assignedPromptIds.value.has(prompt.id);
});

const loadingCurrent = computed(
  () =>
    data.loading.assignments ||
    data.loading.prompts ||
    data.loading.websites ||
    data.loading.projects ||
    data.loading.sectionTasks
);
const websiteOptions = computed(() =>
  availableWebsites.value.map((website) => ({ value: website.id, label: website.name }))
);
const steps = computed(() => [
  { id: 1, label: '1 Choose' },
  { id: 2, label: '2 Fill' },
  { id: 3, label: '3 Copy' },
  { id: 4, label: selectedAssignment.value ? '4 Submit' : '4 Done' }
]);
const currentStep = computed(() => {
  if (selectedAssignment.value && pastedResult.value.trim()) return 4;
  if (hasCopied.value) return 3;
  if (Object.values(filled).some((value) => value.trim()) || selectedProductIds.value.length > 0) return 2;
  return 1;
});
const stepClass = (id: number) =>
  id <= currentStep.value ? 'bg-primary text-white' : 'bg-soft text-text-muted';

watch(
  () => route.query.websiteId,
  (value) => {
    if (typeof value === 'string') selectedWebsiteId.value = value;
  },
  { immediate: true }
);

watch(
  () => [selectedAssignment.value?.id, selectedPrompt.value?.id, selectedWebsite.value?.id],
  () => {
    Object.keys(filled).forEach((key) => delete filled[key]);
    const defaults = {
      ...(selectedPrompt.value?.defaultValues ?? {}),
      ...(selectedAssignment.value?.filledValues ?? {})
    };
    Object.assign(filled, fieldDefaults(selectedPrompt.value?.editableFields ?? [], defaults));
    pastedResult.value = selectedAssignment.value?.pastedResult ?? '';

    const products = selectedWebsite.value?.products ?? [];
    const requiredCount =
      selectedPrompt.value?.requiresProducts ||
      (selectedPrompt.value?.requiredProductFields.length ? 1 : 0);
    selectedProductIds.value = requiredCount > 0 ? products.slice(0, requiredCount).map((product) => product.id) : [];
  },
  { immediate: true }
);

const updateField = (key: string, value: string) => {
  filled[key] = value;
};

const toggleProduct = (productId: string) => {
  selectedProductIds.value = selectedProductIds.value.includes(productId)
    ? selectedProductIds.value.filter((id) => id !== productId)
    : [...selectedProductIds.value, productId];
};

const promptTitle = (id: string) => data.promptById(id)?.title ?? 'Assigned prompt';
const projectName = (id: string | null) => data.projectById(id)?.name ?? 'No project';
const websiteNameForAssignment = (assignment: PromptAssignment) => {
  const websiteId = assignment.websiteId || data.projectById(assignment.projectId)?.websiteId || '';
  return data.websiteById(websiteId)?.name ?? 'No website';
};

const finalPrompt = computed(() => {
  if (!selectedWebsite.value) return 'Select a website profile to generate the final prompt.';
  return buildFinalPrompt(selectedPrompt.value, selectedWebsite.value, filled, selectedProducts.value);
});

const copyPrompt = async () => {
  if (!selectedWebsite.value || !selectedPrompt.value) return;
  await navigator.clipboard.writeText(finalPrompt.value);
  if (selectedAssignment.value) {
    await data.addActivityLog('prompt_copied', 'assignment', selectedAssignment.value.id, 'Prompt copied.');
  } else {
    await data.addActivityLog('prompt_copied', 'prompt', selectedPrompt.value.id, 'Prompt copied from Prompt Library.');
  }
  hasCopied.value = true;
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};

const saveProgress = async () => {
  if (!selectedAssignment.value) return;
  saving.value = true;
  const nextAssignment: PromptAssignment = {
    ...selectedAssignment.value,
    filledValues: { ...filled },
    pastedResult: pastedResult.value,
    status: selectedAssignment.value.status === 'pending' ? 'in_progress' : selectedAssignment.value.status,
    startedAt: selectedAssignment.value.startedAt || new Date().toISOString().slice(0, 10)
  };
  await data.upsertAssignment(nextAssignment);
  if (selectedAssignment.value.status === 'pending') {
    await data.addActivityLog('task_started', 'assignment', selectedAssignment.value.id, 'Task started from Prompt Builder.');
  }
  saving.value = false;
};

const submit = async () => {
  if (!selectedAssignment.value) return;
  submitting.value = true;
  const ok = await data.submitAssignment(
    selectedAssignment.value,
    { ...filled },
    pastedResult.value,
    screenshotUrl.value
  );
  submitting.value = false;
  if (ok) router.push('/my-submissions');
};

const loadPageData = async () => {
  await Promise.allSettled([
    data.fetchAssignments(),
    data.fetchPrompts(),
    data.fetchProjects(),
    data.fetchWebsites(),
    data.fetchSectionTasks(),
    data.fetchSubmissions(),
    data.fetchReviewComments()
  ]);
};

onMounted(() => {
  void loadPageData();
});

const Info = defineComponent({
  name: 'Info',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true }
  },
  setup(props) {
    return () =>
      h('div', { class: 'rounded-card border border-border bg-card p-3' }, [
        h('div', { class: 'text-xs text-text-muted' }, props.label),
        h('div', { class: 'ui-font mt-1 text-sm font-semibold text-text-main' }, props.value)
      ]);
  }
});
</script>
