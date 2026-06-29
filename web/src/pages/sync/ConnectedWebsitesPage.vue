<template>
  <div class="sync-page">
    <PageHeader
      :title="$t('Connected Websites')"
      subtitle="E-commerce framework sites that receive product data pushed from the master catalog."
    >
      <template #actions>
        <button type="button" class="btn-primary" @click="openNew">+ {{ $t('Add website') }}</button>
      </template>
    </PageHeader>

    <div v-if="store.error" class="card card-pad sync-error-card">{{ store.error }}</div>

    <div v-if="store.loading && store.websites.length === 0" class="card card-pad text-text-muted">{{ $t('Loading…') }}</div>

    <EmptyState
      v-else-if="store.websites.length === 0"
      :title="$t('No websites yet')"
      :description="$t('Add your first e-commerce framework site to start pushing products to it.')"
    />

    <div v-else class="card sync-table-wrap">
      <table class="sync-table">
        <thead>
          <tr>
            <th>{{ $t('Website') }}</th>
            <th>{{ $t('Endpoint') }}</th>
            <th>{{ $t('Secret') }}</th>
            <th>{{ $t('Status') }}</th>
            <th>{{ $t('Last sync') }}</th>
            <th class="text-right">{{ $t('Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in store.websites" :key="w.id">
            <td>
              <p class="sync-strong">{{ w.name }}</p>
              <p class="sync-mono">{{ w.domain }}</p>
              <p class="sync-platform">{{ w.platform }}</p>
            </td>
            <td class="sync-mono sync-endpoint">{{ w.sync_endpoint }}</td>
            <td>
              <div class="flex items-center gap-2">
                <code class="sync-mono">{{ reveal === w.id ? w.secret_token : '••••••••' }}</code>
                <button type="button" class="link-btn" @click="reveal = reveal === w.id ? null : w.id">
                  {{ reveal === w.id ? $t('hide') : $t('show') }}
                </button>
                <button type="button" class="link-btn" @click="copyToken(w.secret_token)">{{ $t('copy') }}</button>
              </div>
            </td>
            <td>
              <button type="button" @click="toggleActive(w)" :title="$t('Toggle active')">
                <SyncBadge :status="w.active ? 'active' : 'inactive'" />
              </button>
              <div v-if="w.last_status" class="mt-1"><SyncBadge :status="w.last_status" /></div>
            </td>
            <td class="sync-muted">{{ formatDateTime(w.last_sync_at) }}</td>
            <td>
              <div class="sync-actions">
                <button type="button" class="btn-secondary sync-btn" :disabled="testingId === w.id" @click="test(w)">
                  {{ testingId === w.id ? $t('Testing…') : $t('Test') }}
                </button>
                <button type="button" class="btn-secondary sync-btn" @click="overridesFor = w">{{ $t('Overrides') }}</button>
                <button type="button" class="btn-secondary sync-btn" @click="openEdit(w)">{{ $t('Edit') }}</button>
                <button type="button" class="btn-danger sync-btn" @click="remove(w)">{{ $t('Delete') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add / edit website -->
    <Modal v-if="editing" :open="true" :title="editingExisting ? $t('Edit website') : $t('Add website')" size="lg" @close="editing = null">
      <div class="wf">
        <div class="wf-grid">
          <FormInput v-model="form.name" :label="$t('Website name')" placeholder="Konstructz Store" />
          <FormInput v-model="form.domain" :label="$t('Domain')" placeholder="store.konstructz.com" />
        </div>
        <FormInput v-model="form.sync_endpoint" :label="$t('API sync endpoint')" placeholder="https://store.konstructz.com/api/receiver.php" />
        <div>
          <label class="wf-label">{{ $t('Secret token') }}</label>
          <div class="flex gap-2">
            <FormInput v-model="form.secret_token" class="flex-1" :placeholder="editingExisting ? '' : $t('auto-generated if left blank')" />
            <button type="button" class="btn-secondary" @click="genToken">{{ $t('Generate') }}</button>
          </div>
          <p class="wf-hint">{{ $t("Must match SYNC_TOKEN in the site's sync-config.php.") }}</p>
        </div>
        <div class="wf-grid">
          <FormInput v-model="form.platform" :label="$t('Platform / framework')" placeholder="konstructz-framework" />
          <label class="wf-toggle">
            <input type="checkbox" v-model="form.active" />
            <span>{{ $t('Active — receive syncs') }}</span>
          </label>
        </div>
        <FormTextarea v-model="form.notes" :label="$t('Notes')" :rows="2" />
        <div v-if="formError" class="sync-error-card">{{ formError }}</div>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="editing = null">{{ $t('Cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="saving" @click="save">{{ saving ? $t('Saving…') : $t('Save website') }}</button>
      </template>
    </Modal>

    <OverridesModal v-if="overridesFor" :website="overridesFor" @close="overridesFor = null" />

    <p v-if="toast" class="sync-toast">{{ toast }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import Modal from '@/components/ui/Modal.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import SyncBadge from '@/components/sync/SyncBadge.vue';
import OverridesModal from '@/components/sync/OverridesModal.vue';
import { useProductSyncStore, type ConnectedWebsite, type WebsiteInput } from '@/stores/productSync';

const store = useProductSyncStore();

const editing = ref<ConnectedWebsite | 'new' | null>(null);
const editingExisting = ref(false);
const overridesFor = ref<ConnectedWebsite | null>(null);
const testingId = ref<string | null>(null);
const reveal = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const toast = ref<string | null>(null);

// Concrete string-typed form (avoids null unions from WebsiteInput in v-model).
const form = reactive({
  name: '', domain: '', sync_endpoint: '', secret_token: '', platform: 'konstructz-framework', active: true, notes: '',
});

onMounted(() => { void store.fetchWebsites(); });

const flash = (m: string) => { toast.value = m; setTimeout(() => (toast.value = null), 3500); };

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const resetForm = (w?: ConnectedWebsite) => {
  form.name = w?.name ?? '';
  form.domain = w?.domain ?? '';
  form.sync_endpoint = w?.sync_endpoint ?? '';
  form.secret_token = w?.secret_token ?? '';
  form.platform = w?.platform ?? 'konstructz-framework';
  form.active = w?.active ?? true;
  form.notes = w?.notes ?? '';
};

const openNew = () => { editingExisting.value = false; resetForm(); formError.value = null; editing.value = 'new'; };
const openEdit = (w: ConnectedWebsite) => { editingExisting.value = true; resetForm(w); formError.value = null; editing.value = w; };

const genToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  form.secret_token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const save = async () => {
  if (!form.name?.trim() || !form.domain?.trim() || !form.sync_endpoint?.trim()) {
    formError.value = 'Name, domain and sync endpoint are required.';
    return;
  }
  saving.value = true; formError.value = null;
  try {
    const payload: WebsiteInput = {
      ...form,
      name: form.name.trim(), domain: form.domain.trim(), sync_endpoint: form.sync_endpoint.trim(),
      secret_token: form.secret_token?.trim() || undefined,
    };
    const saved = editing.value && editing.value !== 'new'
      ? await store.updateWebsite(editing.value.id, payload)
      : await store.createWebsite(payload);
    if (saved) { editing.value = null; flash('Website saved.'); }
    else formError.value = store.error;
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (w: ConnectedWebsite) => { await store.updateWebsite(w.id, { active: !w.active }); };

const remove = async (w: ConnectedWebsite) => {
  if (!window.confirm(`Delete "${w.name}"? Its overrides and sync history are removed too.`)) return;
  if (await store.deleteWebsite(w.id)) flash('Website deleted.');
};

const test = async (w: ConnectedWebsite) => {
  testingId.value = w.id;
  try {
    const r = await store.testConnection(w.id);
    if (r.ok && r.response?.ok !== false) {
      const c = r.response?.product_count;
      flash(`✓ Connected to ${w.name}` + (typeof c === 'number' ? ` · ${c} products on site` : ''));
    } else {
      flash(`✗ ${w.name}: ${r.error ?? 'HTTP ' + r.status}`);
    }
  } catch (e) {
    flash(`✗ ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    testingId.value = null;
  }
};

const copyToken = (token: string) => {
  navigator.clipboard?.writeText(token).then(() => flash('Secret token copied.'), () => flash('Could not copy.'));
};
</script>

<style scoped>
.sync-page { display: flex; flex-direction: column; gap: 1.1rem; }
.sync-error-card { border: 1px solid rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); border-radius: 10px; padding: 0.75rem 1rem; color: #dc2626; font-size: 0.85rem; }
.sync-table-wrap { overflow-x: auto; }
.sync-table { width: 100%; border-collapse: collapse; min-width: 56rem; }
.sync-table th, .sync-table td { text-align: left; padding: 0.7rem 0.85rem; font-size: 0.85rem; vertical-align: top; border-bottom: 1px solid var(--border); }
.sync-table thead th { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg)); }
.sync-table tbody tr:last-child td { border-bottom: 0; }
.sync-strong { font-weight: 700; color: var(--text-main); margin: 0; }
.sync-mono { font-family: 'Jost Numbers', monospace; font-size: 0.72rem; color: var(--text-muted); margin: 0; }
.sync-endpoint { max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sync-platform { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0.2rem 0 0; }
.sync-muted { color: var(--text-muted); white-space: nowrap; }
.sync-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; }
.sync-btn { font-size: 0.74rem; padding: 0.3rem 0.6rem; height: auto; }
.link-btn { background: none; border: 0; color: var(--primary); font-size: 0.72rem; cursor: pointer; }
.wf { display: flex; flex-direction: column; gap: 0.85rem; }
.wf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
.wf-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; color: var(--text-muted); margin-bottom: 0.4rem; }
.wf-hint { font-size: 0.72rem; color: var(--text-muted); margin: 0.35rem 0 0; }
.wf-toggle { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: var(--text-main); align-self: end; padding-bottom: 0.5rem; cursor: pointer; }
.sync-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-size: 0.85rem; color: var(--text-main); }
@media (max-width: 720px) { .wf-grid { grid-template-columns: 1fr; } }
</style>
