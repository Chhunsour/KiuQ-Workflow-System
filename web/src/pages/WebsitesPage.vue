<template>
  <div>
    <PageHeader title="Websites" subtitle="Saved website profiles you can reference inside prompts.">
      <template #actions>
        <RouterLink to="/websites/new" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Website
        </RouterLink>
      </template>
    </PageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" placeholder="Search websites..." />
    </div>

    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="w in filtered" :key="w.id" class="card card-pad">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div v-if="w.faviconUrl" class="ws-avatar">
                <img :src="w.faviconUrl" alt="" class="ws-favicon" @error="(e) => ((e.target as HTMLImageElement).parentElement!.style.display = 'none')" />
              </div>
              <div class="min-w-0">
                <h3 class="ui-font text-base font-semibold text-text-main truncate">{{ w.name }}</h3>
                <a
                  v-if="w.domain"
                  :href="`https://${w.domain}`"
                  target="_blank"
                  rel="noopener"
                  class="text-sm text-primary hover:underline truncate block"
                >
                  {{ w.domain }}
                </a>
                <span v-else class="text-sm text-text-muted">No domain</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <StatusBadge :status="w.status" />
              <span v-if="w.isFramework" class="wp-conn-badge" :class="getConnectionStatus(w).dotClass" title="Framework connection status">
                <span class="wp-conn-dot" /> {{ getConnectionStatus(w).text }}
              </span>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-2">
            <div>
              <div class="text-xs text-text-muted">Primary</div>
              <div class="mt-1 flex items-center gap-2">
                <span class="block h-5 w-5 rounded-full border border-border" :style="{ backgroundColor: w.primaryColor }" />
                <span class="ui-font text-xs text-text-main">{{ w.primaryColor }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-text-muted">Secondary</div>
              <div class="mt-1 flex items-center gap-2">
                <span class="block h-5 w-5 rounded-full border border-border" :style="{ backgroundColor: w.secondaryColor }" />
                <span class="ui-font text-xs text-text-main">{{ w.secondaryColor }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-text-muted">Background</div>
              <div class="mt-1 flex items-center gap-2">
                <span class="block h-5 w-5 rounded-full border border-border" :style="{ backgroundColor: w.backgroundColor }" />
                <span class="ui-font text-xs text-text-main">{{ w.backgroundColor }}</span>
              </div>
            </div>
          </div>

          <dl class="mt-4 space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">Type</dt>
              <dd class="ui-font text-text-main">{{ w.websiteType || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">Font</dt>
              <dd class="ui-font text-text-main">{{ w.fontFamily || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">Max width</dt>
              <dd class="ui-font text-text-main">{{ w.maxWidth || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">Products</dt>
              <dd class="ui-font text-text-main">{{ w.products.length }}</dd>
            </div>
          </dl>

          <div class="mt-4 flex gap-2">
            <RouterLink :to="`/websites/${w.id}/edit`" class="btn-secondary flex-1">Edit</RouterLink>
            <button class="btn-danger" @click="confirmDelete(w)">Delete</button>
          </div>
        </div>
      </div>

      <EmptyState
        v-if="filtered.length === 0"
        title="No websites yet"
        description="Create your first website profile to use inside prompt templates."
      >
        <template #action>
          <RouterLink to="/websites/new" class="btn-primary">New Website</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import { useDataStore, type Website } from '@/stores/data';
import { usePageRealtime } from '@/services/realtimeService';

const data = useDataStore();
const search = ref('');

// Live updates: new/edited/deleted websites (incl. from other windows) patch
// the data store reactively, so this list stays current without a refresh.
usePageRealtime(['websites']);

const filtered = computed(() =>
  data.websites.filter(
    (w) =>
      w.name.toLowerCase().includes(search.value.toLowerCase()) ||
      w.domain.toLowerCase().includes(search.value.toLowerCase())
  )
);

const confirmDelete = async (w: Website) => {
  if (!confirm(`Delete website "${w.name}"?`)) return;
  await data.removeWebsite(w.id);
};

const getConnectionStatus = (w: Website) => {
  if (!w.lastAccessedAt) return { text: 'Not Connected', dotClass: 'dot--gray' };
  const lastActive = new Date(w.lastAccessedAt).getTime();
  const diffMinutes = (Date.now() - lastActive) / 1000 / 60;
  if (diffMinutes <= 15) {
    return { text: 'Connected (Active)', dotClass: 'dot--green' };
  } else if (diffMinutes <= 1440) {
    return { text: 'Inactive (Idle)', dotClass: 'dot--orange' };
  } else {
    return { text: 'Disconnected', dotClass: 'dot--red' };
  }
};

onMounted(() => data.fetchWebsites());
</script>

<style scoped>
.ws-avatar {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.ws-favicon {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.wp-conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
}
.wp-conn-badge.dot--green {
  color: #16a34a;
  background: color-mix(in srgb, #16a34a 9%, transparent);
}
.wp-conn-badge.dot--orange {
  color: #d97706;
  background: color-mix(in srgb, #d97706 9%, transparent);
}
.wp-conn-badge.dot--red {
  color: #dc2626;
  background: color-mix(in srgb, #dc2626 9%, transparent);
}
.wp-conn-badge.dot--gray {
  color: #64748b;
  background: color-mix(in srgb, #64748b 9%, transparent);
}
.wp-conn-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
</style>
