<template>
  <div class="member-multi-select" ref="selectRef">
    <div 
      class="select-trigger input rounded-xl border-border/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all px-4 py-2 min-h-[46px] cursor-pointer flex flex-wrap gap-2 items-center"
      @click="toggleDropdown"
    >
      <div v-if="selectedIds.length === 0" class="text-text-muted text-sm px-1">Select team members...</div>
      
      <div v-for="id in selectedIds" :key="id" class="member-chip" @click.stop>
        <div class="chip-avatar">
          <img v-if="memberById(id)?.avatarUrl" :src="memberById(id)?.avatarUrl" :alt="memberName(id)" />
          <span v-else>{{ memberInitials(id) }}</span>
        </div>
        <span class="chip-name">{{ memberName(id) }}</span>
        <button type="button" class="chip-remove" @click.stop="removeMember(id)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      
      <div class="flex-1 min-w-[60px]">
        <input 
          v-model="searchQuery" 
          class="bg-transparent border-none outline-none w-full text-sm p-0 focus:ring-0" 
          placeholder="Search..."
          @input="showDropdown = true"
          @keydown.backspace="handleBackspace"
        />
      </div>

      <div class="select-chevron text-text-muted ml-auto">
        <svg :class="{ 'rotate-180': showDropdown }" class="transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>

    <div v-if="showDropdown" class="select-dropdown card shadow-xl border-border/60">
      <div class="dropdown-actions p-2 border-b border-border/40 flex justify-between gap-2">
        <button type="button" class="action-btn text-primary" @click="selectAll">Select All Active</button>
        <button type="button" class="action-btn text-text-muted" @click="clearAll">Clear Selection</button>
      </div>

      <div class="dropdown-list max-h-64 overflow-y-auto">
        <div 
          v-for="member in filteredMembers" 
          :key="member.id" 
          class="member-row" 
          :class="{ 'is-selected': selectedIds.includes(member.id) }"
          @click="toggleMember(member.id)"
        >
          <div class="row-checkbox">
            <div class="checkbox-box" :class="{ 'checked': selectedIds.includes(member.id) }">
              <svg v-if="selectedIds.includes(member.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>

          <div class="row-avatar">
            <div class="avatar-wrapper">
              <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="member.fullName" />
              <span v-else>{{ initials(member.fullName, member.email) }}</span>
              <span class="status-dot" :class="member.currentStatus" />
            </div>
          </div>

          <div class="row-info">
            <div class="info-name">
              {{ member.fullName }}
              <span class="role-badge" :class="member.role">{{ member.role }}</span>
            </div>
            <div class="info-email">{{ member.email }}</div>
          </div>
        </div>

        <div v-if="filteredMembers.length === 0" class="p-8 text-center">
          <div class="text-text-muted text-sm font-medium">No members found.</div>
        </div>
      </div>
    </div>
    
    <div class="mt-1.5 text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wider font-bold">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      You can select multiple members for the same task.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useDataStore, type Member } from '@/stores/data';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits(['update:modelValue']);

const data = useDataStore();
const selectRef = ref<HTMLElement | null>(null);
const showDropdown = ref(false);
const searchQuery = ref('');

const selectedIds = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const activeMembers = computed(() => data.members.filter(m => m.status === 'active' && m.role !== 'admin'));

const filteredMembers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return activeMembers.value;
  return activeMembers.value.filter(m => 
    m.fullName.toLowerCase().includes(query) || 
    m.email.toLowerCase().includes(query)
  );
});

const memberById = (id: string) => data.memberById(id);
const memberName = (id: string) => memberById(id)?.fullName || 'Unknown';
const initials = (name: string, email: string) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};
const memberInitials = (id: string) => {
  const m = memberById(id);
  return m ? initials(m.fullName, m.email) : '??';
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const toggleMember = (id: string) => {
  if (selectedIds.value.includes(id)) {
    removeMember(id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
};

const removeMember = (id: string) => {
  selectedIds.value = selectedIds.value.filter(sid => sid !== id);
};

const handleBackspace = () => {
  if (!searchQuery.value && selectedIds.value.length > 0) {
    removeMember(selectedIds.value[selectedIds.value.length - 1]);
  }
};

const selectAll = () => {
  selectedIds.value = activeMembers.value.map(m => m.id);
};

const clearAll = () => {
  selectedIds.value = [];
};

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  window.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.member-multi-select {
  position: relative;
  width: 100%;
  z-index: 20;
}

.select-trigger {
  background: var(--input-bg);
  border: 1px solid var(--border);
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 0.2rem 0.6rem 0.2rem 0.3rem;
  transition: all 0.2s ease;
}

.member-chip:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--soft-bg));
}

.chip-avatar {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 99px;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
  overflow: hidden;
}

.chip-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chip-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 1px;
  border-radius: 4px;
}

.chip-remove:hover {
  color: var(--status-needs-fix-fg);
  background: var(--status-needs-fix-bg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--card-bg);
  border-radius: 18px;
  overflow: hidden;
}

.action-btn {
  font-size: 0.72rem;
  font-weight: 750;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
}

.action-btn:hover {
  background: var(--soft-bg);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.member-row:hover {
  background: var(--soft-bg);
}

.member-row.is-selected {
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}

.row-checkbox {
  display: flex;
  align-items: center;
}

.checkbox-box {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.checkbox-box.checked {
  background: var(--primary);
  border-color: var(--primary);
}

.row-avatar {
  display: flex;
  align-items: center;
}

.avatar-wrapper {
  position: relative;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 99px;
  background: var(--soft-bg);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  overflow: visible;
}

.avatar-wrapper img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 99px;
  border: 2px solid var(--card-bg);
  background: #94a3b8;
}

.status-dot.online { background: #16a34a; }
.status-dot.away { background: #eab308; }

.row-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.info-name {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-badge {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: var(--soft-bg);
  color: var(--text-muted);
}

.info-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
