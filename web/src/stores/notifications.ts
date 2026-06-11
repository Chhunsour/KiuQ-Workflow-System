import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { firebaseConfigured } from '@/lib/firebase';
import { playNotificationSound } from '@/composables/useNotificationSound';

// ── Dev logger ────────────────────────────────────────────────────────────────
const DEV  = import.meta.env.DEV;
const log  = (...a: unknown[]) => { if (DEV) console.log('[notifs]',  ...a); };
const warn = (...a: unknown[]) => { if (DEV) console.warn('[notifs]',  ...a); };
const timing = (...a: unknown[]) => { if (DEV) console.log('[notification timing]', ...a); };

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_comment'
  | 'task_deadline_changed'
  | 'task_needs_fix'
  | 'task_approved'
  | 'task_completed'
  | 'work_reviewed'
  | 'prompt_replaced'
  | 'submission_received'
  | 'blocker_reported'
  | 'blocker_resolved'
  | 'mention'
  | 'blog_followup'
  | 'plugin_update'
  | 'monthly_report'
  | 'ebay_click_followup'
  | 'speed_optimization_followup'
  | 'quality_issue_reported'
  | 'quality_issue_fixed'
  | 'announcement'
  | 'daily_summary';

export interface AppNotification {
  id:           string;
  recipientId:  string;
  actorId:      string | null;
  actorName:    string | null;
  actorAvatarUrl: string | null;
  type:         NotificationType;
  title:        string;
  message:      string;
  relatedType:  string | null;
  relatedId:    string | null;
  taskId:       string | null;
  submissionId: string | null;
  link:         string | null;
  relatedWebsiteId: string | null;
  relatedIssueId: string | null;
  isRead:       boolean;
  emailSent:    boolean;
  createdAt:    string;
  priority:     'critical' | 'high' | 'normal' | 'low';
  seenAt:       string | null;
  acknowledgedAt: string | null;
  startedAt:    string | null;
  completedAt:  string | null;
  escalationLevel: number;
}

interface ActorProfile {
  id: string;
  fullName: string;
  avatarUrl: string;
}

export interface NotificationPreferences {
  id:                  string;
  userId:              string;
  inAppEnabled:        boolean;
  emailEnabled:        boolean;
  browserEnabled:      boolean;
  taskAssignedEmail:   boolean;
  commentsEmail:       boolean;
  reviewEmail:         boolean;
  promptReplacedEmail: boolean;
  deadlineEmail:       boolean;
  mentionEmail:        boolean;
  taskAlertsEnabled:   boolean;
  followupAlertsEnabled: boolean;
  qualityAlertsEnabled: boolean;
  soundEnabled:        boolean;
  desktopEnabled:      boolean;
}

export interface CreateNotificationInput {
  recipientId:  string;
  actorId?:     string;
  type:         NotificationType;
  title:        string;
  message:      string;
  relatedType?: string;
  relatedId?:   string;
  taskId?:      string;
  submissionId?: string;
  /** Optional resolved URL for push notification click. Overrides ROUTE_MAP in edge fn. */
  link?:        string;
  relatedWebsiteId?: string;
  relatedIssueId?: string;
  priority?:    'critical' | 'high' | 'normal' | 'low';
}

export interface CreateAdminNotificationInput {
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  relatedType?: string;
  relatedId?: string;
  taskId?: string;
  submissionId?: string;
  relatedWebsiteId?: string;
  relatedIssueId?: string;
  extraRecipientIds?: string[];
}

interface AdminNotificationPayload {
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  related_type: string | null;
  related_id: string | null;
  task_id: string | null;
  submission_id: string | null;
  is_read: boolean;
  email_sent: boolean;
  link?: string | null;
  related_website_id?: string | null;
  related_issue_id?: string | null;
  priority?: 'critical' | 'high' | 'normal' | 'low';
}

// ── Route map (client-side fallback, mirrors edge function) ───────────────────

const ROUTE_MAP: Record<NotificationType, string> = {
  task_assigned:       '/work-board/my',
  task_updated:        '/work-board/my',
  task_comment:        '/work-board/my',
  task_deadline_changed: '/work-board/my',
  task_needs_fix:      '/review-feedback',
  task_approved:       '/my-submissions',
  task_completed:      '/my-submissions',
  work_reviewed:       '/my-submissions',
  submission_received: '/my-submissions',
  prompt_replaced:     '/prompt-library',
  blocker_reported:    '/work-board/my',
  blocker_resolved:    '/work-board/my',
  mention:             '/work-board/my',
  blog_followup:         '/followup/blog',
  plugin_update:         '/followup/plugins',
  monthly_report:        '/my-submissions',
  ebay_click_followup:   '/followup/ebay-click',
  speed_optimization_followup: '/followup/speed-optimization',
  quality_issue_reported: '/work-board/quality-check',
  quality_issue_fixed:    '/work-board/quality-check',
  announcement:           '/notifications',
  daily_summary:          '/notifications',
};

// Notification types that should trigger email
const EMAIL_TYPES: NotificationType[] = [
  'task_assigned', 'task_needs_fix', 'task_approved', 'task_completed',
  'task_comment', 'task_deadline_changed', 'prompt_replaced',
  'submission_received', 'blocker_resolved', 'mention', 'work_reviewed',
  'blog_followup', 'plugin_update', 'monthly_report',
];

// Notification types that should trigger push
const PUSH_TYPES: NotificationType[] = [
  'task_assigned', 'task_needs_fix', 'task_approved', 'task_comment',
  'work_reviewed', 'submission_received', 'prompt_replaced',
  'blocker_reported', 'mention', 'blog_followup', 'plugin_update',
  'monthly_report',
];

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToNotification = (r: any): AppNotification => ({
  id:           r.id,
  recipientId:  r.recipient_id,
  actorId:      r.actor_id      ?? null,
  actorName:    null,
  actorAvatarUrl: null,
  type:         r.type          as NotificationType,
  title:        r.title,
  message:      r.message,
  relatedType:  r.related_type  ?? null,
  relatedId:    r.related_id    ?? null,
  taskId:       r.task_id       ?? null,
  submissionId: r.submission_id ?? null,
  link:         r.link          ?? null,
  relatedWebsiteId: r.related_website_id ?? null,
  relatedIssueId: r.related_issue_id ?? null,
  isRead:       r.is_read,
  emailSent:    r.email_sent,
  createdAt:    r.created_at,
  priority:     r.priority          || 'normal',
  seenAt:       r.seen_at           || null,
  acknowledgedAt: r.acknowledged_at || null,
  startedAt:    r.started_at        || null,
  completedAt:  r.completed_at      || null,
  escalationLevel: r.escalation_level || 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPrefs = (r: any): NotificationPreferences => ({
  id:                  r.id,
  userId:              r.user_id,
  inAppEnabled:        r.in_app_enabled,
  emailEnabled:        r.email_enabled,
  browserEnabled:      r.browser_enabled,
  taskAssignedEmail:   r.task_assigned_email,
  commentsEmail:       r.comments_email,
  reviewEmail:         r.review_email,
  promptReplacedEmail: r.prompt_replaced_email,
  deadlineEmail:       r.deadline_email,
  mentionEmail:        r.mention_email,
  taskAlertsEnabled:   r.task_alerts_enabled   !== false,
  followupAlertsEnabled: r.followup_alerts_enabled !== false,
  qualityAlertsEnabled: r.quality_alerts_enabled  !== false,
  soundEnabled:        r.sound_enabled         !== false,
  desktopEnabled:      r.desktop_enabled       !== false,
});

const isRoleAdmin = (role: unknown) => {
  const normalized = String(role ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  return normalized === 'admin' || normalized === 'owner';
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([]);
  const actorProfiles = ref<Record<string, ActorProfile>>({});
  const preferences   = ref<NotificationPreferences | null>(null);
  const loading       = ref(false);
  const prefsLoading  = ref(false);
  const initialized   = ref(false);
  const unreadCountValue = ref(0);
  const subscribedUserId = ref('');
  const activeSurpriseTask = ref<AppNotification | null>(null);
  let notificationChannel: RealtimeChannel | null = null;

  const unreadCount = computed(() => unreadCountValue.value);
  const hasUnread   = computed(() => unreadCount.value > 0);

  const setUnreadCount = (value: number) => {
    unreadCountValue.value = Math.max(0, value);
  };

  const addNotificationLocal = (notif: AppNotification, options: { toast?: boolean; timingStart?: number } = {}) => {
    const exists = notifications.value.some((n) => n.id === notif.id);
    if (!exists) {
      notifications.value = [notif, ...notifications.value].slice(0, 100);
      if (!notif.isRead) setUnreadCount(unreadCount.value + 1);
    }

    if (options.toast && !exists) {
      showForegroundToast(notif);
      timing('toast shown', options.timingStart ? `${Math.round(performance.now() - options.timingStart)}ms after action` : '');
    }
  };

  const enrichNotification = (notif: AppNotification): AppNotification => {
    if (!notif.actorId) return notif;
    const actor = actorProfiles.value[notif.actorId];
    if (!actor) return notif;
    return {
      ...notif,
      actorName: actor.fullName,
      actorAvatarUrl: actor.avatarUrl,
    };
  };

  const hydrateNotificationActors = async (items: AppNotification[]): Promise<AppNotification[]> => {
    const ids = Array.from(new Set(
      items
        .map((item) => item.actorId)
        .filter((id): id is string => !!id && !actorProfiles.value[id])
    ));

    if (ids.length > 0) {
      // Read from the `team_directory` view (safe columns, readable by every
      // authenticated user) instead of `profiles` directly — members can't
      // read other people's `profiles` rows under RLS, which previously left
      // the actor name/avatar blank (showing "Team member" / "TM").
      const { data, error } = await supabase
        .rpc('get_team_directory')
        .select('id,full_name,avatar_url')
        .in('id', ids);

      if (error) {
        console.warn('[notification] actor profile fetch failed', error.code, error.message);
      } else {
        const next = { ...actorProfiles.value };
        (data as any[] ?? []).forEach((profile: any) => {
          next[profile.id] = {
            id: profile.id,
            fullName: profile.full_name || 'Team member',
            avatarUrl: profile.avatar_url || '',
          };
        });
        actorProfiles.value = next;
      }
    }

    return items.map(enrichNotification);
  };

  const hydrateExistingNotificationActors = async (items: AppNotification[]) => {
    const hydrated = await hydrateNotificationActors(items);
    const byId = new Map(hydrated.map((item) => [item.id, item]));
    notifications.value = notifications.value.map((item) => byId.get(item.id) ?? item);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchNotifications = async (limit = 20) => {
    if (!supabaseConfigured) return;
    const auth = useAuthStore();
    if (!auth.user?.id) return;

    console.log('[notification] current user id', auth.user.id);
    loading.value = true;
    try {
      // Explicit columns instead of select('*') — only the fields rowToNotification reads.
      const { data, error } = await supabase
        .from('notifications')
        .select('id,recipient_id,actor_id,type,title,message,related_type,related_id,task_id,submission_id,link,related_website_id,related_issue_id,is_read,email_sent,created_at,priority,seen_at,acknowledged_at,started_at,completed_at,escalation_level')
        .eq('recipient_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[notification] fetch error', error.code, error.message);
      } else if (data) {
        notifications.value = await hydrateNotificationActors(data.map(rowToNotification));
        initialized.value = true;
        console.log('[notification] unread count fetched', {
          userId: auth.user.id,
          total: notifications.value.length,
          unread: unreadCount.value,
        });
      }
    } finally {
      loading.value = false;
    }
  };

  const fetchUnreadCount = async () => {
    if (!supabaseConfigured) return;
    const auth = useAuthStore();
    if (!auth.user?.id) return;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', auth.user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[notification] unread count fetch error', error.code, error.message);
      return;
    }

    setUnreadCount(count ?? 0);
    console.log('[notification] unread count fetched', {
      userId: auth.user.id,
      unread: unreadCount.value,
    });
  };

  const fetchPreferences = async () => {
    if (!supabaseConfigured) return;
    const auth = useAuthStore();
    if (!auth.user?.id) return;

    prefsLoading.value = true;
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (data) preferences.value = rowToPrefs(data);
    } finally {
      prefsLoading.value = false;
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────

  const createNotification = async (input: CreateNotificationInput): Promise<string | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();
    const startedAt = performance.now();
    console.log('[notification] action triggered', { type: input.type, recipientId: input.recipientId });
    timing('notification insert started', { type: input.type });

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id:  input.recipientId,
        actor_id:      input.actorId      ?? null,
        type:          input.type,
        title:         input.title,
        message:       input.message,
        related_type:  input.relatedType  ?? null,
        related_id:    input.relatedId    ?? null,
        task_id:       input.taskId       ?? null,
        submission_id: input.submissionId ?? null,
        link:          input.link         ?? null,
        related_website_id: input.relatedWebsiteId ?? null,
        related_issue_id:   input.relatedIssueId   ?? null,
        is_read:       false,
        email_sent:    false,
        priority:      input.priority     ?? 'normal',
      })
      .select('id,recipient_id,actor_id,type,title,message,related_type,related_id,task_id,submission_id,link,related_website_id,related_issue_id,is_read,email_sent,created_at,priority,seen_at,acknowledged_at,started_at,completed_at,escalation_level')
      .single();

    if (error || !data) {
      console.error('[notifs] createNotification:', error?.code, error?.message, error?.hint);
      return null;
    }

    const notifId = data.id as string;
    timing(`insert took ${Math.round(performance.now() - startedAt)}ms`, { type: input.type, id: notifId });
    log('Notification created:', notifId, '→ recipient:', input.recipientId, 'type:', input.type);

    if (auth.user?.id && data.recipient_id === auth.user.id) {
      const [notif] = await hydrateNotificationActors([rowToNotification(data)]);
      addNotificationLocal(notif, { toast: true, timingStart: startedAt });
    }

    // Resolve push link: use explicit link, or map from type
    const link = input.link ?? ROUTE_MAP[input.type] ?? '/';

    // Fire email + push in background — never block the action that created this
    if (EMAIL_TYPES.includes(input.type)) {
      void sendEmailNotification(notifId, input);
    }
    if (PUSH_TYPES.includes(input.type)) {
      void sendPushToEdgeFunction(input.recipientId, input.title, input.message, input.type, link);
    }

    return notifId;
  };

  const createNotificationForMany = async (
    recipientIds: string[],
    input: Omit<CreateNotificationInput, 'recipientId'>
  ) => {
    await Promise.allSettled(
      recipientIds.map((id) => createNotification({ ...input, recipientId: id }))
    );
  };

  const createAdminNotification = async (input: CreateAdminNotificationInput): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const auth = useAuthStore();
    const actorId = input.actorId ?? auth.user?.id ?? null;
    if (!actorId) return false;
    const actionStartedAt = performance.now();

    console.log('[notification] action triggered', {
      actorId,
      type: input.type,
      title: input.title,
      relatedTaskId: input.taskId ?? null,
      relatedWebsiteId: input.relatedWebsiteId ?? null,
      relatedIssueId: input.relatedIssueId ?? null,
    });
    console.log('[notification] current user id', auth.user?.id ?? null);

    let adminIdsCache: string[] | null = null;
    let adminErrorCache: { code?: string; message: string } | null = null;
    let adminLookupLogged = false;
    const adminsPromise = supabase
      .from('profiles')
      .select('id,role,status')
      .eq('status', 'active');

    const loadAdminIds = async () => {
      if (adminIdsCache || adminErrorCache) {
        return { adminIds: adminIdsCache ?? [], adminError: adminErrorCache };
      }

      const { data: admins, error: adminError } = await adminsPromise;
      if (adminError) {
        adminErrorCache = { code: adminError.code, message: adminError.message };
        console.error('[notification] insert error admins lookup failed', adminError.code, adminError.message);
      } else {
        adminIdsCache = (admins ?? []).filter((profile) => isRoleAdmin(profile.role)).map((profile) => profile.id);
        console.log('[notification] admins found', adminIdsCache);
      }
      adminLookupLogged = true;
      return { adminIds: adminIdsCache ?? [], adminError: adminErrorCache };
    };

    void loadAdminIds();

    const rpcPayload = {
      p_actor_id: actorId,
      p_type: input.type,
      p_title: input.title,
      p_message: input.message,
      p_link: input.link,
      p_related_type: input.relatedType ?? null,
      p_related_id: input.relatedId ?? null,
      p_task_id: input.taskId ?? null,
      p_submission_id: input.submissionId ?? null,
      p_related_website_id: input.relatedWebsiteId ?? null,
      p_related_issue_id: input.relatedIssueId ?? null,
      p_extra_recipient_ids: input.extraRecipientIds ?? [],
    };

    console.log('[notification] insert payload', rpcPayload);

    const insertDirectFallback = async () => {
      const { adminIds, adminError } = await loadAdminIds();
      if (adminError || adminIds.length === 0) return false;
      const insertStartedAt = performance.now();
      timing('notification insert started', { type: input.type, mode: 'direct' });

      const actorIsAdmin = adminIds.includes(actorId);
      const recipients = Array.from(new Set(adminIds)).filter((id) => !(actorIsAdmin && id === actorId));
      const directPayload: AdminNotificationPayload[] = recipients.map((recipientId) => {
        const row: AdminNotificationPayload = {
          recipient_id: recipientId,
          actor_id: actorId,
          type: input.type,
          title: input.title,
          message: input.message,
          related_type: input.relatedType ?? null,
          related_id: input.relatedId ?? null,
          task_id: input.taskId ?? null,
          submission_id: input.submissionId ?? null,
          is_read: false,
          email_sent: false,
        };
        if (input.link) row.link = input.link;
        if (input.relatedWebsiteId) row.related_website_id = input.relatedWebsiteId;
        if (input.relatedIssueId) row.related_issue_id = input.relatedIssueId;
        return row;
      });

      console.log('[notification] insert payload direct fallback', directPayload);
      const { data: inserted, error: directError } = await supabase
        .from('notifications')
        .insert(directPayload)
        .select('id,recipient_id,actor_id,type,title,message,related_type,related_id,task_id,submission_id,is_read,email_sent,created_at');

      if (directError) {
        console.error('[notification] insert error direct fallback failed', directError.code, directError.message, directError.hint);
        return false;
      }

      timing(`insert took ${Math.round(performance.now() - insertStartedAt)}ms`, { type: input.type, mode: 'direct' });
      console.log('[notification] insert success', inserted);
      const hydrated = await hydrateNotificationActors((inserted ?? []).map(rowToNotification));
      hydrated.forEach((notif) => {
        if (auth.user?.id && notif.recipientId === auth.user.id) {
          addNotificationLocal(notif, { toast: true, timingStart: actionStartedAt });
        }
      });
      return true;
    };

    const insertStartedAt = performance.now();
    timing('notification insert started', { type: input.type, mode: 'rpc' });
    const { data, error } = await supabase.rpc('create_admin_notifications', rpcPayload);

    if (error) {
      console.error('[notification] insert error rpc failed', error.code, error.message, error.hint);
      return insertDirectFallback();
    }
    const insertedCount = typeof data === 'number' ? data : Number(data ?? 0);
    timing(`insert took ${Math.round(performance.now() - insertStartedAt)}ms`, { type: input.type, mode: 'rpc' });
    console.log('[notification] insert success', { inserted: insertedCount, type: input.type });
    if (!adminLookupLogged) void loadAdminIds();
    if (insertedCount === 0) {
      const { adminIds } = await loadAdminIds();
      if (adminIds.length > 0) {
        console.warn('[notification] insert error rpc inserted 0 rows; trying direct fallback');
        return insertDirectFallback();
      }
    }
    return insertedCount > 0;
  };

  const createTestAdminNotification = async (): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) return false;

    console.log('[notification] action triggered', { type: 'admin_test', actorId: auth.user.id });
    console.log('[notification] current user id', auth.user.id);
    const startedAt = performance.now();

    const payload: AdminNotificationPayload = {
      recipient_id: auth.user.id,
      actor_id: auth.user.id,
      type: 'task_updated',
      title: 'Test admin notification',
      message: 'In-system notification test created successfully.',
      related_type: 'test',
      related_id: null,
      task_id: null,
      submission_id: null,
      is_read: false,
      email_sent: false,
      priority: 'normal',
    };
    console.log('[notification] insert payload', payload);
    timing('notification insert started', { type: 'admin_test' });

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select('id,recipient_id,actor_id,type,title,message,related_type,related_id,task_id,submission_id,is_read,email_sent,created_at,priority,seen_at,acknowledged_at,started_at,completed_at,escalation_level')
      .single();

    if (error) {
      console.error('[notification] insert error test notification failed', error.code, error.message, error.hint);
      return false;
    }

    timing(`insert took ${Math.round(performance.now() - startedAt)}ms`, { type: 'admin_test' });
    console.log('[notification] insert success', data);
    const [notif] = await hydrateNotificationActors([rowToNotification(data)]);
    addNotificationLocal(notif, { toast: true, timingStart: startedAt });
    return true;
  };

  // ── Email ────────────────────────────────────────────────────────────────

  const sendEmailNotification = async (
    notificationId: string,
    input: CreateNotificationInput & {
      recipientEmail?: string;
      recipientName?:  string;
      taskTitle?:      string;
      dueDate?:        string;
    }
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          notification_id: notificationId,
          type:            input.type,
          recipient_email: input.recipientEmail ?? '',
          recipient_name:  input.recipientName  ?? '',
          title:           input.title,
          message:         input.message,
          task_title:      input.taskTitle,
          due_date:        input.dueDate,
          related_type:    input.relatedType,
          related_id:      input.relatedId,
          task_id:         input.taskId,
        },
      });
      if (error) warn('Email edge function error (non-blocking):', error.message);
    } catch (e) {
      warn('sendEmailNotification failed silently:', e);
    }
  };

  // ── Push via edge function ────────────────────────────────────────────────

  /**
   * Calls the send-push-notification edge function.
   * Always passes the resolved `link` so the notification click goes to the right page.
   */
  const sendPushToEdgeFunction = async (
    recipientId: string,
    title:       string,
    body:        string,
    type:        NotificationType,
    link:        string,
  ): Promise<void> => {
    if (!firebaseConfigured || !supabaseConfigured) return;
    try {
      log('Calling send-push-notification edge fn →', { recipientId, type, link });
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id:   recipientId,
          title,
          body_text: body,
          type,
          link,
        },
      });
      if (error) {
        warn('send-push-notification error:', error.message);
      } else {
        log('send-push-notification result:', data);
      }
    } catch (e) {
      warn('sendPushToEdgeFunction threw:', e);
    }
  };

  /**
   * Public helper used by PushNotificationCard "Send Test" and admin test panel.
   */
  const sendPushNotification = async (input: CreateNotificationInput): Promise<void> => {
    const link = input.link ?? ROUTE_MAP[input.type] ?? '/';
    await sendPushToEdgeFunction(input.recipientId, input.title, input.message, input.type, link);
  };

  // ── Mark read ────────────────────────────────────────────────────────────

  const markRead = async (id: string) => {
    const n = notifications.value.find((x) => x.id === id);
    if (!n || n.isRead) return;
    n.isRead = true;
    setUnreadCount(unreadCount.value - 1);
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAsRead = markRead;

  const markAllRead = async () => {
    if (!supabaseConfigured) return;
    const auth = useAuthStore();
    if (!auth.user?.id) return;
    notifications.value.forEach((n) => { n.isRead = true; });
    setUnreadCount(0);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', auth.user.id)
      .eq('is_read', false);
  };

  // ── Seen, Acknowledge, Analytics Actions ───────────────────────────────────

  const markSeen = async (ids: string[]) => {
    if (!supabaseConfigured || ids.length === 0) return;
    const nowStr = new Date().toISOString();
    
    notifications.value.forEach((n) => {
      if (ids.includes(n.id) && !n.seenAt) {
        n.seenAt = nowStr;
      }
    });

    await supabase
      .from('notifications')
      .update({ seen_at: nowStr })
      .in('id', ids)
      .is('seen_at', null);
  };

  const acknowledgeNotification = async (id: string) => {
    const n = notifications.value.find((x) => x.id === id);
    if (!n) return;
    const nowStr = new Date().toISOString();
    n.acknowledgedAt = nowStr;
    n.isRead = true;
    setUnreadCount(unreadCount.value - 1);

    await supabase
      .from('notifications')
      .update({ acknowledged_at: nowStr, is_read: true })
      .eq('id', id);

    // If task/quality issue, auto-acknowledge the issue status too
    if (n.type === 'quality_issue_reported' && n.relatedType === 'quality_issue' && n.relatedId) {
      try {
        const { useQualityCheckStore } = await import('@/stores/qualityCheck');
        const qc = useQualityCheckStore();
        await qc.updateIssue(n.relatedId, { status: 'acknowledged' });
      } catch (e) {
        console.error('[notification] auto-acknowledgement of quality issue failed:', e);
      }
    }
  };

  const fetchAnalytics = async () => {
    if (!supabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_notification_analytics');
    if (error) {
      console.error('[notification] fetchAnalytics error:', error);
      return null;
    }
    return data;
  };

  // ── Realtime ─────────────────────────────────────────────────────────────

  const handleRealtimeInsert = async (row: Record<string, unknown>) => {
    const auth = useAuthStore();
    if (!auth.user?.id) return;
    // Only handle notifications addressed to the current user
    if (row['recipient_id'] !== auth.user.id) return;

    const receivedAt = performance.now();
    const createdAt = typeof row['created_at'] === 'string' ? Date.parse(row['created_at']) : NaN;
    if (!Number.isNaN(createdAt)) {
      timing(`realtime received after ${Math.max(0, Date.now() - createdAt)}ms`, { id: row['id'] });
    } else {
      timing('realtime received', { id: row['id'] });
    }

    const rawNotif = rowToNotification(row);
    console.log('[notification] realtime event received', {
      id: rawNotif.id,
      recipientId: rawNotif.recipientId,
      type: rawNotif.type,
      unreadBefore: unreadCount.value,
    });
    
    // Set active surprise task state if it is a new task assignment
    if (rawNotif.type === 'task_assigned') {
      activeSurpriseTask.value = rawNotif;
    }
    
    // Hydrate actor profile before adding locally so avatar/name are present on toast
    const [notif] = await hydrateNotificationActors([rawNotif]);
    
    addNotificationLocal(notif, { toast: true, timingStart: receivedAt });
    showBrowserNotification(notif.title, notif.message);
    console.log('[notification] unread count fetched', {
      userId: auth.user.id,
      total: notifications.value.length,
      unread: unreadCount.value,
    });
  };

  const handleRealtimeUpdate = (row: Record<string, unknown>) => {
    const auth = useAuthStore();
    if (!auth.user?.id) return;
    if (row['recipient_id'] !== auth.user.id) return;

    const idx = notifications.value.findIndex((n) => n.id === row['id']);
    if (idx !== -1) {
      const wasRead = notifications.value[idx].isRead;
      const next = enrichNotification(rowToNotification(row));
      notifications.value[idx] = next;
      if (!wasRead && next.isRead) setUnreadCount(unreadCount.value - 1);
      if (wasRead && !next.isRead) setUnreadCount(unreadCount.value + 1);
    }
  };

  const handleRealtimePayload = (
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    row: Record<string, unknown>
  ) => {
    if (eventType === 'INSERT') void handleRealtimeInsert(row);
    else if (eventType === 'UPDATE') handleRealtimeUpdate(row);
  };

  const subscribeToNotifications = async (userId: string) => {
    if (!supabaseConfigured || !userId) return;
    if (notificationChannel && subscribedUserId.value === userId) {
      console.log('[notification] realtime subscribed already active for current user');
      return;
    }

    await unsubscribeNotifications();
    subscribedUserId.value = userId;
    console.log('[notification] realtime subscribed building channel without recipient_id filter');

    notificationChannel = supabase.channel(`notifications-personal-${userId}`);
    notificationChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('[notification] realtime event received raw', payload);
          handleRealtimePayload(
            payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            (payload.new ?? payload.old) as Record<string, unknown>
          );
        }
      )
      .subscribe((status) => {
        console.log('[notification] realtime subscribed status:', status);
      });
  };

  const unsubscribeNotifications = async () => {
    if (notificationChannel) {
      await supabase.removeChannel(notificationChannel);
      notificationChannel = null;
    }
    subscribedUserId.value = '';
  };

  // ── Preferences ──────────────────────────────────────────────────────────

  const updatePreferences = async (
    patch: Partial<Omit<NotificationPreferences, 'id' | 'userId'>>
  ) => {
    if (!supabaseConfigured) return;
    const auth = useAuthStore();
    if (!auth.user?.id) return;

    if (preferences.value) Object.assign(preferences.value, patch);

    const dbPatch: Record<string, unknown> = {};
    if (patch.inAppEnabled        !== undefined) dbPatch['in_app_enabled']        = patch.inAppEnabled;
    if (patch.emailEnabled        !== undefined) dbPatch['email_enabled']         = patch.emailEnabled;
    if (patch.browserEnabled      !== undefined) dbPatch['browser_enabled']       = patch.browserEnabled;
    if (patch.taskAssignedEmail   !== undefined) dbPatch['task_assigned_email']   = patch.taskAssignedEmail;
    if (patch.commentsEmail       !== undefined) dbPatch['comments_email']        = patch.commentsEmail;
    if (patch.reviewEmail         !== undefined) dbPatch['review_email']          = patch.reviewEmail;
    if (patch.promptReplacedEmail !== undefined) dbPatch['prompt_replaced_email'] = patch.promptReplacedEmail;
    if (patch.deadlineEmail       !== undefined) dbPatch['deadline_email']        = patch.deadlineEmail;
    if (patch.mentionEmail        !== undefined) dbPatch['mention_email']         = patch.mentionEmail;
    if (patch.taskAlertsEnabled   !== undefined) dbPatch['task_alerts_enabled']   = patch.taskAlertsEnabled;
    if (patch.followupAlertsEnabled !== undefined) dbPatch['followup_alerts_enabled'] = patch.followupAlertsEnabled;
    if (patch.qualityAlertsEnabled  !== undefined) dbPatch['quality_alerts_enabled']  = patch.qualityAlertsEnabled;
    if (patch.soundEnabled         !== undefined) dbPatch['sound_enabled']         = patch.soundEnabled;
    if (patch.desktopEnabled       !== undefined) dbPatch['desktop_enabled']       = patch.desktopEnabled;

    await supabase
      .from('notification_preferences')
      .upsert({ user_id: auth.user.id, ...dbPatch });
  };

  // ── Browser native notification (fallback, not FCM) ──────────────────────

  const requestBrowserPermission = async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  };

  const showBrowserNotification = (title: string, body: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const auth = useAuthStore();
    const isCritical = title.toLowerCase().includes('critical') || body.toLowerCase().includes('critical');
    const isAdmin = auth.profile?.role && ['admin', 'owner', 'head', 'supervisor'].includes(auth.profile.role);
    if (!isCritical || !isAdmin) {
      if (preferences.value && !preferences.value.desktopEnabled) return;
    }
    new Notification(`KiuQ — ${title}`, { body, icon: '/favicon.svg' });
  };

  // ── Foreground toast (shown inside the app when tab is open) ─────────────

  const foregroundToast = ref<any | null>(null);
  let foregroundToastTimer: ReturnType<typeof setTimeout> | null = null;

  const showForegroundToast = (titleOrNotif: string | AppNotification, body?: string) => {
    console.log('[notification] toast shown', { titleOrNotif, body });
    if (typeof titleOrNotif === 'string') {
      foregroundToast.value = { title: titleOrNotif, message: body ?? '', body: body ?? '' };
    } else {
      foregroundToast.value = titleOrNotif;
    }
    if (foregroundToastTimer) clearTimeout(foregroundToastTimer);
    foregroundToastTimer = setTimeout(() => {
      foregroundToast.value = null;
    }, 5000);
    
    const title = typeof titleOrNotif === 'string' ? titleOrNotif : titleOrNotif.title;
    const msg = typeof titleOrNotif === 'string' ? (body ?? '') : titleOrNotif.message;

    const auth = useAuthStore();
    const isCritical = title.toLowerCase().includes('critical') || msg.toLowerCase().includes('critical');
    const isAdmin = auth.profile?.role && ['admin', 'owner', 'head', 'supervisor'].includes(auth.profile.role);
    
    if (isCritical && isAdmin) {
      setTimeout(() => {
        void playNotificationSound();
      }, 0);
    } else if (preferences.value?.soundEnabled !== false) {
      setTimeout(() => {
        void playNotificationSound();
      }, 0);
    }
  };

  // ── Reset (on logout) ────────────────────────────────────────────────────

  const reset = () => {
    notifications.value = [];
    unreadCountValue.value = 0;
    preferences.value   = null;
    initialized.value   = false;
    loading.value       = false;
    foregroundToast.value = null;
  };

  return {
    notifications,
    preferences,
    loading,
    prefsLoading,
    initialized,
    unreadCount,
    hasUnread,
    fetchNotifications,
    fetchUnreadCount,
    fetchPreferences,
    addNotificationLocal,
    createNotification,
    createNotificationForMany,
    createAdminNotification,
    createTestAdminNotification,
    markRead,
    markAsRead,
    markAllRead,
    subscribeToNotifications,
    unsubscribeNotifications,
    handleRealtimePayload,
    updatePreferences,
    requestBrowserPermission,
    showBrowserNotification,
    foregroundToast,
    showForegroundToast,
    sendPushNotification,
    activeSurpriseTask,
    markSeen,
    acknowledgeNotification,
    fetchAnalytics,
    reset,
  };
});
