<template>
  <div>
    <PageHeader :title="$t('Member Activity')" subtitle="Recent task, review, blocker, and report activity." />

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" :placeholder="$t('Search activity...')" />
      <FormSelect
        v-model="memberFilter"
        class="max-w-[240px]"
        :options="[{ value: '', label: 'All members' }, ...memberOptions]"
      />
    </div>

    <LoadingBlock :loading="data.loading.activityLogs" :error="data.errors.activityLogs" :retry="data.fetchActivityLogs">
      <div v-if="filtered.length > 0" class="card overflow-hidden">
        <div v-for="log in filtered" :key="log.id" class="border-b border-border px-6 py-4 last:border-0">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="ui-font text-sm font-medium text-text-main">{{ log.message }}</div>
              <div class="mt-1 text-xs text-text-muted">{{ memberName(log.userId) }} · {{ actionLabel(log.action) }}</div>
            </div>
            <span class="text-xs text-text-muted whitespace-nowrap">{{ new Date(log.createdAt).toLocaleString() }}</span>
          </div>
        </div>
      </div>
      <EmptyState v-else :title="$t('No activity')" description="Member activity will appear as the team works." />
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import { useDataStore, type ActivityAction } from '@/stores/data';
import { usePageRealtime } from '@/services/realtimeService';

const data = useDataStore();
const search = ref('');
const memberFilter = ref('');

// Live updates: new activity log entries patch the data store reactively, so the
// feed grows without a manual refresh.
usePageRealtime(['activity_logs', 'profiles']);

const memberOptions = computed(() =>
  data.members.map((member) => ({ value: member.id, label: member.fullName || member.email }))
);
const memberName = (id: string) => data.memberById(id)?.fullName ?? data.memberById(id)?.email ?? 'Team member';
const actionLabel = (action: ActivityAction) =>
  action
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');

const filtered = computed(() =>
  data.activityLogs.filter((log) => {
    const q = search.value.toLowerCase();
    const matchesSearch =
      !q ||
      log.message.toLowerCase().includes(q) ||
      memberName(log.userId).toLowerCase().includes(q) ||
      actionLabel(log.action).toLowerCase().includes(q);
    const matchesMember = !memberFilter.value || log.userId === memberFilter.value;
    return matchesSearch && matchesMember;
  })
);

onMounted(() => {
  data.fetchActivityLogs();
  data.fetchMembers();
});
</script>
