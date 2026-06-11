export interface NavItem {
  label: string;
  to: string;
  icon: string;
  badgeKey?: 'today' | 'tasks' | 'feedback' | 'submissions';
  children?: NavItem[];
  /** When set, a small uppercase section label renders above this item. */
  section?: string;
  isExecutiveOnly?: boolean;
  isLocked?: boolean;
  isTaskAlertManagerOnly?: boolean;
}

const svg = (path: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

/* ── Icon library ──────────────────────────────────────────────────────────
   Named once, referenced everywhere — consistent, modern line icons. */
const ICON = {
  dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  members: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  board: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h3M8 12h5M16 8h1M16 12h1M8 16h2"/>'),
  checkDoc: svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  shieldCheck: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
  pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  box: svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'),
  ebay: svg('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  projects: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  folders: svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  globe: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>'),
  monitor: svg('<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  plusCircle: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>'),
  cms: svg('<path d="M3 9h18"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 21V9"/>'),
  cube: svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
  bolt: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  note: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 14h6M9 18h4"/>'),
  chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  docs: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M8 7h8M8 11h8M8 15h5"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  trophy: svg('<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 5H3v2a4 4 0 0 0 4 4"/><path d="M19 5h2v2a4 4 0 0 1-4 4"/>'),
  alert: svg('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
  activity: svg('<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  profile: svg('<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>'),
  commandCenter: svg('<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>')
};

const workBoardChildren: NavItem[] = [
  { label: 'My Work Board', to: '/work-board/my', icon: ICON.checkDoc },
  { label: 'Member Board', to: '/work-board/members', icon: ICON.members },
  { label: 'Quality Check', to: '/work-board/quality-check', icon: ICON.shieldCheck }
];

const followupChildren: NavItem[] = [
  { label: 'Blog Followup', to: '/followup/blog', icon: ICON.pen },
  { label: 'Plugin Update', to: '/followup/plugins', icon: ICON.box },
  { label: 'eBay Click Followup', to: '/followup/ebay-click', icon: ICON.ebay },
  { label: 'Website Optimization', to: '/followup/speed-optimization', icon: ICON.clock }
];

const websiteChildren: NavItem[] = [
  { label: 'My Websites', to: '/websites/my', icon: ICON.monitor },
  { label: 'Team Websites', to: '/websites/team', icon: ICON.members },
  { label: 'New Website', to: '/websites/new', icon: ICON.plusCircle }
];

const cmsChildren: NavItem[] = [
  { label: 'Overview',   to: '/cms',          icon: ICON.dashboard },
  { label: 'Products',   to: '/cms/products', icon: ICON.cube, isLocked: true },
  { label: 'Blog Posts', to: '/cms/blog',     icon: ICON.pen  },
];

const promptChildren: NavItem[] = [
  { label: 'Prompt Dashboard', to: '/prompt', icon: ICON.dashboard },
  { label: 'Prompt Library', to: '/prompt/library', icon: ICON.book },
  { label: 'Prompt Builder', to: '/prompt/builder', icon: ICON.plus }
];

const adminReportsChildren: NavItem[] = [
  { label: 'Overview', to: '/reports/overview', icon: ICON.dashboard },
  { label: 'Daily Reports', to: '/reports/daily', icon: ICON.clock },
  { label: 'Weekly Reports', to: '/reports/weekly', icon: ICON.calendar },
  { label: 'Monthly Reports', to: '/reports/monthly', icon: ICON.calendar },
  { label: 'Member Performance', to: '/reports/member', icon: ICON.profile },
  { label: 'Team Analytics', to: '/reports/team', icon: ICON.members },
  { label: 'Activity Logs', to: '/reports/activity', icon: ICON.activity },
  { label: 'Productivity Insights', to: '/reports/insights', icon: ICON.bolt },
  { label: 'Exports', to: '/reports/exports', icon: ICON.download },
  { label: 'Report Settings', to: '/reports/settings', icon: ICON.settings }
];

const memberReportsChildren: NavItem[] = [
  { label: 'Overview', to: '/reports/overview', icon: ICON.dashboard },
  { label: 'Daily Reports', to: '/reports/daily', icon: ICON.clock },
  { label: 'Weekly Reports', to: '/reports/weekly', icon: ICON.calendar },
  { label: 'Monthly Reports', to: '/reports/monthly', icon: ICON.calendar },
  { label: 'Exports', to: '/reports/exports', icon: ICON.download }
];

export const adminNavItems: NavItem[] = [
  // ── OVERVIEW ──
  { section: 'Overview', label: 'Dashboard', to: '/', icon: ICON.dashboard },

  // ── EXECUTIVE ──
  { section: 'Executive', label: 'Command Center', to: '/command-center', icon: ICON.commandCenter, isExecutiveOnly: true },

  // ── OPERATIONS ──
  { section: 'Operations', label: 'Work Board', to: '/work-board', icon: ICON.board, children: workBoardChildren },
  { label: 'Followup', to: '/followup', icon: ICON.checkDoc, children: followupChildren },
  { label: 'Calendar', to: '/calendar', icon: ICON.calendar },
  { label: 'Reports', to: '/reports', icon: ICON.activity },
  { label: 'Projects', to: '/projects', icon: ICON.projects },
  { label: 'Folders', to: '/folders', icon: ICON.folders },

  // ── CONTENT ──
  { section: 'Content', label: 'Websites', to: '/websites', icon: ICON.globe, children: websiteChildren },
  { label: 'CMS', to: '/cms', icon: ICON.cms, children: cmsChildren },
  { label: 'Blog Center', to: '/blog-center', icon: ICON.bolt },
  { label: 'Images', to: '/images', icon: ICON.image },
  { label: 'Prompt', to: '/prompt', icon: ICON.chat, children: promptChildren },
  { label: 'Old Prompt Library', to: '/prompt-library', icon: ICON.book },

  // ── TEAM ──
  { section: 'Team', label: 'Members', to: '/members', icon: ICON.members },
  { label: 'Reviews', to: '/reviews', icon: ICON.checkDoc },
  { label: 'Leaderboard', to: '/leaderboard', icon: ICON.trophy },
  { label: 'Activity', to: '/activity', icon: ICON.activity },
  { label: 'Notes', to: '/notes', icon: ICON.note },

  // ── LIBRARY ──
  { section: 'Library', label: 'Docs', to: '/docs', icon: ICON.docs },
  { label: 'Resources', to: '/resources', icon: ICON.download },

  // ── SYSTEM ──
  { section: 'System', label: 'Settings', to: '/settings', icon: ICON.settings },
  { label: 'Task Alerts', to: '/admin/notifications/task-alerts', icon: ICON.alert, isTaskAlertManagerOnly: true }
];

/**
 * Sidebar entries for the limited Quality Checker role.
 * Intentionally minimal — these users must not see team work, member
 * boards, docs, prompts, reports, websites lists, or leaderboard.
 */
export const qualityCheckerNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: ICON.dashboard },
  { label: 'Quality Check Board', to: '/quality-check', icon: ICON.shieldCheck },
  { label: 'Profile', to: '/profile', icon: ICON.profile },
  { label: 'Settings', to: '/settings', icon: ICON.settings }
];

export const memberNavItems: NavItem[] = [
  // ── OVERVIEW ──
  { section: 'Overview', label: 'My Dashboard', to: '/my-dashboard', icon: ICON.dashboard },

  // ── OPERATIONS ──
  {
    section: 'Operations',
    label: 'Work Board',
    to: '/work-board',
    icon: ICON.board,
    children: [
      { label: 'My Work Board', to: '/work-board/my', badgeKey: 'today' as const, icon: ICON.checkDoc },
      { label: 'Member Board', to: '/work-board/members', icon: ICON.members },
      { label: 'Quality Check', to: '/work-board/quality-check', icon: ICON.shieldCheck }
    ]
  },
  { label: 'Followup', to: '/followup', icon: ICON.checkDoc, children: followupChildren },
  { label: 'Calendar', to: '/calendar', icon: ICON.calendar },
  { label: 'Reports', to: '/reports', icon: ICON.activity },

  // ── CONTENT ──
  { section: 'Content', label: 'Websites', to: '/websites', icon: ICON.globe, children: websiteChildren },
  { label: 'CMS', to: '/cms', icon: ICON.cms, children: cmsChildren },
  { label: 'Blog Center', to: '/blog-center', icon: ICON.bolt },
  { label: 'Images', to: '/images', icon: ICON.image },

  // ── TEAM ──
  { section: 'Team', label: 'Members', to: '/team-members', icon: ICON.members },
  { label: 'Leaderboard', to: '/leaderboard', icon: ICON.trophy },

  // ── LIBRARY ──
  { section: 'Library', label: 'Docs', to: '/docs', icon: ICON.docs },
  { label: 'Resources', to: '/resources', icon: ICON.download }
];

export const navItems = adminNavItems;
