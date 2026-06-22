import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/stores/data';
import { isAdminRole, isApprovedStatus, isQualityCheckerRole, isViewerRole, normalizeRole } from '@/lib/roles';

const adminOnly = { requiresAuth: true, roles: ['admin'] as Role[] };
const memberOnly = { requiresAuth: true, roles: ['member'] as Role[] };
const adminOrMember = { requiresAuth: true, roles: ['admin', 'member'] as Role[] };
const qualityCheckerOnly = { requiresAuth: true, roles: ['quality_checker'] as Role[] };
const adminOrQualityChecker = { requiresAuth: true, roles: ['admin', 'quality_checker'] as Role[] };
// Add 'quality_checker' to the allowlist for Quality Check routes so the
// roleIsAllowed gate doesn't bounce them off their own home page.
const qualityCheckAccess = { requiresAuth: true, roles: ['admin', 'member', 'quality_checker'] as Role[] };
const authenticated = { requiresAuth: true };

/**
 * `roleIsAllowed` maps abstract role buckets to concrete user roles:
 *   - `admin` in meta → ANY admin-class role (admin/owner/head/supervisor),
 *     via isAdminRole(). Head + Supervisor inherit admin access here.
 *   - `member` in meta → ANY non-admin-class, non-QC user. That includes
 *     team members AND Assistant Head — AH shares the Team Member
 *     dashboard by design, so it must pass every member route.
 *   - `quality_checker` in meta → only QC users (used by QC routes that
 *     also accept admin and member).
 */
const roleIsAllowed = (currentRole: Role | null, allowedRoles: Role[]) => {
  const normalized = normalizeRole(currentRole);
  return allowedRoles.some((role) => {
    const allowed = normalizeRole(role);
    if (allowed === 'admin') return isAdminRole(normalized);
    if (allowed === 'member') return !isAdminRole(normalized) && !isQualityCheckerRole(normalized);
    return normalized === allowed;
  });
};

const QUALITY_CHECKER_HOME = '/dashboard';

/**
 * Routes a Quality Checker is permitted on. Everything else they touch
 * (even via deep link) redirects to their home.
 */
const QC_ALLOWED_EXACT_PATHS = new Set([
  '/dashboard',
  '/quality-check',
  '/profile',
  '/profile/me',
  '/settings',
  '/pending'
]);

const isQualityCheckerAllowedPath = (path: string) =>
  QC_ALLOWED_EXACT_PATHS.has(path) || path.startsWith('/quality-check/');

const homePathForRole = (currentRole: Role | null) => {
  if (isAdminRole(currentRole)) return '/';
  if (isQualityCheckerRole(currentRole)) return QUALITY_CHECKER_HOME;
  return '/my-dashboard';
};

const redirectUnlessCurrent = (currentPath: string, targetPath: string) => {
  if (currentPath === targetPath) return true;
  return { path: targetPath };
};

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'admin-dashboard', meta: adminOnly, component: () => import('@/pages/AdminDashboardPage.vue') },
      { path: 'dashboard', name: 'quality-checker-dashboard', meta: qualityCheckerOnly, component: () => import('@/pages/QualityCheckerDashboardPage.vue') },
      { path: 'profile', name: 'profile', meta: authenticated, component: () => import('@/pages/ProfilePage.vue') },
      { path: 'profile/me', name: 'profile-me', meta: authenticated, component: () => import('@/pages/ProfilePage.vue') },
      { path: 'profiles/:userId', name: 'profile-detail', meta: authenticated, component: () => import('@/pages/FullProfilePage.vue') },
      { path: 'quality-checker-dashboard', redirect: '/dashboard' },
      { path: 'admin/work-board', name: 'admin-work-board', redirect: '/work-board/members' },
      { path: 'admin/work-board/member/:memberId', name: 'admin-member-work-board', meta: adminOrMember, component: () => import('@/pages/MemberBoardPage.vue') },
      { path: 'members', name: 'members', meta: adminOnly, component: () => import('@/pages/MembersPage.vue') },
      { path: 'members/:id/profile', name: 'member-profile', meta: adminOnly, component: () => import('@/pages/ProfilePage.vue') },
      { path: 'projects', name: 'projects', meta: adminOnly, component: () => import('@/pages/ProjectsPage.vue') },
      { path: 'folders', name: 'folders', meta: adminOrMember, component: () => import('@/pages/FoldersPage.vue') },
      { path: 'folders/:id', name: 'folder-detail', meta: adminOrMember, component: () => import('@/pages/FolderDetailPage.vue') },
      { path: 'websites', name: 'websites', redirect: '/websites/my' },
      { path: 'websites/my', name: 'websites-my', meta: adminOrMember, component: () => import('@/pages/MyWebsitesPage.vue') },
      { path: 'websites/team', name: 'websites-team', meta: adminOrMember, component: () => import('@/pages/TeamWebsitesPage.vue') },
      { path: 'websites/new', name: 'website-new', meta: adminOrMember, component: () => import('@/pages/NewWebsitePage.vue') },
      { path: 'websites/:id/edit', name: 'website-edit', meta: adminOrMember, component: () => import('@/pages/NewWebsitePage.vue') },
      { path: 'performance', name: 'performance', meta: adminOrMember, component: () => import('@/pages/PerformancePage.vue') },
      { path: 'notes', name: 'notes', meta: adminOnly, component: () => import('@/pages/NotesPage.vue') },
      { path: 'prompt-library', name: 'prompt-library', meta: adminOrMember, component: () => import('@/pages/PromptLibraryPage.vue') },
      { path: 'prompt-library/website/:websiteId', name: 'prompt-library-website', meta: adminOrMember, component: () => import('@/pages/PromptLibraryPage.vue') },
      { path: 'prompt-library/website/:websiteId/:pageGroup', name: 'prompt-library-website-group', meta: adminOrMember, component: () => import('@/pages/PromptLibraryPage.vue') },
      { path: 'prompt-library/website/:websiteId/:pageGroup/:promptId', name: 'prompt-library-website-detail', meta: adminOrMember, component: () => import('@/pages/PromptLibraryPage.vue') },
      { path: 'prompt-library/:pageGroup', name: 'prompt-library-group', meta: adminOrMember, component: () => import('@/pages/PromptLibraryPage.vue') },
      { path: 'prompt-library/:pageGroup/:promptId', name: 'prompt-library-detail', meta: adminOrMember, component: () => import('@/pages/PromptLibraryPage.vue') },
      { path: 'library', name: 'library', redirect: '/prompt-library' },
      { path: 'prompt-builder/use/:promptId', name: 'prompt-builder-use', meta: adminOrMember, component: () => import('@/pages/MemberPromptBuilderPage.vue') },
      { path: 'reviews', name: 'reviews', meta: adminOnly, component: () => import('@/pages/ReviewsPage.vue') },
      { path: 'docs/folders/:id', name: 'docs-folder-detail', meta: adminOrMember, component: () => import('@/pages/DocsFolderDetailPage.vue') },
      { path: 'docs', name: 'docs', meta: adminOrMember, component: () => import('@/pages/DocsPage.vue') },
      { path: 'resources', name: 'resources', meta: adminOrMember, component: () => import('@/pages/ResourcesPage.vue') },
      { path: 'resources/:id', name: 'resource-detail', meta: adminOrMember, component: () => import('@/pages/ResourceDetailPage.vue') },
      { path: 'leaderboard', name: 'leaderboard', meta: authenticated, component: () => import('@/pages/LeaderboardPage.vue') },
      { path: 'calendar', name: 'calendar', meta: adminOrMember, component: () => import('@/pages/CalendarPage.vue') },
      { path: 'activity', name: 'activity', meta: adminOnly, component: () => import('@/pages/ActivityPage.vue') },
      { path: 'settings', name: 'settings', meta: adminOrQualityChecker, component: () => import('@/pages/SettingsPage.vue') },
      { path: 'settings/translations', name: 'translations-review', meta: adminOnly, component: () => import('@/pages/TranslationReviewPage.vue') },
      { path: 'my-dashboard', name: 'member-dashboard', meta: memberOnly, component: () => import('@/pages/MemberDashboardPage.vue') },
      { path: 'team-members', name: 'team-members', meta: memberOnly, component: () => import('@/pages/TeamMembersPage.vue') },
      { path: 'quality-check', name: 'quality-check-direct', meta: qualityCheckAccess, component: () => import('@/pages/QualityCheckPage.vue') },
      { path: 'quality-check/:websiteId', name: 'quality-check-board-direct', meta: qualityCheckAccess, component: () => import('@/pages/QualityBoardPage.vue') },
      { path: 'work-board', name: 'work-board', redirect: '/work-board/my' },
      { path: 'work-board/my', name: 'work-board-my', meta: adminOrMember, component: () => import('@/pages/TodaysWorkPage.vue') },
      { path: 'work-board/members', name: 'work-board-members', meta: adminOrMember, component: () => import('@/pages/MemberBoardPage.vue') },
      { path: 'work-board/members/:memberId', name: 'work-board-member-detail', meta: adminOrMember, component: () => import('@/pages/MemberBoardPage.vue') },
      { path: 'work-board/quality-check', name: 'quality-check', meta: qualityCheckAccess, component: () => import('@/pages/QualityCheckPage.vue') },
      { path: 'work-board/quality-check/:websiteId', name: 'quality-check-board', meta: qualityCheckAccess, component: () => import('@/pages/QualityBoardPage.vue') },
      { path: 'today', name: 'today', redirect: '/work-board/my' },
      { path: 'my-assigned-prompts', name: 'my-assigned-prompts', meta: memberOnly, component: () => import('@/pages/MyAssignedPromptsPage.vue') },
      { path: 'prompt-builder', name: 'prompt-builder', meta: memberOnly, component: () => import('@/pages/MemberPromptBuilderPage.vue') },
      { path: 'prompt-builder/:assignmentId', name: 'prompt-builder-assignment', meta: memberOnly, component: () => import('@/pages/MemberPromptBuilderPage.vue') },
      { path: 'my-submissions', name: 'my-submissions', meta: memberOnly, component: () => import('@/pages/MySubmissionsPage.vue') },
      { path: 'review-feedback', name: 'review-feedback', meta: memberOnly, component: () => import('@/pages/ReviewFeedbackPage.vue') },
      { path: 'notifications', name: 'notifications', meta: authenticated, component: () => import('@/pages/NotificationsPage.vue') },
      {
        path: 'admin/notifications/task-alerts',
        name: 'task-alerts-admin',
        component: () => import('@/pages/TaskAlertsAdminPage.vue'),
        beforeEnter: (to, from, next) => {
          const auth = useAuthStore();
          const role = normalizeRole(auth.profile?.role);
          if (role === 'admin' || role === 'owner' || role === 'head') {
            next();
          } else {
            next(homePathForRole(auth.profile?.role || null));
          }
        }
      },
      { path: 'followup', name: 'followup', meta: adminOrMember, component: () => import('@/pages/FollowupPage.vue') },
      { path: 'followup/blog', name: 'followup-blog', meta: adminOrMember, component: () => import('@/pages/FollowupBlogPage.vue') },
      { path: 'followup/blog/:websiteId', name: 'followup-blog-tracker', meta: adminOrMember, component: () => import('@/pages/FollowupBlogTrackerPage.vue') },
      { path: 'followup/plugins', name: 'followup-plugins', meta: adminOrMember, component: () => import('@/pages/FollowupPluginsPage.vue') },
      { path: 'followup/plugins/:websiteId', name: 'followup-plugins-tracker', meta: adminOrMember, component: () => import('@/pages/FollowupPluginsTrackerPage.vue') },
      { path: 'followup/ebay-click', name: 'followup-ebay-click', meta: adminOrMember, component: () => import('@/pages/FollowupEbayClickPage.vue') },
      { path: 'followup/ebay-click/:memberId', name: 'followup-ebay-click-member', meta: adminOrMember, component: () => import('@/pages/FollowupEbayClickPage.vue') },
      { path: 'followup/speed-optimization', name: 'followup-speed-optimization', meta: adminOrMember, component: () => import('@/pages/FollowupSpeedOptimizationPage.vue') },
      { path: 'followup/speed-optimization/:websiteId', name: 'followup-speed-optimization-tracker', meta: adminOrMember, component: () => import('@/pages/FollowupSpeedOptimizationTrackerPage.vue') },

      // ── CMS ──────────────────────────────────────────────────────────────
      // adminOrMember meta admits Head/Supervisor/AH/Team Member; the
      // existing roleIsAllowed logic excludes Quality Checker.
      { path: 'cms',              name: 'cms-home',          meta: adminOrMember, component: () => import('@/pages/cms/CmsHomePage.vue') },
      { path: 'cms/products',     name: 'cms-products',      meta: adminOrMember, component: () => import('@/pages/cms/CmsProductsListPage.vue') },
      { path: 'cms/products/:id', name: 'cms-product-edit',  meta: adminOrMember, component: () => import('@/pages/cms/CmsProductEditPage.vue') },
      { path: 'cms/blog',         name: 'cms-blog',          meta: adminOrMember, component: () => import('@/pages/cms/CmsBlogPostsListPage.vue') },
      { path: 'cms/blog/:id',     name: 'cms-blog-edit',     meta: adminOrMember, component: () => import('@/pages/cms/CmsBlogPostEditPage.vue') },

      // ── Images dashboard ───────────────────────────────────────────────────
      // Standalone hub for blog imagery: WebP converter + visibility-scoped
      // library. Extensible — more image tools will land here over time.
      { path: 'images', name: 'images', meta: adminOrMember, component: () => import('@/pages/ImagesPage.vue') },

      // ── Blog Center ────────────────────────────────────────────────────────
      // Main fast-workflow page (pick brand → title → machine → copy prompt).
      { path: 'blog-center', name: 'blog-center', meta: adminOrMember, component: () => import('@/pages/BlogCenterPage.vue') },
      // Per-website template management — accessed via "Manage Templates" link
      // from inside Blog Center. Head/Supervisor/Assistant Head only.
      { path: 'blog-center/templates', name: 'blog-center-templates', meta: adminOrMember, component: () => import('@/pages/BlogImageCenterPage.vue') },
      { path: 'blog-center/templates/:websiteId', name: 'blog-center-templates-detail', meta: adminOrMember, component: () => import('@/pages/BlogImageCenterDetailPage.vue') },
      // Legacy redirects so old links continue to work.
      { path: 'blog-image-center', redirect: '/blog-center' },
      { path: 'blog-image-center/:websiteId', redirect: (to) => `/blog-center/templates/${to.params.websiteId}` },
      { path: 'blog-image-library', redirect: '/blog-center' },

      // ── Prompt Workflow System ──────────────────────────────────────────────
      { path: 'prompt', name: 'prompt-dashboard', meta: adminOrMember, component: () => import('@/pages/PromptDashboardPage.vue') },
      { path: 'prompt/library', name: 'prompt-workflow-library', meta: adminOrMember, component: () => import('@/pages/PromptWorkflowLibraryPage.vue') },
      { path: 'prompt/builder', name: 'prompt-workflow-builder', meta: adminOrMember, component: () => import('@/pages/PromptWorkflowBuilderPage.vue') },
      { path: 'prompt/builder/:promptId', name: 'prompt-workflow-builder-prompt', meta: adminOrMember, component: () => import('@/pages/PromptWorkflowBuilderPage.vue') },
      { path: 'prompt/website/:websiteId', name: 'prompt-website', meta: adminOrMember, component: () => import('@/pages/PromptWebsitePage.vue') },
      { path: 'prompt/website/:websiteId/page/:pageType', name: 'prompt-page-group', meta: adminOrMember, component: () => import('@/pages/PromptPageGroupPage.vue') },

      // ── Reports Dashboard ──────────────────────────────────────────────────
      {
        path: 'reports',
        name: 'reports-dashboard',
        component: () => import('@/pages/reports/PerformanceDocumentationPage.vue'),
        meta: authenticated
      },

      // ── Command Center (Executive OS) ───────────────────────────────────────
      { path: 'command-center', name: 'command-center', meta: { requiresAuth: true, roles: ['head', 'supervisor'] as Role[] }, component: () => import('@/pages/CommandCenterPage.vue') },

      // ── Winner Center (Owner/Admin/Head monthly reward system) ───────────────
      // Owner/Admin/Head only — Supervisor and below are excluded. A custom
      // guard is used because the `roles: ['admin']` meta token expands to
      // include Supervisor (via isAdminRole), which we must keep out here.
      {
        path: 'winner-center',
        name: 'winner-center',
        meta: { requiresAuth: true },
        component: () => import('@/pages/WinnerCenterPage.vue'),
        beforeEnter: (to, from, next) => {
          const auth = useAuthStore();
          const role = normalizeRole(auth.profile?.role);
          if (role === 'admin' || role === 'owner' || role === 'head') {
            next();
          } else {
            next(homePathForRole(auth.profile?.role || null));
          }
        }
      }
    ]
  },
  {
    path: '/auth',
    component: AuthLayout,
    meta: { requiresGuest: true },
    children: [
      { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue') },
      { path: '/register', name: 'register', component: () => import('@/pages/RegisterPage.vue') }
    ]
  },
  {
    // Pending-approval landing. Bare route (no sidebar/topbar) — the
    // beforeEach guard sends every unapproved authenticated user here.
    path: '/pending',
    name: 'pending-approval',
    meta: { requiresAuth: true, allowPending: true },
    component: () => import('@/pages/PendingApprovalPage.vue')
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // Wait for the real Supabase session/profile initialization.
  if (!auth.initialized || auth.initializing) {
    await auth.init();
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresAuth && auth.isAuthenticated && !auth.profile && auth.error) {
    return true;
  }
  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return redirectUnlessCurrent(to.path, homePathForRole(auth.currentRole));
  }

  // Pending / deactivated accounts can only see the pending screen and
  // /login (which the auth-guest guard above will bounce them off of).
  // Once approved, this clause becomes a no-op.
  if (auth.isAuthenticated && auth.profile && !isApprovedStatus(auth.profile.status)) {
    if (to.meta.allowPending) return true;
    return redirectUnlessCurrent(to.path, '/pending');
  }
  // Approved user accidentally hits /pending — send them home.
  if (to.path === '/pending' && auth.isAuthenticated && auth.profile && isApprovedStatus(auth.profile.status)) {
    return redirectUnlessCurrent(to.path, homePathForRole(auth.currentRole));
  }

  // Quality Checker is a strict allowlist — block every other route at
  // the router level, regardless of what the route's role metadata says.
  if (isQualityCheckerRole(auth.currentRole) && !isQualityCheckerAllowedPath(to.path)) {
    return redirectUnlessCurrent(to.path, QUALITY_CHECKER_HOME);
  }

  // Viewers cannot access creation or editing routes (read-only enforcement)
  if (isViewerRole(auth.currentRole) && (
    to.path === '/websites/new' ||
    to.path.includes('/edit') ||
    to.path.includes('/new') ||
    to.path.includes('/builder') ||
    to.path.startsWith('/cms/products/') ||
    to.path.startsWith('/cms/blog/')
  )) {
    return redirectUnlessCurrent(to.path, '/my-dashboard');
  }

  const roles = to.meta.roles as Role[] | undefined;
  if (roles?.length) {
    if (!auth.currentRole) return true;
    if (!roleIsAllowed(auth.currentRole, roles)) {
      return redirectUnlessCurrent(to.path, homePathForRole(auth.currentRole));
    }
  }
  return true;
});

router.afterEach((to) => {
  const auth = useAuthStore();
  if (!auth.initialized || !auth.isAuthenticated || !auth.profile) return;

  void auth.touchActive(to.fullPath, { force: true });
  void auth.recordActivity('page_navigated', 'page', null, `Opened ${to.fullPath}.`);

  if (to.path === '/work-board/my') {
    void auth.recordActivity('opened_today_work', 'page', null, 'Opened My Work Board.');
  }
  if (to.name === 'prompt-builder-assignment' || to.name === 'prompt-builder-use') {
    const assignmentId = typeof to.params.assignmentId === 'string' ? to.params.assignmentId : null;
    const promptId = typeof to.params.promptId === 'string' ? to.params.promptId : null;
    void auth.recordActivity(
      'opened_task',
      assignmentId ? 'assignment' : promptId ? 'prompt' : 'page',
      assignmentId || promptId,
      assignmentId ? 'Opened a task.' : 'Opened a prompt.'
    );
  }
  if (to.path === '/review-feedback') {
    void auth.recordActivity('viewed_admin_feedback', 'page', null, 'Viewed admin feedback.');
  }
  if (to.path.startsWith('/docs')) {
    void auth.recordActivity('viewed_doc', 'page', null, 'Opened Docs.');
  }
  if (to.path.startsWith('/prompt')) {
    void auth.recordActivity('page_navigated', 'page', null, 'Opened Prompt Workflow.');
  }
});
