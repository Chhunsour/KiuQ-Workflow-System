<template>
  <Modal :open="true" :title="$t('Edit product')" :subtitle="product.name || undefined" size="lg" @close="$emit('close')">
    <div class="ep">
      <p class="ep-hint">{{ $t('Edits save to the master catalog. Sync afterwards to push them to your sites.') }}</p>

      <!-- images -->
      <div class="ep-images">
        <div class="ep-images-head">
          <label class="ep-label">{{ $t('Product images') }}</label>
          <span class="ep-images-hint">{{ $t('Click an image to set it as the main one.') }}</span>
        </div>
        <div class="ep-gallery">
          <button
            v-for="img in images" :key="img.id" type="button"
            class="ep-thumb" :class="{ 'ep-thumb--feat': img.is_feature_image }"
            :title="img.is_feature_image ? $t('Main image') : $t('Set as main image')"
            @click="setFeatured(img)"
          >
            <img :src="img.url" alt="" loading="lazy" decoding="async" />
            <span v-if="img.is_feature_image" class="ep-thumb-badge"><span class="ep-ico" v-html="ICON.star" /></span>
            <span class="ep-thumb-x" :aria-label="$t('Remove image')" role="button" @click.stop="removeImage(img)">×</span>
          </button>

          <label class="ep-thumb ep-thumb--add" :class="{ 'ep-thumb--busy': uploading }">
            <input type="file" accept="image/*" multiple class="ep-file" :disabled="uploading" @change="onFiles" />
            <span v-if="uploading" class="ep-spinner" />
            <template v-else><span class="ep-ico ep-add-ico" v-html="ICON.plus" /><span class="ep-add-lbl">{{ $t('Add') }}</span></template>
          </label>
        </div>
        <p v-if="imgLoading" class="ep-images-loading">{{ $t('Loading images…') }}</p>
      </div>

      <div class="ep-grid">
        <div class="ep-field ep-col-2">
          <label class="ep-label">{{ $t('Product title') }}</label>
          <input v-model="draft.name" type="text" class="ep-input" :placeholder="$t('Untitled')" />
        </div>

        <div class="ep-field ep-col-2">
          <label class="ep-label">{{ $t('Slug') }}</label>
          <input v-model="draft.product_slug" type="text" class="ep-input ep-mono" placeholder="product-slug" />
        </div>

        <div class="ep-field">
          <label class="ep-label">{{ $t('SKU') }}</label>
          <input v-model="draft.sku" type="text" class="ep-input ep-mono" placeholder="SKU-000" />
        </div>

        <div class="ep-field">
          <label class="ep-label">{{ $t('Price') }}</label>
          <input v-model="draft.product_price" type="text" inputmode="decimal" class="ep-input ep-mono" placeholder="0.00" />
        </div>

        <div class="ep-field">
          <label class="ep-label">{{ $t('Category') }}</label>
          <input v-model="draft.product_category" type="text" class="ep-input" list="ep-categories" :placeholder="$t('Uncategorized')" />
          <datalist id="ep-categories">
            <option v-for="c in categories" :key="c" :value="c" />
          </datalist>
        </div>

        <div class="ep-field">
          <label class="ep-label">{{ $t('Product type') }}</label>
          <input v-model="draft.product_type" type="text" class="ep-input" :placeholder="$t('e.g. machine, part')" />
        </div>

        <div class="ep-field">
          <label class="ep-label">{{ $t('GTIN') }}</label>
          <input v-model="draft.product_gtin" type="text" class="ep-input ep-mono" placeholder="—" />
        </div>

        <div class="ep-field ep-col-2">
          <label class="ep-label">{{ $t('Button / product URL') }}</label>
          <input v-model="draft.button_url" type="text" class="ep-input ep-mono" placeholder="https://…" />
        </div>

        <div class="ep-field ep-col-2">
          <label class="ep-label">{{ $t('Short description') }}</label>
          <textarea v-model="draft.short_description" rows="2" class="ep-input" />
        </div>

        <div class="ep-field ep-col-2">
          <label class="ep-label">{{ $t('Full description') }}</label>
          <textarea v-model="draft.description" rows="4" class="ep-input" />
        </div>
      </div>

      <p v-if="errorMsg" class="ep-error">{{ errorMsg }}</p>
    </div>

    <template #footer>
      <span v-if="dirty" class="ep-dirty mr-auto">{{ $t('Unsaved changes') }}</span>
      <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('Cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="saving || !dirty" @click="save">
        {{ saving ? $t('Saving…') : $t('Save changes') }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useProductSyncStore, type SourceProduct, type SourceProductPatch, type FolderImage } from '@/stores/productSync';

const props = defineProps<{ product: SourceProduct }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved', p: SourceProduct): void }>();

const store = useProductSyncStore();

const svg = (p: string) =>
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  star: svg('<path d="M12 2 15 9l7 .5-5.5 4.5L18 21l-6-3.6L6 21l1.5-7L2 9.5 9 9z" fill="currentColor" stroke="none"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
};

const saving = ref(false);
const errorMsg = ref<string | null>(null);

/* ── images ─────────────────────────────────────────────────────────────── */
const images = ref<FolderImage[]>([]);
const imgLoading = ref(true);
const uploading = ref(false);

const loadImages = async () => {
  imgLoading.value = true;
  try { images.value = await store.fetchFolderImages(props.product.id); }
  finally { imgLoading.value = false; }
};
onMounted(loadImages);

const setFeatured = async (img: FolderImage) => {
  if (img.is_feature_image) return;
  const ok = await store.setFeaturedImage(props.product.id, img.id);
  if (ok) images.value = images.value.map((i) => ({ ...i, is_feature_image: i.id === img.id }));
};

const onFiles = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (files.length === 0) return;
  uploading.value = true; errorMsg.value = null;
  try {
    for (const file of files) {
      const makeFeatured = images.value.length === 0;
      const row = await store.uploadFolderImage(props.product.id, file, makeFeatured);
      if (!row) { errorMsg.value = store.error || 'Upload failed.'; break; }
    }
    await loadImages();
  } finally { uploading.value = false; }
};

const removeImage = async (img: FolderImage) => {
  if (!window.confirm('Remove this image? This cannot be undone.')) return;
  const ok = await store.deleteFolderImage(img, props.product.id);
  if (ok) images.value = images.value.filter((i) => i.id !== img.id);
  else errorMsg.value = store.error || 'Could not remove image.';
};

const EDITABLE: (keyof SourceProductPatch)[] = [
  'name', 'product_slug', 'sku', 'product_price', 'product_category',
  'product_type', 'product_gtin', 'button_url', 'short_description', 'description',
];

const initial = (): Record<string, string> => {
  const o: Record<string, string> = {};
  for (const k of EDITABLE) o[k] = (props.product[k] ?? '') as string;
  return o;
};

const draft = reactive<Record<string, string>>(initial());
const baseline = initial();

const categories = computed(() => {
  const set = new Set<string>();
  for (const p of store.sourceProducts) if (p.product_category) set.add(p.product_category);
  return [...set].sort();
});

const dirty = computed(() => EDITABLE.some((k) => (draft[k] ?? '').trim() !== (baseline[k] ?? '').trim()));

const save = async () => {
  saving.value = true; errorMsg.value = null;
  const patch: SourceProductPatch = {};
  for (const k of EDITABLE) {
    const v = (draft[k] ?? '').trim();
    if (v !== (baseline[k] ?? '').trim()) (patch as Record<string, string | null>)[k] = v === '' ? null : v;
  }
  try {
    const updated = await store.updateSourceProduct(props.product.id, patch);
    if (!updated) { errorMsg.value = store.error || 'Could not save product.'; return; }
    emit('saved', updated);
    emit('close');
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.ep { display: flex; flex-direction: column; gap: 0.9rem; }
.ep-hint { font-size: 0.78rem; color: var(--text-muted); margin: 0; }
.ep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.ep-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.ep-col-2 { grid-column: 1 / -1; }
.ep-label { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.ep-input { width: 100%; border: 1px solid var(--border); border-radius: 9px; background: var(--card-bg); color: var(--text-main); font-size: 0.85rem; padding: 0.5rem 0.65rem; outline: none; transition: border-color 140ms; }
.ep-input:focus { border-color: var(--primary); }
.ep-mono { font-family: 'Jost Numbers', monospace; }
textarea.ep-input { resize: vertical; line-height: 1.5; }
.ep-error { font-size: 0.82rem; color: #dc2626; padding: 0.55rem 0.7rem; border: 1px solid rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); border-radius: 9px; margin: 0; }
.ep-dirty { font-size: 0.74rem; color: var(--text-muted); align-self: center; }

/* images */
.ep-images { display: flex; flex-direction: column; gap: 0.5rem; }
.ep-images-head { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.ep-images-hint { font-size: 0.72rem; color: var(--text-muted); }
.ep-gallery { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.ep-thumb { position: relative; width: 4.5rem; height: 4.5rem; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); background: var(--soft-bg); padding: 0; cursor: pointer; transition: border-color 140ms, box-shadow 140ms; }
.ep-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ep-thumb:hover { border-color: var(--primary); }
.ep-thumb--feat { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary) inset; cursor: default; }
.ep-thumb-badge { position: absolute; top: 3px; left: 3px; display: inline-flex; align-items: center; justify-content: center; width: 1.1rem; height: 1.1rem; border-radius: 5px; background: var(--primary); color: #fff; }
.ep-thumb-badge .ep-ico :deep(svg) { width: 11px; height: 11px; }
.ep-thumb-x { position: absolute; top: 2px; right: 2px; width: 1.1rem; height: 1.1rem; display: flex; align-items: center; justify-content: center; border-radius: 5px; background: rgba(0,0,0,0.55); color: #fff; font-size: 0.9rem; line-height: 1; opacity: 0; transition: opacity 140ms; }
.ep-thumb:hover .ep-thumb-x { opacity: 1; }
.ep-thumb--add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.15rem; border-style: dashed; color: var(--text-muted); }
.ep-thumb--add:hover { color: var(--primary); }
.ep-thumb--busy { cursor: progress; }
.ep-file { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.ep-file:disabled { cursor: progress; }
.ep-add-ico :deep(svg) { width: 18px; height: 18px; }
.ep-add-lbl { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.ep-ico { display: inline-flex; }
.ep-spinner { width: 1.1rem; height: 1.1rem; border: 2px solid var(--primary); border-top-color: transparent; border-radius: 50%; animation: ep-rot 0.8s linear infinite; }
@keyframes ep-rot { to { transform: rotate(360deg); } }
.ep-images-loading { font-size: 0.74rem; color: var(--text-muted); margin: 0; }

@media (max-width: 620px) { .ep-grid { grid-template-columns: 1fr; } .ep-col-2 { grid-column: auto; } }
@media (prefers-reduced-motion: reduce) { .ep-spinner { animation: none; } }
</style>
