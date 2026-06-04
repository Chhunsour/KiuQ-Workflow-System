<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="ui-font text-sm font-semibold text-text-main">Final prompt preview</div>
        <div class="text-xs text-text-muted">
          Combined: website + selected products + locked rules + filled fields + template + output type.
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary h-9 px-3 text-xs" type="button" @click="copy">
          {{ copied ? 'Copied!' : 'Copy Final Prompt' }}
        </button>
      </div>
    </div>

    <FormSelect
      :model-value="websiteId ?? ''"
      :options="websiteOptions"
      label="Test website profile"
      placeholder="No website context"
      @update:model-value="(v: string) => $emit('update:websiteId', v || null)"
    />

    <!-- Product picker (only relevant when this website has products) -->
    <div v-if="availableProducts.length" class="rounded-card border border-border p-3 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="ui-font text-xs font-semibold uppercase tracking-wide text-text-muted">
          Test products
          <span v-if="prompt.requiresProducts > 0" class="ml-1 text-primary">
            (this prompt expects {{ prompt.requiresProducts }})
          </span>
        </div>
        <button
          class="text-xs text-primary hover:underline"
          type="button"
          @click="selectedProductIds = []"
          v-if="selectedProductIds.length"
        >Clear</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="product in availableProducts"
          :key="product.id"
          type="button"
          class="ui-font rounded-btn border px-3 py-1 text-xs font-medium transition"
          :class="
            selectedProductIds.includes(product.id)
              ? 'border-primary bg-primary text-white'
              : 'border-border text-text-main hover:bg-soft'
          "
          @click="toggleProduct(product.id)"
        >
          {{ product.name || 'Unnamed product' }}
        </button>
      </div>
    </div>

    <div v-if="prompt.editableFields.length > 0" class="rounded-card border border-border p-4 space-y-3">
      <div class="ui-font text-xs font-semibold uppercase tracking-wide text-text-muted">
        Test fields (team would fill these)
      </div>
      <div v-for="field in prompt.editableFields" :key="field.id">
        <FormInput
          v-if="field.type === 'text'"
          :model-value="filled[field.key] ?? ''"
          :label="field.label || field.key"
          :helper="field.helper"
          @update:model-value="(v) => update(field.key, v)"
        />
        <FormTextarea
          v-else-if="field.type === 'textarea'"
          :model-value="filled[field.key] ?? ''"
          :label="field.label || field.key"
          :helper="field.helper"
          :rows="3"
          @update:model-value="(v) => update(field.key, v)"
        />
        <FormSelect
          v-else-if="field.type === 'select'"
          :model-value="filled[field.key] ?? ''"
          :label="field.label || field.key"
          :helper="field.helper"
          :options="field.options ?? []"
          placeholder="Select..."
          @update:model-value="(v) => update(field.key, v)"
        />
      </div>
    </div>

    <div
      v-if="missingRequirementMessages.length"
      class="rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/20 p-3 text-sm text-status-needs-fix-fg"
    >
      <div class="ui-font font-semibold">Missing required data</div>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li v-for="message in missingRequirementMessages" :key="message">{{ message }}</li>
      </ul>
    </div>

    <pre
      class="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main"
    >{{ assembled }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import { useDataStore, type Prompt } from '@/stores/data';
import {
  buildFinalPrompt,
  fieldDefaults,
  missingRequiredProductFields,
  missingRequiredWebsiteFields
} from '@/lib/promptLibrary';

const props = defineProps<{ prompt: Prompt; websiteId: string | null }>();
defineEmits<{ (e: 'update:websiteId', v: string | null): void }>();

const data = useDataStore();
const filled = reactive<Record<string, string>>({});
const selectedProductIds = ref<string[]>([]);
const copied = ref(false);

const websiteOptions = computed(() =>
  data.websites.map((w) => ({ value: w.id, label: w.name }))
);

const currentWebsite = computed(() => data.websiteById(props.websiteId));
const availableProducts = computed(() => currentWebsite.value?.products ?? []);
const selectedProducts = computed(() =>
  availableProducts.value.filter((product) => selectedProductIds.value.includes(product.id))
);
const missingWebsiteFields = computed(() =>
  missingRequiredWebsiteFields(props.prompt, currentWebsite.value)
);
const missingProductFields = computed(() =>
  missingRequiredProductFields(props.prompt, selectedProducts.value)
);
const missingRequirementMessages = computed(() => [
  ...((props.prompt.requiresProducts > 0 || props.prompt.requiredProductFields.length > 0) && selectedProducts.value.length === 0
    ? ['Select a product so product placeholders can be filled.']
    : []),
  ...missingWebsiteFields.value.map((field) => `Website profile is missing ${field}.`),
  ...missingProductFields.value.map((field) => `Selected product is missing ${field}.`)
]);

watch(
  () => props.prompt.editableFields,
  (fields) => {
    fields.forEach((f) => {
      if (filled[f.key] === undefined) filled[f.key] = f.defaultValue ?? '';
    });
  },
  { immediate: true, deep: true }
);

// When the website changes, drop any product selections from the previous site.
watch(
  () => [props.websiteId, props.prompt.requiresProducts, props.prompt.requiredProductFields.length],
  () => {
    const products = availableProducts.value;
    const requiredCount = props.prompt.requiresProducts || (props.prompt.requiredProductFields.length ? 1 : 0);
    selectedProductIds.value = requiredCount > 0 ? products.slice(0, requiredCount).map((product) => product.id) : [];
  },
  { immediate: true }
);

const update = (key: string, val: string) => {
  filled[key] = val;
};

const toggleProduct = (id: string) => {
  selectedProductIds.value = selectedProductIds.value.includes(id)
    ? selectedProductIds.value.filter((x) => x !== id)
    : [...selectedProductIds.value, id];
};

const assembled = computed(() =>
  buildFinalPrompt(
    props.prompt,
    currentWebsite.value,
    fieldDefaults(props.prompt.editableFields, filled),
    selectedProducts.value
  )
);

const copy = async () => {
  await navigator.clipboard.writeText(assembled.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};
</script>
