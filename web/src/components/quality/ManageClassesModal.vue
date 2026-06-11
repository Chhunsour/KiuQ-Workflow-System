<template>
  <Modal :open="open" title="Manage Class Folders" size="md" @close="$emit('close')">
    <div class="mc-body">
      <p class="mc-hint">
        Organize your websites into class folders (e.g. <em>Class A</em>, <em>Product Landings</em>,
        <em>Urgent Fixes</em>). Each website belongs to one class.
      </p>

      <!-- Existing classes -->
      <div v-if="qc.classes.length === 0" class="mc-empty">No class folders yet — create your first below.</div>
      <ul v-else class="mc-list">
        <li v-for="c in qc.classes" :key="c.id" class="mc-row">
          <span class="mc-swatch" :style="{ background: c.color }" />
          <input
            :value="c.name"
            class="mc-input mc-name-input"
            @change="(e) => rename(c.id, (e.target as HTMLInputElement).value)"
          />
          <input
            type="color"
            :value="c.color"
            class="mc-color-input"
            @change="(e) => recolor(c.id, (e.target as HTMLInputElement).value)"
            title="Pick a color"
          />
          <button
            type="button"
            class="mc-delete-btn"
            :disabled="busyId === c.id"
            @click="remove(c.id, c.name)"
            title="Delete class"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 17.39 19.4A2 2 0 0 1 15.39 21H8.61A2 2 0 0 1 6.61 19.4L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </li>
      </ul>

      <!-- Create new -->
      <div class="mc-create">
        <span class="mc-label">New class folder</span>
        <div class="mc-create-row">
          <input
            v-model="newName"
            type="text"
            class="mc-input"
            placeholder="e.g. Class A Websites"
            @keyup.enter="create"
          />
          <input
            v-model="newColor"
            type="color"
            class="mc-color-input"
            title="Pick a color"
          />
          <button class="btn-primary mc-create-btn" type="button" :disabled="creating || !newName.trim()" @click="create">
            {{ creating ? 'Creating…' : 'Add' }}
          </button>
        </div>
      </div>

      <div v-if="err" class="mc-error">{{ err }}</div>
    </div>

    <template #footer>
      <div class="mc-footer">
        <button class="btn-ghost" type="button" @click="$emit('close')">Done</button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useQualityCheckStore } from '@/stores/qualityCheck';

defineProps<{ open: boolean }>();
defineEmits<{ (e: 'close'): void }>();

const qc = useQualityCheckStore();

const newName  = ref('');
const newColor = ref('#15D6C2');
const creating = ref(false);
const busyId   = ref<string | null>(null);
const err      = ref('');

const create = async () => {
  if (!newName.value.trim()) return;
  creating.value = true;
  err.value = '';
  try {
    const cls = await qc.createClass({ name: newName.value, color: newColor.value });
    if (cls) { newName.value = ''; newColor.value = '#15D6C2'; }
    else err.value = qc.error || 'Could not create class.';
  } finally {
    creating.value = false;
  }
};

const rename = async (id: string, name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return;
  busyId.value = id;
  err.value = '';
  try {
    const ok = await qc.updateClass(id, { name: trimmed });
    if (!ok) err.value = qc.error || 'Could not rename.';
  } finally {
    busyId.value = null;
  }
};

const recolor = async (id: string, color: string) => {
  busyId.value = id;
  err.value = '';
  try {
    const ok = await qc.updateClass(id, { color });
    if (!ok) err.value = qc.error || 'Could not change color.';
  } finally {
    busyId.value = null;
  }
};

const remove = async (id: string, name: string) => {
  if (!window.confirm(`Delete "${name}"? Websites in this class will become unclassified.`)) return;
  busyId.value = id;
  err.value = '';
  try {
    const ok = await qc.deleteClass(id);
    if (!ok) err.value = qc.error || 'Could not delete.';
  } finally {
    busyId.value = null;
  }
};
</script>

<style scoped>
.mc-body { display: flex; flex-direction: column; gap: 0.85rem; }
.mc-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5; }
.mc-empty {
  text-align: center;
  font-size: 0.84rem;
  color: var(--text-muted);
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 1rem;
}
.mc-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.mc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
}
.mc-swatch {
  width: 1rem;
  height: 1rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.mc-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
  font-family: inherit;
}
.mc-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.mc-name-input { flex: 1; }
.mc-color-input {
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  padding: 0;
}
.mc-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 140ms, border-color 140ms;
}
.mc-delete-btn:hover { color: #dc2626; border-color: rgba(220,38,38,0.45); }
.mc-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.mc-create {
  margin-top: 0.4rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.mc-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.mc-create-row { display: flex; gap: 0.5rem; align-items: center; }
.mc-create-row .mc-input { flex: 1; }
.mc-create-btn { white-space: nowrap; }

.mc-error {
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 600;
}
.mc-footer { display: flex; justify-content: flex-end; width: 100%; }
</style>
