import { computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { useQualityCheckStore } from '@/stores/qualityCheck';
import { useNotificationsStore } from '@/stores/notifications';
import { useCmsProductsStore } from '@/stores/cmsProducts';
import { useCmsBlogPostsStore } from '@/stores/cmsBlogPosts';
import { useBlogImageCenterStore } from '@/stores/blogImageCenter';
import { useCommandCenterStore } from '@/stores/commandCenter';

const FOLLOWUP_TABLES = new Set(['blog_upload_slots', 'blog_followup_schedules', 'plugin_update_slots', 'speed_optimization_slots', 'ebay_click_followup']);
const QUALITY_TABLES  = new Set(['quality_issues', 'quality_issue_comments', 'quality_classes']);
const CMS_TABLES      = new Set(['cms_products', 'cms_blog_posts']);
const BLOG_IMAGE_TABLES = new Set(['blog_images', 'blog_image_prompts', 'blog_image_workflows']);

export type RealtimeStatus = 'idle' | 'live' | 'reconnecting' | 'offline';

export interface RealtimeToast {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
}

export type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

const state = reactive({
  status: 'idle' as RealtimeStatus,
  loading: false,
  error: null as string | null,
  toasts: [] as RealtimeToast[]
});

let channel: RealtimeChannel | null = null;
const recentToasts = new Map<string, number>();
const toastWindowMs = 30 * 1000;

// Track which tables are currently needed by active pages
const activeTableSubscriptions = new Map<string, number>();
let subscriptionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const currentUserId = () => useAuthStore().user?.id ?? '';

const setStatus = (status: RealtimeStatus) => {
  state.status = status;
};

const removeToast = (id: string) => {
  state.toasts = state.toasts.filter((toast) => toast.id !== id);
};

export const pushToast = (title: string, message: string, tone: RealtimeToast['tone'] = 'info', key = `${title}:${message}`) => {
  const now = Date.now();
  const previous = recentToasts.get(key) ?? 0;
  if (now - previous < toastWindowMs) return;
  recentToasts.set(key, now);

  const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  state.toasts = [...state.toasts.slice(-3), { id, title, message, tone }];
  setTimeout(() => removeToast(id), 5200);
};

const isOwn = (id: unknown) => !!id && id === currentUserId();

const maybeToast = (payload: RealtimePayload) => {
  const auth = useAuthStore();
  const uid = currentUserId();
  if (!uid || payload.eventType === 'DELETE') return;

  if (payload.table === 'prompt_assignments' && payload.eventType === 'INSERT' && isOwn(payload.new.assigned_member_id)) {
    pushToast('New task assigned', 'Admin assigned a new prompt task to you.', 'info', `assignment:${payload.new.id}`);
    return;
  }
  if (payload.table === 'submissions' && payload.eventType === 'UPDATE' && isOwn(payload.new.submitted_by)) {
    const status = asString(payload.new.status);
    if (status === 'approved') {
      pushToast('Submission approved', 'Admin approved your submitted work.', 'success', `submission-approved:${payload.new.id}`);
    } else if (status === 'needs_fix') {
      pushToast('Submission needs fix', 'Admin requested fixes on your submitted work.', 'warning', `submission-fix:${payload.new.id}`);
    } else if (status === 'rejected') {
      pushToast('Submission rejected', 'Admin rejected your submitted work.', 'warning', `submission-rejected:${payload.new.id}`);
    }
  }
  // Simplified toast logic to reduce noise
};

// Toast labels for important notification types
const notifToastTone: Record<string, RealtimeToast['tone']> = {
  task_assigned:         'info',
  task_needs_fix:        'warning',
  task_approved:         'success',
  task_completed:        'success',
  task_comment:          'info',
  task_deadline_changed: 'info',
  prompt_replaced:       'info',
  submission_received:   'info',
  blocker_resolved:      'success',
  mention:               'info',
  work_reviewed:         'info',
  blog_followup:         'success',
  plugin_update:         'success',
  ebay_click_followup:   'success',
  speed_optimization_followup: 'success',
  quality_issue_reported: 'info',
  quality_issue_fixed:   'success',
};

const handlePayload = (payload: RealtimePayload) => {
  // Handle in-app notifications from the notifications table
  if (payload.table === 'notifications' && payload.eventType === 'INSERT') {
    if (import.meta.env.DEV) {
      console.log('[notification] realtime event received', payload.new);
    }
    const notifs = useNotificationsStore();
    notifs.handleRealtimePayload('INSERT', payload.new);

    // Show a toast for new incoming notifications (only for current user)
    const uid = currentUserId();
    if (uid && payload.new['recipient_id'] === uid) {
      const type  = asString(payload.new['type']);
      const title = asString(payload.new['title']);
      const msg   = asString(payload.new['message']);
      const tone  = notifToastTone[type] ?? 'info';
      if (import.meta.env.DEV) {
        console.log('[notification] toast shown', { id: payload.new['id'], type, title });
      }
      pushToast(title, msg, tone, `notif:${payload.new['id']}`);
    }
    return;
  }

  if (payload.table === 'notifications' && payload.eventType === 'UPDATE') {
    const notifs = useNotificationsStore();
    notifs.handleRealtimePayload('UPDATE', payload.new);
    return;
  }

  // Instead of triggering a full table fetch, just push a toast if necessary
  maybeToast(payload);

  if (import.meta.env.DEV) {
    console.log(`[realtime] ${payload.eventType} on ${payload.table}`);
  }

  // Route followup tables to followup store, quality tables to quality store,
  // everything else to the main data store.
  if (FOLLOWUP_TABLES.has(payload.table)) {
    const followup = useFollowupStore();
    if (typeof followup.handleRealtimePayload === 'function') {
      followup.handleRealtimePayload(payload);
    }
  } else if (QUALITY_TABLES.has(payload.table)) {
    const qc = useQualityCheckStore();
    if (typeof qc.handleRealtimePayload === 'function') {
      qc.handleRealtimePayload(payload);
    }
  } else if (CMS_TABLES.has(payload.table)) {
    if (payload.table === 'cms_blog_posts') {
      const blogPosts = useCmsBlogPostsStore();
      blogPosts.handleRealtimePayload(payload);
    } else {
      const cms = useCmsProductsStore();
      cms.handleRealtimePayload(payload);
    }
  } else if (BLOG_IMAGE_TABLES.has(payload.table)) {
    const blogImage = useBlogImageCenterStore();
    if (typeof blogImage.handleRealtimePayload === 'function') {
      blogImage.handleRealtimePayload(payload);
    }
  } else if (payload.table === 'command_center_entries' || payload.table === 'command_center_metrics') {
    const cc = useCommandCenterStore();
    cc.handleRealtimePayload(payload);
  } else {
    const data = useDataStore();
    if (typeof data.handleRealtimePayload === 'function') {
      data.handleRealtimePayload(payload);
    }
    // websites is shared: QC store also caches the website→class map,
    // so it needs to hear about website inserts/updates/deletes too.
    if (payload.table === 'websites') {
      const qc = useQualityCheckStore();
      if (typeof qc.handleRealtimePayload === 'function') {
        qc.handleRealtimePayload(payload);
      }
    }
  }
};

const applySubscriptions = async () => {
  if (!supabaseConfigured) {
    setStatus('offline');
    return;
  }
  const tablesToWatch = Array.from(activeTableSubscriptions.keys());

  // Tear down existing channels
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }

  if (tablesToWatch.length === 0) {
    setStatus('idle');
    return;
  }

  state.loading = true;
  setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting');

  // Shared channel for all tables except notifications
  const sharedTables = tablesToWatch.filter((t) => t !== 'notifications');
  if (sharedTables.length > 0) {
    channel = supabase.channel('page-live-updates');
    sharedTables.forEach((table) => {
      channel?.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => handlePayload(payload as RealtimePayload)
      );
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setStatus('live');
        state.loading = false;
        state.error = null;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting');
        state.loading = false;
        state.error = 'Live updates disconnected.';
      } else if (status === 'CLOSED') {
        setStatus('reconnecting');
        state.loading = false;
      }
    });
  }

  // Dedicated notifications channel built separately via rebuildNotifChannel()
  // so it can be created after auth is ready (uid is known).
};

const rebuildNotifChannel = async () => {
  if (!supabaseConfigured) return;
  const uid = currentUserId();
  console.log('[notification] realtime rebuild called, current user id=', uid);
  if (!uid) return;
  await useNotificationsStore().subscribeToNotifications(uid);
};

const triggerResubscribe = () => {
  if (subscriptionDebounceTimer) clearTimeout(subscriptionDebounceTimer);
  subscriptionDebounceTimer = setTimeout(() => {
    void applySubscriptions();
  }, 100);
};

export const subscribeToTables = (tables: string[]) => {
  let changed = false;
  tables.forEach(table => {
    const count = activeTableSubscriptions.get(table) || 0;
    activeTableSubscriptions.set(table, count + 1);
    if (count === 0) changed = true;
  });
  if (changed) {
    if (import.meta.env.DEV) console.log('[realtime] subscribed:', tables.join(', '));
    triggerResubscribe();
  }
};

export const unsubscribeFromTables = (tables: string[]) => {
  let changed = false;
  tables.forEach(table => {
    const count = (activeTableSubscriptions.get(table) || 1) - 1;
    if (count <= 0) {
      activeTableSubscriptions.delete(table);
      changed = true;
    } else {
      activeTableSubscriptions.set(table, count);
    }
  });
  if (changed) {
    if (import.meta.env.DEV) console.log('[realtime] unsubscribed:', tables.join(', '));
    triggerResubscribe();
  }
};

export const usePageRealtime = (tables: string[]) => {
  onMounted(() => {
    subscribeToTables(tables);
  });
  onBeforeUnmount(() => {
    unsubscribeFromTables(tables);
  });
};

const stopRealtime = async () => {
  if (subscriptionDebounceTimer) clearTimeout(subscriptionDebounceTimer);
  activeTableSubscriptions.clear();
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }
  await useNotificationsStore().unsubscribeNotifications();
  state.loading = false;
  setStatus('idle');
};

const bindNetworkListeners = () => {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    setStatus('reconnecting');
    triggerResubscribe();
  });
  window.addEventListener('offline', () => setStatus('offline'));
};

let networkBound = false;
const ensureNetworkListeners = () => {
  if (networkBound) return;
  bindNetworkListeners();
  networkBound = true;
};

export const useRealtimeService = () => {
  ensureNetworkListeners();
  return {
    status: computed(() => state.status),
    label: computed(() =>
      state.status === 'live'
        ? 'Live'
        : state.status === 'offline'
          ? 'Offline'
          : state.status === 'idle'
            ? 'Offline'
            : 'Reconnecting...'
    ),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    toasts: computed(() => state.toasts),
    stop: stopRealtime,
    removeToast,
    rebuildNotifChannel,
  };
};
