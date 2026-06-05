<template>
  <div>
    <PageHeader
      :title="viewingOwn ? 'My Profile' : 'Member Profile'"
      subtitle="Manage account details, identity, and personal settings."
    >
      <template #actions>
        <RouterLink v-if="auth.isAdmin && !viewingOwn" class="btn-secondary" to="/members">Back to Members</RouterLink>
        <RouterLink v-if="targetProfile && !auth.isQualityChecker" class="btn-primary" :to="`/profiles/${targetProfile.id}`">
          View Full
        </RouterLink>
      </template>
    </PageHeader>

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

    <LoadingBlock :loading="loadingProfile" :error="profileError" :retry="loadProfileData">
      <div v-if="targetProfile" class="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside class="space-y-6">
          <div class="card card-pad text-center">
            <div class="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-soft text-primary">
              <img
                v-if="form.avatarUrl"
                :src="form.avatarUrl"
                :alt="`${form.fullName || 'User'} avatar`"
                class="h-full w-full object-cover cursor-pointer transition hover:scale-105"
                @click.prevent.stop="openPhotoPreview"
              />
              <span v-else class="ui-font text-3xl font-semibold">{{ initials(form.fullName || form.email) }}</span>
            </div>

            <input
              ref="avatarInput"
              class="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              @change="onAvatarSelected"
            />

            <button
              v-if="canEdit"
              class="btn-secondary mx-auto h-9 px-3 text-xs"
              type="button"
              :disabled="uploadingAvatar"
              @click="avatarInput?.click()"
            >
              {{ uploadingAvatar ? 'Uploading...' : 'Upload photo' }}
            </button>

            <div class="mt-4">
              <h2 class="ui-font text-lg font-semibold text-text-main">{{ form.fullName || 'Unnamed user' }}</h2>
              <p class="mt-1 text-sm text-text-muted">{{ form.email }}</p>
              <div class="mt-3 flex flex-wrap justify-center gap-2">
                <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">
                  {{ roleLabel(form.role) }}
                </span>
                <span v-if="form.position" class="ui-font rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
                  {{ form.position }}
                </span>
              </div>
            </div>
          </div>

          <div class="card card-pad">
            <h3 class="section-title">Preferences</h3>
            <p class="helper mb-4">Personal display settings for this account.</p>
            <FormSelect
              v-model="form.preferredTheme"
              label="Theme"
              :options="[
                { value: 'light', label: 'Light Mode' },
                { value: 'dark-gray', label: 'Dark Gray Mode' }
              ]"
            />
          </div>
        </aside>

        <div class="space-y-6">
          <div class="card card-pad">
            <div class="mb-5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 class="section-title">Profile Details</h3>
                <p class="helper">This information helps the team know who owns each piece of work.</p>
              </div>
              <span class="ui-font text-xs text-text-muted">
                {{ viewingOwn ? 'Your account' : 'Admin view' }}
              </span>
            </div>

            <form class="space-y-5" @submit.prevent="saveProfile">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FormInput v-model="form.fullName" label="Full name" placeholder="Jane Smith" />
                  <p v-if="fieldErrors.fullName" class="mt-1.5 text-xs text-status-needs-fix-fg">
                    {{ fieldErrors.fullName }}
                  </p>
                </div>
                <div>
                  <FormInput v-model="form.email" label="Email address" type="email" placeholder="jane@team.io" />
                  <p v-if="fieldErrors.email" class="mt-1.5 text-xs text-status-needs-fix-fg">
                    {{ fieldErrors.email }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput v-model="form.username" label="Username" placeholder="e.g. john_doe" />
                <FormInput v-model="form.position" label="Role or position" placeholder="Content Builder" />
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput v-model="form.phone" label="Phone number" placeholder="Optional" />
              </div>

              <div v-if="auth.isAdmin" class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormSelect
                  v-model="form.role"
                  label="System role"
                  :options="[
                    { value: 'admin', label: 'Admin' },
                    { value: 'member', label: 'Team Member' },
                    { value: 'reviewer', label: 'Reviewer' }
                  ]"
                />
                <FormSelect
                  v-model="form.status"
                  label="Account status"
                  :options="[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]"
                />
              </div>

              <FormTextarea
                v-model="form.bio"
                label="Short bio"
                placeholder="A short note about your work, strengths, or responsibilities."
                :rows="5"
              />

              <div class="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <button class="btn-ghost" type="button" @click="resetForm">Cancel</button>
                <button class="btn-primary" type="submit" :disabled="saving">
                  {{ saving ? 'Saving...' : 'Save profile' }}
                </button>
              </div>
            </form>
          </div>

          <div v-if="viewingOwn" class="card card-pad">
            <h3 class="section-title">Password</h3>
            <p class="helper mb-5">Change your login password for this account.</p>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                v-model="password.newPassword"
                label="New password"
                type="password"
                placeholder="At least 6 characters"
              />
              <FormInput
                v-model="password.confirmPassword"
                label="Confirm password"
                type="password"
                placeholder="Repeat password"
              />
            </div>
            <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs text-text-muted">Leave this alone unless you want to change your password.</p>
              <button class="btn-secondary" type="button" :disabled="savingPassword" @click="savePassword">
                {{ savingPassword ? 'Updating...' : 'Update password' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="card card-pad text-center">
        <h3 class="section-title">Profile not found</h3>
        <p class="helper mt-1">This profile does not exist or you do not have permission to view it.</p>
        <RouterLink class="btn-primary mt-5" to="/profile">Open My Profile</RouterLink>
      </div>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useImagePreviewStore } from '@/stores/imagePreview';

const previewStore = useImagePreviewStore();
const openPhotoPreview = () => {
  if (form.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: form.avatarUrl,
      fullName: form.fullName || form.email,
      email: form.email,
      role: form.role
    });
  }
};
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member } from '@/stores/data';
import { useThemeStore } from '@/stores/theme';
import { roleLabel } from '@/lib/roles';

const auth = useAuthStore();
const data = useDataStore();
const theme = useThemeStore();
const route = useRoute();

const blankMember = (): Member => ({
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

const form = reactive<Member>(blankMember());
const password = reactive({
  newPassword: '',
  confirmPassword: ''
});
const fieldErrors = reactive({
  fullName: '',
  email: ''
});

const success = ref('');
const error = ref('');
const loadingProfile = ref(false);
const profileError = ref<string | null>(null);
const saving = ref(false);
const savingPassword = ref(false);
const uploadingAvatar = ref(false);
const avatarInput = ref<HTMLInputElement | null>(null);

const routeProfileId = computed(() => {
  const id = route.params.userId ?? route.params.id;
  return typeof id === 'string' && id ? id : auth.profile?.id ?? '';
});
const viewingOwn = computed(() => routeProfileId.value === auth.profile?.id);
const canEdit = computed(() => viewingOwn.value || auth.isAdmin);
const targetProfile = computed<Member | null>(() => {
  if (viewingOwn.value) return auth.profile;
  return data.members.find((member) => member.id === routeProfileId.value) ?? null;
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initials = (value: string) =>
  (value || '?')
    .split(/[\s@.]+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const syncForm = (member: Member | null) => {
  if (!member) return;
  Object.assign(form, {
    ...blankMember(),
    ...member,
    preferredTheme: member.preferredTheme === 'dark-gray' ? 'dark-gray' : 'light'
  });
  fieldErrors.fullName = '';
  fieldErrors.email = '';
  success.value = '';
  error.value = '';
};

const validate = () => {
  fieldErrors.fullName = form.fullName.trim() ? '' : 'Full name is required.';
  fieldErrors.email = emailPattern.test(form.email.trim()) ? '' : 'Enter a valid email address.';
  return !fieldErrors.fullName && !fieldErrors.email;
};

const loadProfileData = async () => {
  if (!auth.profile) return;
  loadingProfile.value = true;
  profileError.value = null;
  try {
    if (auth.isAdmin && data.members.length === 0) {
      await data.fetchMembers();
      profileError.value = data.errors.members;
    }
    syncForm(targetProfile.value);
  } catch (err) {
    console.error('[profile] load failed', err);
    profileError.value = 'Could not load this page. Please try again.';
  } finally {
    loadingProfile.value = false;
  }
};

const resetForm = () => {
  syncForm(targetProfile.value);
  password.newPassword = '';
  password.confirmPassword = '';
};

const saveProfile = async () => {
  success.value = '';
  error.value = '';
  if (!canEdit.value || !validate()) return;

  const next: Member = {
    ...form,
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    username: form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || form.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    position: form.position.trim(),
    phone: form.phone.trim(),
    bio: form.bio.trim()
  };

  saving.value = true;
  const oldEmail = viewingOwn.value ? auth.user?.email ?? auth.profile?.email ?? '' : targetProfile.value?.email ?? '';
  if (viewingOwn.value && next.email !== oldEmail) {
    const emailOk = await auth.updateEmail(next.email);
    if (!emailOk) {
      error.value = auth.error ?? 'Could not update email.';
      saving.value = false;
      return;
    }
  }

  const ok = await data.upsertMember(next);
  if (!ok) {
    error.value = data.errors.members ?? 'Could not update profile.';
    saving.value = false;
    return;
  }

  if (viewingOwn.value) {
    await auth.refreshProfile();
    theme.apply(next.preferredTheme);
  } else {
    await data.fetchMembers();
  }

  saving.value = false;
  success.value =
    viewingOwn.value && next.email !== oldEmail
      ? 'Profile updated. Check your inbox if Supabase asks you to confirm the email change.'
      : 'Profile updated successfully.';
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
    error.value = auth.error ?? 'Could not update password.';
    return;
  }
  password.newPassword = '';
  password.confirmPassword = '';
  success.value = 'Password updated successfully.';
};

const onAvatarSelected = async (event: Event) => {
  success.value = '';
  error.value = '';
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !form.id) return;
  if (!file.type.startsWith('image/')) {
    error.value = 'Please choose an image file.';
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Profile photo must be 5MB or smaller.';
    input.value = '';
    return;
  }
  uploadingAvatar.value = true;
  const url = await auth.uploadAvatar(form.id, file);
  uploadingAvatar.value = false;
  input.value = '';
  if (!url) {
    error.value = auth.error ?? 'Could not upload profile photo.';
    return;
  }
  form.avatarUrl = url;
  success.value = 'Photo uploaded. Save the profile to keep this change.';
};

watch(targetProfile, syncForm, { immediate: true });
watch(
  () => route.params.id,
  () => loadProfileData()
);

onMounted(loadProfileData);
</script>
