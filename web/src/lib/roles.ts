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

type FollowupUserInput = {
  role?: string | null;
  status?: string | null;
  department?: string | null;
  includeInReports?: boolean | null;
  include_in_reports?: boolean | null;
} | string | null | undefined;

type DashboardVisibleUserInput = {
  role?: string | null;
  status?: string | null;
  includeInReports?: boolean | null;
  include_in_reports?: boolean | null;
  excludedFromReports?: boolean | null;
  excluded_from_reports?: boolean | null;
  deletedAt?: string | null;
  deleted_at?: string | null;
  isDeleted?: boolean | null;
  is_deleted?: boolean | null;
} | string | null | undefined;

export const isFollowupRequiredRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'admin'
      || normalized === 'owner'
      || normalized === 'head'
      || normalized === 'assistant_head'
      || normalized === 'team_member'
      || normalized === 'member';
};

export const isFollowupParticipant = (input: FollowupUserInput | DashboardVisibleUserInput): boolean => {
  if (!input) return false;
  if (typeof input === 'string') {
    return isFollowupRequiredRole(input);
  }

  const role = normalizeRole(input.role);
  const status = (input.status ?? 'active').trim().toLowerCase();
  const deleted = Boolean(
    (input as any).deletedAt ||
    (input as any).deleted_at ||
    (input as any).isDeleted ||
    (input as any).is_deleted
  );
  
  const includeInReports = (input as any).includeInReports ?? (input as any).include_in_reports;
  const excludedFromReports = (input as any).excludedFromReports ?? (input as any).excluded_from_reports;
  const isExcluded = excludedFromReports === true || includeInReports === false;

  return status === 'active'
      && !deleted
      && !isExcluded
      && isFollowupRequiredRole(role);
};

export const isFollowupRequiredUser = (input: FollowupUserInput | DashboardVisibleUserInput) => {
  return isFollowupParticipant(input);
};

export const isDashboardVisibleRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'head'
      || normalized === 'admin'
      || normalized === 'owner'
      || normalized === 'assistant_head'
      || normalized === 'member'
      || normalized === 'team_member';
};

export const isDashboardVisibleMember = (input: DashboardVisibleUserInput) => {
  if (typeof input === 'string' || input == null) return isDashboardVisibleRole(input);
  const status = (input.status ?? 'active').trim().toLowerCase();
  const includeInReports = input.includeInReports ?? input.include_in_reports ?? true;
  const excludedFromReports = input.excludedFromReports ?? input.excluded_from_reports ?? false;
  const deleted = Boolean(input.deletedAt || input.deleted_at || input.isDeleted || input.is_deleted);

  return status === 'active'
      && !deleted
      && includeInReports !== false
      && excludedFromReports !== true
      && isDashboardVisibleRole(input.role);
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

/** Owner / Admin / Head — legacy Winner Center roles. */
export const isOwnerAdminOrHeadRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'admin' || normalized === 'owner' || normalized === 'head';
};

/** Winner Center access roles. Supervisor is included so they can test the flow. */
export const canAccessWinnerCenterRole = (input: RoleInput) => {
  const normalized = normalizeRole(input);
  return normalized === 'admin'
      || normalized === 'owner'
      || normalized === 'head'
      || normalized === 'supervisor';
};

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
