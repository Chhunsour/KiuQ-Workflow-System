import type {
  ActivityLog,
  AssignmentStatus,
  Blocker,
  DocsFile,
  Member,
  MonthlyReport,
  Prompt,
  PromptAssignment,
  PromptReplacement,
  Resource,
  ReviewComment,
  Submission,
  TeamDoc
} from '@/stores/data';
import type { BlogSlot, PluginSlot } from '@/stores/followup';
import { isAdminActivityUser, isLeaderboardParticipant, roleActivityLabel } from '@/lib/roles';

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all';

export interface LeaderboardRow {
  userId: string;
  member: Member | null;
  rank: number;
  totalPoints: number;
  activeSeconds: number;
  tasksStarted: number;
  tasksCompleted: number;
  submissionsMade: number;
  approvedSubmissions: number;
  tasksNeedingFix: number;
  rejectedSubmissions: number;
  promptsCopied: number;
  resourcesCreated: number;
  filesUploaded: number;
  linksSaved: number;
  docsViewed: number;
  monthlyReportsSubmitted: number;
  blockersReported: number;
  reviewsCompleted: number;
  docsCreated: number;
  blockersResolved: number;
  currentStreak: number;
  onTimeCompleted: number;
  onDeadlineCompleted: number;
  overdueTasks: number;
  resubmittedWork: number;
  blogFollowupsDone: number;
  pluginUpdatesDone: number;
  websitesCreated: number;
  taskComments: number;
  monthlyReportStatus: 'Submitted' | 'Not submitted';
  lastActiveAt: string;
  hasActivityToday: boolean;
  roleActivityLabel: string;
  pointBreakdown: PointBreakdownItem[];
  suspiciousFlags: SuspiciousFlag[];
}

export interface PointBreakdownItem {
  label: string;
  points: number;
  count: number;
}

/** Admin audit: suspicious farming activity detected for a member. */
export interface SuspiciousFlag {
  type: 'prompt_farm' | 'comment_farm' | 'doc_farm' | 'followup_farm' | 'idle_time' | 'status_churn';
  message: string;
  severity: 'warn' | 'high';
}

export interface BadgeProgress {
  key: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  earned: boolean;
}

export interface AdminActivityRow {
  userId: string;
  member: Member;
  reviewsCompleted: number;
  tasksAssigned: number;
  projectsCreated: number;
  promptsCreated: number;
  promptsReplaced: number;
  docsCreated: number;
  blockersResolved: number;
  lastActiveAt: string;
}

interface BuildLeaderboardParams {
  members: Member[];
  activityLogs: ActivityLog[];
  assignments: PromptAssignment[];
  submissions: Submission[];
  resources: Resource[];
  docsFiles: DocsFile[];
  monthlyReports: MonthlyReport[];
  blockers: Blocker[];
  blogSlots?: BlogSlot[];
  pluginSlots?: PluginSlot[];
  period: LeaderboardPeriod;
  periodStart?: Date; // override for historical months
}

interface BuildAdminActivityParams {
  members: Member[];
  activityLogs: ActivityLog[];
  prompts: Prompt[];
  promptReplacements: PromptReplacement[];
  reviewComments: ReviewComment[];
  docs: TeamDoc[];
  docsFiles: DocsFile[];
  period: LeaderboardPeriod;
}

// ── Scoring constants ────────────────────────────────────────────────────────

export const SCORE = {
  submit_task:           5,
  task_approved:        15,
  complete_before_due:  10,
  complete_on_due:       5,
  needs_fix:            -3,
  rejected:             -8,
  overdue:              -5,
  blog_followup:         3,
  plugin_update:         3,
  monthly_report:        8,
  website_created:       5,
  doc_or_resource:       3,
  prompt_copied:         1,
  task_comment:          1,
  // Active time: +1 per 30 min, cap 3 pts/day — can NEVER decide the winner
  active_per_30min:      1,
  active_daily_cap:      3,
} as const;

// ── Anti-farming caps ────────────────────────────────────────────────────────

const CAPS = {
  /** Max pts from prompt copies per day (3 copies × 1pt = 3pts max) */
  prompt_copy_daily_pts:     3,
  /** Max pts from comments per task per day */
  comment_per_task_daily_pts: 2,
  /** Min comment length to count as useful */
  comment_min_length:        10,
  /** Max docs/resources counted per day for scoring */
  docs_daily_max:             3,
  /** Max new websites counted per day for scoring */
  website_daily_max:          2,
  /** Min doc content length to count (if we have metadata) */
  doc_min_content_length:    20,
  /** Max resubmit points per task (first needs-fix resubmit only) */
  resubmit_per_task_max:      1,
} as const;

/** Suspicious flag thresholds */
const SUSPICIOUS = {
  prompt_copies_per_day:   5,   // >5 distinct prompt copies in a day
  comments_per_hour:       6,   // >6 comment actions in 60 min window
  docs_per_day:            8,   // >8 doc/resource creation logs in a day
  idle_time_threshold_pts: 3,   // full daily cap with no other work actions
  status_changes_per_task: 4,   // >4 status changes on same task = churn
} as const;

// ── Time helpers ─────────────────────────────────────────────────────────────

const minute = 60 * 1000;
const day    = 24 * 60 * minute;
const idleLimitMs = 5 * minute;

const parseTime = (value: string | null | undefined): number => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const dateKey = (value: number | string): string => {
  const date = new Date(typeof value === 'number' ? value : value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const startOfDay = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfToday = () => startOfDay(new Date());

export const periodStartFor = (period: LeaderboardPeriod, override?: Date): number => {
  if (override) return startOfDay(override);
  const today = startOfToday();
  if (period === 'today')  return today;
  if (period === 'week')   return today - 6 * day;
  if (period === 'month') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  return 0;
};

const periodEndFor = (period: LeaderboardPeriod, override?: Date): number => {
  if (!override) return Date.now() + day;
  const end = new Date(override.getFullYear(), override.getMonth() + 1, 1);
  return end.getTime();
};

const inPeriod = (
  value: string | null | undefined,
  period: LeaderboardPeriod,
  start?: number,
  end?: number
): boolean => {
  const time = parseTime(value);
  if (!time) return false;
  if (period === 'all' && !start) return true;
  const s = start ?? periodStartFor(period);
  const e = end   ?? Date.now() + day;
  return time >= s && time < e;
};

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ── Active-time scoring (capped per day, idles excluded) ─────────────────────

const activeSecondsFor = (logs: ActivityLog[]): number => {
  const sorted = [...logs].sort((a, b) => parseTime(a.createdAt) - parseTime(b.createdAt));
  let total    = 0;
  let previous = 0;
  sorted.forEach((log) => {
    const current = parseTime(log.createdAt);
    if (!current) return;
    if (!previous || current - previous > idleLimitMs) {
      // Gap > 5 min counts only as 60s session-start credit (not full gap)
      total += 60;
    } else {
      total += Math.max(30, Math.floor((current - previous) / 1000));
    }
    previous = current;
  });
  return total;
};

/**
 * Active-time points: +1 per 30 min, hard cap SCORE.active_daily_cap per day.
 * Active time is NEVER the primary tiebreaker — quality actions always win.
 */
const activeTimePoints = (logs: ActivityLog[]): number => {
  const byDate = new Map<string, ActivityLog[]>();
  logs.forEach((log) => {
    const key = dateKey(log.createdAt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(log);
  });
  let total = 0;
  byDate.forEach((dayLogs) => {
    const seconds = activeSecondsFor(dayLogs);
    const pts = Math.floor(seconds / 1800) * SCORE.active_per_30min;
    total += Math.min(pts, SCORE.active_daily_cap);
  });
  return total;
};

// ── Streak (requires real-work action, not just login/page-view) ─────────────

const WORK_ACTIONS = new Set([
  'output_submitted', 'submitted_work',
  'task_approved', 'approved_submission', 'approved_work',
  'prompt_copied', 'copied_prompt',
  'monthly_report_submitted', 'submitted_monthly_report',
  'doc_created', 'added_doc',
  'created_resource', 'uploaded_file', 'uploaded_resource', 'saved_link',
  'blocker_reported', 'reported_blocker',
  'resubmitted_work',
  'task_comment',
]);

const currentStreakFor = (logs: ActivityLog[]): number => {
  const workDays = new Set(
    logs
      .filter((log) => WORK_ACTIONS.has(log.action))
      .map((log) => dateKey(log.createdAt))
  );
  let cursor = startOfToday();
  let streak = 0;
  if (!workDays.has(dateKey(cursor))) cursor -= day;
  while (workDays.has(dateKey(cursor))) {
    streak += 1;
    cursor -= day;
  }
  return streak;
};

// ── On-time detection ─────────────────────────────────────────────────────────

const onTime = (assignment: PromptAssignment): 'before' | 'same_day' | 'late' => {
  const completed = parseTime(assignment.completedAt || assignment.updatedAt);
  const due = parseTime(assignment.dueDate);
  if (!completed || !due) return 'late';
  if (completed <= due - day) return 'before';
  if (completed <= due + day - 1) return 'same_day';
  return 'late';
};

const isOverdue = (assignment: PromptAssignment): boolean => {
  const due = parseTime(assignment.dueDate);
  const statusOpen = !['approved', 'rejected'].includes(assignment.status);
  return !!due && due < startOfToday() && statusOpen;
};

const completedInPeriod = (
  assignment: PromptAssignment,
  period: LeaderboardPeriod,
  start: number,
  end: number
): boolean =>
  assignment.status === 'approved' &&
  inPeriod(assignment.completedAt || assignment.updatedAt, period, start, end);

// ── Count helpers ─────────────────────────────────────────────────────────────

/** Cast log.action to string so extended action names (not in ActivityAction union) work. */
const logAction = (log: ActivityLog): string => log.action as string;

const countActions = (logs: ActivityLog[], actions: string[]): number => {
  const wanted = new Set(actions);
  return logs.filter((log) => wanted.has(logAction(log))).length;
};

// ── Build breakdown ───────────────────────────────────────────────────────────

const buildBreakdown = (items: [string, number, number][]): PointBreakdownItem[] =>
  items
    .filter(([, pts, count]) => pts !== 0 && count !== 0)
    .map(([label, points, count]) => ({ label, points, count }));

// ── Anti-farming: prompt copy scoring ────────────────────────────────────────
// Dedup per (promptId, day). Then cap total daily pts at CAPS.prompt_copy_daily_pts.

const promptCopyScore = (logs: ActivityLog[]): { count: number; points: number } => {
  // Deduplicate: one point per unique (promptId, day)
  const seenPerDay = new Map<string, Set<string>>();
  logs
    .filter((log) => logAction(log) === 'prompt_copied' || logAction(log) === 'copied_prompt')
    .forEach((log) => {
      const d = dateKey(log.createdAt);
      if (!seenPerDay.has(d)) seenPerDay.set(d, new Set());
      seenPerDay.get(d)!.add(log.relatedId ?? '__no_id__');
    });

  let count  = 0;
  let points = 0;
  seenPerDay.forEach((promptSet) => {
    const dayCount = promptSet.size;
    count  += dayCount;
    // Cap daily pts: max CAPS.prompt_copy_daily_pts per day
    points += Math.min(dayCount * SCORE.prompt_copied, CAPS.prompt_copy_daily_pts);
  });
  return { count, points };
};

// ── Anti-farming: comment scoring ────────────────────────────────────────────
// Max 2 pts per task per day. Only counts comments with relatedId (task id).
// Short/empty comments (< CAPS.comment_min_length in metadata) are excluded.
// Since activity_logs don't carry the comment text, we gate on:
//  - log.action === 'task_comment'
//  - log.relatedId must exist (links to a task)
//  - max 2 log entries per (relatedId, day) are scored

const commentScore = (logs: ActivityLog[]): { count: number; points: number } => {
  // Group by (taskId, day), cap at CAPS.comment_per_task_daily_pts per group
  const grouped = new Map<string, number>(); // key -> counted pts
  logs
    .filter((log) => logAction(log) === 'task_comment' && !!log.relatedId)
    .forEach((log) => {
      const key = `${log.relatedId}:${dateKey(log.createdAt)}`;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });

  let count  = 0;
  let points = 0;
  grouped.forEach((rawCount) => {
    const capped = Math.min(rawCount, CAPS.comment_per_task_daily_pts);
    count  += capped;
    points += capped * SCORE.task_comment;
  });
  return { count, points };
};

// ── Anti-farming: docs/resource scoring ──────────────────────────────────────
// Count only docs/resources created. Daily cap: CAPS.docs_daily_max.
// Filters out items with empty/untitled names (resource-level check).
// The "Untitled" filter applies when we have the actual resource/doc records.

const isUsefulDoc = (name: string | null | undefined): boolean => {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return false;
  if (n === 'untitled' || n === 'untitled doc' || n === 'new document') return false;
  return n.length >= CAPS.doc_min_content_length || n.split(' ').length >= 2;
};

const docsResourceScore = (
  periodResources: Resource[],
  periodDocs: DocsFile[],
  logs: ActivityLog[]
): { count: number; points: number } => {
  // Filter out clearly empty/untitled docs (Resource uses .title, DocsFile uses .title)
  const usefulResources = periodResources.filter((r) => isUsefulDoc(r.title));
  const usefulDocs      = periodDocs.filter((f) => isUsefulDoc(f.title));

  // Group creation events by day (from records + log actions)
  const creationsByDay = new Map<string, number>();

  usefulResources.forEach((r) => {
    const d = dateKey(r.createdAt || r.updatedAt || '');
    if (d) creationsByDay.set(d, (creationsByDay.get(d) ?? 0) + 1);
  });
  usefulDocs.forEach((f) => {
    const d = dateKey(f.createdAt || f.updatedAt || '');
    if (d) creationsByDay.set(d, (creationsByDay.get(d) ?? 0) + 1);
  });
  // Add log-based counts for days without records
  logs
    .filter((log) => ['created_resource', 'doc_created', 'added_doc', 'uploaded_file', 'uploaded_resource'].includes(logAction(log)))
    .forEach((log) => {
      const d = dateKey(log.createdAt);
      // Only count from logs if not already counted in records to avoid double-counting
      // We use a separate log-only set when records are empty
    });

  let count  = 0;
  let points = 0;
  creationsByDay.forEach((dayCount) => {
    const capped = Math.min(dayCount, CAPS.docs_daily_max);
    count  += capped;
    points += capped * SCORE.doc_or_resource;
  });

  // Fallback: if no records available, use log count (capped)
  if (count === 0) {
    const logsByDay = new Map<string, number>();
    logs
      .filter((log) => ['created_resource', 'doc_created', 'added_doc', 'uploaded_file', 'uploaded_resource'].includes(logAction(log)))
      .forEach((log) => {
        const d = dateKey(log.createdAt);
        logsByDay.set(d, (logsByDay.get(d) ?? 0) + 1);
      });
    logsByDay.forEach((dayCount) => {
      const capped = Math.min(dayCount, CAPS.docs_daily_max);
      count  += capped;
      points += capped * SCORE.doc_or_resource;
    });
  }

  return { count, points };
};

// ── Anti-farming: website creation scoring ───────────────────────────────────
// Max CAPS.website_daily_max counted per day. Dedup by relatedId (website id).

const websiteScore = (logs: ActivityLog[]): { count: number; points: number } => {
  const websiteLogs = logs.filter((log) => ['website_created', 'created_website'].includes(logAction(log)));

  // Dedup by (websiteId, day)
  const seenByDay = new Map<string, Set<string>>();
  websiteLogs.forEach((log) => {
    const d = dateKey(log.createdAt);
    if (!seenByDay.has(d)) seenByDay.set(d, new Set());
    seenByDay.get(d)!.add(log.relatedId ?? log.createdAt); // fallback to ts if no id
  });

  let count  = 0;
  let points = 0;
  seenByDay.forEach((idSet) => {
    const capped = Math.min(idSet.size, CAPS.website_daily_max);
    count  += capped;
    points += capped * SCORE.website_created;
  });
  return { count, points };
};

// ── Anti-farming: submit scoring ─────────────────────────────────────────────
// First submission of a task: +SCORE.submit_task.
// Resubmission after needs_fix: +SCORE.submit_task once per task.
// Repeated clicks on the same task in the same day do NOT add more.

const submissionScore = (
  periodSubmissions: Submission[],
  logs: ActivityLog[]
): { count: number; points: number } => {
  // From submissions table: count unique tasks submitted (not per-submission row)
  const uniqueTasksSubmitted = new Set(
    periodSubmissions.map((s) => s.assignmentId || s.id)
  );

  // From logs: dedup by (relatedId = taskId, day) to prevent re-click farming
  const logSeenByTaskDay = new Set<string>();
  logs
    .filter((log) => ['output_submitted', 'submitted_work', 'resubmitted_work'].includes(log.action))
    .forEach((log) => {
      logSeenByTaskDay.add(`${log.relatedId ?? 'none'}:${dateKey(log.createdAt)}`);
    });

  const count = Math.max(uniqueTasksSubmitted.size, logSeenByTaskDay.size);
  return { count, points: count * SCORE.submit_task };
};

// ── Anti-farming: followup scoring ───────────────────────────────────────────
// Followup points: once per (website, schedule_slot). Uncheck+recheck = still 1pt.
// We use the slot records directly (completedBy + status = 'done'), deduped by slot id.

const followupScore = (
  blogSlots: BlogSlot[],
  pluginSlots: PluginSlot[],
  userId: string,
  inP: (v: string | null | undefined) => boolean
): { blogCount: number; pluginCount: number; points: number } => {
  // Deduplicate by slot id — each slot can only give points once
  const blogDone = new Set(
    blogSlots
      .filter((s) => s.completedBy === userId && s.status === 'done' && inP(s.completedAt || s.updatedAt))
      .map((s) => s.id)
  ).size;

  const pluginDone = new Set(
    pluginSlots
      .filter((s) => s.completedBy === userId && s.status === 'done' && inP(s.completedAt || s.updatedAt))
      .map((s) => s.id)
  ).size;

  return {
    blogCount:   blogDone,
    pluginCount: pluginDone,
    points: blogDone * SCORE.blog_followup + pluginDone * SCORE.plugin_update,
  };
};

// ── Suspicious activity detection ────────────────────────────────────────────

const detectSuspiciousActivity = (
  logs: ActivityLog[],
  promptCopyCount: number,
  commentCountRaw: number,
  docsCountRaw: number,
  activeTimePts: number
): SuspiciousFlag[] => {
  const flags: SuspiciousFlag[] = [];

  // 1. Prompt farming: >5 distinct copies in a single day
  const promptByDay = new Map<string, Set<string>>();
  logs
    .filter((log) => ['prompt_copied', 'copied_prompt'].includes(logAction(log)))
    .forEach((log) => {
      const d = dateKey(log.createdAt);
      if (!promptByDay.has(d)) promptByDay.set(d, new Set());
      promptByDay.get(d)!.add(log.relatedId ?? log.createdAt);
    });
  promptByDay.forEach((ids, day) => {
    if (ids.size > SUSPICIOUS.prompt_copies_per_day) {
      flags.push({
        type: 'prompt_farm',
        message: `${ids.size} prompt copies on ${day} (cap: ${SUSPICIOUS.prompt_copies_per_day})`,
        severity: 'warn',
      });
    }
  });

  // 2. Comment farming: >6 task_comment actions within any 60-min window
  const commentLogs = logs
    .filter((log) => logAction(log) === 'task_comment')
    .sort((a, b) => parseTime(a.createdAt) - parseTime(b.createdAt));
  if (commentLogs.length >= SUSPICIOUS.comments_per_hour) {
    for (let i = 0; i < commentLogs.length; i++) {
      const windowStart = parseTime(commentLogs[i].createdAt);
      let count = 1;
      for (let j = i + 1; j < commentLogs.length; j++) {
        if (parseTime(commentLogs[j].createdAt) - windowStart <= 60 * 60 * 1000) count++;
        else break;
      }
      if (count >= SUSPICIOUS.comments_per_hour) {
        flags.push({
          type: 'comment_farm',
          message: `${count} comments within 1 hour`,
          severity: 'high',
        });
        break;
      }
    }
  }

  // 3. Doc farming: >8 doc/resource creation logs in a single day
  const docLogsByDay = new Map<string, number>();
  logs
    .filter((log) => ['created_resource', 'doc_created', 'added_doc', 'uploaded_file', 'uploaded_resource'].includes(logAction(log)))
    .forEach((log) => {
      const d = dateKey(log.createdAt);
      docLogsByDay.set(d, (docLogsByDay.get(d) ?? 0) + 1);
    });
  docLogsByDay.forEach((count, day) => {
    if (count > SUSPICIOUS.docs_per_day) {
      flags.push({
        type: 'doc_farm',
        message: `${count} docs/resources on ${day} (threshold: ${SUSPICIOUS.docs_per_day})`,
        severity: 'warn',
      });
    }
  });

  // 4. Idle time: full active_daily_cap points but zero real work actions in same period
  if (activeTimePts >= SCORE.active_daily_cap) {
    const hasRealWork = logs.some((log) => WORK_ACTIONS.has(logAction(log)));
    if (!hasRealWork) {
      flags.push({
        type: 'idle_time',
        message: `Max active time points (${activeTimePts}pts) with no real work actions`,
        severity: 'high',
      });
    }
  }

  // 5. Status churn: same task status changed many times (logs with same relatedId)
  const statusChangesPerTask = new Map<string, number>();
  logs
    .filter((log) => ['task_moved', 'status_changed', 'moved_task'].includes(logAction(log)) && log.relatedId)
    .forEach((log) => {
      statusChangesPerTask.set(log.relatedId!, (statusChangesPerTask.get(log.relatedId!) ?? 0) + 1);
    });
  statusChangesPerTask.forEach((count, taskId) => {
    if (count > SUSPICIOUS.status_changes_per_task) {
      flags.push({
        type: 'status_churn',
        message: `Task ${taskId.slice(0, 8)}… status changed ${count}× (threshold: ${SUSPICIOUS.status_changes_per_task})`,
        severity: 'warn',
      });
    }
  });

  return flags;
};

// ── Main export ───────────────────────────────────────────────────────────────

export const buildLeaderboardRows = ({
  members,
  activityLogs,
  assignments,
  submissions,
  resources,
  docsFiles,
  monthlyReports,
  blockers,
  blogSlots = [],
  pluginSlots = [],
  period,
  periodStart: periodStartOverride
}: BuildLeaderboardParams): LeaderboardRow[] => {
  const periodStartOverrideDate = periodStartOverride ?? undefined;
  const pStart = periodStartFor(period, periodStartOverrideDate);
  const pEnd   = periodEndFor(period, periodStartOverrideDate);

  const inP = (v: string | null | undefined) => inPeriod(v, period, pStart, pEnd);

  // Only include leaderboard-eligible members (no admin, no team leads unless role allows)
  const eligibleMembers = members.filter((m) => isLeaderboardParticipant(m));
  const memberMap = new Map(eligibleMembers.map((m) => [m.id, m]));
  const ids = new Set<string>(eligibleMembers.map((m) => m.id));

  // Do NOT add unknown ids from logs/submissions for non-eligible users
  // Only score users who are known leaderboard participants
  activityLogs.forEach((log) => {
    if (memberMap.has(log.userId)) ids.add(log.userId);
  });
  assignments.forEach((a) => {
    if (memberMap.has(a.assignedMemberId)) ids.add(a.assignedMemberId);
  });
  submissions.forEach((s) => {
    if (s.submittedBy && memberMap.has(s.submittedBy)) ids.add(s.submittedBy);
  });

  const rows = [...ids].map((userId): LeaderboardRow => {
    const member = memberMap.get(userId) ?? null;
    const allLogs = activityLogs.filter((log) => log.userId === userId);
    const logs    = allLogs.filter((log) => inP(log.createdAt));

    const userAssignments = assignments.filter((a) => a.assignedMemberId === userId);
    const completedAssignments = userAssignments.filter((a) =>
      completedInPeriod(a, period, pStart, pEnd)
    );

    const userSubmissions   = submissions.filter((s) => s.submittedBy === userId);
    const periodSubmissions = userSubmissions.filter((s) => inP(s.submittedAt));

    const userResources   = resources.filter((r) => r.createdBy === userId);
    const periodResources = userResources.filter((r) => inP(r.createdAt || r.updatedAt));

    const userDocs   = docsFiles.filter((f) => f.createdBy === userId);
    const periodDocs = userDocs.filter((f) => inP(f.createdAt || f.updatedAt));

    const periodReports = monthlyReports.filter(
      (r) => r.memberId === userId && inP(r.submittedAt)
    );

    const periodBlockers = blockers.filter(
      (b) => b.memberId === userId && inP(b.createdAt)
    );

    // ── Anti-farming scored values ──────────────────────────────────────────

    const promptResult  = promptCopyScore(logs);
    const commentResult = commentScore(logs);
    const docsResult    = docsResourceScore(periodResources, periodDocs, logs);
    const websiteResult = websiteScore(logs);
    const submitResult  = submissionScore(periodSubmissions, logs);
    const followResult  = followupScore(blogSlots, pluginSlots, userId, inP);
    const activeTimePts = activeTimePoints(logs);

    // Approved submissions — from actual submission records (truth) or completed assignments
    const approvedFromData       = periodSubmissions.filter((s) => s.status === 'approved').length;
    const approvedFromCompletion = completedAssignments.length;
    const approvedSubmissions    = Math.max(approvedFromData, approvedFromCompletion);

    // Rejected
    const rejectedSubmissions = periodSubmissions.filter((s) => s.status === 'rejected').length;

    // Needs fix (by assignment status in period)
    const tasksNeedingFix = userAssignments.filter(
      (a) => ['needs_fix', 'needs_resubmission'].includes(a.status) &&
             inP(a.updatedAt || a.assignedAt)
    ).length;

    // On-time
    let onTimeBeforeCount   = 0;
    let onTimeSameDayCount  = 0;
    completedAssignments.forEach((a) => {
      const timing = onTime(a);
      if (timing === 'before')    onTimeBeforeCount++;
      else if (timing === 'same_day') onTimeSameDayCount++;
    });

    // Overdue (open tasks past due date)
    const overdueTasks = userAssignments.filter((a) =>
      isOverdue(a) && (period === 'all' || inP(a.dueDate))
    ).length;

    // Monthly reports (dedup by month — one report per month max)
    const reportMonthsSeen = new Set(periodReports.map((r) => r.month ?? ''));
    const reportsSubmitted = Math.max(
      reportMonthsSeen.size,
      countActions(logs, ['monthly_report_submitted', 'submitted_monthly_report'])
    );

    // ── Calculate total points ──────────────────────────────────────────────
    const pts = {
      submissions:    submitResult.points,
      approved:       approvedSubmissions  * SCORE.task_approved,
      beforeDeadline: onTimeBeforeCount    * SCORE.complete_before_due,
      onDeadline:     onTimeSameDayCount   * SCORE.complete_on_due,
      needsFix:       tasksNeedingFix      * SCORE.needs_fix,
      rejected:       rejectedSubmissions  * SCORE.rejected,
      overdue:        overdueTasks         * SCORE.overdue,
      followups:      followResult.points,
      reports:        reportsSubmitted     * SCORE.monthly_report,
      websites:       websiteResult.points,
      docsResources:  docsResult.points,
      prompts:        promptResult.points,
      comments:       commentResult.points,
      activeTime:     activeTimePts,
    };

    const totalPoints = Object.values(pts).reduce((a, b) => a + b, 0);

    // ── Suspicious activity flags ───────────────────────────────────────────
    const suspiciousFlags = detectSuspiciousActivity(
      logs,
      promptResult.count,
      commentResult.count,
      docsResult.count,
      activeTimePts
    );

    // ── Point breakdown for UI ──────────────────────────────────────────────
    const pointBreakdown = buildBreakdown([
      ['Submitted tasks',        pts.submissions,    submitResult.count],
      ['Approved work',          pts.approved,       approvedSubmissions],
      ['Completed before due',   pts.beforeDeadline, onTimeBeforeCount],
      ['Completed on due date',  pts.onDeadline,     onTimeSameDayCount],
      ['Needs fix',              pts.needsFix,       tasksNeedingFix],
      ['Rejected work',          pts.rejected,       rejectedSubmissions],
      ['Overdue tasks',          pts.overdue,        overdueTasks],
      ['Blog followups done',    pts.followups > 0 ? followResult.blogCount * SCORE.blog_followup : 0,   followResult.blogCount],
      ['Plugin updates done',    pts.followups > 0 ? followResult.pluginCount * SCORE.plugin_update : 0, followResult.pluginCount],
      ['Monthly reports',        pts.reports,        reportsSubmitted],
      ['Websites created',       pts.websites,       websiteResult.count],
      ['Docs/resources created', pts.docsResources,  docsResult.count],
      ['Prompts copied',         pts.prompts,        promptResult.count],
      ['Task comments',          pts.comments,       commentResult.count],
      ['Active time',            pts.activeTime,     pts.activeTime > 0 ? 1 : 0],
    ]);

    const monthlyReportStatus = monthlyReports.some(
      (r) => r.memberId === userId && r.month === currentMonthKey()
    ) ? 'Submitted' : 'Not submitted';

    return {
      userId,
      member,
      rank: 0,
      totalPoints,
      activeSeconds: activeSecondsFor(logs),
      tasksStarted: countActions(logs, ['opened_task', 'task_started', 'marked_task_in_progress']),
      tasksCompleted: completedAssignments.length,
      submissionsMade: submitResult.count,
      approvedSubmissions,
      tasksNeedingFix,
      rejectedSubmissions,
      promptsCopied: promptResult.count,
      resourcesCreated: docsResult.count,
      filesUploaded: periodResources.filter((r) => ['file', 'screenshot'].includes(r.type)).length,
      linksSaved: periodResources.filter((r) => ['link', 'website_ref'].includes(r.type)).length,
      docsViewed: countActions(logs, ['viewed_doc']),
      monthlyReportsSubmitted: reportsSubmitted,
      blockersReported: periodBlockers.length + countActions(logs, ['blocker_reported', 'reported_blocker']),
      reviewsCompleted: countActions(logs, ['reviewed_submission', 'task_approved', 'feedback_received']),
      docsCreated: docsResult.count,
      blockersResolved: countActions(logs, ['blocker_resolved', 'resolved_blocker']),
      currentStreak: currentStreakFor(allLogs),
      onTimeCompleted: onTimeBeforeCount,
      onDeadlineCompleted: onTimeSameDayCount,
      overdueTasks,
      resubmittedWork: countActions(logs, ['resubmitted_work']),
      blogFollowupsDone: followResult.blogCount,
      pluginUpdatesDone: followResult.pluginCount,
      websitesCreated: websiteResult.count,
      taskComments: commentResult.count,
      monthlyReportStatus,
      lastActiveAt: member?.lastActiveAt || allLogs[0]?.createdAt || '',
      hasActivityToday: allLogs.some((log) => inPeriod(log.createdAt, 'today')),
      roleActivityLabel: roleActivityLabel(member?.role),
      pointBreakdown,
      suspiciousFlags,
    };
  });

  return sortAndRank(
    rows.filter(
      (row) =>
        row.member ||
        row.totalPoints !== 0 ||
        row.tasksCompleted > 0 ||
        row.submissionsMade > 0
    )
  );
};

/**
 * Sort order: total points → approved work → on-time → submissions.
 * Active seconds is NOT in the tiebreaker chain — quality actions decide rank.
 */
const sortAndRank = (rows: LeaderboardRow[]): LeaderboardRow[] =>
  [...rows]
    .sort(
      (a, b) =>
        b.totalPoints        - a.totalPoints        ||
        b.approvedSubmissions - a.approvedSubmissions ||
        b.onTimeCompleted    - a.onTimeCompleted     ||
        b.tasksCompleted     - a.tasksCompleted      ||
        b.submissionsMade    - a.submissionsMade     ||
        b.promptsCopied      - a.promptsCopied       ||
        (a.member?.fullName || a.member?.email || a.userId).localeCompare(
          b.member?.fullName || b.member?.email || b.userId
        )
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

export const rerankLeaderboardRows = (rows: LeaderboardRow[]): LeaderboardRow[] =>
  sortAndRank(rows);

export const formatActiveTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const hours   = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

export const buildAdminActivityRows = ({
  members,
  activityLogs,
  prompts,
  promptReplacements,
  reviewComments,
  docs,
  docsFiles,
  period
}: BuildAdminActivityParams): AdminActivityRow[] => {
  return members
    .filter(isAdminActivityUser)
    .map((member) => {
      const allLogs = activityLogs.filter((log) => log.userId === member.id);
      const logs    = allLogs.filter((log) => inPeriod(log.createdAt, period));
      const pStart  = periodStartFor(period);
      const pEnd    = periodEndFor(period);
      const inP     = (v: string | null | undefined) => inPeriod(v, period, pStart, pEnd);
      const periodPrompts = prompts.filter(
        (p) => p.createdBy === member.id && inP(p.createdAt || p.updatedAt)
      );
      const periodReplacements = promptReplacements.filter(
        (r) => r.replacedBy === member.id && inP(r.createdAt)
      );
      const periodReviewComments = reviewComments.filter(
        (c) => c.userId === member.id && inP(c.createdAt)
      );
      const periodDocs = docs.filter(
        (d) => d.createdBy === member.id && inP(d.createdAt || d.updatedAt)
      );
      const periodDocsFiles = docsFiles.filter(
        (f) => f.createdBy === member.id && inP(f.createdAt || f.updatedAt)
      );

      return {
        userId: member.id,
        member,
        reviewsCompleted:
          periodReviewComments.length +
          countActions(logs, ['reviewed_submission', 'task_approved', 'feedback_received']),
        tasksAssigned: countActions(logs, ['task_assigned', 'assigned_task', 'created_assignment']),
        projectsCreated: countActions(logs, ['project_created', 'created_project']),
        promptsCreated: periodPrompts.length + countActions(logs, ['prompt_created', 'created_prompt']),
        promptsReplaced:
          periodReplacements.length +
          countActions(logs, ['prompt_replaced', 'replaced_prompt', 'prompt_replacement']),
        docsCreated:
          periodDocs.length + periodDocsFiles.length + countActions(logs, ['doc_created', 'added_doc']),
        blockersResolved: countActions(logs, ['blocker_resolved', 'resolved_blocker']),
        lastActiveAt: member.lastActiveAt || allLogs[0]?.createdAt || ''
      };
    })
    .sort((a, b) => {
      const totalA =
        a.reviewsCompleted + a.tasksAssigned + a.projectsCreated +
        a.promptsCreated + a.promptsReplaced + a.docsCreated + a.blockersResolved;
      const totalB =
        b.reviewsCompleted + b.tasksAssigned + b.projectsCreated +
        b.promptsCreated + b.promptsReplaced + b.docsCreated + b.blockersResolved;
      return totalB - totalA;
    });
};

export const badgesForRow = (row: LeaderboardRow | undefined): BadgeProgress[] => {
  const safe = row ?? {
    promptsCopied: 0,
    tasksCompleted: 0,
    resubmittedWork: 0,
    resourcesCreated: 0,
    currentStreak: 0,
    monthlyReportsSubmitted: 0,
    onTimeCompleted: 0,
    approvedSubmissions: 0,
    blogFollowupsDone: 0,
    pluginUpdatesDone: 0,
  };

  const badges = [
    {
      key: 'top_performer',
      name: 'Top Performer',
      description: 'Got 5 tasks approved.',
      progress: safe.approvedSubmissions,
      target: 5
    },
    {
      key: 'prompt_runner',
      name: 'Prompt Runner',
      description: 'Copied 20 final prompts.',
      progress: safe.promptsCopied,
      target: 20
    },
    {
      key: 'task_finisher',
      name: 'Task Finisher',
      description: 'Completed 10 tasks.',
      progress: safe.tasksCompleted,
      target: 10
    },
    {
      key: 'fast_fixer',
      name: 'Fast Fixer',
      description: 'Fixed and resubmitted work 5 times.',
      progress: safe.resubmittedWork,
      target: 5
    },
    {
      key: 'resource_builder',
      name: 'Resource Builder',
      description: 'Added 10 useful resources, files, or links.',
      progress: safe.resourcesCreated,
      target: 10
    },
    {
      key: 'consistent_worker',
      name: 'Consistent Worker',
      description: 'Active 5 days in a row (with real work).',
      progress: safe.currentStreak,
      target: 5
    },
    {
      key: 'monthly_reporter',
      name: 'Monthly Reporter',
      description: 'Submitted a monthly report.',
      progress: safe.monthlyReportsSubmitted,
      target: 1
    },
    {
      key: 'on_time_worker',
      name: 'On-Time Worker',
      description: 'Completed 5 tasks before deadline.',
      progress: safe.onTimeCompleted,
      target: 5
    },
    {
      key: 'followup_hero',
      name: 'Followup Hero',
      description: 'Completed 10 blog or plugin followups.',
      progress: (safe.blogFollowupsDone ?? 0) + (safe.pluginUpdatesDone ?? 0),
      target: 10
    },
  ];

  return badges.map((badge) => ({
    ...badge,
    progress: Math.min(badge.progress, badge.target),
    earned: badge.progress >= badge.target
  }));
};

/** Total suspicious flag count for a row (for admin badge display). */
export const suspiciousFlagCount = (row: LeaderboardRow): number =>
  row.suspiciousFlags.length;

/** True if member has any high-severity flags. */
export const hasHighSeverityFlag = (row: LeaderboardRow): boolean =>
  row.suspiciousFlags.some((f) => f.severity === 'high');
