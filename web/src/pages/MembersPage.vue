<template>
  <div>
    <PageHeader title="Members" subtitle="People who can be assigned prompts and projects.">
      <template #actions>
        <a class="btn-secondary" href="/register" target="_blank" rel="noopener">Invite link</a>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="openCreateUser">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Create User
        </button>
      </template>
    </PageHeader>

    <div class="mb-5 rounded-card border border-border bg-soft/40 px-4 py-3 text-sm text-text-muted">
      New teammates sign up themselves at
      <code class="rounded bg-card px-1 py-0.5 text-text-main">/register</code>.
      Once they have an account they appear below — edit their role and status here.
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" placeholder="Search members..." />
      <div class="flex items-center gap-1 rounded-card border border-border bg-soft/40 p-1">
        <button
          v-for="opt in statusFilterOptions"
          :key="opt.value"
          type="button"
          class="ui-font rounded-md px-3 py-1.5 text-xs font-medium transition"
          :class="statusFilter === opt.value ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
          @click="statusFilter = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <LoadingBlock :loading="data.loading.members" :error="data.errors.members" :retry="data.fetchMembers">
      <div v-if="filtered.length > 0" class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div class="card overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div>
              <h3 class="section-title">Team profiles</h3>
              <p class="mt-1 text-xs text-text-muted">Click a row to preview profile details without leaving this page.</p>
            </div>
            <div class="ui-font text-xs text-text-muted">{{ filtered.length }} profile{{ filtered.length === 1 ? '' : 's' }}</div>
          </div>

          <div class="hidden grid-cols-[minmax(220px,1fr)_120px_110px_110px_140px] gap-4 border-b border-border bg-soft px-5 py-3 text-xs uppercase tracking-wide text-text-muted md:grid">
            <span class="ui-font font-medium">Member</span>
            <span class="ui-font font-medium">Role</span>
            <span class="ui-font font-medium">Status</span>
            <span class="ui-font font-medium">Last Active</span>
            <span class="ui-font font-medium">Push</span>
          </div>

          <div class="divide-y divide-border">
            <div
              v-for="member in filtered"
              :key="member.id"
              class="grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition hover:bg-soft/50 md:grid-cols-[minmax(220px,1fr)_120px_110px_110px_140px] md:items-center md:gap-4"
              :class="selectedMember?.id === member.id ? 'bg-soft/60' : ''"
              role="button"
              tabindex="0"
              @click="selectMember(member)"
              @keydown.enter="selectMember(member)"
              @keydown.space.prevent="selectMember(member)"
            >
              <div class="flex min-w-0 items-center gap-3">
                <button
                  class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-soft text-primary ui-font text-xs font-semibold transition hover:ring-2 hover:ring-primary/30"
                  type="button"
                  :title="member.avatarUrl ? 'View profile photo' : 'No profile photo uploaded'"
                  @click.stop="openPhoto(member)"
                >
                  <img
                    v-if="member.avatarUrl"
                    :src="member.avatarUrl"
                    :alt="`${member.fullName || 'Member'} avatar`"
                    class="h-full w-full object-cover cursor-pointer transition hover:scale-110"
                  />
                  <span v-else>{{ initials(member.fullName || member.email) }}</span>
                </button>
                <div class="min-w-0">
                  <div class="ui-font truncate font-semibold text-text-main">{{ member.fullName || 'Unnamed member' }}</div>
                  <div class="truncate text-xs text-text-muted">{{ member.email }}</div>
                </div>
              </div>

              <div>
                <span class="ui-font inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium" :class="roleBadgeClass(member.role)">
                  {{ roleLabel(member.role) }}
                </span>
              </div>

              <div>
                <PresenceBadge :member="member" />
              </div>

              <div>
                <div class="ui-font text-sm font-semibold text-text-main">{{ relativeTime(member.lastActiveAt) }}</div>
                <div class="mt-1 text-xs text-text-muted">{{ assignedTaskCount(member.id) }} assigned</div>
              </div>

              <div>
                <template v-if="pushStatus(member.id)">
                  <span class="ui-font inline-flex items-center gap-1 rounded-full bg-status-approved-bg px-2.5 py-1 text-xs font-medium text-status-approved-fg">
                    <span class="h-1.5 w-1.5 rounded-full bg-status-approved-fg"></span>
                    Enabled
                  </span>
                  <div class="mt-1 text-xs text-text-muted">
                    {{ pushStatus(member.id)!.count }} device{{ pushStatus(member.id)!.count === 1 ? '' : 's' }}
                    · {{ relativeTime(pushStatus(member.id)!.lastDate) }}
                  </div>
                </template>
                <span v-else class="ui-font inline-flex rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-text-muted">
                  Not enabled
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside v-if="selectedMember" class="card card-pad h-fit xl:sticky xl:top-24">
          <div class="flex min-w-0 items-center gap-3">
            <button
              class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-soft text-primary ui-font text-lg font-semibold transition hover:ring-2 hover:ring-primary/30"
              type="button"
              :title="selectedMember.avatarUrl ? 'View profile photo' : 'No profile photo uploaded'"
              @click="openPhoto(selectedMember)"
            >
              <img
                v-if="selectedMember.avatarUrl"
                :src="selectedMember.avatarUrl"
                :alt="`${selectedMember.fullName || 'Member'} avatar`"
                class="h-full w-full object-cover cursor-pointer transition hover:scale-105"
              />
              <span v-else>{{ initials(selectedMember.fullName || selectedMember.email) }}</span>
            </button>
            <div class="min-w-0">
              <h3 class="ui-font truncate text-lg font-semibold text-text-main">
                {{ selectedMember.fullName || 'Unnamed member' }}
              </h3>
              <p v-if="selectedMember.username" class="truncate text-sm font-semibold" style="color: var(--primary)">@{{ selectedMember.username }}</p>
              <p class="mt-1 truncate text-sm text-text-muted">{{ selectedMember.email }}</p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span class="ui-font rounded-full px-2.5 py-1 text-xs font-medium" :class="roleBadgeClass(selectedMember.role)">
              {{ roleLabel(selectedMember.role) }}
            </span>
            <PresenceBadge :member="selectedMember" />
            <StatusBadge :status="selectedMember.status" />
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <div v-for="stat in previewStats(selectedMember.id)" :key="stat.label" class="rounded-card border border-border bg-soft/40 p-3">
              <div class="text-xs text-text-muted">{{ stat.label }}</div>
              <div class="ui-font mt-1 text-base font-semibold text-text-main">{{ stat.value }}</div>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <div v-for="item in profileInfo(selectedMember)" :key="item.label" class="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
              <span class="text-xs text-text-muted">{{ item.label }}</span>
              <span class="ui-font text-right text-xs font-semibold text-text-main">{{ item.value }}</span>
            </div>
          </div>

          <div class="mt-5">
            <h4 class="ui-font text-sm font-semibold text-text-main">Recent activity</h4>
            <div v-if="memberLogs(selectedMember.id).length > 0" class="mt-3 divide-y divide-border rounded-card border border-border">
              <div v-for="log in memberLogs(selectedMember.id).slice(0, 4)" :key="log.id" class="px-3 py-2">
                <div class="ui-font text-xs font-medium text-text-main">{{ log.message }}</div>
                <div class="mt-1 text-[11px] text-text-muted">{{ actionLabel(log.action) }} · {{ relativeTime(log.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="mt-3 rounded-card border border-border px-3 py-6 text-center text-xs text-text-muted">
              No activity recorded yet.
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <RouterLink :to="`/profiles/${selectedMember.id}`" class="btn-secondary h-9 px-3 text-xs">View Full</RouterLink>
            <button class="btn-secondary h-9 px-3 text-xs" type="button" @click="openEdit(selectedMember)">Edit Role</button>
            <button
              v-if="selectedMember.status === 'deactivated'"
              class="btn-secondary h-9 px-3 text-xs"
              type="button"
              :disabled="restoring"
              @click="restoreUser(selectedMember)"
            >{{ restoring ? 'Restoring...' : 'Restore User' }}</button>
            <button
              v-if="selectedMember.status === 'active' || selectedMember.status === 'inactive'"
              class="h-9 rounded-card border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-medium text-amber-600 transition hover:bg-amber-500/20 ui-font"
              type="button"
              @click="openDeactivateModal(selectedMember)"
            >Deactivate</button>
            <button
              v-if="selectedMember.id !== auth.profile?.id"
              class="h-9 rounded-card border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-600 transition hover:bg-red-500/20 ui-font"
              type="button"
              @click="openDeleteModal(selectedMember)"
            >Delete</button>
          </div>
        </aside>
      </div>
      <EmptyState
        v-else
        title="No members found"
        description="Try a different search, or send the invite link to add a teammate."
      />
    </LoadingBlock>

    <Modal
      :open="modalOpen"
      title="Edit member"
      subtitle="Change role, status, or notes."
      size="md"
      @close="closeModal"
    >
      <MemberForm ref="formRef" :initial="formInitial" />
      <div v-if="data.errors.members" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.members }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeModal">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="save(formRef?.model)">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </Modal>


    <!-- Deactivate Confirmation -->
    <!-- Deactivate Confirmation -->
    <Modal :open="deactivateOpen" title="Deactivate user?" subtitle="This user will lose access but data stays intact." size="md" @close="deactivateOpen = false">
      <div v-if="deactivateTarget" class="space-y-4">
        <div class="rounded-card border border-border bg-soft/40 p-4">
          <div class="ui-font font-semibold text-text-main">{{ deactivateTarget.fullName || deactivateTarget.email }}</div>
          <div class="mt-1 text-xs text-text-muted">{{ deactivateTarget.email }} · {{ roleLabel(deactivateTarget.role) }}</div>
        </div>
        <p class="text-sm text-text-muted">The user will not be able to log in or use the system. Tasks, submissions, and activity history remain intact. You can restore them later.</p>
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="deactivateOpen = false">Cancel</button>
        <button class="h-9 rounded-card bg-amber-500 px-4 text-sm font-medium text-white transition hover:bg-amber-600 ui-font disabled:opacity-40" type="button" :disabled="deactivating" @click="confirmDeactivate">
          {{ deactivating ? 'Deactivating...' : 'Deactivate User' }}
        </button>
      </template>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :open="deleteOpen" title="Delete user?" subtitle="This action cannot be easily undone." size="md" @close="closeDeleteModal">
      <div v-if="deleteTarget" class="space-y-4">
        <div class="rounded-card border border-red-500/20 bg-red-500/5 p-4">
          <p class="text-sm font-medium text-red-600 dark:text-red-400">This will permanently delete this user from the system. Their profile, assignments, submissions, reports, and activity history will be removed. This action cannot be undone.</p>
        </div>
        <div class="rounded-card border border-border bg-soft/40 p-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-text-muted">Name</span><span class="ui-font font-semibold text-text-main">{{ deleteTarget.fullName || 'Unnamed' }}</span></div>
          <div class="flex justify-between"><span class="text-text-muted">Email</span><span class="ui-font font-semibold text-text-main">{{ deleteTarget.email }}</span></div>
          <div class="flex justify-between"><span class="text-text-muted">Role</span><span class="ui-font font-semibold text-text-main">{{ roleLabel(deleteTarget.role) }}</span></div>
          <div class="flex justify-between"><span class="text-text-muted">Status</span><span class="ui-font font-semibold text-text-main">{{ deleteTarget.status }}</span></div>
          <div class="flex justify-between"><span class="text-text-muted">Assigned tasks</span><span class="ui-font font-semibold text-text-main">{{ assignedTaskCount(deleteTarget.id) }}</span></div>
          <div class="flex justify-between"><span class="text-text-muted">Pending submissions</span><span class="ui-font font-semibold text-text-main">{{ pendingSubmissionCount(deleteTarget.id) }}</span></div>
        </div>
        <div v-if="deleteTargetHasActiveTasks" class="rounded-card border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-400">⚠ This user has active tasks. Reassign tasks before deleting or deactivate the user instead.</div>
        <div>
          <label class="text-sm font-medium text-text-main">Type <strong>DELETE</strong> to confirm</label>
          <input v-model="deleteConfirmText" class="input mt-2 w-full" type="text" placeholder="DELETE" autocomplete="off" />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeDeleteModal">Cancel</button>
        <button class="h-9 rounded-card bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 ui-font disabled:opacity-40 disabled:cursor-not-allowed" type="button" :disabled="deleteConfirmText !== 'DELETE' || deleting" @click="confirmDelete">
          {{ deleting ? 'Deleting...' : 'Delete User' }}
        </button>
      </template>
    </Modal>

    <!-- Create User Modal -->
    <Modal
      :open="createUserOpen"
      title="Create user"
      subtitle="Add a new team member account directly."
      size="md"
      @close="closeCreateUser"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Full Name <span class="text-red-500">*</span></label>
            <input v-model="createForm.fullName" class="input" type="text" placeholder="Jane Smith" autocomplete="off" />
          </div>
          <div>
            <label class="label">Email <span class="text-red-500">*</span></label>
            <input v-model="createForm.email" class="input" type="email" placeholder="jane@example.com" autocomplete="off" />
          </div>
          <div>
            <label class="label">Role <span class="text-red-500">*</span></label>
            <select v-model="createForm.role" class="input">
              <option value="head">Head</option>
              <option value="supervisor">Supervisor</option>
              <option value="assistant_head">Assistant Head</option>
              <option value="team_member">Team Member</option>
              <option value="quality_checker">Quality Checker</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label class="label">Temporary Password <span class="text-red-500">*</span></label>
            <input v-model="createForm.password" class="input" type="text" placeholder="Min 8 characters" autocomplete="new-password" />
          </div>
          <div>
            <label class="label">Username <span class="helper ml-1 inline">(optional)</span></label>
            <input v-model="createForm.username" class="input" type="text" placeholder="@janesmith" autocomplete="off" />
          </div>
          <div>
            <label class="label">Position <span class="helper ml-1 inline">(optional)</span></label>
            <input v-model="createForm.position" class="input" type="text" placeholder="e.g. Designer" autocomplete="off" />
          </div>
          <div>
            <label class="label">Phone <span class="helper ml-1 inline">(optional)</span></label>
            <input v-model="createForm.phone" class="input" type="tel" placeholder="+1 555 000 0000" autocomplete="off" />
          </div>
        </div>
        <div>
          <label class="label">Notes <span class="helper ml-1 inline">(optional)</span></label>
          <textarea v-model="createForm.notes" class="input" rows="2" placeholder="Any notes about this member…" />
        </div>
        <div v-if="createError" class="rounded-card border border-red-500/30 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {{ createError }}
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeCreateUser">Cancel</button>
        <button class="btn-primary" type="button" :disabled="creating" @click="submitCreateUser">
          {{ creating ? 'Creating...' : 'Create User' }}
        </button>
      </template>
    </Modal>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toastMessage" class="fixed bottom-6 right-6 left-6 z-50 max-w-sm rounded-card border px-5 py-3 text-sm font-medium shadow-lg ui-font transition-all sm:left-auto" :class="toastType === 'success' ? 'border-green-500/30 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'">{{ toastMessage }}</div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import PresenceBadge from '@/components/ui/PresenceBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import MemberForm from '@/components/forms/MemberForm.vue';
import { isToday, relativeTime } from '@/lib/presence';
import { roleBadgeClass, roleLabel } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type ActivityAction, type Member, type MemberStatus } from '@/stores/data';
import { supabase } from '@/lib/supabase';
import { useImagePreviewStore } from '@/stores/imagePreview';

const auth = useAuthStore();
const data = useDataStore();
const search = ref('');
const statusFilter = ref<MemberStatus | 'all'>('active');
const modalOpen = ref(false);
const saving = ref(false);
const formRef = ref<{ model: Member } | null>(null);
const selectedMemberId = ref('');
const previewStore = useImagePreviewStore();

const deactivateOpen = ref(false);
const deactivateTarget = ref<Member | null>(null);
const deactivating = ref(false);
const restoring = ref(false);
const deleteOpen = ref(false);
const deleteTarget = ref<Member | null>(null);
const deleteConfirmText = ref('');
const deleting = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Push subscription status per member — loaded once on mount
interface PushSub { count: number; lastDate: string }
const pushMap = ref<Map<string, PushSub>>(new Map());

const fetchPushSubscriptions = async () => {
  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, created_at')
    .eq('is_active', true);
  if (error || !rows) return;
  const map = new Map<string, PushSub>();
  for (const row of rows as { user_id: string; created_at: string }[]) {
    const existing = map.get(row.user_id);
    const d = row.created_at;
    if (!existing) {
      map.set(row.user_id, { count: 1, lastDate: d });
    } else {
      existing.count++;
      if (d > existing.lastDate) existing.lastDate = d;
    }
  }
  pushMap.value = map;
};

const pushStatus = (memberId: string) => pushMap.value.get(memberId) ?? null;

const statusFilterOptions: { value: MemberStatus | 'all'; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'all', label: 'All' }
];

const blank = (): Member => ({
  id: '',
  fullName: '',
  email: '',
  role: 'member',
  status: 'active',
  avatarUrl: '',
  username: '',
  position: '',
  phone: '',
  bio: '',
  preferredTheme: 'light',
  isOnline: false,
  currentStatus: 'offline',
  lastActiveAt: '',
  lastLoginAt: '',
  lastLogoutAt: '',
  todayActivityCount: 0,
  currentPage: '',
  createdAt: '',
  updatedAt: '',
  notes: '',
  lastSeenUpdateId: ''
});

const formInitial = ref<Member>(blank());

const filtered = computed(() =>
  data.members.filter((m) => {
    if (statusFilter.value !== 'all' && m.status !== statusFilter.value) return false;
    const q = search.value.toLowerCase();
    if (q && !`${m.fullName} ${m.email} ${m.position}`.toLowerCase().includes(q)) return false;
    return true;
  })
);
const selectedMember = computed(
  () => filtered.value.find((member) => member.id === selectedMemberId.value) ?? filtered.value[0] ?? null
);

const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const assignedTaskCount = (memberId: string) =>
  data.assignments.filter((a) => a.assignedMemberId === memberId).length +
  data.sectionTasks.filter((t) => t.assignedMemberId === memberId).length;
const pendingSubmissionCount = (memberId: string) =>
  data.submissions.filter((s) => s.submittedBy === memberId && s.status === 'submitted').length;
const needsFixCount = (memberId: string) =>
  data.assignments.filter((a) => a.assignedMemberId === memberId && a.status === 'needs_fix').length +
  data.submissions.filter((s) => s.submittedBy === memberId && s.status === 'needs_fix').length;
const memberLogs = (memberId: string) => data.activityLogs.filter((log) => log.userId === memberId);
const actionLabel = (action: ActivityAction) =>
  action
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
const previewStats = (memberId: string) => [
  { label: 'Assigned', value: assignedTaskCount(memberId) },
  { label: 'Pending', value: pendingSubmissionCount(memberId) },
  { label: 'Needs Fix', value: needsFixCount(memberId) },
  { label: 'Activity Today', value: memberLogs(memberId).filter((log) => isToday(log.createdAt)).length }
];
const profileInfo = (member: Member) => {
  const ps = pushStatus(member.id);
  return [
    { label: 'Username', value: member.username ? `@${member.username}` : 'Not set' },
    { label: 'Position', value: member.position || 'Not set' },
    { label: 'Phone', value: member.phone || 'Not set' },
    { label: 'Push notifications', value: ps ? `Enabled · ${ps.count} device${ps.count === 1 ? '' : 's'}` : 'Not enabled' },
    { label: 'Push last registered', value: ps ? relativeTime(ps.lastDate) : '—' },
    { label: 'Last active', value: relativeTime(member.lastActiveAt) },
    { label: 'Last login', value: relativeTime(member.lastLoginAt) },
    { label: 'Last logout', value: relativeTime(member.lastLogoutAt) }
  ];
};

const openEdit = (m: Member) => {
  formInitial.value = { ...m };
  modalOpen.value = true;
};
const selectMember = (member: Member) => {
  selectedMemberId.value = member.id;
};
const openPhoto = (member: Member) => {
  if (member.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      email: member.email,
      role: member.role
    });
  }
};
const closeModal = () => (modalOpen.value = false);

const save = async (m: Member | undefined) => {
  if (!m || !m.id) return;
  saving.value = true;
  const ok = await data.upsertMember(m);
  saving.value = false;
  if (ok) closeModal();
};

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMessage.value = ''; }, 3500);
};

const deleteTargetHasActiveTasks = computed(() => {
  if (!deleteTarget.value) return false;
  const id = deleteTarget.value.id;
  return data.assignments.some((a) => a.assignedMemberId === id && !['approved', 'rejected'].includes(a.status))
    || data.sectionTasks.some((t) => t.assignedMemberId === id && !['approved', 'completed'].includes(t.status));
});

const openDeactivateModal = (member: Member) => {
  deactivateTarget.value = member;
  deactivateOpen.value = true;
};

const confirmDeactivate = async () => {
  if (!deactivateTarget.value) return;
  deactivating.value = true;
  try {
    const ok = await data.deactivateMember(deactivateTarget.value.id);
    if (ok) {
      void auth.recordActivity('user_logged_out', 'profile', deactivateTarget.value.id, `Admin deactivated user ${deactivateTarget.value.fullName || deactivateTarget.value.email}.`);
      showToast('User deactivated successfully.');
      deactivateOpen.value = false;
    } else {
      showToast(data.errors.members || 'Could not deactivate user. Please try again.', 'error');
    }
  } catch (err) {
    console.error('[members] deactivate failed', err);
    showToast('Could not deactivate user. Please try again.', 'error');
  } finally {
    deactivating.value = false;
  }
};

const openDeleteModal = (member: Member) => {
  deleteTarget.value = member;
  deleteConfirmText.value = '';
  deleteOpen.value = true;
};

const closeDeleteModal = () => {
  deleteOpen.value = false;
  deleteConfirmText.value = '';
};

const confirmDelete = async () => {
  if (!deleteTarget.value || deleteConfirmText.value !== 'DELETE') return;
  deleting.value = true;
  try {
    const ok = await data.softDeleteMember(deleteTarget.value.id);
    if (ok) {
      console.info(`[members] Admin deleted user ${deleteTarget.value.fullName || deleteTarget.value.email}`);
      showToast('User deleted successfully.');
      closeDeleteModal();
    } else {
      showToast(data.errors.members || 'Could not delete user. Please try again.', 'error');
    }
  } catch (err) {
    console.error('[members] delete failed', err);
    showToast('Could not delete user. Please try again.', 'error');
  } finally {
    deleting.value = false;
  }
};

// ── Create User ──────────────────────────────────────────────────────────────
const createUserOpen = ref(false);
const creating = ref(false);
const createError = ref('');

const blankCreateForm = () => ({
  fullName: '',
  email: '',
  // Default new admin-created users to the canonical Team Member role.
  // Legacy 'member' is still valid for existing rows.
  role: 'team_member',
  password: '',
  username: '',
  position: '',
  phone: '',
  notes: ''
});
const createForm = ref(blankCreateForm());

const openCreateUser = () => {
  createForm.value = blankCreateForm();
  createError.value = '';
  createUserOpen.value = true;
};

const closeCreateUser = () => {
  createUserOpen.value = false;
  createError.value = '';
};

const submitCreateUser = async () => {
  createError.value = '';
  const { fullName, email, password, role, username, position, phone, notes } = createForm.value;
  if (!fullName.trim() || !email.trim() || !password.trim()) {
    createError.value = 'Full Name, Email, and Temporary Password are required.';
    return;
  }
  creating.value = true;
  try {
    const { data: result, error } = await supabase.functions.invoke('create-user', {
      body: { fullName: fullName.trim(), email: email.trim(), password, role, username: username.trim() || undefined, position: position.trim() || undefined, phone: phone.trim() || undefined, notes: notes.trim() || undefined }
    });
    if (error) throw error;
    if (!result?.ok) {
      createError.value = result?.error === 'email_exists'
        ? 'This email already exists. Use a different email.'
        : result?.error || 'Could not create user. Please try again.';
      return;
    }
    await data.fetchMembers();
    showToast('User created successfully.');
    closeCreateUser();
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Could not create user. Please try again.';
  } finally {
    creating.value = false;
  }
};

const restoreUser = async (member: Member) => {
  restoring.value = true;
  try {
    const ok = await data.upsertMember({ ...member, status: 'active' });
    if (ok) {
      void auth.recordActivity('user_logged_in', 'profile', member.id, `Admin restored user ${member.fullName || member.email}.`);
      showToast('User restored successfully.');
    } else {
      showToast('Could not restore user. Please try again.', 'error');
    }
  } catch (err) {
    console.error('[members] restore failed', err);
    showToast('Could not restore user. Please try again.', 'error');
  } finally {
    restoring.value = false;
  }
};

onMounted(() => {
  data.fetchMembers();
  if (data.assignments.length === 0) data.fetchAssignments();
  if (data.sectionTasks.length === 0) data.fetchSectionTasks();
  if (data.submissions.length === 0) data.fetchSubmissions();
  if (data.activityLogs.length === 0) data.fetchActivityLogs();
  void fetchPushSubscriptions();
});
</script>
