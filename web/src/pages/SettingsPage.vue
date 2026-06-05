<template>
  <div>
    <PageHeader
      :title="auth.isQualityChecker ? 'Account Settings' : 'Settings'"
      :subtitle="auth.isQualityChecker ? 'Manage your profile, password, notifications, and display settings.' : 'Manage your account and workspace.'"
    />

    <div
      v-if="success"
      class="mb-5 rounded-card border border-status-approved-bg bg-status-approved-bg/60 px-4 py-3 text-sm text-status-approved-fg"
    >
      {{ success }}
    </div>
    <div
      v-if="error"
      class="mb-5 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/60 px-4 py-3 text-sm text-status-needs-fix-fg"
    >
      {{ error }}
    </div>

    <div class="space-y-6">
      <div class="card card-pad">
        <h3 class="section-title mb-1">Profile</h3>
        <p class="helper mb-5">How your name appears across the workspace.</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Display name</label>
            <input v-model="displayName" class="input" />
          </div>
          <div>
            <label class="label">Email</label>
            <input class="input" :value="auth.user?.email ?? ''" disabled />
          </div>
        </div>
        <div class="mt-5 flex justify-end">
          <RouterLink v-if="auth.isQualityChecker" class="btn-secondary mr-2" to="/profile">
            Edit Full Profile
          </RouterLink>
          <button class="btn-primary" type="button" :disabled="saving" @click="saveProfile">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>

      <div class="card card-pad">
        <h3 class="section-title mb-1">Password</h3>
        <p class="helper mb-5">Change your login password for this account.</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">New password</label>
            <input v-model="password.newPassword" class="input" type="password" placeholder="At least 6 characters" />
          </div>
          <div>
            <label class="label">Confirm password</label>
            <input v-model="password.confirmPassword" class="input" type="password" placeholder="Repeat password" />
          </div>
        </div>
        <div class="mt-5 flex justify-end">
          <button class="btn-secondary" type="button" :disabled="savingPassword" @click="savePassword">
            {{ savingPassword ? 'Updating...' : 'Update Password' }}
          </button>
        </div>
      </div>

      <div v-if="auth.isAdmin" class="card card-pad">
        <h3 class="section-title mb-1">Notifications</h3>
        <p class="helper mb-5">Decide when we email you.</p>
        <div class="space-y-3">
          <label v-for="opt in notifyOptions" :key="opt.id" class="flex items-start gap-3">
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
              :checked="opt.checked"
            />
            <div>
              <div class="ui-font text-sm font-medium text-text-main">{{ opt.label }}</div>
              <div class="text-xs text-text-muted">{{ opt.hint }}</div>
            </div>
          </label>
        </div>
      </div>

      <PushNotificationCard />

      <!-- Sound notifications -->
      <div class="card card-pad">
        <h3 class="section-title mb-1">Sound Notifications</h3>
        <p class="helper mb-4">Play a sound when a notification arrives while the app is open.</p>

        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="ui-font text-sm font-medium text-text-main">In-app notification sound</div>
            <div class="mt-0.5 text-xs text-text-muted">
              Plays when you receive a task, comment, or update while KiuQ is open.
            </div>
          </div>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            :class="soundEnabled ? 'bg-primary' : 'bg-border'"
            role="switch"
            :aria-checked="soundEnabled"
            @click="toggleSound"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition"
              :class="soundEnabled ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button class="btn-secondary text-sm" type="button" :disabled="testingSound" @click="testSound">
            {{ testingSound ? 'Playing…' : 'Test Sound' }}
          </button>
          <span class="text-xs text-text-muted">
            For sound in background, enable notification sound in macOS / browser settings.
          </span>
        </div>
      </div>

      <!-- System Updates Management (Admin only) -->
      <div v-if="auth.isAdmin" class="card card-pad">
        <h3 class="section-title mb-1">System Updates & Announcements</h3>
        <p class="helper mb-5">Manage and post system updates, fixes, improvements, or announcements. You can preview updates before publishing them to the team.</p>

        <!-- New Update Form -->
        <div class="border-b border-border pb-5 mb-5">
          <h4 class="text-sm font-semibold text-text-main mb-3">Create System Update</h4>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="label">Update ID (unique identifier slug)</label>
              <input v-model="newUpdate.updateId" class="input" placeholder="e.g. feature-work-board-v2" />
            </div>
            <div>
              <label class="label">Type</label>
              <select v-model="newUpdate.type" class="input">
                <option value="feature">Feature</option>
                <option value="fix">Fix</option>
                <option value="improvement">Improvement</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="label">Title</label>
              <input v-model="newUpdate.title" class="input" placeholder="e.g. New Work Board UI Released" />
            </div>
            <div class="sm:col-span-2">
              <label class="label">Message / Description</label>
              <textarea v-model="newUpdate.message" rows="3" class="input py-2" placeholder="e.g. We have upgraded the work board with drag and drop support and cleaner layouts..."></textarea>
            </div>
            <div class="sm:col-span-2">
              <label class="label">Read More URL (Optional)</label>
              <input v-model="newUpdate.readMoreUrl" class="input" placeholder="e.g. https://kiuq.kiuq.net/docs/work-board" />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2 justify-between">
            <button
              class="btn-secondary text-sm"
              type="button"
              @click="triggerLocalPreview(newUpdate)"
            >
              Test Preview (Local Banner)
            </button>
            <div class="flex gap-2">
              <button
                class="btn-ghost text-sm"
                type="button"
                :disabled="savingUpdate"
                @click="saveUpdate(false)"
              >
                Save as Draft
              </button>
              <button
                class="btn-primary text-sm"
                type="button"
                :disabled="savingUpdate"
                @click="saveUpdate(true)"
              >
                Publish Official
              </button>
            </div>
          </div>
        </div>

        <!-- Updates List -->
        <div>
          <h4 class="text-sm font-semibold text-text-main mb-3">Past Updates</h4>
          <div v-if="loadingUpdates" class="text-sm text-text-muted">Loading updates...</div>
          <div v-else-if="updates.length === 0" class="text-sm text-text-muted">No updates created yet.</div>
          <div v-else class="space-y-3">
            <div
              v-for="item in updates"
              :key="item.id"
              class="border border-border rounded-lg bg-soft-bg/10 overflow-hidden"
            >
              <!-- Update Header -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-soft-bg/25 gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                      :class="{
                        'bg-primary/10 text-primary border-primary/20': item.type === 'feature',
                        'bg-status-needs-fix-bg/15 text-status-needs-fix-fg border-status-needs-fix-bg/30': item.type === 'fix',
                        'bg-status-approved-bg/15 text-status-approved-fg border-status-approved-bg/30': item.type === 'improvement',
                        'bg-status-pending-bg/15 text-status-pending-fg border-status-pending-bg/30': item.type === 'announcement'
                      }"
                    >
                      {{ item.type }}
                    </span>
                    <span class="text-sm font-bold text-text-main">{{ item.title }}</span>
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded border"
                      :class="item.is_official ? 'bg-status-approved-bg/20 text-status-approved-fg border-status-approved-bg/40 font-semibold' : 'bg-border text-text-muted border-border'"
                    >
                      {{ item.is_official ? 'Published' : 'Draft' }}
                    </span>
                    <span
                      v-if="item.is_official"
                      class="text-[10px] font-semibold text-text-muted flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-border/40"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-status-approved-fg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Received: {{ getSeenStats(item.update_id).seenCount }}/{{ getSeenStats(item.update_id).total }}
                    </span>
                  </div>
                  <div class="text-xs text-text-muted mt-1 truncate max-w-lg">{{ item.message }}</div>
                  <div class="text-[10px] text-text-muted mt-0.5">ID: {{ item.update_id }}</div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-center">
                  <button
                    v-if="item.is_official"
                    class="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                    type="button"
                    @click="toggleReceipts(item.update_id)"
                  >
                    <span>Receipts</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="transition-transform duration-200"
                      :class="{ 'rotate-180': expandedReceipts[item.update_id] }"
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  <button
                    class="btn-secondary text-[11px] py-1 px-2.5"
                    type="button"
                    @click="triggerLocalPreview(item)"
                  >
                    Preview
                  </button>
                  <button
                    v-if="!item.is_official"
                    class="btn-primary text-[11px] py-1 px-2.5"
                    type="button"
                    @click="publishUpdate(item.id)"
                  >
                    Publish
                  </button>
                  <button
                    v-if="item.is_official"
                    class="btn-secondary text-[11px] py-1 px-2.5 text-primary border-primary/20 hover:bg-primary/5"
                    type="button"
                    @click="repushUpdate(item.update_id)"
                    title="Force show this update again to all teammates who already dismissed it"
                  >
                    Repush
                  </button>
                  <button
                    class="btn-ghost text-[11px] py-1 px-2.5 text-status-needs-fix-fg hover:bg-status-needs-fix-bg"
                    type="button"
                    @click="deleteUpdate(item.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <!-- Receipts Collapsible Area -->
              <Transition name="expand">
                <div v-if="item.is_official && expandedReceipts[item.update_id]" class="p-3 bg-soft-bg/5 border-t border-border/30">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Acknowledged Teammates -->
                    <div>
                      <div class="flex items-center gap-1.5 text-xs font-semibold text-status-approved-fg mb-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-status-approved-fg animate-pulse"></span>
                        Acknowledged ({{ getSeenStats(item.update_id).acknowledged.length }})
                      </div>
                      <div v-if="getSeenStats(item.update_id).acknowledged.length === 0" class="text-[11px] text-text-muted italic py-1 pl-3">
                        No one has acknowledged yet.
                      </div>
                      <div v-else class="space-y-1.5">
                        <div
                          v-for="m in getSeenStats(item.update_id).acknowledged"
                          :key="m.id"
                          class="flex items-center justify-between p-1.5 rounded bg-soft-bg/20 border border-border/30"
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            <div class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              <img
                                v-if="m.avatarUrl"
                                :src="m.avatarUrl"
                                class="h-full w-full object-cover cursor-pointer transition hover:scale-110"
                                @click.prevent.stop="openPhotoPreview(m)"
                              />
                              <span v-else>{{ initials(m.fullName || m.email) }}</span>
                            </div>
                            <div class="min-w-0">
                              <div class="text-xs font-medium text-text-main truncate">{{ m.fullName || 'Unnamed member' }}</div>
                              <div class="text-[9px] text-text-muted truncate">{{ m.email }}</div>
                            </div>
                          </div>
                          <span class="text-[9px] text-status-approved-fg font-semibold bg-status-approved-bg/10 px-1.5 py-0.5 rounded border border-status-approved-bg/20 flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Got it
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Pending Teammates -->
                    <div>
                      <div class="flex items-center gap-1.5 text-xs font-semibold text-status-pending-fg mb-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-status-pending-fg"></span>
                        Pending ({{ getSeenStats(item.update_id).pending.length }})
                      </div>
                      <div v-if="getSeenStats(item.update_id).pending.length === 0" class="text-[11px] text-text-muted italic py-1 pl-3">
                        All active teammates have received this update.
                      </div>
                      <div v-else class="space-y-1.5">
                        <div
                          v-for="m in getSeenStats(item.update_id).pending"
                          :key="m.id"
                          class="flex items-center justify-between p-1.5 rounded bg-soft-bg/20 border border-border/30"
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            <div class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-border text-text-muted text-[10px] font-bold">
                              <img
                                v-if="m.avatarUrl"
                                :src="m.avatarUrl"
                                class="h-full w-full object-cover cursor-pointer transition hover:scale-110"
                                @click.prevent.stop="openPhotoPreview(m)"
                              />
                              <span v-else>{{ initials(m.fullName || m.email) }}</span>
                            </div>
                            <div class="min-w-0">
                              <div class="text-xs font-medium text-text-main truncate">{{ m.fullName || 'Unnamed member' }}</div>
                              <div class="text-[9px] text-text-muted truncate">{{ m.email }}</div>
                            </div>
                          </div>
                          <span class="text-[9px] text-text-muted font-medium bg-border/50 px-1.5 py-0.5 rounded border border-border">
                            Pending
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <div v-if="auth.isAdmin" class="card card-pad">
        <h3 class="section-title mb-1">Workspace</h3>
        <p class="helper mb-5">Settings that apply to everyone in your team.</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Workspace name</label>
            <input class="input" value="WordPress Prompt Team" />
          </div>
          <div>
            <label class="label">Default reviewer</label>
            <select class="input">
              <option v-for="member in data.members" :key="member.id">{{ member.fullName || member.email }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import PushNotificationCard from '@/components/ui/PushNotificationCard.vue';
import { useAuthStore } from '@/stores/auth';
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
import { useDataStore } from '@/stores/data';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '@/composables/useNotificationSound';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const auth = useAuthStore();
const data = useDataStore();
const displayName = ref(auth.profile?.fullName ?? '');
const saving = ref(false);
const savingPassword = ref(false);
const success = ref('');
const error = ref('');
const password = reactive({
  newPassword: '',
  confirmPassword: ''
});

// Update Management state
const updates = ref<any[]>([]);
const loadingUpdates = ref(false);
const newUpdate = reactive({
  updateId: '',
  type: 'feature' as const,
  title: '',
  message: '',
  readMoreUrl: ''
});
const savingUpdate = ref(false);

// Collapsible receipts state & helper methods
const expandedReceipts = ref<Record<string, boolean>>({});

const toggleReceipts = (updateId: string) => {
  expandedReceipts.value[updateId] = !expandedReceipts.value[updateId];
};

const getSeenStats = (updateId: string) => {
  const activeMembers = data.members.filter((m) => m.status === 'active');
  const acknowledged = activeMembers.filter((m) => m.lastSeenUpdateId === updateId);
  const pending = activeMembers.filter((m) => m.lastSeenUpdateId !== updateId);
  return {
    acknowledged,
    pending,
    total: activeMembers.length,
    seenCount: acknowledged.length
  };
};

const initials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

watch(
  () => auth.profile?.fullName,
  (name) => (displayName.value = name ?? '')
);

const notifyOptions = [
  { id: 'n1', label: 'New task assigned to me', hint: 'Email me when someone gives me a task.', checked: true },
  { id: 'n2', label: 'Review feedback', hint: 'Email me when a reviewer asks for changes.', checked: true },
  { id: 'n3', label: 'Weekly summary', hint: 'A short weekly recap on Monday morning.', checked: false }
];

const saveProfile = async () => {
  if (!auth.profile) return;
  success.value = '';
  error.value = '';
  saving.value = true;
  const ok = await data.upsertMember({ ...auth.profile, fullName: displayName.value.trim() });
  if (ok) {
    await auth.refreshProfile();
    success.value = 'Profile updated successfully.';
  } else {
    error.value = data.errors.members ?? 'Could not update profile. Please try again.';
  }
  saving.value = false;
};

const savePassword = async () => {
  success.value = '';
  error.value = '';
  if (!password.newPassword || password.newPassword.length < 6) {
    error.value = 'Password must be at least 6 characters.';
    return;
  }
  if (password.newPassword !== password.confirmPassword) {
    error.value = 'Password confirmation does not match.';
    return;
  }
  savingPassword.value = true;
  const ok = await auth.updatePassword(password.newPassword);
  savingPassword.value = false;
  if (!ok) {
    error.value = auth.error ?? 'Could not update password. Please try again.';
    return;
  }
  password.newPassword = '';
  password.confirmPassword = '';
  success.value = 'Password updated successfully.';
};

// ── Sound notifications ───────────────────────────────────────────────────────

const soundEnabled = ref(isSoundEnabled());
const testingSound = ref(false);

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  setSoundEnabled(soundEnabled.value);
};

const testSound = async () => {
  testingSound.value = true;
  const prev = soundEnabled.value;
  setSoundEnabled(true); // force play even if disabled, just for the test
  await playNotificationSound();
  setSoundEnabled(prev);
  testingSound.value = false;
};

// ── System Updates ─────────────────────────────────────────────────────────────

const fetchUpdates = async () => {
  if (!supabaseConfigured) return;
  loadingUpdates.value = true;
  try {
    const { data: dbData, error: dbErr } = await supabase
      .from('system_updates')
      .select('*')
      .order('created_at', { ascending: false });
    if (!dbErr) {
      updates.value = dbData ?? [];
    }
  } catch (err) {
    console.error('Failed to fetch updates', err);
  } finally {
    loadingUpdates.value = false;
  }
};

const triggerLocalPreview = (item: any) => {
  if (!item.title || !item.message) {
    error.value = 'Please fill in at least title and message to preview.';
    return;
  }
  const customEvent = new CustomEvent('test-system-update', {
    detail: {
      id: item.id || 'preview-id',
      updateId: item.updateId || item.update_id || 'preview-update-id',
      type: item.type,
      title: item.title,
      message: item.message,
      readMoreUrl: item.readMoreUrl || item.read_more_url || '',
      isOfficial: item.isOfficial || item.is_official || false
    }
  });
  window.dispatchEvent(customEvent);
};

const saveUpdate = async (isOfficial: boolean) => {
  if (!newUpdate.updateId || !newUpdate.title || !newUpdate.message) {
    error.value = 'Please fill in update ID, title, and message.';
    return;
  }
  success.value = '';
  error.value = '';
  savingUpdate.value = true;
  try {
    const { error: err } = await supabase
      .from('system_updates')
      .insert({
        update_id: newUpdate.updateId.trim(),
        type: newUpdate.type,
        title: newUpdate.title.trim(),
        message: newUpdate.message.trim(),
        read_more_url: newUpdate.readMoreUrl.trim(),
        is_official: isOfficial,
        created_by: auth.user?.id
      });
    if (err) {
      error.value = err.message;
    } else {
      success.value = isOfficial ? 'System update published successfully!' : 'System update draft saved successfully!';
      newUpdate.updateId = '';
      newUpdate.title = '';
      newUpdate.message = '';
      newUpdate.readMoreUrl = '';
      await fetchUpdates();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save update.';
  } finally {
    savingUpdate.value = false;
  }
};

const publishUpdate = async (id: string) => {
  success.value = '';
  error.value = '';
  try {
    const { error: err } = await supabase
      .from('system_updates')
      .update({ is_official: true })
      .eq('id', id);
    if (err) {
      error.value = err.message;
    } else {
      success.value = 'System update published successfully!';
      await fetchUpdates();
    }
  } catch (err) {
    error.value = 'Failed to publish update.';
  }
};

const repushUpdate = async (updateId: string) => {
  if (!confirm(`Are you sure you want to push update "${updateId}" again? This will reset the seen status for all teammates so it displays again on their next load.`)) return;
  success.value = '';
  error.value = '';
  try {
    const { error: err } = await supabase
      .from('profiles')
      .update({ last_seen_update_id: '' })
      .eq('last_seen_update_id', updateId);
    if (err) {
      error.value = err.message;
    } else {
      success.value = `System update "${updateId}" has been successfully pushed again to all teammates.`;
      // Also update local state for the admin immediately
      if (auth.profile && auth.profile.lastSeenUpdateId === updateId) {
        auth.profile.lastSeenUpdateId = '';
      }
    }
  } catch (err) {
    error.value = 'Failed to push update again.';
  }
};

const deleteUpdate = async (id: string) => {
  if (!confirm('Are you sure you want to delete this update?')) return;
  success.value = '';
  error.value = '';
  try {
    const { error: err } = await supabase
      .from('system_updates')
      .delete()
      .eq('id', id);
    if (err) {
      error.value = err.message;
    } else {
      success.value = 'System update deleted.';
      await fetchUpdates();
    }
  } catch (err) {
    error.value = 'Failed to delete update.';
  }
};

onMounted(() => {
  if (auth.isAdmin) {
    if (data.members.length === 0) data.fetchMembers();
    fetchUpdates();
  }
});
</script>

<style scoped>
/* Expand transition for receipts */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 800px;
  opacity: 1;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-top-color: transparent !important;
}
</style>
