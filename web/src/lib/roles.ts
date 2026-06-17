type RoleInput = string | { role?: string | null } | null | undefined;

const roleValue = (input: RoleInput) =>
  typeof input === 'string' ? input : input?.role;

export const normalizeRole = (role: RoleInput) =>
  (roleValue(role) || 'member').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const roleLabel = (role: string | null | undefined) => {
  const normalized = normalizeRole(role);
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'owner') return 'Owner';
  if (normalized === 'head') return 'Head';
  if (normalized === 'supervisor') return 'Supervisor';
  if (normalized === 'assistant_head') return 'Assistant Head';
  if (normalized === 'reviewer') return 'Reviewer';
  if (normalized === 'member') return 'Team Member';
  if (normalized === 'team_member') return 'Team Member';
  if (normalized === 'quality_checker') return 'Quality Checker';
  if (normalized === 'viewer') return 'Viewer';
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const roleActivityLabel = (role: string | null | undefined) => {
  const normalized = normalizeRole(role);
  if (normalized === 'admin') return 'Admin Activity';
  if (normalized === 'owner') return 'Admin Activity';
  if (normalized === 'reviewer') return 'Reviewer Activity';
  return 'Member Work';
};

export const isLeaderboardParticipant = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'member' || normalized === 'team_member';
};

export const isAdminActivityUser = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'admin' || normalized === 'owner'
      || normalized === 'head' || normalized === 'supervisor';
};

/**
 * Admin-level role. Returns true for any role with full system access:
 * legacy `admin`/`owner` AND the new hierarchy `head`/`supervisor`.
 *
 * Mirrors the SQL `is_admin()` helper exactly. Every existing route
 * guard, store gate, and UI visibility check using this function
 * continues to work unchanged for legacy admins; head/supervisor get
 * the same access automatically.
 */
export const isAdminRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'admin'
      || normalized === 'owner'
      || normalized === 'head'
      || normalized === 'supervisor';
};

/** Head OR Supervisor specifically (excludes legacy admin/owner). */
export const isHeadOrSupervisorRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'head' || normalized === 'supervisor';
};

/** Head only (excludes Supervisor, Assistant Head, and legacy admin/owner). */
export const isHeadRole = (input: RoleInput) => normalizeRole(input) === 'head';

/** Assistant Head — uses the team-member dashboard but with extra
 *  Quality Check approval power. Wired up in the next QC pass. */
export const isAssistantHeadRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'assistant_head';
};

/**
 * True only for the limited Quality Checker role. Distinct from admin and
 * from team-member — must not pass any "member" check.
 */
export const isQualityCheckerRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'quality_checker';
};

/**
 * True only for the read-only Viewer role. Excluded from leaderboard and active directory.
 */
export const isViewerRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'viewer';
};

/**
 * Member-class role. True for regular team members, Assistant Head, and Viewers.
 * Excludes head/supervisor/admin/owner/quality_checker/reviewer — they
 * have their own dashboards.
 *
 * Used by route guards and the sidebar to route AH alongside members.
 */
export const isMemberRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'member'
      || normalized === 'team_member'
      || normalized === 'assistant_head'
      || normalized === 'viewer';
};

// ── Account status ──────────────────────────────────────────────────────
export type AccountStatus = 'active' | 'inactive' | 'deactivated' | 'pending';

export const isApprovedStatus = (status: string | null | undefined): boolean => {
  // Active and inactive are both "approved" (inactive = soft-pause, not blocked).
  // Pending and deactivated do NOT have approved access.
  const s = (status ?? 'active').toLowerCase();
  return s === 'active' || s === 'inactive';
};

export const roleBadgeClass = (role: string | null | undefined) => {
  const normalized = normalizeRole(role);
  // Admin-class: primary tint
  if (normalized === 'admin' || normalized === 'owner' ||
      normalized === 'head'  || normalized === 'supervisor') return 'bg-primary/10 text-primary';
  // Reviewer-class: submitted tone
  if (normalized === 'reviewer' || normalized === 'assistant_head' ||
      normalized === 'quality_checker') return 'bg-status-submitted-bg text-status-submitted-fg';
  // Member-class: approved tone
  if (normalized === 'member' || normalized === 'team_member') return 'bg-status-approved-bg text-status-approved-fg';
  if (normalized === 'viewer') return 'bg-soft text-text-muted';
  return 'bg-soft text-text-muted';
};
