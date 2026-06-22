<template>
  <div class="tm-page">
    <PageHeader :title="$t('Members')" subtitle="Your team — roles and contact details." />

    <!-- Toolbar -->
    <div class="tm-toolbar">
      <div class="tm-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input v-model="search" type="search" :placeholder="$t('Search by name, role, or position…')" />
      </div>
      <div class="tm-filters">
        <button
          v-for="opt in roleFilterOptions"
          :key="opt.value"
          type="button"
          class="tm-chip"
          :class="{ 'tm-chip--active': roleFilter === opt.value }"
          @click="roleFilter = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="tm-grid">
      <div v-for="i in 6" :key="i" class="tm-card tm-card--skeleton">
        <span class="tm-skel tm-skel--avatar" />
        <div class="tm-card-body">
          <span class="tm-skel tm-skel--line" />
          <span class="tm-skel tm-skel--line tm-skel--short" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="tm-error">
      <p>{{ error }}</p>
      <button class="btn-primary" type="button" @click="load">{{ $t('Retry') }}</button>
    </div>

    <!-- Content -->
    <div v-else-if="filtered.length > 0" class="tm-layout">
      <!-- Directory grid -->
      <div class="tm-grid">
        <button
          v-for="member in filtered"
          :key="member.id"
          type="button"
          class="tm-card"
          :class="{ 'tm-card--active': selectedMember?.id === member.id }"
          @click="selectMember(member)"
        >
          <span class="tm-card-avatar">
            <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="`${member.fullName || 'Member'} avatar`" class="cursor-pointer transition hover:scale-110" @click.prevent.stop="openPhotoPreview(member)" />
            <span v-else>{{ initials(member.fullName || member.email) }}</span>
          </span>
          <div class="tm-card-body">
            <div class="tm-card-name">{{ member.fullName || 'Unnamed member' }}</div>
            <div v-if="member.username" class="tm-card-username">@{{ member.username }}</div>
            <div class="tm-card-position">{{ member.position || 'No position set' }}</div>
          </div>
          <span class="tm-role-badge" :class="roleBadgeClass(member.role)">{{ roleLabel(member.role) }}</span>
        </button>
      </div>

      <!-- Profile preview panel -->
      <aside v-if="selectedMember" class="tm-profile">
        <div class="tm-profile-hero">
          <span class="tm-profile-avatar">
            <img v-if="selectedMember.avatarUrl" :src="selectedMember.avatarUrl" :alt="`${selectedMember.fullName || 'Member'} avatar`" class="cursor-pointer transition hover:scale-105" @click.prevent.stop="openPhotoPreview(selectedMember)" />
            <span v-else>{{ initials(selectedMember.fullName || selectedMember.email) }}</span>
          </span>
          <h2 class="tm-profile-name">{{ selectedMember.fullName || 'Unnamed member' }}</h2>
          <p v-if="selectedMember.username" class="tm-profile-username">@{{ selectedMember.username }}</p>
          <span class="tm-role-badge tm-role-badge--lg" :class="roleBadgeClass(selectedMember.role)">
            {{ roleLabel(selectedMember.role) }}
          </span>
        </div>

        <p v-if="selectedMember.bio" class="tm-profile-bio">{{ selectedMember.bio }}</p>

        <!-- Profile + contact info (no activity / no online status) -->
        <div class="tm-info">
          <div v-for="item in profileInfo(selectedMember)" :key="item.label" class="tm-info-row">
            <span class="tm-info-icon" v-html="item.icon"></span>
            <span class="tm-info-label">{{ item.label }}</span>
            <span class="tm-info-value">{{ item.value }}</span>
          </div>
        </div>
      </aside>
    </div>

    <EmptyState
      v-else
      :title="$t('No members found')"
      description="Try a different search or role filter."
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { roleBadgeClass, roleLabel, normalizeRole } from '@/lib/roles';
import { useImagePreviewStore } from '@/stores/imagePreview';
const previewStore = useImagePreviewStore();

const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      email: member.email,
      role: member.role
    });
  }
};
import { supabase } from '@/lib/supabase';

interface DirectoryMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string;
  username: string;
  position: string;
  phone: string;
  bio: string;
  createdAt: string;
}

const members = ref<DirectoryMember[]>([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
type RoleBucket = 'all' | 'admin' | 'member' | 'quality_checker';
const roleFilter = ref<RoleBucket>('all');
const selectedMemberId = ref('');

const roleFilterOptions: { value: RoleBucket; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Leads' },
  { value: 'member', label: 'Team' },
  { value: 'quality_checker', label: 'Quality' }
];

const roleBucket = (role: string | null | undefined): Exclude<RoleBucket, 'all'> => {
  const r = normalizeRole(role);
  if (r === 'admin' || r === 'owner' || r === 'head' || r === 'supervisor') return 'admin';
  if (r === 'quality_checker') return 'quality_checker';
  return 'member';
};

// Pulls from the `team_directory` VIEW (safe columns only — no presence,
// no last-seen, no activity). See migration 0069_team_directory_view.sql.
const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data, error: err } = await supabase
      .rpc('get_team_directory')
      .select('id, full_name, email, role, avatar_url, username, position, phone, bio, created_at')
      .order('full_name', { ascending: true });

    if (err) throw err;

    members.value = (data as any[] ?? []).map((r: any): DirectoryMember => ({
      id: r.id,
      fullName: r.full_name ?? '',
      email: r.email ?? '',
      role: r.role ?? 'member',
      avatarUrl: r.avatar_url ?? '',
      username: r.username ?? '',
      position: r.position ?? '',
      phone: r.phone ?? '',
      bio: r.bio ?? '',
      createdAt: r.created_at ?? ''
    }));
  } catch (e) {
    console.error('[team-members] load failed', e);
    error.value = 'Could not load members. Please try again.';
  } finally {
    loading.value = false;
  }
};

const filtered = computed(() =>
  members.value.filter((m) => {
    if (roleFilter.value !== 'all' && roleBucket(m.role) !== roleFilter.value) return false;
    const q = search.value.toLowerCase().trim();
    if (q && !`${m.fullName} ${m.email} ${m.position} ${m.username}`.toLowerCase().includes(q)) return false;
    return true;
  })
);

const selectedMember = computed(
  () => filtered.value.find((member) => member.id === selectedMemberId.value) ?? filtered.value[0] ?? null
);

const initials = (name: string) =>
  (name || '?')
    .split(/[\s@.]+/)
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const memberSince = (iso: string) => {
  if (!iso) return 'Not set';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Not set' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const ic = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
};

const profileInfo = (member: DirectoryMember) => [
  { label: 'Role', value: roleLabel(member.role), icon: ic.user },
  { label: 'Position', value: member.position || 'Not set', icon: ic.briefcase },
  { label: 'Email', value: member.email || 'Not set', icon: ic.mail },
  { label: 'Phone', value: member.phone || 'Not set', icon: ic.phone },
  { label: 'Member since', value: memberSince(member.createdAt), icon: ic.calendar }
];

const selectMember = (member: DirectoryMember) => {
  selectedMemberId.value = member.id;
};

onMounted(load);
</script>

<style scoped>
.tm-page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding-bottom: 2.5rem;
}

/* ── Toolbar ── */
.tm-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.tm-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1 1 18rem;
  max-width: 26rem;
  padding: 0 0.85rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-muted);
  transition: border-color 140ms, box-shadow 140ms;
}
.tm-search:focus-within {
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.tm-search svg { flex-shrink: 0; }
.tm-search input {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  padding: 0.6rem 0;
  font-size: 0.85rem;
  color: var(--text-main);
}
.tm-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 50%, var(--card-bg));
}
.tm-chip {
  border: 0;
  border-radius: 9px;
  padding: 0.4rem 0.85rem;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms, color 140ms;
}
.tm-chip:hover { color: var(--text-main); }
.tm-chip--active {
  background: var(--primary);
  color: #f8fbff;
  box-shadow: 0 4px 14px -6px color-mix(in srgb, var(--primary) 70%, transparent);
}

/* ── Layout ── */
.tm-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 1.25rem;
  align-items: start;
}

/* ── Directory grid ── */
.tm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.85rem;
}
.tm-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-align: left;
  padding: 0.95rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms, box-shadow 150ms;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.tm-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  box-shadow: 0 10px 26px -16px color-mix(in srgb, var(--primary) 60%, transparent);
}
.tm-card--active {
  border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}
.tm-card--skeleton { cursor: default; pointer-events: none; }
.tm-card-avatar,
.tm-profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-weight: 800;
  flex-shrink: 0;
}
.tm-card-avatar { width: 3rem; height: 3rem; font-size: 0.9rem; }
.tm-card-avatar img,
.tm-profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tm-card-body { min-width: 0; flex: 1; }
.tm-card-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tm-card-username {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tm-card-position {
  font-size: 0.74rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}
.tm-role-badge {
  flex-shrink: 0;
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
}
.tm-role-badge--lg {
  align-self: center;
  font-size: 0.74rem;
  padding: 0.3rem 0.75rem;
}

/* ── Profile panel ── */
.tm-profile {
  position: sticky;
  top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.4rem;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 8px 30px -22px rgba(15,23,42,0.4);
}
.tm-profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}
.tm-profile-avatar {
  width: 5rem;
  height: 5rem;
  font-size: 1.5rem;
  border: 3px solid color-mix(in srgb, var(--primary) 22%, transparent);
}
.tm-profile-name {
  margin: 0.2rem 0 0;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}
.tm-profile-username {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary);
}
.tm-profile-bio {
  margin: 0;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: var(--soft-bg);
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-main);
  text-align: center;
}

/* Contact / profile info */
.tm-info { display: flex; flex-direction: column; gap: 0.1rem; }
.tm-info-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.8rem;
}
.tm-info-row:last-child { border-bottom: 0; }
.tm-info-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--primary);
}
.tm-info-icon :deep(svg) { width: 15px; height: 15px; }
.tm-info-label { color: var(--text-muted); }
.tm-info-value {
  margin-left: auto;
  text-align: right;
  font-weight: 700;
  color: var(--text-main);
  word-break: break-word;
}

/* ── Skeleton ── */
.tm-skel {
  display: block;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-muted) 14%, transparent);
  animation: tm-pulse 1.3s ease-in-out infinite;
}
.tm-skel--avatar { width: 3rem; height: 3rem; border-radius: 999px; flex-shrink: 0; }
.tm-skel--line { height: 0.7rem; width: 80%; margin-bottom: 0.4rem; }
.tm-skel--short { width: 50%; }
@keyframes tm-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Error ── */
.tm-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .tm-layout { grid-template-columns: 1fr; }
  .tm-profile { position: static; order: -1; }
}
</style>
