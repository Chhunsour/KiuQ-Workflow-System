<template>
  <Modal :open="true" :title="`${$t('Overrides')} · ${website.name}`" size="xl" @close="$emit('close')">
    <div class="ov">
      <input v-model="search" type="search" class="ov-search" :placeholder="$t('Search products…')" />

      <p v-if="loading" class="text-sm text-text-muted py-6 text-center">{{ $t('Loading…') }}</p>
      <div v-else class="ov-list">
        <div v-for="p in filtered" :key="p.id" class="ov-row">
          <div class="min-w-0 flex-1">
            <p class="ov-name">{{ p.name || 'Untitled' }}<span v-if="p.sku" class="ov-sku"> · {{ p.sku }}</span></p>
            <p class="ov-slug">/{{ p.product_slug || '—' }}</p>
          </div>
          <span class="ov-summary" :class="summaryClass(p.id)">{{ summary(p.id) }}</span>
          <button type="button" class="btn-secondary ov-btn" @click="edit(p)">{{ $t('Edit') }}</button>
        </div>
        <p v-if="filtered.length === 0" class="text-sm text-text-muted py-6 text-center">{{ $t('No products match.') }}</p>
      </div>
    </div>

    <!-- Per-product override editor -->
    <Modal v-if="editing" :open="true" :title="`${$t('Override')} · ${editing.name}`" size="md" @close="editing = null">
      <div class="ove">
        <label class="ove-toggle">
          <input type="checkbox" v-model="draftEnabled" />
          <span>{{ $t('Include this product on this website') }}</span>
        </label>
        <p class="text-[11px] text-text-muted">{{ $t('Leave a field blank to inherit master data (shown as placeholder).') }}</p>
        <div class="ove-fields">
          <div v-for="f in OVERRIDE_FIELDS" :key="String(f.key)">
            <label class="ove-label">{{ f.label }}</label>
            <textarea v-if="f.type === 'area'" v-model="draft[String(f.key)]" rows="2" class="ove-input" :placeholder="masterValue(f.key)" />
            <input v-else :type="f.type === 'number' ? 'number' : 'text'" v-model="draft[String(f.key)]" class="ove-input" :placeholder="masterValue(f.key)" />
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn-danger mr-auto" :disabled="!existingFor(editing.id)" @click="revert">{{ $t('Revert to master') }}</button>
        <button type="button" class="btn-secondary" @click="editing = null">{{ $t('Cancel') }}</button>
        <button type="button" class="btn-primary" @click="save">{{ $t('Save override') }}</button>
      </template>
    </Modal>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useProductSyncStore, OVERRIDE_FIELDS, type ConnectedWebsite, type ProductOverride, type SourceProduct } from '@/stores/productSync';

const props = defineProps<{ website: ConnectedWebsite }>();
defineEmits<{ (e: 'close'): void }>();

const sync = useProductSyncStore();

const loading = ref(true);
const search = ref('');
const overrides = ref<Map<string, ProductOverride>>(new Map());
const editing = ref<SourceProduct | null>(null);
const draft = ref<Record<string, string>>({});
const draftEnabled = ref(true);

onMounted(async () => {
  try {
    if (sync.sourceProducts.length === 0) await sync.fetchSourceProducts();
    const list = await sync.fetchOverrides(props.website.id);
    overrides.value = new Map(list.map((o) => [o.product_id, o]));
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return sync.sourceProducts;
  return sync.sourceProducts.filter((p) => `${p.name} ${p.product_slug ?? ''} ${p.sku ?? ''}`.toLowerCase().includes(q));
});

const existingFor = (productId: string) => overrides.value.get(productId) ?? null;

const summary = (productId: string): string => {
  const o = overrides.value.get(productId);
  if (!o) return 'Master data';
  if (o.enabled === false) return 'Disabled on this site';
  const n = OVERRIDE_FIELDS.filter((f) => o[f.key] != null && o[f.key] !== '').length;
  return n ? `${n} override${n > 1 ? 's' : ''}` : 'Master data';
};
const summaryClass = (productId: string) => {
  const o = overrides.value.get(productId);
  if (o?.enabled === false) return 'ov-summary--off';
  return o ? 'ov-summary--on' : '';
};

const masterValue = (key: keyof ProductOverride): string => {
  const p = editing.value;
  if (!p) return '';
  const map: Record<string, unknown> = {
    title: p.name,
    price: p.product_price,
    short_description: p.short_description,
    button_url: p.button_url,
    status: 'published',
  };
  const v = map[String(key)];
  return v != null && v !== '' ? String(v) : '—';
};

const edit = (p: SourceProduct) => {
  editing.value = p;
  const ex = overrides.value.get(p.id);
  draftEnabled.value = ex?.enabled ?? true;
  const d: Record<string, string> = {};
  for (const f of OVERRIDE_FIELDS) {
    const v = ex?.[f.key];
    d[String(f.key)] = v != null ? String(v) : '';
  }
  draft.value = d;
};

const save = async () => {
  if (!editing.value) return;
  const payload: Record<string, unknown> = { product_id: editing.value.id, website_id: props.website.id, enabled: draftEnabled.value };
  for (const f of OVERRIDE_FIELDS) {
    const raw = draft.value[String(f.key)]?.trim();
    if (!raw) { payload[String(f.key)] = null; continue; }
    payload[String(f.key)] = f.type === 'number' ? Number(raw) : raw;
  }
  const saved = await sync.upsertOverride(
    payload as unknown as Partial<ProductOverride> & { website_id: string; product_id: string }
  );
  if (saved) overrides.value.set(saved.product_id, saved);
  editing.value = null;
};

const revert = async () => {
  if (!editing.value) return;
  const ex = overrides.value.get(editing.value.id);
  if (ex) { await sync.deleteOverride(ex.id); overrides.value.delete(editing.value.id); }
  editing.value = null;
};
</script>

<style scoped>
.ov { display: flex; flex-direction: column; gap: 0.75rem; }
.ov-search { width: 100%; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main); font-size: 0.85rem; padding: 0.5rem 0.75rem; outline: none; }
.ov-list { max-height: 55vh; overflow-y: auto; }
.ov-row { display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0; border-bottom: 1px solid var(--border); }
.ov-name { font-weight: 700; color: var(--text-main); font-size: 0.85rem; margin: 0; }
.ov-slug { font-size: 0.72rem; color: var(--text-muted); margin: 0; font-family: 'Jost Numbers', monospace; }
.ov-sku { color: var(--text-muted); font-weight: 600; font-family: 'Jost Numbers', monospace; }
.ov-summary { font-size: 0.72rem; color: var(--text-muted); }
.ov-summary--on { color: var(--primary); }
.ov-summary--off { color: #dc2626; }
.ov-btn { font-size: 0.76rem; padding: 0.3rem 0.65rem; height: auto; }
.ove { display: flex; flex-direction: column; gap: 0.75rem; }
.ove-toggle { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: var(--text-main); cursor: pointer; }
.ove-fields { display: flex; flex-direction: column; gap: 0.6rem; max-height: 45vh; overflow-y: auto; padding-right: 0.25rem; }
.ove-label { display: block; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; color: var(--text-muted); margin-bottom: 0.3rem; }
.ove-input { width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); color: var(--text-main); font-size: 0.85rem; padding: 0.45rem 0.6rem; outline: none; }
</style>
