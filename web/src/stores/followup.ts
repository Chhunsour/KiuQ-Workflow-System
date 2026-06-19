import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore, type NotificationType } from '@/stores/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EbayClickStatus = 'pending' | 'done' | 'missed' | 'no_work_day';
export type EbayCompletionSource = 'member' | 'admin_manual' | 'admin_auto_fill' | 'not_required_today';
export type EbayAutoFillActionType = 'admin_auto_fill' | 'not_required_today';

export interface EbayClickEntry {
  id: string;
  userId: string;
  date: string;        // YYYY-MM-DD
  dayName: string;
  status: 'done' | 'missed';
  completedAt: string;
  completedBy: string | null;
  completedByUserId: string | null;
  completedByRole: string | null;
  completionSource: EbayCompletionSource;
  reason: string | null;
  autoFillBatchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EbayAutoFillResult {
  autoFilledCount: number;
  alreadyCompletedCount: number;
  skippedCount: number;
  affectedMemberCount: number;
  actionType: EbayAutoFillActionType;
  followupDate: string;
  entries: EbayClickEntry[];
}

export type BlogSlotStatus = 'pending' | 'done' | 'missed' | 'late';
export type PluginSlotStatus = 'pending' | 'done' | 'missed' | 'needs_attention';
export type SpeedSlotStatus  = 'pending' | 'done' | 'missed' | 'needs_attention';
export type PluginCheckResult =
  | 'no_updates_needed'
  | 'updated_successfully'
  | 'updates_available_incomplete'
  | 'issue_found'
  | 'needs_admin_help';

export interface BlogSlot {
  id: string;
  websiteId: string;
  scheduledDate: string;   // YYYY-MM-DD
  dayOfWeek: number;       // 2=Tue, 6=Sat
  status: BlogSlotStatus;
  assignedTo: string | null;
  blogTitle: string | null;
  blogUrl: string | null;
  uploadDate: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  completedBy: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  completedByRole: string | null;
  completionSource: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PluginSlot {
  id: string;
  websiteId: string;
  weekStart: string;       // YYYY-MM-DD (Monday)
  status: PluginSlotStatus;
  assignedTo: string | null;
  checkResult: PluginCheckResult | null;
  updateDate: string | null;
  pluginsUpdatedCount: number | null;
  pluginNames: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  completedBy: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  completedByRole: string | null;
  completionSource: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpeedSlot {
  id: string;
  websiteId: string;
  weekStart: string;       // YYYY-MM-DD (Monday)
  status: SpeedSlotStatus;
  assignedTo: string | null;
  beforeScore: number | null;
  afterScore: number | null;
  notes: string | null;
  screenshotUrl: string | null;
  issueFound: boolean;
  needsAdminHelp: boolean;
  completedBy: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  completedByRole: string | null;
  completionSource: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSpeedSlot {
  websiteId: string;
  weekStart: string;
  status?: SpeedSlotStatus;
  assignedTo?: string | null;
  beforeScore?: number | null;
  afterScore?: number | null;
  notes?: string | null;
  screenshotUrl?: string | null;
  issueFound?: boolean;
  needsAdminHelp?: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
}

export interface UpsertBlogSlot {
  websiteId: string;
  scheduledDate: string;
  dayOfWeek: number;
  status?: BlogSlotStatus;
  assignedTo?: string | null;
  blogTitle?: string | null;
  blogUrl?: string | null;
  screenshotUrl?: string | null;
  notes?: string | null;
  completedBy?: string | null;
  completedAt?: string | null;
}

export interface UpsertPluginSlot {
  websiteId: string;
  weekStart: string;
  status?: PluginSlotStatus;
  assignedTo?: string | null;
  checkResult?: PluginCheckResult | null;
  updateDate?: string | null;
  pluginsUpdatedCount?: number | null;
  pluginNames?: string | null;
  screenshotUrl?: string | null;
  notes?: string | null;
  completedBy?: string | null;
  completedAt?: string | null;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToEbayClick = (r: any): EbayClickEntry => ({
  id:          r.id,
  userId:      r.user_id,
  date:        r.date,
  dayName:     r.day_name,
  status:      r.status,
  completedAt: r.completed_at,
  completedBy: r.completed_by ?? null,
  completedByUserId: r.completed_by_user_id ?? r.completed_by ?? null,
  completedByRole: r.completed_by_role ?? null,
  completionSource: (r.completion_source
    ?? (r.completed_by && r.completed_by !== r.user_id ? 'admin_manual' : 'member')) as EbayCompletionSource,
  reason: r.reason ?? null,
  autoFillBatchId: r.auto_fill_batch_id ?? null,
  createdAt:   r.created_at,
  updatedAt:   r.updated_at,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToBlogSlot = (r: any): BlogSlot => ({
  id:            r.id,
  websiteId:     r.website_id,
  scheduledDate: r.scheduled_date,
  dayOfWeek:     r.day_of_week,
  status:        r.status,
  assignedTo:    r.assigned_to   ?? null,
  blogTitle:     r.blog_title    ?? null,
  blogUrl:       r.blog_url      ?? null,
  uploadDate:    r.upload_date   ?? null,
  screenshotUrl: r.screenshot_url ?? null,
  notes:         r.notes         ?? null,
  completedBy:   r.completed_by  ?? null,
  completedAt:   r.completed_at  ?? null,
  completedByUserId: r.completed_by_user_id ?? r.completed_by ?? null,
  completedByRole: r.completed_by_role ?? null,
  completionSource: r.completion_source ?? 'member_completed',
  reason:        r.reason ?? null,
  createdAt:     r.created_at,
  updatedAt:     r.updated_at,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPluginSlot = (r: any): PluginSlot => ({
  id:                  r.id,
  websiteId:           r.website_id,
  weekStart:           r.week_start,
  status:              r.status,
  assignedTo:          r.assigned_to           ?? null,
  checkResult:         r.check_result          ?? null,
  updateDate:          r.update_date           ?? null,
  pluginsUpdatedCount: r.plugins_updated_count ?? null,
  pluginNames:         r.plugin_names          ?? null,
  screenshotUrl:       r.screenshot_url        ?? null,
  notes:               r.notes                 ?? null,
  completedBy:         r.completed_by          ?? null,
  completedAt:         r.completed_at          ?? null,
  completedByUserId: r.completed_by_user_id ?? r.completed_by ?? null,
  completedByRole: r.completed_by_role ?? null,
  completionSource: r.completion_source ?? 'member_completed',
  reason:        r.reason ?? null,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToSpeedSlot = (r: any): SpeedSlot => ({
  id:             r.id,
  websiteId:      r.website_id,
  weekStart:      r.week_start,
  status:         r.status,
  assignedTo:     r.assigned_to       ?? null,
  beforeScore:    r.before_score      ?? null,
  afterScore:     r.after_score       ?? null,
  notes:          r.notes             ?? null,
  screenshotUrl:  r.screenshot_url    ?? null,
  issueFound:     r.issue_found       ?? false,
  needsAdminHelp: r.needs_admin_help  ?? false,
  completedBy:    r.completed_by      ?? null,
  completedAt:    r.completed_at      ?? null,
  completedByUserId: r.completed_by_user_id ?? r.completed_by ?? null,
  completedByRole: r.completed_by_role ?? null,
  completionSource: r.completion_source ?? 'member_completed',
  reason:        r.reason ?? null,
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
});

// ─── Blog schedule types + mapper ─────────────────────────────────────────────

export type BlogScheduleKind = 'weekly' | 'monthly' | 'custom';

export interface BlogSchedule {
  id: string;
  websiteId: string;
  kind: BlogScheduleKind;
  /** 0=Sun .. 6=Sat. Used when kind === 'weekly'. */
  weekdays: number[];
  /**
   * Day-of-month numbers (1..31) the user posts on every month.
   * Preferred way to express monthly schedules — e.g. [8, 16, 27]
   * means: publish on the 8th, 16th, and 27th of every month.
   * When this is set, monthlyTarget is ignored.
   */
  monthlyDays: number[];
  /**
   * @deprecated Auto-placement count per calendar month. Kept only
   * to display existing rows that were created with the old UI;
   * new schedules use monthlyDays instead.
   */
  monthlyTarget: number | null;
  /**
   * @deprecated Explicit YYYY-MM-DD dates from the old "custom" UI.
   * Kept for backward compatibility; the modal no longer offers this.
   */
  customDates: string[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Default schedule applied to any website with no row in
 *  blog_followup_schedules — preserves legacy "Tue + Sat" behavior. */
export const DEFAULT_BLOG_WEEKDAYS = [2, 6]; // Tue + Sat

export interface UpsertBlogSchedule {
  websiteId: string;
  kind: BlogScheduleKind;
  weekdays?: number[];
  monthlyDays?: number[];
  monthlyTarget?: number | null;
  customDates?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToBlogSchedule = (r: any): BlogSchedule => ({
  id:             r.id,
  websiteId:      r.website_id,
  kind:           (r.schedule_type ?? 'weekly') as BlogScheduleKind,
  weekdays:       Array.isArray(r.weekdays)      ? r.weekdays.map((d: number) => Number(d))      : [],
  monthlyDays:    Array.isArray(r.monthly_days)  ? r.monthly_days.map((d: number) => Number(d))  : [],
  monthlyTarget:  r.monthly_target ?? null,
  customDates:    Array.isArray(r.custom_dates)  ? r.custom_dates.map(String)                    : [],
  createdBy:      r.created_by ?? null,
  updatedBy:      r.updated_by ?? null,
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO date string YYYY-MM-DD for a Date object — timezone-safe.
 * Uses LOCAL date parts (never toISOString, which converts to UTC and
 * can shift the day in non-UTC zones — that mismatch was the cause of
 * "Mark Tue from overview doesn't show in calendar" reports). */
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Return the Monday of the ISO week containing the given date. */
const getWeekStart = (d: Date): Date => {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

/**
 * Compute the required blog dates in [startDate, endDate] for a website,
 * given its resolved schedule. Returns local-date objects + the day-of-week
 * each one falls on (so the slot row can store day_of_week alongside the
 * scheduled_date — unchanged from the legacy schema).
 *
 * Behavior per kind:
 *   - weekly  : every date in range whose weekday is in schedule.weekdays
 *   - monthly : for each calendar month in range, evenly distribute
 *               `monthlyTarget` dates (placed on Tuesdays where possible
 *               so they line up with the existing default day-of-week)
 *   - custom  : only schedule.customDates that fall inside the range
 *
 * If schedule is null (no row exists), falls back to DEFAULT_BLOG_WEEKDAYS
 * (Tue + Sat) — preserves existing data and behavior.
 */
const blogDatesInRange = (
  startDate: Date,
  endDate: Date,
  schedule: BlogSchedule | null
): { date: Date; dow: number }[] => {
  const results: { date: Date; dow: number }[] = [];

  // --- custom: explicit dates only
  if (schedule?.kind === 'custom') {
    const startIso = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endIso   = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    for (const iso of schedule.customDates) {
      if (iso >= startIso && iso <= endIso) {
        const d = new Date(`${iso}T00:00:00`);
        results.push({ date: d, dow: d.getDay() });
      }
    }
    return results;
  }

  // --- monthly: prefer explicit day-of-month numbers, fall back to
  // the legacy auto-placement for any existing rows that still use it.
  if (schedule?.kind === 'monthly') {
    const explicitDays = (schedule.monthlyDays ?? [])
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31);

    if (explicitDays.length > 0) {
      // Walk each calendar month in the range, placing one slot per
      // listed day-number. If a month is short (e.g. Feb 30), clamp
      // to the month's last day so the user still gets a slot.
      const monthsSeen = new Set<string>();
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const monthKey = `${cur.getFullYear()}-${cur.getMonth()}`;
        if (!monthsSeen.has(monthKey)) {
          monthsSeen.add(monthKey);
          const year = cur.getFullYear();
          const month = cur.getMonth();
          const lastDay = new Date(year, month + 1, 0).getDate();
          for (const wanted of explicitDays) {
            const day = Math.min(wanted, lastDay);
            const d = new Date(year, month, day);
            if (d >= startDate && d <= endDate) {
              results.push({ date: d, dow: d.getDay() });
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
      return results;
    }

    // Legacy auto-placement fallback (deprecated UI but keep data live).
    if (schedule.monthlyTarget && schedule.monthlyTarget > 0) {
      const target = Math.max(1, Math.min(31, schedule.monthlyTarget));
      const monthsSeen = new Set<string>();
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const monthKey = `${cur.getFullYear()}-${cur.getMonth()}`;
        if (!monthsSeen.has(monthKey)) {
          monthsSeen.add(monthKey);
          const year = cur.getFullYear();
          const month = cur.getMonth();
          const lastDay = new Date(year, month + 1, 0).getDate();
          for (let i = 1; i <= target; i++) {
            const day = Math.min(lastDay, Math.max(1, Math.round((lastDay * i) / (target + 1))));
            const d = new Date(year, month, day);
            if (d >= startDate && d <= endDate) {
              results.push({ date: d, dow: d.getDay() });
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
      return results;
    }
    return results;
  }

  // --- weekly (default): use schedule.weekdays or the Tue+Sat fallback
  const wantDows = new Set<number>(
    schedule?.kind === 'weekly' && schedule.weekdays.length > 0
      ? schedule.weekdays
      : DEFAULT_BLOG_WEEKDAYS
  );
  const cur = new Date(startDate);
  while (cur <= endDate) {
    if (wantDows.has(cur.getDay())) {
      results.push({ date: new Date(cur), dow: cur.getDay() });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return results;
};

/**
 * Generate all Monday (week-start) dates within [startDate, endDate].
 */
const weekStartsInRange = (startDate: Date, endDate: Date): Date[] => {
  const results: Date[] = [];
  const cur = getWeekStart(new Date(startDate));
  while (cur <= endDate) {
    results.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return results;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFollowupStore = defineStore('followup', () => {
  const blogSlots      = ref<BlogSlot[]>([]);
  const blogSchedules  = ref<BlogSchedule[]>([]);
  const pluginSlots    = ref<PluginSlot[]>([]);
  const speedSlots     = ref<SpeedSlot[]>([]);
  const ebayEntries    = ref<EbayClickEntry[]>([]);

  const loadingBlog   = ref(false);
  const loadingPlugin = ref(false);
  const loadingSpeed  = ref(false);
  const loadingEbay   = ref(false);
  const errorBlog     = ref<string | null>(null);
  const errorPlugin   = ref<string | null>(null);
  const errorSpeed    = ref<string | null>(null);
  const errorEbay     = ref<string | null>(null);

  const actorName = () => {
    const auth = useAuthStore();
    return auth.profile?.fullName || auth.user?.email || 'A member';
  };

  const websiteLabel = async (websiteId: string): Promise<string> => {
    const { data } = await supabase
      .from('websites')
      .select('name,domain')
      .eq('id', websiteId)
      .maybeSingle();
    return data?.name || data?.domain || 'a website';
  };

  const notifyAdminFollowup = async (
    type: NotificationType,
    title: string,
    message: string,
    link: string,
    relatedWebsiteId?: string,
    relatedId?: string
  ) => {
    const auth = useAuthStore();
    if (!auth.user?.id || auth.isAdmin) return;
    const notifs = useNotificationsStore();
    await notifs.createAdminNotification({
      actorId: auth.user.id,
      type,
      title,
      message,
      link,
      relatedType: relatedWebsiteId ? 'website' : 'followup',
      relatedId,
      relatedWebsiteId,
    });
  };

  // ── Blog slots ─────────────────────────────────────────────────────────────

  const fetchBlogSlots = async (websiteId?: string) => {
    if (!supabaseConfigured) return;
    loadingBlog.value = true;
    errorBlog.value   = null;
    try {
      let q = supabase
        .from('blog_upload_slots')
        .select('*')
        .order('scheduled_date', { ascending: false });
      if (websiteId) q = q.eq('website_id', websiteId);
      const { data, error } = await q;
      if (error) { errorBlog.value = error.message; return; }
      if (websiteId) {
        // replace only slots for that website
        const other = blogSlots.value.filter((s) => s.websiteId !== websiteId);
        blogSlots.value = [...other, ...(data ?? []).map(rowToBlogSlot)];
      } else {
        blogSlots.value = (data ?? []).map(rowToBlogSlot);
      }
    } catch (err) {
      errorBlog.value = err instanceof Error ? err.message : 'Failed to load blog slots.';
    } finally {
      loadingBlog.value = false;
    }
  };

  /**
   * Ensure blog slots exist for a website for [today - 4 weeks, today + 4 weeks].
   * Uses INSERT … ON CONFLICT DO NOTHING so it is safe to call repeatedly.
   */
  // ── Blog schedules ─────────────────────────────────────────────────────
  //
  // The legacy default (when no schedule row exists) is Tuesday + Saturday
  // weekly. Any website with a row here overrides that default.

  /** Resolve the schedule for a website. Returns null if no row exists,
   *  which the date-generator interprets as the legacy Tue+Sat default. */
  const scheduleFor = (websiteId: string): BlogSchedule | null =>
    blogSchedules.value.find((s) => s.websiteId === websiteId) ?? null;

  const fetchBlogSchedules = async () => {
    if (!supabaseConfigured) return;
    const { data, error } = await supabase
      .from('blog_followup_schedules')
      .select('id,website_id,schedule_type,weekdays,monthly_days,monthly_target,custom_dates,created_by,updated_by,created_at,updated_at');
    if (error) {
      if (import.meta.env.DEV) console.warn('[followup] fetchBlogSchedules', error.message);
      return;
    }
    blogSchedules.value = (data ?? []).map(rowToBlogSchedule);
  };

  /**
   * Upsert (one per website). Pass the kind explicitly; the other arrays
   * default to empty so a switch from weekly→monthly cleanly nulls the
   * unused columns instead of leaving stale data behind.
   */
  const upsertBlogSchedule = async (input: UpsertBlogSchedule): Promise<BlogSchedule | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();
    const uid = auth.user?.id ?? null;

    const row: Record<string, unknown> = {
      website_id:     input.websiteId,
      schedule_type:  input.kind,
      weekdays:       input.kind === 'weekly'  ? (input.weekdays ?? DEFAULT_BLOG_WEEKDAYS) : null,
      monthly_days:   input.kind === 'monthly' ? (input.monthlyDays ?? [])                 : null,
      monthly_target: input.kind === 'monthly' ? (input.monthlyTarget ?? null)             : null,
      custom_dates:   input.kind === 'custom'  ? (input.customDates ?? [])                 : null,
      updated_by:     uid,
    };
    // created_by is only set on initial insert
    if (!scheduleFor(input.websiteId)) row['created_by'] = uid;

    const { data, error } = await supabase
      .from('blog_followup_schedules')
      .upsert(row, { onConflict: 'website_id' })
      .select()
      .single();

    if (error || !data) {
      if (import.meta.env.DEV) console.warn('[followup] upsertBlogSchedule', error?.message);
      return null;
    }
    const sched = rowToBlogSchedule(data);
    const idx = blogSchedules.value.findIndex((s) => s.id === sched.id);
    if (idx !== -1) blogSchedules.value[idx] = sched;
    else blogSchedules.value = [sched, ...blogSchedules.value];

    // Regenerate slots so the calendar reflects the new schedule on next paint.
    // Existing checked-Done slots are untouched (we upsert with ignoreDuplicates).
    void ensureBlogSlots(input.websiteId);
    return sched;
  };

  const ensureBlogSlots = async (websiteId: string) => {
    if (!supabaseConfigured) return;
    const today = new Date();
    const from  = new Date(today); from.setDate(today.getDate() - 28);
    const to    = new Date(today); to.setDate(today.getDate() + 28);

    const schedule = scheduleFor(websiteId);
    const dates = blogDatesInRange(from, to, schedule);

    // Clean up future pending slots that no longer fit the active schedule (e.g. if we set Temporary Website)
    const activeIsoDates = new Set(dates.map(d => isoDate(d.date)));
    const todayIso = isoDate(today);

    try {
      const { data: pendingSlots } = await supabase
        .from('blog_upload_slots')
        .select('id,scheduled_date')
        .eq('website_id', websiteId)
        .eq('status', 'pending')
        .gte('scheduled_date', todayIso);

      if (pendingSlots && pendingSlots.length > 0) {
        const idsToDelete = pendingSlots
          .filter(slot => !activeIsoDates.has(slot.scheduled_date))
          .map(slot => slot.id);

        if (idsToDelete.length > 0) {
          await supabase
            .from('blog_upload_slots')
            .delete()
            .in('id', idsToDelete);

          blogSlots.value = blogSlots.value.filter(s => !idsToDelete.includes(s.id));
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[followup] failed to clean up stale blog slots', e);
    }

    if (dates.length === 0) return;

    const rows = dates.map(({ date, dow }) => ({
      website_id:     websiteId,
      scheduled_date: isoDate(date),
      day_of_week:    dow,
      status:         'pending' as const,
    }));

    await supabase.from('blog_upload_slots').upsert(rows, {
      onConflict: 'website_id,scheduled_date',
      ignoreDuplicates: true,
    });
  };

  const upsertBlogSlot = async (input: UpsertBlogSlot & { id?: string }): Promise<BlogSlot | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();

    const row: Record<string, unknown> = {
      website_id:     input.websiteId,
      scheduled_date: input.scheduledDate,
      day_of_week:    input.dayOfWeek,
    };
    if (input.status           !== undefined) row['status']            = input.status;
    if (input.assignedTo       !== undefined) row['assigned_to']       = input.assignedTo;
    if (input.blogTitle        !== undefined) row['blog_title']        = input.blogTitle;
    if (input.blogUrl          !== undefined) row['blog_url']          = input.blogUrl;
    if (input.screenshotUrl    !== undefined) row['screenshot_url']    = input.screenshotUrl;
    if (input.notes            !== undefined) row['notes']             = input.notes;
    if (input.completedBy      !== undefined) row['completed_by']      = input.completedBy;
    if (input.completedAt      !== undefined) row['completed_at']      = input.completedAt;

    // Auto-set completed_by/at when marking done/late
    if (input.status === 'done' || input.status === 'late') {
      if (!row['completed_by']) row['completed_by'] = auth.user?.id ?? null;
      if (!row['completed_at']) row['completed_at'] = new Date().toISOString();
    }

    if (input.id) row['id'] = input.id;

    const { data, error } = await supabase
      .from('blog_upload_slots')
      .upsert(row, { onConflict: 'website_id,scheduled_date' })
      .select()
      .single();

    if (error || !data) { console.error('[followup] upsertBlogSlot', error?.message); return null; }
    const previous = blogSlots.value.find(
      (s) => s.websiteId === input.websiteId && s.scheduledDate === input.scheduledDate
    );
    const slot = rowToBlogSlot(data);
    const idx  = blogSlots.value.findIndex((s) => s.id === slot.id);
    if (idx !== -1) blogSlots.value[idx] = slot;
    else blogSlots.value = [slot, ...blogSlots.value];
    if (slot.status === 'done' && previous?.status !== 'done') {
      const website = await websiteLabel(slot.websiteId);
      void notifyAdminFollowup(
        'blog_followup',
        'Blog followup completed',
        `${actorName()} completed blog followup for ${website}.`,
        '/followup/blog',
        slot.websiteId,
        slot.id
      );
    }

    // Notify employee when assigned/reassigned a slot
    const assignmentChanged = slot.assignedTo && slot.assignedTo !== previous?.assignedTo;
    if (assignmentChanged) {
      try {
        const { useNotificationsStore } = await import('@/stores/notifications');
        const notifs = useNotificationsStore();
        const website = await websiteLabel(slot.websiteId);
        await notifs.createNotification({
          recipientId: slot.assignedTo!,
          actorId: auth.user?.id,
          type: 'blog_followup',
          title: 'New Blog Followup Assigned',
          message: `You have been assigned a blog followup task for ${website}: "${slot.blogTitle || 'Blog Upload'}".`,
          relatedType: 'blog_followup',
          relatedId: slot.id,
          relatedWebsiteId: slot.websiteId,
        });
      } catch (e) {
        console.warn('[notification] failed to trigger blog slot assignment notification:', e);
      }
    }

    return slot;
  };

  // ── Plugin slots ───────────────────────────────────────────────────────────

  const fetchPluginSlots = async (websiteId?: string) => {
    if (!supabaseConfigured) return;
    loadingPlugin.value = true;
    errorPlugin.value   = null;
    try {
      let q = supabase
        .from('plugin_update_slots')
        .select('*')
        .order('week_start', { ascending: false });
      if (websiteId) q = q.eq('website_id', websiteId);
      const { data, error } = await q;
      if (error) { errorPlugin.value = error.message; return; }
      if (websiteId) {
        const other = pluginSlots.value.filter((s) => s.websiteId !== websiteId);
        pluginSlots.value = [...other, ...(data ?? []).map(rowToPluginSlot)];
      } else {
        pluginSlots.value = (data ?? []).map(rowToPluginSlot);
      }
    } catch (err) {
      errorPlugin.value = err instanceof Error ? err.message : 'Failed to load plugin slots.';
    } finally {
      loadingPlugin.value = false;
    }
  };

  const ensurePluginSlots = async (websiteId: string) => {
    if (!supabaseConfigured) return;
    const today = new Date();
    const from  = new Date(today); from.setDate(today.getDate() - 28);
    const to    = new Date(today); to.setDate(today.getDate() + 28);

    const weeks = weekStartsInRange(from, to);
    if (weeks.length === 0) return;

    const rows = weeks.map((w) => ({
      website_id:  websiteId,
      week_start:  isoDate(w),
      status:      'pending' as const,
    }));

    await supabase.from('plugin_update_slots').upsert(rows, {
      onConflict: 'website_id,week_start',
      ignoreDuplicates: true,
    });
  };

  const upsertPluginSlot = async (input: UpsertPluginSlot & { id?: string }): Promise<PluginSlot | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();

    const row: Record<string, unknown> = {
      website_id: input.websiteId,
      week_start:  input.weekStart,
    };
    if (input.status               !== undefined) row['status']                 = input.status;
    if (input.assignedTo           !== undefined) row['assigned_to']            = input.assignedTo;
    if (input.checkResult          !== undefined) row['check_result']           = input.checkResult;
    if (input.updateDate           !== undefined) row['update_date']            = input.updateDate;
    if (input.pluginsUpdatedCount  !== undefined) row['plugins_updated_count']  = input.pluginsUpdatedCount;
    if (input.pluginNames          !== undefined) row['plugin_names']           = input.pluginNames;
    if (input.screenshotUrl        !== undefined) row['screenshot_url']         = input.screenshotUrl;
    if (input.notes                !== undefined) row['notes']                  = input.notes;
    if (input.completedBy          !== undefined) row['completed_by']           = input.completedBy;
    if (input.completedAt          !== undefined) row['completed_at']           = input.completedAt;

    if (input.status === 'done' || input.status === 'needs_attention') {
      if (!row['completed_by']) row['completed_by'] = auth.user?.id ?? null;
      if (!row['completed_at']) row['completed_at'] = new Date().toISOString();
    }

    if (input.id) row['id'] = input.id;

    const { data, error } = await supabase
      .from('plugin_update_slots')
      .upsert(row, { onConflict: 'website_id,week_start' })
      .select()
      .single();

    if (error || !data) { console.error('[followup] upsertPluginSlot', error?.message); return null; }
    const previous = pluginSlots.value.find(
      (s) => s.websiteId === input.websiteId && s.weekStart === input.weekStart
    );
    const slot = rowToPluginSlot(data);
    const idx  = pluginSlots.value.findIndex((s) => s.id === slot.id);
    if (idx !== -1) pluginSlots.value[idx] = slot;
    else pluginSlots.value = [slot, ...pluginSlots.value];
    if (slot.status === 'done' && previous?.status !== 'done') {
      const website = await websiteLabel(slot.websiteId);
      void notifyAdminFollowup(
        'plugin_update',
        'Plugin update completed',
        `${actorName()} completed plugin update for ${website}.`,
        '/followup/plugins',
        slot.websiteId,
        slot.id
      );
    }

    // Notify employee when assigned/reassigned a slot
    const assignmentChanged = slot.assignedTo && slot.assignedTo !== previous?.assignedTo;
    if (assignmentChanged) {
      try {
        const { useNotificationsStore } = await import('@/stores/notifications');
        const notifs = useNotificationsStore();
        const website = await websiteLabel(slot.websiteId);
        await notifs.createNotification({
          recipientId: slot.assignedTo!,
          actorId: auth.user?.id,
          type: 'plugin_update',
          title: 'New Plugin Update Assigned',
          message: `You have been assigned plugin updates for ${website}.`,
          relatedType: 'plugin_update',
          relatedId: slot.id,
          relatedWebsiteId: slot.websiteId,
        });
      } catch (e) {
        console.warn('[notification] failed to trigger plugin slot assignment notification:', e);
      }
    }

    return slot;
  };

  // ── Speed Optimization slots ──────────────────────────────────────────────

  const fetchSpeedSlots = async (websiteId?: string) => {
    if (!supabaseConfigured) return;
    loadingSpeed.value = true;
    errorSpeed.value   = null;
    try {
      let q = supabase
        .from('speed_optimization_slots')
        .select('*')
        .order('week_start', { ascending: false });
      if (websiteId) q = q.eq('website_id', websiteId);
      const { data, error } = await q;
      if (error) { errorSpeed.value = error.message; return; }
      if (websiteId) {
        const other = speedSlots.value.filter((s) => s.websiteId !== websiteId);
        speedSlots.value = [...other, ...(data ?? []).map(rowToSpeedSlot)];
      } else {
        speedSlots.value = (data ?? []).map(rowToSpeedSlot);
      }
    } catch (err) {
      errorSpeed.value = err instanceof Error ? err.message : 'Failed to load speed optimization slots.';
    } finally {
      loadingSpeed.value = false;
    }
  };

  const ensureSpeedSlots = async (websiteId: string) => {
    if (!supabaseConfigured) return;
    const today = new Date();
    const from  = new Date(today); from.setDate(today.getDate() - 28);
    const to    = new Date(today); to.setDate(today.getDate() + 28);

    const weeks = weekStartsInRange(from, to);
    if (weeks.length === 0) return;

    const rows = weeks.map((w) => ({
      website_id: websiteId,
      week_start: isoDate(w),
      status:     'pending' as const,
    }));

    await supabase.from('speed_optimization_slots').upsert(rows, {
      onConflict: 'website_id,week_start',
      ignoreDuplicates: true,
    });
  };

  const upsertSpeedSlot = async (input: UpsertSpeedSlot & { id?: string }): Promise<SpeedSlot | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();

    const row: Record<string, unknown> = {
      website_id: input.websiteId,
      week_start: input.weekStart,
    };
    if (input.status          !== undefined) row['status']           = input.status;
    if (input.assignedTo      !== undefined) row['assigned_to']      = input.assignedTo;
    if (input.beforeScore     !== undefined) row['before_score']     = input.beforeScore;
    if (input.afterScore      !== undefined) row['after_score']      = input.afterScore;
    if (input.notes           !== undefined) row['notes']            = input.notes;
    if (input.screenshotUrl   !== undefined) row['screenshot_url']   = input.screenshotUrl;
    if (input.issueFound      !== undefined) row['issue_found']      = input.issueFound;
    if (input.needsAdminHelp  !== undefined) row['needs_admin_help'] = input.needsAdminHelp;
    if (input.completedBy     !== undefined) row['completed_by']     = input.completedBy;
    if (input.completedAt     !== undefined) row['completed_at']     = input.completedAt;

    // Auto-stamp the completer on done / needs_attention
    if (input.status === 'done' || input.status === 'needs_attention') {
      if (!row['completed_by']) row['completed_by'] = auth.user?.id ?? null;
      if (!row['completed_at']) row['completed_at'] = new Date().toISOString();
    }

    if (input.id) row['id'] = input.id;

    const { data, error } = await supabase
      .from('speed_optimization_slots')
      .upsert(row, { onConflict: 'website_id,week_start' })
      .select()
      .single();

    if (error || !data) { console.error('[followup] upsertSpeedSlot', error?.message); return null; }
    const previous = speedSlots.value.find(
      (s) => s.websiteId === input.websiteId && s.weekStart === input.weekStart
    );
    const slot = rowToSpeedSlot(data);
    const idx  = speedSlots.value.findIndex((s) => s.id === slot.id);
    if (idx !== -1) speedSlots.value[idx] = slot;
    else speedSlots.value = [slot, ...speedSlots.value];
    if (slot.status === 'done' && previous?.status !== 'done') {
      const website = await websiteLabel(slot.websiteId);
      void notifyAdminFollowup(
        'speed_optimization_followup',
        'Speed optimization completed',
        `${actorName()} completed speed optimization for ${website}.`,
        '/followup/speed-optimization',
        slot.websiteId,
        slot.id
      );
    }

    // Notify employee when assigned/reassigned a slot
    const assignmentChanged = slot.assignedTo && slot.assignedTo !== previous?.assignedTo;
    if (assignmentChanged) {
      try {
        const { useNotificationsStore } = await import('@/stores/notifications');
        const notifs = useNotificationsStore();
        const website = await websiteLabel(slot.websiteId);
        await notifs.createNotification({
          recipientId: slot.assignedTo!,
          actorId: auth.user?.id,
          type: 'speed_optimization_followup',
          title: 'New Speed Optimization Assigned',
          message: `You have been assigned speed optimization followup for ${website}.`,
          relatedType: 'speed_optimization_followup',
          relatedId: slot.id,
          relatedWebsiteId: slot.websiteId,
        });
      } catch (e) {
        console.warn('[notification] failed to trigger speed slot assignment notification:', e);
      }
    }

    return slot;
  };

  // ── eBay Click Followup ────────────────────────────────────────────────────

  /**
   * Fetch eBay click entries. Admins fetch all; members fetch their own.
   * Optionally filter by userId (admin use).
   */
  const fetchEbayEntries = async (userId?: string) => {
    if (!supabaseConfigured) return;
    loadingEbay.value = true;
    errorEbay.value   = null;
    try {
      const auth = useAuthStore();
      let q = supabase
        .from('ebay_click_followup')
        .select('*')
        .order('date', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      else if (!auth.isAdmin) q = q.eq('user_id', auth.user?.id ?? '');
      const { data, error } = await q;
      if (error) { errorEbay.value = error.message; return; }
      if (userId) {
        const other = ebayEntries.value.filter((e) => e.userId !== userId);
        ebayEntries.value = [...other, ...(data ?? []).map(rowToEbayClick)];
      } else {
        ebayEntries.value = (data ?? []).map(rowToEbayClick);
      }
    } catch (err) {
      errorEbay.value = err instanceof Error ? err.message : 'Failed to load eBay followup.';
    } finally {
      loadingEbay.value = false;
    }
  };

  /** Mark a day as done (or undo by deleting if same user). Admin can act on behalf of any user. */
  const markEbayDone = async (date: string, dayName: string, targetUserId?: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const auth = useAuthStore();
    const uid = targetUserId ?? auth.user?.id ?? '';
    const source: EbayCompletionSource = auth.isAdmin && uid !== auth.user?.id ? 'admin_manual' : 'member';
    const row = {
      user_id:      uid,
      date,
      day_name:     dayName,
      status:       'done',
      completed_at: new Date().toISOString(),
      completed_by: auth.user?.id ?? null,
      completed_by_user_id: auth.user?.id ?? null,
      completed_by_role: auth.profile?.role ?? null,
      completion_source: source,
      reason: null,
      auto_fill_batch_id: null,
    };
    const { data, error } = await supabase
      .from('ebay_click_followup')
      .upsert(row, { onConflict: 'user_id,date' })
      .select()
      .single();
    if (error || !data) { console.error('[followup] markEbayDone', error?.message); return false; }
    const entry = rowToEbayClick(data);
    const idx = ebayEntries.value.findIndex((e) => e.userId === uid && e.date === date);
    if (idx !== -1) ebayEntries.value[idx] = entry;
    else ebayEntries.value = [entry, ...ebayEntries.value];
    if (!auth.isAdmin) {
      void notifyAdminFollowup(
        'ebay_click_followup',
        'eBay followup completed',
        `${actorName()} completed today's eBay click followup.`,
        '/followup/ebay-click',
        undefined,
        entry.id
      );
    }
    return true;
  };

  const upsertEbayEntries = (entries: EbayClickEntry[]) => {
    if (!entries.length) return;
    const next = [...ebayEntries.value];
    entries.forEach((entry) => {
      const idx = next.findIndex((e) => e.id === entry.id || (e.userId === entry.userId && e.date === entry.date));
      if (idx !== -1) next[idx] = entry;
      else next.unshift(entry);
    });
    ebayEntries.value = next.sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt));
  };

  const autoFillEbayClick = async (input: {
    date: string;
    actionType: EbayAutoFillActionType;
    reason?: string;
    excludedUserIds?: string[];
  }): Promise<EbayAutoFillResult | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errorEbay.value = 'You do not have permission to auto fill eBay Click followups.';
      return null;
    }

    errorEbay.value = null;
    const { data, error } = await supabase.rpc('auto_fill_ebay_click_followup', {
      p_date: input.date,
      p_action_type: input.actionType,
      p_reason: input.reason?.trim() || null,
      p_excluded_user_ids: input.excludedUserIds ?? []
    });

    if (error) {
      console.error('[followup] autoFillEbayClick', error.message);
      errorEbay.value = error.message.includes('permission')
        ? 'You do not have permission to auto fill eBay Click followups.'
        : 'Auto fill failed. Please try again.';
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (Array.isArray(data) ? data[0] : data) as any;
    if (!row) {
      errorEbay.value = 'No active members found for eBay Click followup.';
      return null;
    }

    const rows = Array.isArray(row.entries) ? row.entries : [];
    const entries = rows.map(rowToEbayClick);
    upsertEbayEntries(entries);

    return {
      autoFilledCount: Number(row.auto_filled_count ?? 0),
      alreadyCompletedCount: Number(row.already_completed_count ?? 0),
      skippedCount: Number(row.skipped_count ?? 0),
      affectedMemberCount: Number(row.affected_member_count ?? 0),
      actionType: row.action_type as EbayAutoFillActionType,
      followupDate: row.followup_date,
      entries
    };
  };

  const bulkCompleteBlogFollowups = async (
    date: string,
    actionType: string,
    reason?: string
  ): Promise<{ affectedCount: number; skippedCount: number } | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errorBlog.value = 'You do not have permission to perform bulk actions.';
      return null;
    }

    errorBlog.value = null;
    const { data, error } = await supabase.rpc('bulk_complete_blog_followups', {
      p_date: date,
      p_action_type: actionType,
      p_reason: reason?.trim() || null
    });

    if (error) {
      console.error('[followup] bulkCompleteBlogFollowups', error.message);
      errorBlog.value = error.message;
      return null;
    }

    const res = Array.isArray(data) ? data[0] : data;
    await fetchBlogSlots(); // reload slots to reflect new data
    return {
      affectedCount: Number(res?.affected_count ?? 0),
      skippedCount: Number(res?.skipped_count ?? 0)
    };
  };

  const bulkCompletePluginUpdates = async (
    weekStart: string,
    actionType: string,
    reason?: string
  ): Promise<{ affectedCount: number; skippedCount: number } | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errorPlugin.value = 'You do not have permission to perform bulk actions.';
      return null;
    }

    errorPlugin.value = null;
    const { data, error } = await supabase.rpc('bulk_complete_plugin_updates', {
      p_week_start: weekStart,
      p_action_type: actionType,
      p_reason: reason?.trim() || null
    });

    if (error) {
      console.error('[followup] bulkCompletePluginUpdates', error.message);
      errorPlugin.value = error.message;
      return null;
    }

    const res = Array.isArray(data) ? data[0] : data;
    await fetchPluginSlots(); // reload slots to reflect new data
    return {
      affectedCount: Number(res?.affected_count ?? 0),
      skippedCount: Number(res?.skipped_count ?? 0)
    };
  };

  const bulkCompleteSpeedOptimization = async (
    weekStart: string,
    actionType: string,
    reason?: string
  ): Promise<{ affectedCount: number; skippedCount: number } | null> => {
    if (!supabaseConfigured) return null;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errorSpeed.value = 'You do not have permission to perform bulk actions.';
      return null;
    }

    errorSpeed.value = null;
    const { data, error } = await supabase.rpc('bulk_complete_speed_optimization', {
      p_week_start: weekStart,
      p_action_type: actionType,
      p_reason: reason?.trim() || null
    });

    if (error) {
      console.error('[followup] bulkCompleteSpeedOptimization', error.message);
      errorSpeed.value = error.message;
      return null;
    }

    const res = Array.isArray(data) ? data[0] : data;
    await fetchSpeedSlots(); // reload slots to reflect new data
    return {
      affectedCount: Number(res?.affected_count ?? 0),
      skippedCount: Number(res?.skipped_count ?? 0)
    };
  };

  /** Remove a done entry (uncheck). Admin only for other users. */
  const unmarkEbayDone = async (date: string, targetUserId?: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const auth = useAuthStore();
    const uid = targetUserId ?? auth.user?.id ?? '';
    const { error } = await supabase
      .from('ebay_click_followup')
      .delete()
      .eq('user_id', uid)
      .eq('date', date);
    if (error) { console.error('[followup] unmarkEbayDone', error.message); return false; }
    ebayEntries.value = ebayEntries.value.filter((e) => !(e.userId === uid && e.date === date));
    return true;
  };

  const ebayEntriesForUser = (userId: string) =>
    ebayEntries.value.filter((e) => e.userId === userId);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const blogSlotsForWebsite  = (websiteId: string) =>
    blogSlots.value.filter((s) => s.websiteId === websiteId)
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  const pluginSlotsForWebsite = (websiteId: string) =>
    pluginSlots.value.filter((s) => s.websiteId === websiteId)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const speedSlotsForWebsite = (websiteId: string) =>
    speedSlots.value.filter((s) => s.websiteId === websiteId)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  // ── Schedule-aware summary counts ────────────────────────────────────────
  // The legacy `*PendingCount` helpers used to count `status === 'pending'`
  // across the entire history — which inflates to "hundreds" because every
  // never-completed slot stays pending forever. The dashboard cares about
  // what's actually DUE in the current period. The helpers below count only
  // due-but-not-completed items for a given date range.

  const inRange = (iso: string, startIso: string, endIso: string) =>
    iso >= startIso && iso <= endIso;

  /** Blog: schedule-aware. Each slot has a scheduledDate. */
  const blogRangeSummary = (startIso: string, endIso: string) => {
    const due = blogSlots.value.filter((s) => inRange(s.scheduledDate, startIso, endIso));
    const done = due.filter((s) => s.status === 'done').length;
    const total = due.length;
    return { done, total, pending: Math.max(0, total - done) };
  };

  /** Plugin: weekly. A slot's weekStart (Mon) must fall inside the range. */
  const pluginRangeSummary = (startIso: string, endIso: string) => {
    const due = pluginSlots.value.filter((s) => inRange(s.weekStart, startIso, endIso));
    const done = due.filter((s) => s.status === 'done').length;
    const total = due.length;
    return { done, total, pending: Math.max(0, total - done) };
  };

  /** Speed optimization: weekly. */
  const speedRangeSummary = (startIso: string, endIso: string) => {
    const due = speedSlots.value.filter((s) => inRange(s.weekStart, startIso, endIso));
    const done = due.filter((s) => s.status === 'done').length;
    const total = due.length;
    return { done, total, pending: Math.max(0, total - done) };
  };

  // ── Legacy "today" helpers (kept for callers that just want a number) ───
  // These now correctly mean "due today (or this week for weekly slots) and
  // still pending" — not "every never-completed slot in history".
  const todayIsoStr = () => isoDate(new Date());
  const thisMondayIsoStr = () => isoDate(getWeekStart(new Date()));

  const blogPendingCount   = () => blogRangeSummary(todayIsoStr(), todayIsoStr()).pending;
  const pluginPendingCount = () => pluginRangeSummary(thisMondayIsoStr(), thisMondayIsoStr()).pending;
  const speedPendingCount  = () => speedRangeSummary(thisMondayIsoStr(), thisMondayIsoStr()).pending;

  /**
   * Ensure blog + plugin slots exist for every website in the given list.
   * Safe to call on every page load — uses INSERT … ON CONFLICT DO NOTHING.
   */
  const syncExistingWebsitesToFollowup = async (websiteIds: string[]) => {
    if (!supabaseConfigured || websiteIds.length === 0) return;
    // Load all blog schedules ONCE before generating slots so each
    // ensureBlogSlots call sees the resolved per-site schedule (instead
    // of falling back to Tue+Sat for the first paint).
    await fetchBlogSchedules();
    await Promise.all(
      websiteIds.flatMap((id) => [ensureBlogSlots(id), ensurePluginSlots(id), ensureSpeedSlots(id)])
    );
  };

  const reset = () => {
    blogSlots.value     = [];
    blogSchedules.value = [];
    pluginSlots.value   = [];
    speedSlots.value    = [];
    ebayEntries.value   = [];
    errorBlog.value    = null;
    errorPlugin.value  = null;
    errorSpeed.value   = null;
    errorEbay.value    = null;
  };

  return {
    blogSlots,
    blogSchedules,
    pluginSlots,
    speedSlots,
    ebayEntries,
    loadingBlog,
    loadingPlugin,
    loadingSpeed,
    loadingEbay,
    errorBlog,
    errorPlugin,
    errorSpeed,
    errorEbay,
    fetchBlogSlots,
    fetchBlogSchedules,
    fetchPluginSlots,
    fetchSpeedSlots,
    fetchEbayEntries,
    ensureBlogSlots,
    ensurePluginSlots,
    ensureSpeedSlots,
    syncExistingWebsitesToFollowup,
    upsertBlogSlot,
    upsertBlogSchedule,
    upsertPluginSlot,
    upsertSpeedSlot,
    markEbayDone,
    unmarkEbayDone,
    autoFillEbayClick,
    bulkCompleteBlogFollowups,
    bulkCompletePluginUpdates,
    bulkCompleteSpeedOptimization,
    ebayEntriesForUser,
    blogSlotsForWebsite,
    pluginSlotsForWebsite,
    speedSlotsForWebsite,
    blogPendingCount,
    pluginPendingCount,
    speedPendingCount,
    blogRangeSummary,
    pluginRangeSummary,
    speedRangeSummary,
    scheduleFor,
    handleRealtimePayload(payload: { eventType: string; table: string; new: any; old: any }) {
      const { eventType, table, new: newRow, old: oldRow } = payload;
      const tableMap: Record<string, { list: any; toObj: (r: any) => any }> = {
        blog_upload_slots:         { list: blogSlots,     toObj: rowToBlogSlot },
        blog_followup_schedules:   { list: blogSchedules, toObj: rowToBlogSchedule },
        plugin_update_slots:       { list: pluginSlots,   toObj: rowToPluginSlot },
        speed_optimization_slots:  { list: speedSlots,    toObj: rowToSpeedSlot },
        ebay_click_followup:       { list: ebayEntries,   toObj: rowToEbayClick },
      };
      const config = tableMap[table];
      if (!config) return;
      if (eventType === 'INSERT') {
        const obj = config.toObj(newRow);
        if (!config.list.value.some((i: any) => i.id === obj.id)) {
          config.list.value = [...config.list.value, obj];
          if (import.meta.env.DEV) console.log(`[realtime] INSERT ${table}`, obj.id);
        }
      } else if (eventType === 'UPDATE') {
        const obj = config.toObj(newRow);
        const idx = config.list.value.findIndex((i: any) => i.id === obj.id);
        if (idx !== -1) {
          config.list.value = config.list.value.map((i: any) => i.id === obj.id ? obj : i);
          if (import.meta.env.DEV) console.log(`[realtime] UPDATE ${table}`, obj.id);
        } else {
          config.list.value = [...config.list.value, obj];
        }
      } else if (eventType === 'DELETE') {
        const id = oldRow?.id || newRow?.id;
        if (id) {
          config.list.value = config.list.value.filter((i: any) => i.id !== id);
          if (import.meta.env.DEV) console.log(`[realtime] DELETE ${table}`, id);
        }
      }
    },
    reset,
  };
});
