<template>
  <div class="sync-page">
    <PageHeader :title="$t('Sync Settings')" subtitle="Performance and safety tuning for the product sync orchestrator." />

    <div v-if="store.error" class="card card-pad sync-error-card">{{ store.error }}</div>

    <p v-if="loading" class="text-text-muted text-sm">{{ $t('Loading…') }}</p>
    <div v-else-if="!store.settings" class="card card-pad text-status-needs-fix-fg text-sm">
      {{ $t('Settings row not found. Run the product_sync migration.') }}
    </div>
    <div v-else class="card card-pad sync-settings-card">
      <div class="ss-grid">
        <div>
          <FormInput v-model.number="form.batch_size" type="number" :label="$t('Batch size')" />
          <p class="ss-hint">{{ $t('Products per HTTP request to a website. Lower = safer for small servers.') }}</p>
        </div>
        <div>
          <FormInput v-model.number="form.concurrency" type="number" :label="$t('Website concurrency')" />
          <p class="ss-hint">{{ $t('How many websites are pushed to in parallel.') }}</p>
        </div>
        <div>
          <FormInput v-model.number="form.request_timeout_s" type="number" :label="$t('Request timeout (seconds)')" />
          <p class="ss-hint">{{ $t('Per request to a receiver.') }}</p>
        </div>
        <div>
          <label class="ss-label">{{ $t('Compress images') }}</label>
          <label class="ss-toggle">
            <input type="checkbox" v-model="form.compress_images" />
            <span>{{ $t('Hint receivers to recompress images (GD).') }}</span>
          </label>
        </div>
      </div>
      <div class="mt-5">
        <button type="button" class="btn-primary" :disabled="saving" @click="save">{{ saving ? $t('Saving…') : $t('Save settings') }}</button>
      </div>
    </div>

    <p v-if="toast" class="sync-toast">{{ toast }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import FormInput from '@/components/ui/FormInput.vue';
import { useProductSyncStore } from '@/stores/productSync';

const store = useProductSyncStore();
const loading = ref(true);
const saving = ref(false);
const toast = ref<string | null>(null);

const form = reactive({ batch_size: 5, concurrency: 3, request_timeout_s: 60, compress_images: true });

const sync = () => {
  if (!store.settings) return;
  form.batch_size = store.settings.batch_size;
  form.concurrency = store.settings.concurrency;
  form.request_timeout_s = store.settings.request_timeout_s;
  form.compress_images = store.settings.compress_images;
};

watch(() => store.settings, sync);

onMounted(async () => {
  try { await store.fetchSettings(); sync(); } finally { loading.value = false; }
});

const save = async () => {
  saving.value = true;
  try {
    const ok = await store.updateSettings({
      batch_size: Number(form.batch_size) || 1,
      concurrency: Number(form.concurrency) || 1,
      request_timeout_s: Number(form.request_timeout_s) || 60,
      compress_images: form.compress_images,
    });
    if (ok) { toast.value = 'Settings saved.'; setTimeout(() => (toast.value = null), 2500); }
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.sync-page { display: flex; flex-direction: column; gap: 1.1rem; }
.sync-error-card { border: 1px solid rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); color: #dc2626; font-size: 0.85rem; }
.sync-settings-card { max-width: 42rem; }
.ss-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
.ss-hint { font-size: 0.72rem; color: var(--text-muted); margin: 0.35rem 0 0; }
.ss-label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.4rem; }
.ss-toggle { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; color: var(--text-muted); cursor: pointer; }
.sync-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-size: 0.85rem; color: var(--text-main); }
@media (max-width: 720px) { .ss-grid { grid-template-columns: 1fr; } }
</style>
