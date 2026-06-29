<template>
  <Modal :open="true" :title="$t('Sync products')" size="lg" @close="$emit('close')">
    <div class="sync-modal">
      <p class="text-sm text-text-muted">
        {{ $t('Syncing') }} <span class="text-text-main font-semibold">{{ target.label }}</span>.
      </p>

      <!-- sync type -->
      <div>
        <p class="sync-label">{{ $t('What to sync') }}</p>
        <div class="sync-type-grid">
          <button
            v-for="t in SYNC_TYPES"
            :key="t.value"
            type="button"
            class="sync-type-btn"
            :class="{ 'sync-type-btn--active': syncType === t.value }"
            @click="syncType = t.value"
          >
            <span class="sync-type-title">{{ t.label }}</span>
            <span class="sync-type-hint">{{ t.hint }}</span>
          </button>
        </div>
      </div>

      <!-- websites -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="sync-label mb-0">{{ $t('Target websites') }}</p>
          <button type="button" class="link-btn" @click="selectAll">{{ $t('All websites') }}</button>
        </div>
        <p v-if="loadingSites" class="text-sm text-text-muted">{{ $t('Loading websites…') }}</p>
        <p v-else-if="activeSites.length === 0" class="text-sm text-status-needs-fix-fg">
          {{ $t('No active websites yet. Add one in Connected Websites first.') }}
        </p>
        <div v-else class="sync-site-list">
          <label v-for="w in activeSites" :key="w.id" class="sync-site">
            <input type="checkbox" :checked="isChecked(w.id)" @change="toggleSite(w.id)" />
            <span class="min-w-0">
              <span class="sync-site-name">{{ w.name }}</span>
              <span class="sync-site-domain">{{ w.domain }}</span>
            </span>
          </label>
        </div>
      </div>

      <!-- force -->
      <label class="sync-force">
        <input type="checkbox" v-model="force" />
        <span>
          <span class="sync-site-name">{{ $t('Force sync') }}</span>
          <span class="sync-site-domain">{{ $t('Ignore overrides and re-push even unchanged products.') }}</span>
        </span>
      </label>

      <div v-if="errorMsg" class="sync-error">{{ errorMsg }}</div>

      <div v-if="result" class="sync-result">
        <p>
          <span class="text-status-approved-fg font-semibold">{{ result.success }} {{ $t('succeeded') }}</span> ·
          <span :class="result.failed ? 'text-status-needs-fix-fg font-semibold' : 'text-text-muted'">
            {{ result.failed }} {{ $t('failed') }}
          </span>
          <span v-if="typeof result.skipped === 'number'" class="text-text-muted"> · {{ result.skipped }} {{ $t('unchanged') }}</span>
        </p>
        <ul v-if="failedResults.length" class="sync-result-errors">
          <li v-for="(r, i) in failedResults" :key="i">{{ r.website }} · {{ r.product }}: {{ r.error }}</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-secondary" @click="$emit('close')">
        {{ result ? $t('Close') : $t('Cancel') }}
      </button>
      <button type="button" class="btn-primary" :disabled="!canRun || running" @click="run">
        {{ running ? $t('Syncing…') : result ? $t('Sync again') : $t('Start sync') }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useProductSyncStore, type SyncResult, type SyncType } from '@/stores/productSync';

export interface SyncTarget {
  productIds: string[] | 'all';
  label: string;
  /** Optional preset for the "what to sync" selector (defaults to 'full'). */
  defaultType?: SyncType;
  /** Optional preset list of target website ids (defaults to all active). */
  websiteIds?: string[];
}

const props = defineProps<{ target: SyncTarget }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'done', r: SyncResult): void }>();

const store = useProductSyncStore();

const SYNC_TYPES: { value: SyncType; label: string; hint: string }[] = [
  { value: 'full', label: 'Full product', hint: 'All fields + images' },
  { value: 'price', label: 'Price only', hint: 'Price, sale, stock' },
  { value: 'images', label: 'Images only', hint: 'Featured + gallery' },
  { value: 'descriptions', label: 'Descriptions only', hint: 'Title + text' },
];

const loadingSites = ref(true);
const syncType = ref<SyncType>(props.target.defaultType ?? 'full');
const selectedSites = ref<'all' | Set<string>>(
  props.target.websiteIds && props.target.websiteIds.length ? new Set(props.target.websiteIds) : 'all'
);
const force = ref(false);
const running = ref(false);
const errorMsg = ref<string | null>(null);
const result = ref<SyncResult | null>(null);

const activeSites = computed(() => store.websites.filter((w) => w.active));
const failedResults = computed(() => (result.value?.results ?? []).filter((r) => !r.ok));

onMounted(async () => {
  try { if (store.websites.length === 0) await store.fetchWebsites(); }
  finally { loadingSites.value = false; }
});

const isChecked = (id: string) => selectedSites.value === 'all' || selectedSites.value.has(id);
const selectAll = () => { selectedSites.value = 'all'; };
const toggleSite = (id: string) => {
  const next = selectedSites.value === 'all' ? new Set(activeSites.value.map((w) => w.id)) : new Set(selectedSites.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  selectedSites.value = next;
};

const websiteIds = computed<string[] | 'all'>(() =>
  selectedSites.value === 'all' ? 'all' : [...selectedSites.value]
);
const canRun = computed(() =>
  activeSites.value.length > 0 && (websiteIds.value === 'all' || websiteIds.value.length > 0)
);

const run = async () => {
  running.value = true; errorMsg.value = null; result.value = null;
  try {
    const r = await store.callSync({
      productIds: props.target.productIds,
      websiteIds: websiteIds.value,
      syncType: syncType.value,
      force: force.value,
    });
    result.value = r;
    emit('done', r);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
};
</script>

<style scoped>
.sync-modal { display: flex; flex-direction: column; gap: 1.1rem; }
.sync-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.5rem; }
.sync-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.sync-type-btn { text-align: left; padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid var(--border); background: var(--card-bg); cursor: pointer; transition: border-color 140ms, background 140ms; }
.sync-type-btn--active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
.sync-type-title { display: block; font-weight: 700; color: var(--text-main); font-size: 0.85rem; }
.sync-type-hint { display: block; font-size: 0.72rem; color: var(--text-muted); }
.link-btn { background: none; border: 0; color: var(--primary); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; }
.sync-site-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 12rem; overflow-y: auto; }
.sync-site, .sync-force { display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.65rem; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.sync-force { align-items: flex-start; }
.sync-site-name { display: block; font-weight: 700; color: var(--text-main); font-size: 0.85rem; }
.sync-site-domain { display: block; font-size: 0.72rem; color: var(--text-muted); }
.sync-error { padding: 0.6rem 0.75rem; border: 1px solid rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); border-radius: 10px; font-size: 0.82rem; color: var(--status-needs-fix-fg, #dc2626); }
.sync-result { padding: 0.7rem 0.8rem; border: 1px solid var(--border); background: var(--soft-bg); border-radius: 10px; font-size: 0.85rem; }
.sync-result-errors { margin: 0.4rem 0 0; padding-left: 1rem; max-height: 8rem; overflow-y: auto; color: #dc2626; font-size: 0.78rem; }
</style>
