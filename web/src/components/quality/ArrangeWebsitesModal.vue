<template>
  <Modal
    :open="open"
    :title="title"
    subtitle="Move websites in or out of this class folder. Each website can only belong to one folder."
    size="xl"
    @close="$emit('close')"
  >
    <div class="aw-body">
      <!-- Filters row (shared by both panes) -->
      <div class="aw-filters">
        <div class="aw-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" type="search" placeholder="Search by name or domain…" />
        </div>
        <select v-model="creatorFilter" class="aw-select">
          <option value="all">All creators</option>
          <option v-for="m in creators" :key="m.id" :value="m.id">
            {{ m.fullName || m.email }}
          </option>
        </select>
        <select v-model="typeFilter" class="aw-select">
          <option value="all">All website types</option>
          <option v-for="t in websiteTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <!-- Two-pane mover -->
      <div class="aw-panes">
        <!-- Available pane -->
        <section class="aw-pane">
          <header class="aw-pane-head">
            <div>
              <h3>Available websites</h3>
              <p>Not in this folder.</p>
            </div>
            <span class="aw-count">{{ filteredAvailable.length }}</span>
          </header>

          <div class="aw-list-wrap">
            <div v-if="filteredAvailable.length === 0" class="aw-empty">
              {{ availableMaster.length === 0
                ? 'Every saved website already belongs to a folder.'
                : 'No websites match these filters.' }}
            </div>

            <ul v-else class="aw-list">
              <li
                v-for="w in filteredAvailable"
                :key="w.id"
                class="aw-item"
                :class="{ 'aw-item--checked': availableSelection.has(w.id) }"
                @click="toggleAvailable(w.id)"
              >
                <input
                  type="checkbox"
                  :checked="availableSelection.has(w.id)"
                  class="aw-check"
                  @click.stop
                  @change="toggleAvailable(w.id)"
                />
                <img v-if="w.faviconUrl" :src="w.faviconUrl" :alt="w.name" class="aw-favicon" loading="lazy" />
                <span v-else class="aw-favicon aw-favicon--fallback">{{ initials(w.name) }}</span>
                <div class="aw-item-main">
                  <span class="aw-item-name">{{ w.name || 'Untitled' }}</span>
                  <span v-if="w.domain" class="aw-item-domain">{{ w.domain }}</span>
                  <div class="aw-item-meta">
                    <span v-if="w.websiteType">{{ w.websiteType }}</span>
                    <span v-if="memberName(w.createdBy)">· by {{ memberName(w.createdBy) }}</span>
                    <span v-if="currentClassOf(w.id)" class="aw-item-class">
                      · in <strong>{{ classNameOf(currentClassOf(w.id)!) }}</strong>
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <!-- Mover controls -->
        <div class="aw-mover">
          <button
            type="button"
            class="aw-mover-btn"
            :disabled="busy || availableSelection.size === 0"
            title="Add selected to this folder"
            @click="moveIntoFolder"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <span>Add</span>
            <span v-if="availableSelection.size" class="aw-mover-count">{{ availableSelection.size }}</span>
          </button>
          <button
            type="button"
            class="aw-mover-btn aw-mover-btn--ghost"
            :disabled="busy || insideSelection.size === 0"
            title="Remove selected from this folder"
            @click="moveOutOfFolder"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="12 5 5 12 12 19"/>
              <line x1="19" y1="12" x2="5" y2="12"/>
            </svg>
            <span>Remove</span>
            <span v-if="insideSelection.size" class="aw-mover-count">{{ insideSelection.size }}</span>
          </button>
        </div>

        <!-- Inside-folder pane -->
        <section class="aw-pane">
          <header class="aw-pane-head">
            <div>
              <h3>In this folder</h3>
              <p>{{ folderLabel }}</p>
            </div>
            <span class="aw-count">{{ filteredInside.length }}</span>
          </header>

          <div class="aw-list-wrap">
            <div v-if="filteredInside.length === 0" class="aw-empty">
              {{ insideMaster.length === 0
                ? 'No websites in this folder yet — pick some on the left.'
                : 'No websites match these filters.' }}
            </div>

            <ul v-else class="aw-list">
              <li
                v-for="w in filteredInside"
                :key="w.id"
                class="aw-item"
                :class="{ 'aw-item--checked': insideSelection.has(w.id) }"
                @click="toggleInside(w.id)"
              >
                <input
                  type="checkbox"
                  :checked="insideSelection.has(w.id)"
                  class="aw-check"
                  @click.stop
                  @change="toggleInside(w.id)"
                />
                <img v-if="w.faviconUrl" :src="w.faviconUrl" :alt="w.name" class="aw-favicon" loading="lazy" />
                <span v-else class="aw-favicon aw-favicon--fallback">{{ initials(w.name) }}</span>
                <div class="aw-item-main">
                  <span class="aw-item-name">{{ w.name || 'Untitled' }}</span>
                  <span v-if="w.domain" class="aw-item-domain">{{ w.domain }}</span>
                  <div class="aw-item-meta">
                    <span v-if="w.websiteType">{{ w.websiteType }}</span>
                    <span v-if="memberName(w.createdBy)">· by {{ memberName(w.createdBy) }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <div v-if="err" class="aw-error">{{ err }}</div>
    </div>

    <template #footer>
      <div class="aw-footer">
        <span class="aw-footer-hint">
          Changes save immediately. Each website belongs to one folder at a time.
        </span>
        <button class="btn-ghost" type="button" @click="$emit('close')">Done</button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useDataStore, type Website } from '@/stores/data';
import { useQualityCheckStore } from '@/stores/qualityCheck';

const props = defineProps<{
  open: boolean;
  /**
   * The class folder being arranged. `null` means the "Unclassified" pseudo-folder
   * (websites with no class). For Unclassified, the "Add" direction is disabled —
   * you can only remove websites *from* other folders into Unclassified by opening
   * the other folder's modal. The right pane still shows the unassigned websites.
   */
  classId: string | null;
}>();
defineEmits<{ (e: 'close'): void }>();

const data = useDataStore();
const qc   = useQualityCheckStore();

const busy = ref(false);
const err  = ref('');

const availableSelection = ref<Set<string>>(new Set());
const insideSelection    = ref<Set<string>>(new Set());

// Reset selections + filters whenever the modal opens or the target folder changes
watch(
  () => [props.open, props.classId] as const,
  ([o]) => {
    if (o) {
      availableSelection.value = new Set();
      insideSelection.value    = new Set();
      search.value        = '';
      creatorFilter.value = 'all';
      typeFilter.value    = 'all';
      err.value           = '';
    }
  },
  { immediate: true }
);

// ── Folder label ──────────────────────────────────────────────────────────
const title = computed(() => {
  if (props.classId === null) return 'Unclassified websites';
  const c = qc.classes.find((x) => x.id === props.classId);
  return c ? `Arrange — ${c.name}` : 'Arrange websites';
});
const folderLabel = computed(() => {
  if (props.classId === null) return 'Websites with no class folder';
  const c = qc.classes.find((x) => x.id === props.classId);
  return c?.name ?? 'This folder';
});
const classNameOf = (id: string) =>
  qc.classes.find((c) => c.id === id)?.name ?? 'another folder';
const currentClassOf = (websiteId: string): string | null => {
  // Prefer the live Website.qualityClassId; fall back to the cached map.
  const w = data.websites.find((x) => x.id === websiteId);
  if (w) return w.qualityClassId;
  return qc.classOf(websiteId);
};

// ── Master partitioning (before filters) ─────────────────────────────────
const insideMaster = computed<Website[]>(() => {
  if (props.classId === null) {
    return data.websites.filter((w) => !w.qualityClassId);
  }
  return data.websites.filter((w) => w.qualityClassId === props.classId);
});
const availableMaster = computed<Website[]>(() => {
  if (props.classId === null) {
    // For the Unclassified view, "available" = everything currently inside any folder
    return data.websites.filter((w) => !!w.qualityClassId);
  }
  return data.websites.filter((w) => w.qualityClassId !== props.classId);
});

// ── Filters ──────────────────────────────────────────────────────────────
const search        = ref('');
const creatorFilter = ref<'all' | string>('all');
const typeFilter    = ref<'all' | string>('all');

const creators = computed(() => {
  const ids = new Set<string>();
  data.websites.forEach((w) => { if (w.createdBy) ids.add(w.createdBy); });
  return data.members.filter((m) => ids.has(m.id));
});
const websiteTypes = computed(() => {
  const set = new Set<string>();
  data.websites.forEach((w) => { if (w.websiteType) set.add(w.websiteType); });
  return Array.from(set).sort();
});

const applyFilters = (list: Website[]) => {
  const q = search.value.trim().toLowerCase();
  return list.filter((w) => {
    if (creatorFilter.value !== 'all' && w.createdBy !== creatorFilter.value) return false;
    if (typeFilter.value    !== 'all' && w.websiteType !== typeFilter.value)  return false;
    if (!q) return true;
    return (w.name   || '').toLowerCase().includes(q)
        || (w.domain || '').toLowerCase().includes(q);
  });
};
const filteredAvailable = computed(() => applyFilters(availableMaster.value));
const filteredInside    = computed(() => applyFilters(insideMaster.value));

// ── Selection toggles ────────────────────────────────────────────────────
const toggleAvailable = (id: string) => {
  const next = new Set(availableSelection.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  availableSelection.value = next;
};
const toggleInside = (id: string) => {
  const next = new Set(insideSelection.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  insideSelection.value = next;
};

// ── Move actions ─────────────────────────────────────────────────────────
const moveIntoFolder = async () => {
  if (props.classId === null) {
    err.value = 'Open a real class folder to move websites into it.';
    return;
  }
  const ids = Array.from(availableSelection.value);
  if (ids.length === 0) return;
  busy.value = true;
  err.value = '';
  try {
    // Mirror into the local Website objects so the panes update instantly,
    // then push the change to Supabase + the QC website→class map.
    const updated = await qc.setWebsiteClassBulk(ids, props.classId);
    if (!updated) { err.value = qc.error || 'Could not move websites.'; return; }
    data.websites = data.websites.map((w) =>
      ids.includes(w.id) ? { ...w, qualityClassId: props.classId } : w
    );
    availableSelection.value = new Set();
  } finally {
    busy.value = false;
  }
};

const moveOutOfFolder = async () => {
  const ids = Array.from(insideSelection.value);
  if (ids.length === 0) return;
  busy.value = true;
  err.value = '';
  try {
    // Removing from a folder always means setting class to null. From the
    // Unclassified pseudo-folder, "remove" still means "set to null", which
    // is a no-op — so we just clear the selection in that case.
    if (props.classId === null) {
      insideSelection.value = new Set();
      return;
    }
    const ok = await qc.setWebsiteClassBulk(ids, null);
    if (!ok) { err.value = qc.error || 'Could not remove websites.'; return; }
    data.websites = data.websites.map((w) =>
      ids.includes(w.id) ? { ...w, qualityClassId: null } : w
    );
    insideSelection.value = new Set();
  } finally {
    busy.value = false;
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────
const memberName = (id: string | null | undefined) => {
  if (!id) return '';
  const m = data.members.find((x) => x.id === id);
  return m?.fullName || m?.email || '';
};
const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';
</script>

<style scoped>
.aw-body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 60vh;
}

/* Filters */
.aw-filters {
  display: grid;
  grid-template-columns: minmax(14rem, 2fr) 1fr 1fr;
  gap: 0.55rem;
}
@media (max-width: 720px) {
  .aw-filters { grid-template-columns: 1fr; }
}
.aw-search { position: relative; }
.aw-search svg {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--text-muted);
  transform: translateY(-50%);
}
.aw-search input,
.aw-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.82rem;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.aw-search input { padding-left: 2rem; }
.aw-search input:focus,
.aw-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

/* Panes */
.aw-panes {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.6rem;
  min-height: 0;
  flex: 1;
}
@media (max-width: 820px) {
  .aw-panes { grid-template-columns: 1fr; }
}
.aw-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  overflow: hidden;
}
.aw-pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg));
}
.aw-pane-head h3 {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.86rem;
  font-weight: 850;
  color: var(--text-main);
}
.aw-pane-head p {
  margin: 0.1rem 0 0;
  font-size: 0.72rem;
  color: var(--text-muted);
}
.aw-count {
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  color: var(--primary);
  padding: 0.18rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 900;
}

.aw-list-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  min-height: 18rem;
  max-height: 50vh;
}
.aw-empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  padding: 1.25rem;
  text-align: center;
  font-size: 0.82rem;
}
.aw-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.aw-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 0.6rem;
  background: var(--card-bg);
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.aw-item:hover { border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); }
.aw-item--checked {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}
.aw-check {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
}
.aw-favicon {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--soft-bg);
  border: 1px solid var(--border);
}
.aw-favicon--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
  color: var(--primary);
}
.aw-item-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.aw-item-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.aw-item-domain {
  font-size: 0.72rem;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.aw-item-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.15rem;
}
.aw-item-class strong { color: var(--text-main); font-weight: 700; }

/* Mover column */
.aw-mover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
}
@media (max-width: 820px) {
  .aw-mover { flex-direction: row; padding: 0.25rem 0; }
}
.aw-mover-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 140ms ease, transform 140ms ease;
}
.aw-mover-btn:hover:not(:disabled) { transform: translateY(-1px); }
.aw-mover-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.aw-mover-btn--ghost {
  background: transparent;
  color: var(--text-main);
  border-color: var(--border);
}
.aw-mover-count {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  font-size: 0.7rem;
}
.aw-mover-btn--ghost .aw-mover-count {
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  color: var(--primary);
}

.aw-error {
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 600;
}
.aw-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}
.aw-footer-hint { font-size: 0.74rem; color: var(--text-muted); }
</style>
