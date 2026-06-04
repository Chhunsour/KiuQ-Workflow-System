// ─────────────────────────────────────────────────────────────────────────────
// Shared display helpers for notifications (bell dropdown + full page).
// Keeps category labels, icons, colors, relative time, and day-grouping
// identical everywhere so users always recognize what they're looking at.
// ─────────────────────────────────────────────────────────────────────────────

import type { NotificationType } from '@/stores/notifications';

export type NotificationVariant = 'primary' | 'success' | 'warning' | 'purple' | 'neutral';

/**
 * Short, human category label shown in the meta line / badge.
 * This is the "what am I looking at" signal — keep it specific.
 *   task_assigned  → "Assigned"
 *   task_comment   → "Comment"
 *   task_updated   → "Task moved"
 *   quality_*      → "Quality Check"
 */
export const notificationCategoryLabel = (type: NotificationType): string => {
  const map: Partial<Record<NotificationType, string>> = {
    task_assigned:               'Assigned',
    task_updated:                'Task moved',
    task_comment:                'Comment',
    task_deadline_changed:       'Deadline',
    task_needs_fix:              'Needs fix',
    task_approved:               'Approved',
    task_completed:              'Completed',
    work_reviewed:               'Reviewed',
    prompt_replaced:             'Prompt',
    submission_received:         'Submission',
    blocker_reported:            'Blocker',
    blocker_resolved:            'Blocker',
    mention:                     'Mention',
    blog_followup:               'Blog Followup',
    plugin_update:               'Plugin Update',
    ebay_click_followup:         'eBay Followup',
    speed_optimization_followup: 'Speed Optimization',
    monthly_report:              'Monthly Report',
    quality_issue_reported:      'Quality Check',
    quality_issue_fixed:         'Quality Check',
  };
  return map[type] ?? 'Update';
};

/**
 * Inner SVG paths for the small badge icon on each notification.
 * Distinct per category so a comment, a move, an assignment, and a
 * quality check are instantly distinguishable at a glance.
 * Wrap with: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" …>
 */
export const notificationIconPaths = (type: NotificationType): string => {
  const map: Record<NotificationType, string> = {
    // Assigned → clipboard with a check
    task_assigned:         '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',
    // Moved → four-way move arrows
    task_updated:          '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
    // Comment → speech bubble
    task_comment:          '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    // Deadline → calendar with clock hand
    task_deadline_changed: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 14v3l2 1"/>',
    // Needs fix → alert triangle
    task_needs_fix:        '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    // Approved → check circle
    task_approved:         '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    // Completed → check circle
    task_completed:        '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    // Reviewed → eye
    work_reviewed:         '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    // Prompt replaced → refresh
    prompt_replaced:       '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
    // Submission → inbox
    submission_received:   '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    // Blocker reported → alert triangle
    blocker_reported:      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    // Blocker resolved → check circle
    blocker_resolved:      '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    // Mention → @ sign
    mention:               '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
    // Followups
    blog_followup:         '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M8 7h8"/><path d="M8 11h6"/>',
    plugin_update:         '<path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5a6 6 0 0 1-12 0z"/><path d="M12 19v3"/>',
    ebay_click_followup:   '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    speed_optimization_followup: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    monthly_report:        '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V7"/><path d="M17 16v-8"/>',
    // Quality check → shield (alert vs check)
    quality_issue_reported: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    quality_issue_fixed:    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  };
  return map[type] ?? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';
};

/** Full <svg> string for the badge icon at a given pixel size. */
export const notificationIconSvg = (type: NotificationType, size = 11): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${notificationIconPaths(type)}</svg>`;

/** Color variant for the icon chip + type badge. */
export const notificationVariant = (type: NotificationType): NotificationVariant => {
  if (['task_needs_fix', 'blocker_reported', 'quality_issue_reported'].includes(type)) return 'warning';
  if (['task_approved', 'task_completed', 'blocker_resolved', 'blog_followup', 'plugin_update', 'ebay_click_followup', 'speed_optimization_followup', 'quality_issue_fixed'].includes(type)) return 'success';
  if (['task_comment', 'work_reviewed', 'mention'].includes(type)) return 'purple';
  if (['task_assigned', 'task_updated'].includes(type)) return 'primary';
  return 'neutral';
};

/** Compact relative time for inline display ("just now", "5m ago", "3d ago"). */
export const notificationTimeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Day-group bucket for organizing the list into sections:
 *   Today · 1 day ago · 2 days ago … · 1 week ago … · 1 month ago … · 1 year ago…
 * `order` ascends with age so the newest group sorts first.
 */
export const notificationDayGroup = (iso: string): { key: string; label: string; order: number } => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const created = new Date(iso);
  const startOfCreated = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();

  // Future / clock-skew → treat as Today
  const days = Math.max(0, Math.round((startOfToday - startOfCreated) / 86_400_000));

  if (days === 0) return { key: 'd0', label: 'Today', order: 0 };
  if (days === 1) return { key: 'd1', label: '1 day ago', order: 1 };
  if (days < 7)  return { key: `d${days}`, label: `${days} days ago`, order: days };

  if (days < 30) {
    const w = Math.floor(days / 7);
    return { key: `w${w}`, label: w === 1 ? '1 week ago' : `${w} weeks ago`, order: 100 + w };
  }
  if (days < 365) {
    const mo = Math.floor(days / 30);
    return { key: `m${mo}`, label: mo === 1 ? '1 month ago' : `${mo} months ago`, order: 200 + mo };
  }
  const y = Math.floor(days / 365);
  return { key: `y${y}`, label: y === 1 ? '1 year ago' : `${y} years ago`, order: 300 + y };
};

/** Group a (newest-first) notification list into ordered day sections. */
export const groupNotificationsByDay = <T extends { createdAt: string }>(
  items: T[]
): { key: string; label: string; order: number; items: T[] }[] => {
  const groups = new Map<string, { key: string; label: string; order: number; items: T[] }>();
  for (const item of items) {
    const g = notificationDayGroup(item.createdAt);
    const existing = groups.get(g.key);
    if (existing) existing.items.push(item);
    else groups.set(g.key, { ...g, items: [item] });
  }
  return Array.from(groups.values()).sort((a, b) => a.order - b.order);
};
