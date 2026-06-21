// Mapping helpers between Supabase row shapes (snake_case) and the
// camelCase shapes used in the Vue app. Keep this thin — only what the UI
// actually consumes.

import type {
  Member,
  Website,
  Product,
  Folder,
  Project,
  Note,
  Prompt,
  EditableField,
  PromptAssignment,
  PromptReplacement,
  Submission,
  ReviewComment,
  SectionTask,
  TeamDoc,
  MonthlyReport,
  Blocker,
  ActivityLog,
  DocsFolder,
  DocsFile,
  DocsAssignment,
  Resource
} from '@/stores/data';

// =====================
// Profile <-> Member
// =====================
export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: Member['role'];
  status: 'active' | 'inactive' | 'deactivated' | 'deleted';
  avatar_url?: string | null;
  username?: string | null;
  position?: string | null;
  phone?: string | null;
  bio?: string | null;
  preferred_theme?: 'light' | 'dark-gray' | null;
  is_online?: boolean | null;
  current_status?: Member['currentStatus'] | null;
  last_active_at?: string | null;
  last_login_at?: string | null;
  last_logout_at?: string | null;
  today_activity_count?: number | null;
  current_page?: string | null;
  notes: string;
  last_seen_update_id?: string | null;
  department?: string | null;
  include_in_reports?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export const profileToMember = (r: ProfileRow): Member => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  role: r.role,
  status: r.status,
  avatarUrl: r.avatar_url ?? '',
  username: r.username ?? '',
  position: r.position ?? '',
  phone: r.phone ?? '',
  bio: r.bio ?? '',
  preferredTheme: r.preferred_theme === 'dark-gray' ? 'dark-gray' : 'light',
  isOnline: r.is_online ?? false,
  currentStatus: r.current_status ?? 'offline',
  lastActiveAt: r.last_active_at ?? '',
  lastLoginAt: r.last_login_at ?? '',
  lastLogoutAt: r.last_logout_at ?? '',
  todayActivityCount: r.today_activity_count ?? 0,
  currentPage: r.current_page ?? '',
  createdAt: r.created_at ?? '',
  updatedAt: r.updated_at ?? '',
  notes: r.notes ?? '',
  lastSeenUpdateId: r.last_seen_update_id ?? '',
  department: r.department ?? 'website_team',
  includeInReports: r.include_in_reports ?? true
});

export const memberToProfile = (m: Member): Partial<ProfileRow> => ({
  id: m.id || undefined,
  full_name: m.fullName,
  email: m.email,
  role: m.role,
  status: m.status,
  avatar_url: m.avatarUrl,
  username: m.username,
  position: m.position,
  phone: m.phone,
  bio: m.bio,
  preferred_theme: m.preferredTheme === 'dark-gray' ? 'dark-gray' : 'light',
  is_online: m.isOnline,
  current_status: m.currentStatus,
  last_active_at: m.lastActiveAt || null,
  last_login_at: m.lastLoginAt || null,
  last_logout_at: m.lastLogoutAt || null,
  today_activity_count: m.todayActivityCount,
  current_page: m.currentPage || null,
  notes: m.notes,
  last_seen_update_id: m.lastSeenUpdateId || null,
  department: m.department || 'website_team',
  include_in_reports: m.includeInReports ?? true
});

// =====================
// Folder
// =====================
export interface FolderRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export const folderRowToFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10)
});

export const folderToRow = (f: Folder): Partial<FolderRow> => ({
  id: f.id || undefined,
  name: f.name,
  description: f.description
});

// =====================
// Website (+ products)
// =====================
export interface WebsiteRow {
  id: string;
  name: string;
  domain: string;
  website_type: string;
  industry?: string | null;
  website_goal?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color?: string | null;
  text_color?: string | null;
  font_family: string;
  button_font_family: string;
  max_width: string;
  border_radius: string;
  design_style_notes: string;
  phone_number?: string | null;
  email?: string | null;
  business_address?: string | null;
  whatsapp_link?: string | null;
  facebook_link?: string | null;
  instagram_link?: string | null;
  youtube_link?: string | null;
  other_social_links?: string | null;
  main_keyword?: string | null;
  seo_notes: string;
  internal_linking_notes: string;
  target_country?: string | null;
  target_audience: string;
  extra_instructions: string;
  product_categories: string;
  important_pages: string;
  brand_notes: string;
  social_links?: string | null;
  status: 'in_development' | 'active' | 'inactive';
  notes: string;
  favicon_url?: string | null;
  created_by?: string;
  created_at?: string;
  quality_class_id?: string | null;
  is_framework?: boolean | null;
  platform_type?: 'wordpress' | 'framework' | 'unknown' | null;
  last_accessed_at?: string | null;
  website_products?: WebsiteProductRow[];
}

export interface WebsiteProductRow {
  id: string;
  website_id: string;
  name: string;
  category: string;
  url: string;
  image_url: string;
  short_description: string;
  long_description?: string | null;
  key_features?: string | null;
  key_specs: string;
  price: string;
  sku?: string | null;
  manual_url?: string | null;
  notes: string;
  position: number;
}

export const websiteRowToWebsite = (r: WebsiteRow): Website => ({
  id: r.id,
  name: r.name,
  domain: r.domain ?? '',
  websiteType: r.website_type ?? '',
  industry: r.industry ?? '',
  websiteGoal: r.website_goal ?? '',
  primaryColor: r.primary_color,
  secondaryColor: r.secondary_color,
  accentColor: r.accent_color,
  backgroundColor: r.background_color ?? '#ffffff',
  textColor: r.text_color ?? '#0f172a',
  fontFamily: r.font_family,
  buttonFontFamily: r.button_font_family,
  maxWidth: r.max_width,
  borderRadius: r.border_radius,
  designStyleNotes: r.design_style_notes ?? '',
  phoneNumber: r.phone_number ?? '',
  email: r.email ?? '',
  businessAddress: r.business_address ?? '',
  whatsappLink: r.whatsapp_link ?? '',
  facebookLink: r.facebook_link ?? '',
  instagramLink: r.instagram_link ?? '',
  youtubeLink: r.youtube_link ?? '',
  otherSocialLinks: r.other_social_links ?? '',
  mainKeyword: r.main_keyword ?? '',
  seoNotes: r.seo_notes ?? '',
  internalLinkingNotes: r.internal_linking_notes ?? '',
  targetCountry: r.target_country ?? '',
  targetAudience: r.target_audience ?? '',
  extraInstructions: r.extra_instructions ?? '',
  productCategories: r.product_categories ?? '',
  importantPages: r.important_pages ?? '',
  brandNotes: r.brand_notes ?? '',
  socialLinks: r.social_links ?? '',
  status: r.status,
  notes: r.notes ?? '',
  faviconUrl: r.favicon_url ?? '',
  createdBy: r.created_by ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10),
  qualityClassId: r.quality_class_id ?? null,
  isFramework: r.is_framework ?? false,
  platformType: r.platform_type ?? 'unknown',
  lastAccessedAt: r.last_accessed_at ?? null,
  products: (r.website_products ?? []).map(productRowToProduct)
});

export const websiteToRow = (w: Website): Partial<WebsiteRow> => ({
  id: w.id || undefined,
  name: w.name,
  domain: w.domain,
  website_type: w.websiteType,
  industry: w.industry,
  website_goal: w.websiteGoal,
  primary_color: w.primaryColor,
  secondary_color: w.secondaryColor,
  accent_color: w.accentColor,
  background_color: w.backgroundColor,
  text_color: w.textColor,
  font_family: w.fontFamily,
  button_font_family: w.buttonFontFamily,
  max_width: w.maxWidth,
  border_radius: w.borderRadius,
  design_style_notes: w.designStyleNotes,
  phone_number: w.phoneNumber,
  email: w.email,
  business_address: w.businessAddress,
  whatsapp_link: w.whatsappLink,
  facebook_link: w.facebookLink,
  instagram_link: w.instagramLink,
  youtube_link: w.youtubeLink,
  other_social_links: w.otherSocialLinks,
  main_keyword: w.mainKeyword,
  seo_notes: w.seoNotes,
  internal_linking_notes: w.internalLinkingNotes,
  target_country: w.targetCountry,
  target_audience: w.targetAudience,
  extra_instructions: w.extraInstructions,
  product_categories: w.productCategories,
  important_pages: w.importantPages,
  brand_notes: w.brandNotes,
  social_links: w.socialLinks,
  status: w.status,
  notes: w.notes,
  favicon_url: w.faviconUrl || null,
  created_by: w.createdBy || undefined,
  quality_class_id: w.qualityClassId ?? null,
  is_framework: w.platformType === 'framework',
  platform_type: w.platformType || 'unknown',
  last_accessed_at: w.lastAccessedAt
});

export const productRowToProduct = (r: WebsiteProductRow): Product => ({
  id: r.id,
  name: r.name ?? '',
  category: r.category ?? '',
  url: r.url ?? '',
  imageUrl: r.image_url ?? '',
  shortDescription: r.short_description ?? '',
  longDescription: r.long_description ?? '',
  keyFeatures: r.key_features ?? '',
  keySpecs: r.key_specs ?? '',
  price: r.price ?? '',
  sku: r.sku ?? '',
  manualUrl: r.manual_url ?? '',
  notes: r.notes ?? ''
});

export const productToRow = (
  p: Product,
  websiteId: string,
  position: number
): Partial<WebsiteProductRow> => ({
  id: p.id && !p.id.startsWith('pr_') ? p.id : undefined,
  website_id: websiteId,
  name: p.name,
  category: p.category,
  url: p.url,
  image_url: p.imageUrl,
  short_description: p.shortDescription,
  long_description: p.longDescription,
  key_features: p.keyFeatures,
  key_specs: p.keySpecs,
  price: p.price,
  sku: p.sku,
  manual_url: p.manualUrl,
  notes: p.notes,
  position
});

// =====================
// Project (+ members junction)
// =====================
export interface ProjectRow {
  id: string;
  name: string;
  website_id: string | null;
  status: Project['status'];
  deadline: string | null;
  notes: string;
  created_at: string;
  project_members?: { member_id: string }[];
}

export const projectRowToProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  websiteId: r.website_id,
  assignedMemberIds: (r.project_members ?? []).map((pm) => pm.member_id),
  status: r.status,
  deadline: r.deadline ?? '',
  notes: r.notes ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10)
});

export const projectToRow = (p: Project): Partial<ProjectRow> => ({
  id: p.id || undefined,
  name: p.name,
  website_id: p.websiteId,
  status: p.status,
  deadline: p.deadline || null,
  notes: p.notes
});

// =====================
// Note
// =====================
export interface NoteRow {
  id: string;
  title: string;
  related_type: Note['relatedType'];
  related_id: string | null;
  folder_id?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export const noteRowToNote = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  relatedType: r.related_type,
  relatedId: r.related_id,
  folderId: r.folder_id ?? null,
  content: r.content ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

export const noteToRow = (n: Note): Partial<NoteRow> => ({
  id: n.id || undefined,
  title: n.title,
  related_type: n.relatedType,
  related_id: n.relatedId,
  folder_id: n.folderId,
  content: n.content
});

// =====================
// Prompt Template
// =====================
export interface PromptRow {
  id: string;
  title: string;
  category: string;
  page_group?: string | null;
  section_type?: string | null;
  topic_type?: string | null;
  folder_id: string | null;
  prompt_type: Prompt['promptType'];
  prompt_mode?: Prompt['promptMode'] | null;
  compatible_website_types?: string[] | null;
  required_website_fields?: string[] | null;
  required_product_fields?: string[] | null;
  requires_products?: number | null;
  short_description?: string | null;
  locked_rules: string;
  editable_fields: EditableField[];
  template_content: string;
  default_values?: Record<string, string> | null;
  output_type: Prompt['outputType'];
  status: Prompt['status'];
  version: number;
  quality_status?: Prompt['qualityStatus'] | null;
  parent_prompt_id?: string | null;
  usage_count?: number | null;
  approved_output_count?: number | null;
  rejected_output_count?: number | null;
  needs_fix_count?: number | null;
  notes: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export const promptRowToPrompt = (r: PromptRow): Prompt => ({
  id: r.id,
  title: r.title,
  category: r.category ?? '',
  pageGroup: r.page_group ?? r.category ?? '',
  sectionType: r.section_type ?? '',
  topicType: r.topic_type ?? null,
  folderId: r.folder_id,
  promptType: r.prompt_type,
  promptMode: r.prompt_mode ?? (r.prompt_type === 'full_page' ? 'full_page' : 'section'),
  compatibleWebsiteTypes: Array.isArray(r.compatible_website_types) ? r.compatible_website_types : [],
  requiredWebsiteFields: Array.isArray(r.required_website_fields) ? r.required_website_fields : [],
  requiredProductFields: Array.isArray(r.required_product_fields) ? r.required_product_fields : [],
  requiresProducts: typeof r.requires_products === 'number' ? r.requires_products : 0,
  shortDescription: r.short_description ?? '',
  lockedRules: r.locked_rules ?? '',
  editableFields: Array.isArray(r.editable_fields) ? r.editable_fields : [],
  templateContent: r.template_content ?? '',
  defaultValues: r.default_values && typeof r.default_values === 'object' ? r.default_values : {},
  outputType: r.output_type,
  status: r.status,
  version: r.version,
  qualityStatus: r.quality_status ?? 'good',
  parentPromptId: r.parent_prompt_id ?? null,
  usageCount: r.usage_count ?? 0,
  approvedOutputCount: r.approved_output_count ?? 0,
  rejectedOutputCount: r.rejected_output_count ?? 0,
  needsFixCount: r.needs_fix_count ?? 0,
  notes: r.notes ?? '',
  createdBy: r.created_by ?? null,
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

export const promptToRow = (p: Prompt): Partial<PromptRow> => ({
  id: p.id || undefined,
  title: p.title,
  category: p.pageGroup || p.category,
  page_group: p.pageGroup || p.category,
  section_type: p.sectionType,
  topic_type: p.topicType || null,
  folder_id: p.folderId,
  prompt_type: p.promptType,
  prompt_mode: p.promptMode,
  compatible_website_types: p.compatibleWebsiteTypes,
  required_website_fields: p.requiredWebsiteFields,
  required_product_fields: p.requiredProductFields,
  requires_products: p.requiresProducts,
  short_description: p.shortDescription,
  locked_rules: p.lockedRules,
  editable_fields: p.editableFields,
  template_content: p.templateContent,
  default_values: p.defaultValues,
  output_type: p.outputType,
  status: p.status,
  version: p.version,
  quality_status: p.qualityStatus,
  parent_prompt_id: p.parentPromptId,
  // counters are incremented by dedicated store actions, NOT by admin save —
  // including them here would reset stats every time the editor saves.
  notes: p.notes
});

// =====================
// Prompt Replacement (audit trail of prompt swaps)
// =====================
export interface PromptReplacementRow {
  id: string;
  assignment_id: string;
  old_prompt_id: string;
  new_prompt_id: string;
  member_id: string;
  replaced_by: string | null;
  replacement_reason: PromptReplacement['replacementReason'];
  admin_note: string;
  created_at: string;
}

export const promptReplacementRowToReplacement = (
  r: PromptReplacementRow
): PromptReplacement => ({
  id: r.id,
  assignmentId: r.assignment_id,
  oldPromptId: r.old_prompt_id,
  newPromptId: r.new_prompt_id,
  memberId: r.member_id,
  replacedBy: r.replaced_by,
  replacementReason: r.replacement_reason,
  adminNote: r.admin_note ?? '',
  createdAt: (r.created_at ?? '').slice(0, 16).replace('T', ' ')
});

// =====================
// Prompt Assignment
// =====================
export interface AssignmentRow {
  id: string;
  prompt_id: string | null;
  project_id: string | null;
  website_id: string | null;
  assigned_member_id: string;
  assigned_by: string | null;
  status: PromptAssignment['status'];
  filled_values: Record<string, string>;
  pasted_result: string;
  due_date?: string | null;
  priority?: PromptAssignment['priority'];
  admin_note?: string;
  started_at?: string | null;
  completed_at?: string | null;
  assigned_at: string;
  updated_at: string;
  is_archived?: boolean;
}

export const assignmentRowToAssignment = (r: AssignmentRow): PromptAssignment => ({
  id: r.id,
  promptId: r.prompt_id ?? '',
  projectId: r.project_id,
  websiteId: r.website_id,
  assignedMemberId: r.assigned_member_id,
  status: r.status,
  filledValues: r.filled_values ?? {},
  pastedResult: r.pasted_result ?? '',
  dueDate: r.due_date ?? '',
  priority: r.priority ?? 'normal',
  adminNote: r.admin_note ?? '',
  startedAt: r.started_at ? r.started_at.slice(0, 10) : '',
  completedAt: r.completed_at ? r.completed_at.slice(0, 10) : '',
  assignedAt: (r.assigned_at ?? '').slice(0, 10),
  assignedBy: r.assigned_by,
  updatedAt: (r.updated_at ?? '').slice(0, 10),
  isArchived: r.is_archived || false
});

export const assignmentToRow = (
  a: PromptAssignment,
  assignedBy?: string | null
): Partial<AssignmentRow> => {
  const row: Partial<AssignmentRow> = {
    prompt_id: a.promptId || null,
    project_id: a.projectId,
    website_id: a.websiteId,
    assigned_member_id: a.assignedMemberId,
    status: a.status,
    filled_values: a.filledValues,
    pasted_result: a.pastedResult,
    due_date: a.dueDate || null,
    priority: a.priority,
    admin_note: a.adminNote,
    started_at: a.startedAt || null,
    completed_at: a.completedAt || null,
    is_archived: a.isArchived || false
  };
  if (a.id) row.id = a.id;
  if (assignedBy !== undefined) row.assigned_by = assignedBy;
  return row;
};

// =====================
// Section Task
// =====================
export interface SectionTaskRow {
  id: string;
  page_id: string;
  name: string;
  assigned_member_id: string | null;
  status: SectionTask['status'];
  notes: string;
  due_date?: string | null;
  priority?: SectionTask['priority'];
  admin_note?: string;
  created_at: string;
  updated_at: string;
  project_pages?: {
    title?: string;
    project_id?: string;
    projects?: { name?: string; deadline?: string | null } | null;
  } | null;
}

export const sectionTaskRowToTask = (r: SectionTaskRow): SectionTask => ({
  id: r.id,
  pageId: r.page_id,
  pageTitle: r.project_pages?.title ?? '',
  projectId: r.project_pages?.project_id ?? null,
  projectName: r.project_pages?.projects?.name ?? '',
  name: r.name,
  assignedMemberId: r.assigned_member_id,
  status: r.status,
  notes: r.notes ?? '',
  dueDate: r.due_date ?? r.project_pages?.projects?.deadline ?? '',
  priority: r.priority ?? 'normal',
  adminNote: r.admin_note ?? '',
  deadline: r.due_date ?? r.project_pages?.projects?.deadline ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

// =====================
// Submission
// =====================
export interface SubmissionRow {
  id: string;
  assignment_id: string;
  content: string;
  screenshot_url?: string;
  status: Submission['status'];
  submitted_by: string | null;
  submitted_at: string;
}

export const submissionRowToSubmission = (r: SubmissionRow): Submission => ({
  id: r.id,
  assignmentId: r.assignment_id,
  content: r.content ?? '',
  screenshotUrl: r.screenshot_url ?? '',
  status: r.status,
  submittedBy: r.submitted_by,
  submittedAt: (r.submitted_at ?? '').slice(0, 10)
});

export const submissionToRow = (s: Submission): Partial<SubmissionRow> => ({
  id: s.id || undefined,
  assignment_id: s.assignmentId,
  content: s.content,
  screenshot_url: s.screenshotUrl,
  status: s.status,
  submitted_by: s.submittedBy,
  submitted_at: s.submittedAt || undefined
});

// =====================
// Review Comment
// =====================
export interface ReviewCommentRow {
  id: string;
  submission_id: string;
  reviewer_id: string | null;
  body: string;
  created_at: string;
}

export const reviewCommentRowToComment = (r: ReviewCommentRow): ReviewComment => ({
  id: r.id,
  submissionId: r.submission_id,
  userId: r.reviewer_id,
  body: r.body ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10)
});

// =====================
// Team Docs
// =====================
export interface TeamDocRow {
  id: string;
  title: string;
  category: TeamDoc['category'];
  content: string;
  folder_id?: string | null;
  related_project_id: string | null;
  related_website_id: string | null;
  status: TeamDoc['status'];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const teamDocRowToDoc = (r: TeamDocRow): TeamDoc => ({
  id: r.id,
  title: r.title,
  category: r.category,
  content: r.content ?? '',
  folderId: r.folder_id ?? null,
  relatedProjectId: r.related_project_id,
  relatedWebsiteId: r.related_website_id,
  status: r.status,
  createdBy: r.created_by,
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

export const teamDocToRow = (d: TeamDoc, createdBy?: string | null): Partial<TeamDocRow> => {
  const row: Partial<TeamDocRow> = {
    id: d.id || undefined,
    title: d.title,
    category: d.category,
    content: d.content,
    folder_id: d.folderId,
    related_project_id: d.relatedProjectId,
    related_website_id: d.relatedWebsiteId,
    status: d.status
  };
  if (createdBy !== undefined) row.created_by = createdBy;
  return row;
};

// =====================
// Monthly Report
// =====================
export interface MonthlyReportRow {
  id: string;
  member_id: string;
  month: string;
  completed_summary: string;
  struggles: string;
  help_needed: string;
  blockers: string;
  next_month_plan: string;
  submitted_at: string;
  admin_comment: string;
  status: MonthlyReport['status'];
}

export const monthlyReportRowToReport = (r: MonthlyReportRow): MonthlyReport => ({
  id: r.id,
  memberId: r.member_id,
  month: r.month,
  completedSummary: r.completed_summary ?? '',
  struggles: r.struggles ?? '',
  helpNeeded: r.help_needed ?? '',
  blockers: r.blockers ?? '',
  nextMonthPlan: r.next_month_plan ?? '',
  submittedAt: (r.submitted_at ?? '').slice(0, 10),
  adminComment: r.admin_comment ?? '',
  status: r.status
});

export const monthlyReportToRow = (r: MonthlyReport): Partial<MonthlyReportRow> => ({
  id: r.id || undefined,
  member_id: r.memberId,
  month: r.month,
  completed_summary: r.completedSummary,
  struggles: r.struggles,
  help_needed: r.helpNeeded,
  blockers: r.blockers,
  next_month_plan: r.nextMonthPlan,
  admin_comment: r.adminComment,
  status: r.status
});

// =====================
// Blocker
// =====================
export interface BlockerRow {
  id: string;
  task_id: string | null;
  member_id: string;
  reason: string;
  what_tried: string;
  help_needed: string;
  urgency: Blocker['urgency'];
  status: Blocker['status'];
  admin_response: string;
  created_at: string;
  resolved_at: string | null;
}

export const blockerRowToBlocker = (r: BlockerRow): Blocker => ({
  id: r.id,
  taskId: r.task_id,
  memberId: r.member_id,
  reason: r.reason ?? '',
  whatTried: r.what_tried ?? '',
  helpNeeded: r.help_needed ?? '',
  urgency: r.urgency,
  status: r.status,
  adminResponse: r.admin_response ?? '',
  createdAt: (r.created_at ?? '').slice(0, 10),
  resolvedAt: r.resolved_at ? r.resolved_at.slice(0, 10) : ''
});

export const blockerToRow = (b: Blocker): Partial<BlockerRow> => ({
  id: b.id || undefined,
  task_id: b.taskId,
  member_id: b.memberId,
  reason: b.reason,
  what_tried: b.whatTried,
  help_needed: b.helpNeeded,
  urgency: b.urgency,
  status: b.status,
  admin_response: b.adminResponse,
  resolved_at: b.resolvedAt || null
});

// =====================
// Activity Log
// =====================
export interface ActivityLogRow {
  id: string;
  user_id: string;
  action: ActivityLog['action'];
  related_type: ActivityLog['relatedType'];
  related_id: string | null;
  message: string;
  created_at: string;
}

export const activityLogRowToActivity = (r: ActivityLogRow): ActivityLog => ({
  id: r.id,
  userId: r.user_id,
  action: r.action,
  relatedType: r.related_type,
  relatedId: r.related_id,
  message: r.message ?? '',
  createdAt: r.created_at ?? ''
});

// =====================
// Docs Drive — folders, files, assignments
// =====================
export interface DocsFolderRow {
  id: string;
  name: string;
  description: string;
  related_project_id: string | null;
  related_website_id: string | null;
  folder_color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const docsFolderRowToFolder = (r: DocsFolderRow): DocsFolder => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  relatedProjectId: r.related_project_id,
  relatedWebsiteId: r.related_website_id,
  folderColor: r.folder_color || '#15D6C2',
  createdBy: r.created_by,
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

export const docsFolderToRow = (
  f: DocsFolder,
  createdBy?: string | null
): Partial<DocsFolderRow> => ({
  id: f.id || undefined,
  name: f.name,
  description: f.description,
  related_project_id: f.relatedProjectId,
  related_website_id: f.relatedWebsiteId,
  folder_color: f.folderColor || '#15D6C2',
  ...(createdBy !== undefined ? { created_by: createdBy } : {})
});

export interface DocsFileRow {
  id: string;
  folder_id: string | null;
  title: string;
  type: DocsFile['type'];
  url: string;
  description: string;
  content: string;
  related_project_id: string | null;
  related_website_id: string | null;
  related_task_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Product doc fields
  category?: DocsFile['category'];
  product_name?: string;
  product_url?: string;
  product_image_url?: string;
  product_short_desc?: string;
  product_long_desc?: string;
  product_features?: string;
  product_specs?: string;
  product_price?: string;
  product_sku?: string;
  product_notes?: string;
  drive_link?: string;
  linked_prompt_id?: string | null;
}

export const docsFileRowToFile = (r: DocsFileRow): DocsFile => ({
  id: r.id,
  folderId: r.folder_id,
  title: r.title,
  type: r.type,
  url: r.url ?? '',
  description: r.description ?? '',
  content: r.content ?? '',
  relatedProjectId: r.related_project_id,
  relatedWebsiteId: r.related_website_id,
  relatedTaskId: r.related_task_id,
  createdBy: r.created_by,
  updatedBy: r.updated_by ?? null,
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10),
  category: r.category ?? 'other',
  productName: r.product_name ?? '',
  productUrl: r.product_url ?? '',
  productImageUrl: r.product_image_url ?? '',
  productShortDesc: r.product_short_desc ?? '',
  productLongDesc: r.product_long_desc ?? '',
  productFeatures: r.product_features ?? '',
  productSpecs: r.product_specs ?? '',
  productPrice: r.product_price ?? '',
  productSku: r.product_sku ?? '',
  productNotes: r.product_notes ?? '',
  driveLink: r.drive_link ?? '',
  linkedPromptId: r.linked_prompt_id ?? null
});

export const docsFileToRow = (
  f: DocsFile,
  createdBy?: string | null
): Partial<DocsFileRow> => ({
  id: f.id || undefined,
  folder_id: f.folderId,
  title: f.title,
  type: f.type,
  url: f.url,
  description: f.description,
  content: f.content,
  related_project_id: f.relatedProjectId,
  related_website_id: f.relatedWebsiteId,
  related_task_id: f.relatedTaskId,
  updated_by: f.updatedBy ?? null,
  category: f.category ?? 'other',
  product_name: f.productName ?? '',
  product_url: f.productUrl ?? '',
  product_image_url: f.productImageUrl ?? '',
  product_short_desc: f.productShortDesc ?? '',
  product_long_desc: f.productLongDesc ?? '',
  product_features: f.productFeatures ?? '',
  product_specs: f.productSpecs ?? '',
  product_price: f.productPrice ?? '',
  product_sku: f.productSku ?? '',
  product_notes: f.productNotes ?? '',
  drive_link: f.driveLink ?? '',
  linked_prompt_id: f.linkedPromptId ?? null,
  ...(createdBy !== undefined ? { created_by: createdBy } : {})
});

export interface DocsAssignmentRow {
  id: string;
  assignment_type: DocsAssignment['assignmentType'];
  folder_id: string | null;
  file_id: string | null;
  assigned_to: string;
  assigned_by: string | null;
  related_project_id: string | null;
  related_website_id: string | null;
  message: string;
  priority: DocsAssignment['priority'];
  due_date: string | null;
  status: DocsAssignment['status'];
  created_at: string;
  updated_at: string;
}

export const docsAssignmentRowToAssignment = (r: DocsAssignmentRow): DocsAssignment => ({
  id: r.id,
  assignmentType: r.assignment_type,
  folderId: r.folder_id,
  fileId: r.file_id,
  assignedTo: r.assigned_to,
  assignedBy: r.assigned_by,
  relatedProjectId: r.related_project_id,
  relatedWebsiteId: r.related_website_id,
  message: r.message ?? '',
  priority: r.priority,
  dueDate: r.due_date ? r.due_date.slice(0, 10) : '',
  status: r.status,
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

export const docsAssignmentToRow = (
  a: DocsAssignment,
  assignedBy?: string | null
): Partial<DocsAssignmentRow> => ({
  id: a.id || undefined,
  assignment_type: a.assignmentType,
  folder_id: a.assignmentType === 'folder' ? a.folderId : null,
  file_id: a.assignmentType === 'file' ? a.fileId : null,
  assigned_to: a.assignedTo,
  related_project_id: a.relatedProjectId,
  related_website_id: a.relatedWebsiteId,
  message: a.message,
  priority: a.priority,
  due_date: a.dueDate || null,
  status: a.status,
  ...(assignedBy !== undefined ? { assigned_by: assignedBy } : {})
});

// =====================
// Resources (user-created files / links / notes)
// =====================
export interface ResourceRow {
  id: string;
  title: string;
  type: Resource['type'];
  description: string;
  folder_id: string | null;
  project_id: string | null;
  website_id: string | null;
  task_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  external_url: string | null;
  text_content: string | null;
  visibility: Resource['visibility'];
  status: Resource['status'];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const resourceRowToResource = (r: ResourceRow): Resource => ({
  id: r.id,
  title: r.title,
  type: r.type,
  description: r.description ?? '',
  folderId: r.folder_id,
  projectId: r.project_id,
  websiteId: r.website_id,
  taskId: r.task_id,
  filePath: r.file_url ?? '',
  fileName: r.file_name ?? '',
  fileType: r.file_type ?? '',
  fileSize: r.file_size ?? 0,
  externalUrl: r.external_url ?? '',
  textContent: r.text_content ?? '',
  visibility: r.visibility,
  status: r.status,
  createdBy: r.created_by,
  createdAt: (r.created_at ?? '').slice(0, 10),
  updatedAt: (r.updated_at ?? '').slice(0, 10)
});

export const resourceToRow = (
  r: Resource,
  createdBy?: string | null
): Partial<ResourceRow> => ({
  id: r.id || undefined,
  title: r.title,
  type: r.type,
  description: r.description,
  folder_id: r.folderId,
  project_id: r.projectId,
  website_id: r.websiteId,
  task_id: r.taskId,
  file_url: r.filePath || null,
  file_name: r.fileName || null,
  file_type: r.fileType || null,
  file_size: r.fileSize || null,
  external_url: r.externalUrl || null,
  text_content: r.textContent || null,
  visibility: r.visibility,
  status: r.status,
  ...(createdBy !== undefined ? { created_by: createdBy } : {})
});
