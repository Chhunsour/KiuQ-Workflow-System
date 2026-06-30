<template>
  <div>
    <PageHeader
      title="Messages"
      subtitle="Contact & quote requests sent in from connected websites."
    >
      <template #actions>
        <button class="btn-secondary" type="button" @click="fetchMessages">
          Refresh
        </button>
      </template>
    </PageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="f in filters"
          :key="f"
          type="button"
          class="ui-font rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          :class="statusFilter === f ? 'bg-primary text-white' : 'bg-soft text-text-muted hover:text-text-main'"
          @click="statusFilter = f"
        >
          {{ labelFor(f) }} ({{ counts[f] }})
        </button>
      </div>
      <input
        v-model="search"
        class="input max-w-xs"
        type="search"
        placeholder="Search name, email, message..."
      />
    </div>

    <LoadingBlock :loading="loading" :error="error" :retry="fetchMessages">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="m in filtered"
          :key="m.id"
          type="button"
          class="card card-pad flex flex-col text-left"
          :class="m.status === 'new' ? 'ring-1 ring-primary/30' : ''"
          @click="openDetail(m)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">
              {{ m.website }}
            </span>
            <span class="ui-font rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(m.status)">
              {{ m.status }}
            </span>
          </div>
          <h3 class="mt-3 ui-font text-base font-semibold text-text-main">
            {{ m.name || m.email || 'Website visitor' }}
          </h3>
          <p class="mt-0.5 text-xs text-text-muted">
            {{ m.product_interest || m.interest_type || 'General enquiry' }}
            · {{ m.source === 'chat' ? 'Chat' : 'Form' }}
          </p>
          <p v-if="m.message" class="mt-2 line-clamp-2 flex-1 text-sm text-text-main">{{ m.message }}</p>
          <p class="mt-3 text-xs text-text-muted">{{ formatDate(m.created_at) }}</p>
        </button>
      </div>

      <EmptyState
        v-if="filtered.length === 0"
        :title="messages.length === 0 ? 'No messages yet' : 'No messages match this filter'"
        description="Customer enquiries from your connected websites will appear here."
      />
    </LoadingBlock>

    <Modal :open="!!selected" :title="selected?.name || 'Message'" size="md" @close="selected = null">
      <div v-if="selected" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Website" :value="selected.website" />
          <Detail label="Received" :value="formatDate(selected.created_at)" />
          <Detail label="Email" :value="selected.email" />
          <Detail label="Phone" :value="selected.phone" />
          <Detail label="Company" :value="selected.company" />
          <Detail label="Interest" :value="selected.product_interest || selected.interest_type" />
          <Detail label="Source" :value="selected.source === 'chat' ? 'Chat assistant' : 'Contact form'" />
          <Detail label="Location" :value="selected.location" />
        </div>
        <div v-if="selected.product_url">
          <p class="ui-font text-xs uppercase tracking-wide text-text-muted">Product</p>
          <a :href="selected.product_url" target="_blank" rel="noreferrer" class="text-sm text-primary hover:underline break-all">
            {{ selected.product_interest || selected.product_url }}
          </a>
        </div>
        <div v-if="selected.message">
          <p class="ui-font text-xs uppercase tracking-wide text-text-muted">Message</p>
          <p class="mt-1 whitespace-pre-line text-sm text-text-main">{{ selected.message }}</p>
        </div>
        <div v-if="selected.transcript_summary">
          <p class="ui-font text-xs uppercase tracking-wide text-text-muted">Chat summary</p>
          <p class="mt-1 whitespace-pre-line text-sm text-text-main">{{ selected.transcript_summary }}</p>
        </div>
      </div>
      <template #footer>
        <a v-if="selected?.email" class="btn-secondary" :href="`mailto:${selected.email}`">Reply by email</a>
        <button v-if="selected && selected.status !== 'read'" class="btn-ghost" :disabled="busy" @click="setStatus(selected, 'read')">Mark read</button>
        <button v-if="selected && selected.status !== 'archived'" class="btn-ghost" :disabled="busy" @click="setStatus(selected, 'archived')">Archive</button>
        <button v-if="selected" class="btn-danger" :disabled="busy" @click="remove(selected)">Delete</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, type FunctionalComponent } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import { supabase } from '@/lib/supabase';

type Status = 'new' | 'read' | 'archived';

interface WebsiteMessage {
  id: string;
  created_at: string;
  website: string;
  source: string;
  source_page: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  language: string | null;
  interest_type: string | null;
  product_interest: string | null;
  product_url: string | null;
  message: string | null;
  transcript_summary: string | null;
  status: Status;
}

/** Tiny inline label/value cell for the detail modal. */
const Detail: FunctionalComponent<{ label: string; value?: string | null }> = (props) =>
  props.value
    ? h('div', [
        h('p', { class: 'ui-font text-xs uppercase tracking-wide text-text-muted' }, props.label),
        h('p', { class: 'text-text-main break-words' }, props.value)
      ])
    : null;

const messages = ref<WebsiteMessage[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const busy = ref(false);
const search = ref('');
const statusFilter = ref<'all' | Status>('all');
const selected = ref<WebsiteMessage | null>(null);

const filters: Array<'all' | Status> = ['all', 'new', 'read', 'archived'];
const labelFor = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);

const counts = computed(() => {
  const c: Record<string, number> = { all: messages.value.length, new: 0, read: 0, archived: 0 };
  for (const m of messages.value) c[m.status] = (c[m.status] ?? 0) + 1;
  return c;
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return messages.value
    .filter((m) => statusFilter.value === 'all' || m.status === statusFilter.value)
    .filter((m) => {
      if (!q) return true;
      return [m.name, m.email, m.phone, m.company, m.product_interest, m.message]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
});

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusClass = (s: Status) =>
  s === 'new'
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    : s === 'read'
      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
      : 'bg-soft text-text-muted';

async function fetchMessages() {
  loading.value = true;
  error.value = null;
  const { data, error: err } = await supabase
    .from('website_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (err) {
    error.value = err.message;
  } else {
    messages.value = (data ?? []) as WebsiteMessage[];
  }
  loading.value = false;
}

const openDetail = (m: WebsiteMessage) => {
  selected.value = m;
  if (m.status === 'new') setStatus(m, 'read');
};

async function setStatus(m: WebsiteMessage, status: Status) {
  busy.value = true;
  const { error: err } = await supabase
    .from('website_messages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', m.id);
  if (!err) {
    m.status = status;
    if (selected.value?.id === m.id) selected.value = { ...m };
  }
  busy.value = false;
}

async function remove(m: WebsiteMessage) {
  if (!confirm('Delete this message permanently?')) return;
  busy.value = true;
  const { error: err } = await supabase.from('website_messages').delete().eq('id', m.id);
  if (!err) {
    messages.value = messages.value.filter((x) => x.id !== m.id);
    selected.value = null;
  }
  busy.value = false;
}

onMounted(fetchMessages);
</script>
