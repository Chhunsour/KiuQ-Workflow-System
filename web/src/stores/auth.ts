import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { profileToMember, type ProfileRow } from '@/lib/db';
import { isAdminRole, isApprovedStatus, isAssistantHeadRole, isHeadOrSupervisorRole, isOwnerAdminOrHeadRole, isMemberRole, isQualityCheckerRole, isViewerRole, normalizeRole } from '@/lib/roles';
import type { ActivityAction, ActivityLog, Member } from '@/stores/data';

type PresenceStatus = 'online' | 'away' | 'offline';
type PresenceOptions = {
  force?: boolean;
  status?: PresenceStatus;
};
type ProfileLoadOptions = {
  blocking?: boolean;
};

const AUTH_TIMEOUT_MS = 10_000;

const errMsg = (err: unknown) =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong';

const withTimeout = async <T>(promise: PromiseLike<T>, label: string, ms = AUTH_TIMEOUT_MS): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const cachedProfileKey = (uid: string) => `kiuq-profile-cache:${uid}`;

const readCachedProfile = (uid: string): Member | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cachedProfileKey(uid));
    return raw ? (JSON.parse(raw) as Member) : null;
  } catch {
    return null;
  }
};

const writeCachedProfile = (member: Member) => {
  if (typeof window === 'undefined' || !member.id) return;
  try {
    window.localStorage.setItem(cachedProfileKey(member.id), JSON.stringify(member));
  } catch {
    // localStorage can be blocked in private windows; the app should still work.
  }
};

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);
  const profile = ref<Member | null>(null);
  const initializing = ref(true);
  const initialized = ref(false);
  const profileLoading = ref(false);
  const dataLoading = ref(false);
  const realtimeLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!session.value);
  const currentUser = computed(() => user.value);
  const currentRole = computed(() => profile.value?.role ?? null);
  const normalizedRole = computed(() => normalizeRole(profile.value?.role));
  const isAdmin = computed(() => isAdminRole(profile.value?.role));
  const isQualityChecker = computed(() => isQualityCheckerRole(profile.value?.role));
  /** Assistant Head — uses the Team Member dashboard but with extra
   *  Quality Check approval power (wired up in the QC approval pass). */
  const isAssistantHead = computed(() => isAssistantHeadRole(profile.value?.role));
  const isHeadOrSupervisor = computed(() => isHeadOrSupervisorRole(profile.value?.role));
  /** Owner / Admin / Head — gate for the Winner Center (excludes Supervisor and below). */
  const canAccessWinnerCenter = computed(() => isOwnerAdminOrHeadRole(profile.value?.role));
  // `isMember` used to be `!isAdmin`, which incorrectly treated a Quality
  // Checker as a member and granted them every member surface. Now an
  // explicit role check — a QC is *not* a member. AH IS a member-class
  // for routing/sidebar purposes (shares the Team Member dashboard).
  const isMember = computed(() => isMemberRole(profile.value?.role));
  const isViewer = computed(() => isViewerRole(profile.value?.role));
  // Approval gate: pending/deactivated accounts get redirected to the
  // pending screen before any other guard fires.
  const accountStatus = computed(() => profile.value?.status ?? null);
  const isApproved = computed(() => isApprovedStatus(profile.value?.status));
  const canEdit = computed(() => isAdmin.value);
  const canDelete = computed(() => isAdmin.value);
  const canReview = computed(() => isAdmin.value);
  const authLoading = computed(() => initializing.value);

  let unsub: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let listenersBound = false;
  let initPromise: Promise<void> | null = null;
  let lastPresenceWrite = 0;
  let lastLoginWrite = 0;
  let lastLocalActivity = Date.now();
  const recentActions = new Map<string, number>();
  const presenceThrottleMs = 60 * 1000;

  const nowIso = () => new Date().toISOString();
  const currentPagePath = () =>
    typeof window === 'undefined'
      ? ''
      : `${window.location.pathname}${window.location.search}`.slice(0, 180);

  const fallbackRoleForUser = (target: User): Member['role'] => {
    const metadataRole =
      typeof target.user_metadata?.role === 'string'
        ? target.user_metadata.role
        : typeof target.app_metadata?.role === 'string'
          ? target.app_metadata.role
          : '';
    if (metadataRole) return metadataRole as Member['role'];
    const email = (target.email ?? '').toLowerCase();
    return email === 'sour@kiuq.com' ? 'admin' : 'member';
  };

  const fallbackProfileFromUser = (target: User): Member => {
    const timestamp = nowIso();
    const fullName =
      (target.user_metadata?.full_name as string | undefined) ||
      (target.user_metadata?.name as string | undefined) ||
      (target.email ? target.email.split('@')[0] : 'User');
    const cached = readCachedProfile(target.id);
    return {
      id: target.id,
      fullName,
      email: target.email ?? '',
      role: fallbackRoleForUser(target),
      status: 'active',
      avatarUrl: '',
      username: (target.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      position: '',
      phone: '',
      bio: '',
      preferredTheme: 'light',
      isOnline: true,
      currentStatus: 'online',
      lastActiveAt: timestamp,
      lastLoginAt: cached?.lastLoginAt ?? '',
      lastLogoutAt: cached?.lastLogoutAt ?? '',
      todayActivityCount: cached?.todayActivityCount ?? 0,
      currentPage: currentPagePath(),
      createdAt: cached?.createdAt ?? '',
      updatedAt: timestamp,
      notes: '',
      lastSeenUpdateId: ''
    };
  };

  const useFallbackProfile = (reason: unknown) => {
    if (!user.value) return;
    const cached = readCachedProfile(user.value.id);
    const timestamp = nowIso();
    profile.value = {
      ...(cached ?? fallbackProfileFromUser(user.value)),
      isOnline: true,
      currentStatus: 'online',
      lastActiveAt: timestamp,
      currentPage: currentPagePath(),
      updatedAt: timestamp
    };
    writeCachedProfile(profile.value);
    error.value = null;
    console.warn('[auth] using local profile fallback', reason);
  };

  const patchProfilePresence = (patch: Partial<Member>) => {
    if (!profile.value) return;
    profile.value = { ...profile.value, ...patch };
  };

  const writePresence = async (
    currentPage = currentPagePath(),
    status: PresenceStatus,
    options: PresenceOptions = {},
    updateLastActive = status === 'online'
  ): Promise<void> => {
    if (!supabaseConfigured || !user.value?.id) return;
    const now = Date.now();
    if (!options.force && now - lastPresenceWrite < presenceThrottleMs) return;
    lastPresenceWrite = now;

    const timestamp = nowIso();
    try {
      const { error: rpcError } = await withTimeout(
        supabase.rpc('touch_profile_presence', {
          p_current_page: currentPage,
          p_status: status
        }),
        'presence update'
      );

      if (rpcError) {
        await withTimeout(
          supabase
            .from('profiles')
            .update({
              is_online: status === 'online',
              current_status: status,
              last_active_at: updateLastActive ? timestamp : profile.value?.lastActiveAt || null,
              current_page: currentPage,
              updated_at: timestamp
            })
            .eq('id', user.value.id),
          'presence fallback update'
        );
      }

      patchProfilePresence({
        isOnline: status === 'online',
        currentStatus: status,
        lastActiveAt: updateLastActive ? timestamp : profile.value?.lastActiveAt ?? '',
        currentPage,
        updatedAt: timestamp
      });
    } catch (err) {
      console.warn('[auth] presence update failed', err);
    }
  };

  const touchActive = async (
    currentPage = currentPagePath(),
    options: PresenceOptions = {}
  ): Promise<void> => {
    lastLocalActivity = Date.now();
    await writePresence(currentPage, options.status ?? 'online', options, true);
  };

  const syncPresenceFromLocalActivity = async (): Promise<void> => {
    const age = Date.now() - lastLocalActivity;
    if (age <= 2 * 60 * 1000) {
      await writePresence(currentPagePath(), 'online', { force: true }, true);
    } else if (age <= 10 * 60 * 1000) {
      await writePresence(currentPagePath(), 'away', { force: true }, false);
    } else {
      await writePresence(currentPagePath(), 'offline', { force: true }, false);
    }
  };

  const recordActivity = async (
    action: ActivityAction,
    relatedType: ActivityLog['relatedType'],
    relatedId: string | null,
    message: string,
    targetUserId?: string | null,
    touchPresence = true
  ): Promise<void> => {
    if (!supabaseConfigured || !user.value?.id) return;
    const uid = targetUserId ?? user.value.id;
    const currentPage = currentPagePath();
    const timestamp = nowIso();
    const isOwnActivity = touchPresence && uid === user.value.id;
    if (isOwnActivity) lastLocalActivity = Date.now();

    // Throttle repetitive actions (e.g. copying same prompt multiple times)
    const actionKey = `${uid}:${action}:${relatedId}`;
    const lastActionTime = recentActions.get(actionKey) || 0;
    const now = Date.now();
    const actionThrottleMs = action === 'copied_prompt' || action === 'opened_task' ? 5 * 60 * 1000 : 1000;
    if (now - lastActionTime < actionThrottleMs) return;
    recentActions.set(actionKey, now);

    try {
      const { error: rpcError } = await withTimeout(
        supabase.rpc('record_activity_log', {
          p_user_id: uid,
          p_action: action,
          p_related_type: relatedType,
          p_related_id: relatedId,
          p_message: message,
          p_current_page: currentPage,
          p_touch_presence: touchPresence
        }),
        'activity log write'
      );

      if (rpcError) {
        await withTimeout(
          supabase.from('activity_logs').insert({
            user_id: uid,
            action,
            related_type: relatedType,
            related_id: relatedId,
            message
          }),
          'activity fallback write'
        );
        if (touchPresence && uid === user.value.id) {
          void touchActive(currentPage, { force: true });
        }
      }
      if (isOwnActivity) {
        patchProfilePresence({
          isOnline: true,
          currentStatus: 'online',
          lastActiveAt: timestamp,
          currentPage,
          updatedAt: timestamp
        });
      }
    } catch (err) {
      console.warn('[auth] activity log failed', err);
    }
  };

  const onWindowActivity = () => {
    void touchActive(currentPagePath());
  };

  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void touchActive(currentPagePath(), { force: true });
    }
  };

  const bindActivityListeners = () => {
    if (listenersBound || typeof window === 'undefined' || typeof document === 'undefined') return;
    window.addEventListener('click', onWindowActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    listenersBound = true;
  };

  const unbindActivityListeners = () => {
    if (!listenersBound || typeof window === 'undefined' || typeof document === 'undefined') return;
    window.removeEventListener('click', onWindowActivity);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    listenersBound = false;
  };

  const startHeartbeat = () => {
    if (typeof window === 'undefined') return;
    bindActivityListeners();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      void syncPresenceFromLocalActivity();
    }, 60 * 1000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    unbindActivityListeners();
  };

  const recordLogin = async () => {
    if (!supabaseConfigured || !user.value?.id) return;
    try {
      const now = Date.now();
      if (now - lastLoginWrite < 5000) return;
      lastLoginWrite = now;
      const timestamp = nowIso();
      lastLocalActivity = Date.now();
      await withTimeout(
        supabase
          .from('profiles')
          .update({
            is_online: true,
            current_status: 'online',
            last_login_at: timestamp,
            last_active_at: timestamp,
            current_page: currentPagePath(),
            updated_at: timestamp
          })
          .eq('id', user.value.id),
        'login presence update'
      );
      patchProfilePresence({
        isOnline: true,
        currentStatus: 'online',
        lastLoginAt: timestamp,
        lastActiveAt: timestamp,
        currentPage: currentPagePath(),
        updatedAt: timestamp
      });
      void recordActivity('user_logged_in', 'profile', user.value.id, 'User logged in.');
    } catch (err) {
      console.warn('[auth] login presence failed', err);
    }
  };

  const recordLogout = async () => {
    if (!supabaseConfigured || !user.value?.id) return;
    try {
      const uid = user.value.id;
      const timestamp = nowIso();
      lastLocalActivity = 0;
      void recordActivity('user_logged_out', 'profile', uid, 'User logged out.', uid, false);
      await withTimeout(
        supabase
          .from('profiles')
          .update({
            is_online: false,
            current_status: 'offline',
            last_logout_at: timestamp,
            current_page: '',
            updated_at: timestamp
          })
          .eq('id', uid),
        'logout presence update'
      );
      patchProfilePresence({
        isOnline: false,
        currentStatus: 'offline',
        lastLogoutAt: timestamp,
        currentPage: '',
        updatedAt: timestamp
      });
    } catch (err) {
      console.warn('[auth] logout presence failed', err);
    }
  };

  const loadProfile = async (uid: string, options: ProfileLoadOptions = {}): Promise<void> => {
    const blocking = options.blocking ?? !initialized.value;
    if (blocking) profileLoading.value = true;
    try {
      const { data, error: err } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single(),
        'profile load'
      );
      if (err) {
        const { data: created, error: createErr } = await withTimeout(
          supabase
            .from('profiles')
            .insert({
              id: uid,
              email: user.value?.email ?? '',
              full_name: (user.value?.user_metadata?.full_name as string | undefined) ?? '',
              // New self-registered accounts default to the limited
              // Quality Checker role (never a team member) and are
              // auto-approved so they can start reporting quality issues
              // immediately. Their reach is intentionally narrow — only
              // the Quality Check surface and their own profile — so the
              // approval gate isn't needed for safety. Head/Supervisor
              // can later promote or revoke any QC from the Members page.
              role: 'quality_checker',
              status: 'active'
            })
            .select('*')
            .single(),
          'profile create'
        );
        if (!createErr) {
          profile.value = profileToMember(created as ProfileRow);
          writeCachedProfile(profile.value);
          console.info('[auth] Profile created');
          return;
        }
        console.error('[auth] create profile failed', createErr);
        useFallbackProfile(createErr);
        return;
      }
      profile.value = profileToMember(data as ProfileRow);
      writeCachedProfile(profile.value);
      console.info('[auth] Profile loaded');
    } catch (err) {
      console.error('[auth] load profile failed', err);
      useFallbackProfile(err);
    } finally {
      if (blocking) profileLoading.value = false;
    }
  };

  const runInit = async () => {
    if (!supabaseConfigured) {
      initializing.value = false;
      initialized.value = true;
      error.value =
        'Supabase is not configured. Copy web/.env.example to web/.env and add your Supabase URL and anon key.';
      return;
    }

    initializing.value = true;
    initialized.value = false;
    error.value = null;
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 'session load');
      session.value = data.session;
      user.value = data.session?.user ?? null;
      console.info('[auth] Session loaded');
      if (user.value) {
        await loadProfile(user.value.id, { blocking: true });
        if (profile.value) {
          startHeartbeat();
          void touchActive(currentPagePath(), { force: true });
        }
      }

      if (!unsub) {
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, next) => {
          session.value = next;
          user.value = next?.user ?? null;
          if (user.value) {
            try {
              await loadProfile(user.value.id, { blocking: false });
              if (profile.value) {
                startHeartbeat();
                if (event === 'SIGNED_IN') void recordLogin();
                else void touchActive(currentPagePath(), { force: true });
              }
            } catch (err) {
              console.error('[auth] auth change failed', err);
            }
          } else {
            stopHeartbeat();
            profile.value = null;
          }
        });
        unsub = () => listener.subscription.unsubscribe();
      }
    } catch (err) {
      console.error('[auth] init failed', err);
      error.value = errMsg(err).includes('timed out')
        ? 'Could not load your session in time. Please try again.'
        : 'Could not load your session. Please try again.';
      session.value = null;
      user.value = null;
      profile.value = null;
      stopHeartbeat();
    } finally {
      initializing.value = false;
      initialized.value = true;
      console.info('[auth] Auth initialized');
    }
  };

  const init = async () => {
    if (initPromise) return initPromise;
    initPromise = runInit().finally(() => {
      initPromise = null;
    });
    return initPromise;
  };

  const retryInit = async () => {
    if (initPromise) {
      void initPromise.catch(() => undefined);
      initPromise = null;
    }
    return init();
  };

  const finishTimedOutInit = () => {
    if (session.value?.user && !user.value) {
      user.value = session.value.user;
    }

    if (user.value && !profile.value) {
      useFallbackProfile(new Error('auth/profile initialization timed out'));
    }

    if (user.value && profile.value) {
      error.value = null;
      startHeartbeat();
      void touchActive(currentPagePath(), { force: true });
    } else {
      error.value = 'Could not load your session in time. Please try again.';
    }

    profileLoading.value = false;
    initializing.value = false;
    initialized.value = true;
  };

  const cleanup = () => {
    unsub?.();
    unsub = null;
    stopHeartbeat();
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    error.value = null;
    if (!supabaseConfigured) {
      error.value = 'Supabase is not configured.';
      return false;
    }
    try {
      const { data, error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        'sign in'
      );
      if (err) {
        error.value = err.message;
        return false;
      }
      session.value = data.session;
      user.value = data.user;
      if (data.user) {
        await loadProfile(data.user.id, { blocking: true });
        if (!profile.value) return false;
        startHeartbeat();
        void recordLogin();
      }
      return true;
    } catch (err) {
      console.error('[auth] sign in failed', err);
      const message = errMsg(err);
      error.value = message.includes('timed out') ? 'Sign in timed out. Please try again.' : message;
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<boolean> => {
    error.value = null;
    if (!supabaseConfigured) {
      error.value = 'Supabase is not configured.';
      return false;
    }
    try {
      const { data, error: err } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        }),
        'sign up'
      );
      if (err) {
        error.value = err.message;
        return false;
      }
      session.value = data.session;
      user.value = data.user;
      if (data.user) {
        await loadProfile(data.user.id, { blocking: true });
        if (!profile.value) return false;
        startHeartbeat();
        void recordLogin();
      }
      return true;
    } catch (err) {
      console.error('[auth] sign up failed', err);
      error.value = 'Could not create your account. Please try again.';
      return false;
    }
  };

  const signOut = async () => {
    error.value = null;
    void recordLogout();
    stopHeartbeat();
    try {
      await withTimeout(supabase.auth.signOut(), 'sign out');
    } catch (err) {
      console.warn('[auth] sign out request failed', err);
    }
    session.value = null;
    user.value = null;
    profile.value = null;
  };

  const updateEmail = async (email: string): Promise<boolean> => {
    error.value = null;
    if (!supabaseConfigured) {
      error.value = 'Supabase is not configured.';
      return false;
    }
    try {
      const { data, error: err } = await withTimeout(supabase.auth.updateUser({ email }), 'email update');
      if (err) {
        error.value = err.message;
        return false;
      }
      user.value = data.user;
      return true;
    } catch (err) {
      console.error('[auth] email update failed', err);
      error.value = 'Could not update email. Please try again.';
      return false;
    }
  };

  const updatePassword = async (password: string): Promise<boolean> => {
    error.value = null;
    if (!supabaseConfigured) {
      error.value = 'Supabase is not configured.';
      return false;
    }
    try {
      const { error: err } = await withTimeout(supabase.auth.updateUser({ password }), 'password update');
      if (err) {
        error.value = err.message;
        return false;
      }
      return true;
    } catch (err) {
      console.error('[auth] password update failed', err);
      error.value = 'Could not update password. Please try again.';
      return false;
    }
  };

  const uploadAvatar = async (profileId: string, file: File): Promise<string | null> => {
    error.value = null;
    if (!supabaseConfigured) {
      error.value = 'Supabase is not configured.';
      return null;
    }
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${profileId}/${Date.now()}.${ext}`;
    try {
      const { error: err } = await withTimeout(
        supabase.storage.from('avatars').upload(path, file, {
          cacheControl: '3600',
          upsert: true
        }),
        'avatar upload'
      );
      if (err) {
        error.value = err.message;
        return null;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error('[auth] avatar upload failed', err);
      error.value = 'Could not upload profile photo. Please try again.';
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user.value) await loadProfile(user.value.id, { blocking: false });
  };

  return {
    // state
    session,
    user,
    profile,
    initializing,
    initialized,
    profileLoading,
    authLoading,
    dataLoading,
    realtimeLoading,
    error,
    // derived
    isAuthenticated,
    currentUser,
    currentRole,
    isAdmin,
    isHeadOrSupervisor,
    canAccessWinnerCenter,
    isMember,
    isViewer,
    isAssistantHead,
    isQualityChecker,
    accountStatus,
    isApproved,
    canEdit,
    canDelete,
    canReview,
    // actions
    init,
    retryInit,
    finishTimedOutInit,
    cleanup,
    signIn,
    signUp,
    signOut,
    updateEmail,
    updatePassword,
    uploadAvatar,
    refreshProfile,
    touchActive,
    recordActivity
  };
});
