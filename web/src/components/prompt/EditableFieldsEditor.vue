<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <div class="ui-font text-sm font-semibold text-text-main">Editable input fields</div>
        <div class="text-xs text-text-muted">
          Fields the team will fill. Use the key inside the template like
          <code class="rounded bg-soft px-1">{{ placeholderHint }}</code>.
        </div>
      </div>
      <button class="btn-secondary h-8 px-3 text-xs" type="button" @click="addField">
        + Add field
      </button>
    </div>

    <div v-if="fields.length === 0" class="rounded-card border border-dashed border-border bg-soft/40 p-4 text-center text-sm text-text-muted">
      No editable fields yet. Add one to let the team customize this prompt.
    </div>

    <div v-for="(field, idx) in fields" :key="field.id" class="rounded-card border border-border p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput
          :model-value="field.label"
          label="Field label"
          placeholder="Headline"
          @update:model-value="(v) => update(idx, 'label', v)"
        />
        <FormInput
          :model-value="field.key"
          label="Key (used in template)"
          placeholder="headline"
          helper="Lowercase, no spaces. Used as {{key}}."
          @update:model-value="(v) => update(idx, 'key', sanitizeKey(v))"
        />
        <FormSelect
          :model-value="field.type"
          label="Type"
          :options="[
            { value: 'text', label: 'Single-line text' },
            { value: 'textarea', label: 'Multi-line text' },
            { value: 'select', label: 'Dropdown' }
          ]"
          @update:model-value="(v) => update(idx, 'type', v as EditableField['type'])"
        />
        <FormInput
          :model-value="field.defaultValue ?? ''"
          label="Default value (optional)"
          @update:model-value="(v) => update(idx, 'defaultValue', v)"
        />
        <FormInput
          v-if="field.type === 'select'"
          :model-value="(field.options ?? []).join(', ')"
          label="Options (comma separated)"
          placeholder="Friendly, Professional, Playful"
          class="sm:col-span-2"
          @update:model-value="(v) => updateOptions(idx, v)"
        />
        <FormInput
          :model-value="field.helper ?? ''"
          label="Helper text (optional)"
          class="sm:col-span-2"
          @update:model-value="(v) => update(idx, 'helper', v)"
        />
      </div>
      <div class="mt-2 flex justify-end">
        <button class="btn-danger h-8 px-3 text-xs" type="button" @click="removeField(idx)">
          Remove field
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import type { EditableField } from '@/stores/data';

const props = defineProps<{ fields: EditableField[] }>();
const emit = defineEmits<{ (e: 'update:fields', fields: EditableField[]): void }>();

const placeholderHint = '{{key}}';

const newId = () => 'ef_' + Math.random().toString(36).slice(2, 9);

const sanitizeKey = (v: string) =>
  v
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const addField = () => {
  emit('update:fields', [
    ...props.fields,
    { id: newId(), key: '', label: '', type: 'text', helper: '', defaultValue: '' }
  ]);
};

const removeField = (idx: number) => {
  emit('update:fields', props.fields.filter((_, i) => i !== idx));
};

const update = <K extends keyof EditableField>(idx: number, key: K, value: EditableField[K]) => {
  const next = props.fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f));
  emit('update:fields', next);
};

const updateOptions = (idx: number, raw: string) => {
  const opts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  update(idx, 'options', opts);
};
</script>
