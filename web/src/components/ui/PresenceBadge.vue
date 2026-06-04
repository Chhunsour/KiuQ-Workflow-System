<template>
  <span class="badge" :class="classes">
    <span class="badge-dot" :class="dotClass" />
    {{ labelText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { presenceLabel, presenceStatusFor, type PresenceStatus } from '@/lib/presence';
import type { Member } from '@/stores/data';

const props = withDefaults(
  defineProps<{
    member: Pick<Member, 'currentStatus' | 'lastActiveAt' | 'lastLogoutAt'>;
    label?: string;
  }>(),
  { label: '' }
);

const status = computed<PresenceStatus>(() => presenceStatusFor(props.member));

const classes = computed(() => {
  if (status.value === 'online') return 'bg-status-approved-bg text-status-approved-fg';
  if (status.value === 'away') return 'bg-status-submitted-bg text-status-submitted-fg';
  return 'bg-status-not-started-bg text-status-not-started-fg';
});

const dotClass = computed(() => {
  if (status.value === 'online') return 'bg-status-approved-fg';
  if (status.value === 'away') return 'bg-status-submitted-fg';
  return 'bg-status-not-started-fg/70';
});

const labelText = computed(() => props.label || presenceLabel(status.value));
</script>
