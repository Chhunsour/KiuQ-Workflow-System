<template>
  <form class="space-y-4" @submit.prevent="$emit('submit', model)">
    <FormInput v-model="model.name" :label="$t('Project name')" :placeholder="$t('Acme — Launch sprint')" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormSelect
        v-model="websiteValue"
        :label="$t('Related website')"
        :placeholder="$t('None')"
        :options="websiteOptions"
      />
      <FormSelect
        v-model="model.status"
        :label="$t('Status')"
        :options="[
          { value: 'not_started', label: 'Not Started' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'review', label: 'Review' },
          { value: 'approved', label: 'Approved' },
          { value: 'completed', label: 'Completed' }
        ]"
      />
    </div>
    <FormInput v-model="model.deadline" :label="$t('Deadline')" type="date" />
    <div>
      <label class="label">{{ $t('Assigned members') }}</label>
      <p class="helper -mt-1 mb-2">{{ $t('Pick one or more team members.') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="m in members"
          :key="m.id"
          type="button"
          class="ui-font rounded-btn border px-3 py-1.5 text-sm font-medium transition"
          :class="
            model.assignedMemberIds.includes(m.id)
              ? 'border-primary bg-primary text-white'
              : 'border-border text-text-main hover:bg-soft'
          "
          @click="toggleMember(m.id)"
        >
          {{ m.fullName }}
        </button>
      </div>
    </div>
    <FormTextarea v-model="model.notes" :label="$t('Notes')" />
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import { useDataStore, type Project } from '@/stores/data';

const props = defineProps<{ initial: Project }>();
defineEmits<{ (e: 'submit', value: Project): void }>();

const data = useDataStore();
const model = reactive<Project>({ ...props.initial, assignedMemberIds: [...props.initial.assignedMemberIds] });

watch(
  () => props.initial,
  (next) => {
    Object.assign(model, next);
    model.assignedMemberIds = [...next.assignedMemberIds];
  }
);

const members = computed(() => data.members.filter((m) => m.status === 'active'));
const websiteOptions = computed(() => data.websites.map((w) => ({ value: w.id, label: w.name })));
const websiteValue = computed({
  get: () => model.websiteId ?? '',
  set: (v) => (model.websiteId = v || null)
});

const toggleMember = (id: string) => {
  if (model.assignedMemberIds.includes(id)) {
    model.assignedMemberIds = model.assignedMemberIds.filter((x) => x !== id);
  } else {
    model.assignedMemberIds = [...model.assignedMemberIds, id];
  }
};

defineExpose({ model });
</script>
