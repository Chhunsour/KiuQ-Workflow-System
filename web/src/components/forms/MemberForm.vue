<template>
  <form class="space-y-4" @submit.prevent="$emit('submit', model)">
    <FormInput v-model="model.fullName" label="Full name" placeholder="Jane Smith" />
    <FormInput v-model="model.email" label="Email" type="email" placeholder="jane@team.io" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormInput v-model="model.position" label="Role or position" placeholder="Content Builder" />
      <FormInput v-model="model.phone" label="Phone" placeholder="Optional" />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormSelect
        v-model="model.role"
        label="Role"
        :options="[
          { value: 'head', label: 'Head' },
          { value: 'supervisor', label: 'Supervisor' },
          { value: 'assistant_head', label: 'Assistant Head' },
          { value: 'team_member', label: 'Team Member' },
          { value: 'quality_checker', label: 'Quality Checker' },
          { value: 'viewer', label: 'Viewer' },
          { value: 'admin', label: 'Admin (legacy)' },
          { value: 'member', label: 'Team Member (legacy)' },
          { value: 'reviewer', label: 'Reviewer (legacy)' }
        ]"
      />
      <FormSelect
        v-model="model.status"
        label="Status"
        :options="[
          { value: 'pending', label: 'Pending approval' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'deactivated', label: 'Deactivated' }
        ]"
      />
    </div>
    <FormTextarea v-model="model.bio" label="Bio" helper="Short profile note shown on the user's profile." />
    <FormTextarea v-model="model.notes" label="Notes" helper="Anything the admin should remember." />
    <slot name="extra" />
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import type { Member } from '@/stores/data';

const props = defineProps<{ initial: Member }>();
defineEmits<{ (e: 'submit', value: Member): void }>();

const model = reactive<Member>({ ...props.initial });

watch(
  () => props.initial,
  (next) => Object.assign(model, next)
);

defineExpose({ model });
</script>
