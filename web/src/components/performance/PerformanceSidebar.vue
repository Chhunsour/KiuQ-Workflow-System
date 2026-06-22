<template>
  <div class="perf-sidebar-container flex flex-col h-full font-sans">
    <!-- Search Input -->
    <div class="mb-2.5 relative">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('performance.searchPlaceholder') || 'Search website...'"
        class="w-full bg-input text-[11px] border border-border/80 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-primary placeholder:text-text-soft font-sans font-medium text-text-main"
      />
      <span class="absolute left-2.5 top-2 text-text-soft select-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <button
        v-if="searchQuery"
        type="button"
        @click="searchQuery = ''"
        class="absolute right-2.5 top-2 text-text-muted hover:text-text-main text-[9px] font-bold"
      >
        ✕
      </button>
    </div>

    <!-- Info Block: Scoped Count -->
    <div class="flex items-center justify-between text-[9px] text-text-muted font-bold uppercase tracking-wider mb-2 px-1">
      <span>{{ filteredWebsites.length }} {{ filteredWebsites.length === 1 ? $t('website') : $t('websites') }}</span>
      <span class="max-w-[150px] truncate" :title="scopeLabel">{{ scopeLabel }}</span>
    </div>

    <!-- Scrollable Website List -->
    <div class="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-240px)]">
      <div
        v-for="w in filteredWebsites"
        :key="w.id"
        class="perf-sidebar-item group"
        :class="{ 'is-selected': websiteFilter === w.id && scopeFilter === 'single' }"
        @click="selectWebsite(w)"
        :title="$t('View performance for this website')"
      >
        <!-- Favicon -->
        <div class="flex-shrink-0">
          <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="16" />
        </div>

        <!-- Name & Domain -->
        <div class="min-w-0 flex-1 ml-2">
          <div class="text-[11px] font-bold text-text-main truncate group-hover:text-primary transition-colors leading-tight">
            {{ w.name || w.domain }}
          </div>
          <div class="text-[9px] text-text-muted/80 truncate leading-normal font-mono mt-0.5">
            {{ w.domain }}
          </div>
        </div>
      </div>

      <div v-if="filteredWebsites.length === 0" class="py-8 text-center text-xs text-text-muted font-sans border border-dashed border-border/60 rounded-xl bg-soft/5">
        {{ $t('No websites found.') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import WebsiteFavicon from '@/components/ui/WebsiteFavicon.vue';
import type { Website } from '@/stores/data';

const props = defineProps<{
  websites: Website[];
  scopeFilter: string;
  websiteFilter: string;
  scopeLabel: string;
}>();

const emit = defineEmits<{
  (e: 'select-website', website: Website): void;
}>();

const searchQuery = ref('');

const filteredWebsites = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return props.websites;
  return props.websites.filter(
    (w) =>
      (w.name ?? '').toLowerCase().includes(q) ||
      (w.domain ?? '').toLowerCase().includes(q)
  );
});

const selectWebsite = (w: Website) => {
  emit('select-website', w);
};
</script>

<style scoped>
.perf-sidebar-item {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.5rem;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  transition: all 120ms ease;
  border-left: 3px solid transparent;
  user-select: none;
}
.perf-sidebar-item:hover {
  background-color: var(--soft-bg);
}
.perf-sidebar-item.is-selected {
  border-left-color: var(--primary);
  background-color: rgba(21, 214, 194, 0.06); /* Subtle KiuQ cyan active background */
}
.perf-sidebar-item.is-selected:hover {
  background-color: rgba(21, 214, 194, 0.09);
}
</style>
