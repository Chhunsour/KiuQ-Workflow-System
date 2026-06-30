import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import {
  activityLogRowToActivity,
  assignmentRowToAssignment,
  assignmentToRow,
  blockerRowToBlocker,
  blockerToRow,
  docsAssignmentRowToAssignment,
  docsAssignmentToRow,
  docsFileRowToFile,
  docsFileToRow,
  docsFolderRowToFolder,
  docsFolderToRow,
  folderRowToFolder,
  folderToRow,
  monthlyReportRowToReport,
  monthlyReportToRow,
  noteRowToNote,
  noteToRow,
  productToRow,
  profileToMember,
  promptReplacementRowToReplacement,
  promptRowToPrompt,
  promptToRow,
  projectRowToProject,
  projectToRow,
  resourceRowToResource,
  resourceToRow,
  reviewCommentRowToComment,
  sectionTaskRowToTask,
  submissionRowToSubmission,
  teamDocRowToDoc,
  teamDocToRow,
  websiteRowToWebsite,
  websiteToRow,
  type ActivityLogRow,
  type AssignmentRow,
  type BlockerRow,
  type DocsAssignmentRow,
  type DocsFileRow,
  type DocsFolderRow,
  type FolderRow,
  type MonthlyReportRow,
  type NoteRow,
  type ProfileRow,
  type ProjectRow,
  type PromptReplacementRow,
  type PromptRow,
  type ResourceRow,
  type ReviewCommentRow,
  type SectionTaskRow,
  type SubmissionRow,
  type TeamDocRow,
  type WebsiteRow
} from '@/lib/db';
import { useAuthStore } from '@/stores/auth';
import { useFollowupStore } from '@/stores/followup';
import { isAdminRole, isDashboardVisibleMember } from '@/lib/roles';
import type { Status } from '@/components/ui/StatusBadge.vue';

// =====================
// Types (UI-facing, camelCase)
// =====================
export type Role = 'admin' | 'member' | 'reviewer' | (string & {});
export type ProjectStatus = 'not_started' | 'in_progress' | 'review' | 'approved' | 'completed';
export type PromptStatus = 'draft' | 'approved';
export type PromptMode = 'section' | 'full_page';
export type AssignmentStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'needs_fix'
  | 'rejected'
  | 'needs_resubmission'
  | 'postponed';

export type PromptQualityStatus = 'good' | 'needs_improvement' | 'weak' | 'archived';

export type PromptReplacementReason =
  | 'weak_prompt'
  | 'needs_improvement'
  | 'better_prompt_available'
  | 'other';

export interface PromptReplacement {
  id: string;
  assignmentId: string;
  oldPromptId: string;
  newPromptId: string;
  memberId: string;
  replacedBy: string | null;
  replacementReason: PromptReplacementReason;
  adminNote: string;
  createdAt: string;
}
export type SubmissionStatus = 'submitted' | 'approved' | 'needs_fix' | 'rejected';
export type WebsiteStatus = 'in_development' | 'active' | 'inactive';
export type MemberStatus = 'active' | 'inactive' | 'deactivated' | 'deleted';
export type MemberPresenceStatus = 'online' | 'away' | 'offline';
export type PromptType =
  | 'full_page'
  | 'section'
  | 'seo'
  | 'content'
  | 'design'
  | 'image'
  | 'fixing'
  | 'blog';
export type OutputType =
  | 'html_css'
  | 'elementor_section'
  | 'full_page_layout'
  | 'seo_fields'
  | 'page_copy'
  | 'image_prompt'
  | 'policy_text'
  | 'faq_text'
  | 'text'
  | 'full_page';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type DocCategory =
  | 'system'
  | 'assigned_prompts'
  | 'submissions'
  | 'wordpress'
  | 'elementor'
  | 'design'
  | 'seo'
  | 'images'
  | 'mistakes'
  | 'admin';
export type DocStatus = 'draft' | 'published';
export type MonthlyReportStatus = 'submitted' | 'reviewed';
export type BlockerStatus = 'open' | 'resolved';
export type ThemePreference = 'light' | 'dark-gray';
export type BoardColumnKey = 'to_do' | 'in_progress' | 'waiting_review' | 'needs_fix' | 'completed' | 'postpone';

export type ActivityAction =
  | 'user_login'
  | 'user_logged_in'
  | 'user_logout'
  | 'user_logged_out'
  | 'page_navigated'
  | 'opened_today_work'
  | 'opened_task'
  | 'marked_task_in_progress'
  | 'task_started'
  | 'copied_prompt'
  | 'prompt_copied'
  | 'submitted_work'
  | 'output_submitted'
  | 'approved_submission'
  | 'feedback_received'
  | 'completed_task'
  | 'overdue_task'
  | 'task_approved'
  | 'task_needs_fix'
  | 'rejected_submission'
  | 'reported_blocker'
  | 'blocker_reported'
  | 'viewed_admin_feedback'
  | 'resubmitted_work'
  | 'created_resource'
  | 'uploaded_file'
  | 'uploaded_resource'
  | 'saved_link'
  | 'viewed_doc'
  | 'submitted_monthly_report'
  | 'monthly_report_submitted'
  | 'project_created'
  | 'task_assigned'
  | 'assigned_task'
  | 'reviewed_submission'
  | 'review_submission'
  | 'approved_work'
  | 'gave_feedback'
  | 'doc_created'
  | 'added_doc'
  | 'blocker_resolved'
  | 'resolved_blocker'
  | 'prompt_created'
  | 'created_prompt'
  | 'prompt_replaced'
  | 'replaced_prompt'
  | 'prompt_replacement'
  | 'csv_exported'
  | 'gsc_synced'
  | 'product_updated';

export interface Member {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: MemberStatus;
  avatarUrl: string;
  username: string;
  position: string;
  phone: string;
  bio: string;
  preferredTheme: ThemePreference;
  isOnline: boolean;
  currentStatus: MemberPresenceStatus;
  lastActiveAt: string;
  lastLoginAt: string;
  lastLogoutAt: string;
  todayActivityCount: number;
  currentPage: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  lastSeenUpdateId: string;
  department?: string;
  includeInReports?: boolean;
}

export interface SystemUpdate {
  id: string;
  updateId: string;
  type: 'feature' | 'fix' | 'improvement' | 'announcement';
  title: string;
  message: string;
  readMoreUrl: string;
  isOfficial: boolean;
  createdBy?: string | null;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  url: string;
  imageUrl: string;
  shortDescription: string;
  longDescription: string;
  keyFeatures: string;
  keySpecs: string;
  price: string;
  sku: string;
  manualUrl: string;
  notes: string;
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  websiteType: string;
  industry: string;
  websiteGoal: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  buttonFontFamily: string;
  maxWidth: string;
  borderRadius: string;
  designStyleNotes: string;
  phoneNumber: string;
  email: string;
  businessAddress: string;
  whatsappLink: string;
  facebookLink: string;
  instagramLink: string;
  youtubeLink: string;
  otherSocialLinks: string;
  mainKeyword: string;
  seoNotes: string;
  internalLinkingNotes: string;
  targetCountry: string;
  targetAudience: string;
  extraInstructions: string;
  productCategories: string;
  importantPages: string;
  brandNotes: string;
  socialLinks: string;
  status: WebsiteStatus;
  notes: string;
  faviconUrl: string;
  createdBy: string;
  createdAt: string;
  qualityClassId: string | null;
  isFramework: boolean;
  platformType: 'wordpress' | 'framework' | 'unknown';
  lastAccessedAt: string | null;
  products: Product[];
}

export interface Project {
  id: string;
  name: string;
  websiteId: string | null;
  assignedMemberIds: string[];
  status: ProjectStatus;
  deadline: string;
  notes: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  relatedType: 'project' | 'website' | 'prompt' | 'team' | 'none';
  relatedId: string | null;
  folderId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface EditableField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  helper?: string;
  options?: string[];
  defaultValue?: string;
}

export interface Prompt {
  id: string;
  title: string;
  category: string;
  pageGroup: string;
  sectionType: string;
  topicType: string | null;
  folderId: string | null;
  promptType: PromptType;
  promptMode: PromptMode;
  compatibleWebsiteTypes: string[];
  requiredWebsiteFields: string[];
  requiredProductFields: string[];
  requiresProducts: number;
  shortDescription: string;
  lockedRules: string;
  editableFields: EditableField[];
  templateContent: string;
  defaultValues: Record<string, string>;
  outputType: OutputType;
  status: PromptStatus;
  version: number;
  qualityStatus: PromptQualityStatus;
  parentPromptId: string | null;
  usageCount: number;
  approvedOutputCount: number;
  rejectedOutputCount: number;
  needsFixCount: number;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptAssignment {
  id: string;
  promptId: string;
  projectId: string | null;
  websiteId: string | null;
  assignedMemberId: string;
  status: AssignmentStatus;
  filledValues: Record<string, string>;
  pastedResult: string;
  dueDate: string;
  priority: Priority;
  adminNote: string;
  startedAt: string;
  completedAt: string;
  assignedAt: string;
  assignedBy: string | null;
  updatedAt: string;
  isArchived?: boolean;
}

export interface SectionTask {
  id: string;
  pageId: string;
  pageTitle: string;
  projectId: string | null;
  projectName: string;
  name: string;
  assignedMemberId: string | null;
  status: ProjectStatus;
  notes: string;
  dueDate: string;
  priority: Priority;
  adminNote: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  content: string;
  screenshotUrl: string;
  status: SubmissionStatus;
  submittedBy: string | null;
  submittedAt: string;
}

export interface ReviewComment {
  id: string;
  submissionId: string;
  userId: string | null;
  body: string;
  createdAt: string;
}

export interface TeamDoc {
  id: string;
  title: string;
  category: DocCategory;
  content: string;
  folderId: string | null;
  relatedProjectId: string | null;
  relatedWebsiteId: string | null;
  status: DocStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyReport {
  id: string;
  memberId: string;
  month: string;
  completedSummary: string;
  struggles: string;
  helpNeeded: string;
  blockers: string;
  nextMonthPlan: string;
  submittedAt: string;
  adminComment: string;
  status: MonthlyReportStatus;
}

export interface Blocker {
  id: string;
  taskId: string | null;
  memberId: string;
  reason: string;
  whatTried: string;
  helpNeeded: string;
  urgency: Priority;
  status: BlockerStatus;
  adminResponse: string;
  createdAt: string;
  resolvedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  relatedType:
    | 'assignment'
    | 'submission'
    | 'blocker'
    | 'monthly_report'
    | 'task'
    | 'resource'
    | 'page'
    | 'profile'
    | 'prompt'
    | 'none';
  relatedId: string | null;
  message: string;
  createdAt: string;
}

// =====================
// Docs Drive
// =====================
export type DocsFileType =
  | 'text_doc'
  | 'google_doc'
  | 'google_sheet'
  | 'google_drive'
  | 'pdf'
  | 'image_folder'
  | 'website_link'
  | 'other';

export type DocsFileCategory =
  | 'product_details'
  | 'website_instructions'
  | 'landing_page_prompts'
  | 'seo_notes'
  | 'design_references'
  | 'company_rules'
  | 'other';

export type DocsAssignmentStatus = 'sent' | 'viewed' | 'used' | 'archived';
export type DocsAssignmentPriority = 'low' | 'normal' | 'high';
export type DocsAssignmentType = 'folder' | 'file';

export interface DocsFolder {
  id: string;
  name: string;
  description: string;
  relatedProjectId: string | null;
  relatedWebsiteId: string | null;
  folderColor: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocsFile {
  id: string;
  folderId: string | null;
  title: string;
  type: DocsFileType;
  url: string;
  description: string;
  content: string;
  relatedProjectId: string | null;
  relatedWebsiteId: string | null;
  relatedTaskId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Product doc fields
  category: DocsFileCategory;
  productName: string;
  productUrl: string;
  productImageUrl: string;
  productShortDesc: string;
  productLongDesc: string;
  productFeatures: string;
  productSpecs: string;
  productPrice: string;
  productSku: string;
  productNotes: string;
  driveLink: string;
  linkedPromptId: string | null;
}

export interface DocsAssignment {
  id: string;
  assignmentType: DocsAssignmentType;
  folderId: string | null;
  fileId: string | null;
  assignedTo: string;
  assignedBy: string | null;
  relatedProjectId: string | null;
  relatedWebsiteId: string | null;
  message: string;
  priority: DocsAssignmentPriority;
  dueDate: string;
  status: DocsAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Resources
// =====================
export type ResourceType =
  | 'file'
  | 'link'
  | 'note'
  | 'document'
  | 'website_ref'
  | 'screenshot';

export type ResourceVisibility = 'private' | 'team' | 'admin_only';
export type ResourceStatus = 'draft' | 'published';

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  description: string;
  folderId: string | null;
  projectId: string | null;
  websiteId: string | null;
  taskId: string | null;
  // For file/screenshot — Supabase Storage path within the 'resources' bucket.
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  // For link/website_ref.
  externalUrl: string;
  // For note/document.
  textContent: string;
  visibility: ResourceVisibility;
  status: ResourceStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface TeamMemberSummary {
  memberId: string;
  fullName: string;
  role: string;
  email: string;
  status: string;
  avatarUrl: string | null;
  currentStatus: MemberPresenceStatus;
  lastActiveAt: string | null;
  createdAt: string;
  followupsDone: number;
  followupsTotal: number;
  followupsPending: number;
  followupsMissed: number;
  followupsNotRequired: number;
  followupsAutoCompleted: number;
  tasksInProgress: number;
  tasksWaitingReview: number;
  tasksCompleted: number;
  tasksOverdue: number;
  qiAssigned: number;
  qiFixed: number;
  qiWaitingReview: number;
  qiNeedsFix: number;
  completedWorkCount: number;
}

type EntityKey =
  | 'members'
  | 'projects'
  | 'folders'
  | 'websites'
  | 'notes'
  | 'prompts'
  | 'assignments'
  | 'sectionTasks'
  | 'submissions'
  | 'reviewComments'
  | 'docs'
  | 'monthlyReports'
  | 'blockers'
  | 'activityLogs'
  | 'docsFolders'
  | 'docsFiles'
  | 'docsAssignments'
  | 'resources'
  | 'promptReplacements';

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
const friendlyDashboardError = 'Could not load dashboard data. Please try again.';

export const useDataStore = defineStore('data', () => {
  const members = ref<Member[]>([]);
  const projects = ref<Project[]>([]);
  const folders = ref<Folder[]>([]);
  const websites = ref<Website[]>([]);
  const notes = ref<Note[]>([]);
  const prompts = ref<Prompt[]>([]);
  const assignments = ref<PromptAssignment[]>([]);
  const sectionTasks = ref<SectionTask[]>([]);
  const submissions = ref<Submission[]>([]);
  const reviewComments = ref<ReviewComment[]>([]);
  const docs = ref<TeamDoc[]>([]);
  const monthlyReports = ref<MonthlyReport[]>([]);
  const blockers = ref<Blocker[]>([]);
  const activityLogs = ref<ActivityLog[]>([]);
  const docsFolders = ref<DocsFolder[]>([]);
  const docsFiles = ref<DocsFile[]>([]);
  const docsAssignments = ref<DocsAssignment[]>([]);
  const resources = ref<Resource[]>([]);
  const promptReplacements = ref<PromptReplacement[]>([]);
  // websiteId -> docId[]
  const websiteProductDocs = ref<Record<string, string[]>>({});

  const lastFetchTime = reactive<Record<EntityKey | 'all', number>>({
    members: 0,
    projects: 0,
    folders: 0,
    websites: 0,
    notes: 0,
    prompts: 0,
    assignments: 0,
    sectionTasks: 0,
    submissions: 0,
    reviewComments: 0,
    docs: 0,
    monthlyReports: 0,
    blockers: 0,
    activityLogs: 0,
    docsFolders: 0,
    docsFiles: 0,
    docsAssignments: 0,
    resources: 0,
    promptReplacements: 0,
    all: 0
  });

  const loading = reactive<Record<EntityKey, boolean>>({
    members: false,
    projects: false,
    folders: false,
    websites: false,
    notes: false,
    prompts: false,
    assignments: false,
    sectionTasks: false,
    submissions: false,
    reviewComments: false,
    docs: false,
    monthlyReports: false,
    blockers: false,
    activityLogs: false,
    docsFolders: false,
    docsFiles: false,
    docsAssignments: false,
    resources: false,
    promptReplacements: false
  });

  const errors = reactive<Record<EntityKey, string | null>>({
    members: null,
    projects: null,
    folders: null,
    websites: null,
    notes: null,
    prompts: null,
    assignments: null,
    sectionTasks: null,
    submissions: null,
    reviewComments: null,
    docs: null,
    monthlyReports: null,
    blockers: null,
    activityLogs: null,
    docsFolders: null,
    docsFiles: null,
    docsAssignments: null,
    resources: null,
    promptReplacements: null
  });
  const dataLoading = computed(() => Object.values(loading).some(Boolean));

  // ============= Generic helpers =============
  const fetchWatchdogs = new Map<EntityKey, ReturnType<typeof setTimeout>>();

  const ensureConfigured = (key: EntityKey): boolean => {
    if (!supabaseConfigured) {
      errors[key] = 'Supabase is not configured. See web/.env.example.';
      return false;
    }
    return true;
  };

  const CACHE_MS = 5 * 60 * 1000;

  const shouldFetch = (key: EntityKey | 'all', force = false) => {
    if (force) return true;
    const now = Date.now();
    return now - lastFetchTime[key] > CACHE_MS;
  };

  const beginFetch = (key: EntityKey | 'all', force = false): boolean => {
    if (key !== 'all' && !ensureConfigured(key)) return false;
    if (!shouldFetch(key, force)) return false;
    
    const loadingKey = key === 'all' ? 'members' : key;
    if (loading[loadingKey]) return false;
    
    loading[loadingKey] = true;
    if (key !== 'all') {
      errors[key] = null;
      if (fetchWatchdogs.has(key)) clearTimeout(fetchWatchdogs.get(key));
      fetchWatchdogs.set(
        key,
        setTimeout(() => {
          if (loading[key]) {
            console.error(`[data] ${key} fetch timed out`);
            errors[key] = friendlyDashboardError;
            loading[key] = false;
          }
          fetchWatchdogs.delete(key);
        }, 10_000)
      );
    }
    return true;
  };

  const finishFetch = (key: EntityKey | 'all'): void => {
    if (key !== 'all' && fetchWatchdogs.has(key)) {
      clearTimeout(fetchWatchdogs.get(key));
      fetchWatchdogs.delete(key);
    }
    const loadingKey = key === 'all' ? 'members' : key;
    loading[loadingKey] = false;
    lastFetchTime[key] = Date.now();
  };

  const recordFetchError = (key: EntityKey, context: string, err: unknown): void => {
    console.error(`[data] ${context}: ${errMsg(err)}`, err);
    errors[key] = friendlyDashboardError;
  };

  // ============= Members (profiles) =============
  const profileSelect =
    'id, full_name, email, role, status, avatar_url, username, position, phone, bio, preferred_theme, is_online, current_status, last_active_at, last_login_at, last_logout_at, today_activity_count, current_page, notes, last_seen_update_id, department, include_in_reports, created_at, updated_at';

  const fetchMembers = async (force = false) => {
    if (!beginFetch('members', force)) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(profileSelect)
        .order('full_name', { ascending: true });
      if (error) {
        recordFetchError('members', 'fetchMembers', error);
        return;
      }
      members.value = (data as ProfileRow[]).map(profileToMember);
    } catch (err) {
      recordFetchError('members', 'fetchMembers', err);
    } finally {
      finishFetch('members');
    }
  };

  const fetchMemberProfile = async (id: string): Promise<Member | null> => {
    if (!id || !supabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(profileSelect)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const member = profileToMember(data as ProfileRow);
      const index = members.value.findIndex((item) => item.id === member.id);
      if (index === -1) {
        members.value.push(member);
      } else {
        members.value[index] = member;
      }
      errors.members = null;
      return member;
    } catch (err) {
      console.error(`[data] fetchMemberProfile: ${errMsg(err)}`, err);
      return null;
    }
  };

  const upsertMember = async (m: Member): Promise<boolean> => {
    if (!ensureConfigured('members')) return false;
    if (!m.id) {
      errors.members =
        'New members sign up at /register. Edit their role and status here once they appear.';
      return false;
    }
    errors.members = null;
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: m.fullName,
        email: m.email,
        role: m.role,
        status: m.status,
        avatar_url: m.avatarUrl,
        username: m.username || null,
        position: m.position,
        phone: m.phone,
        bio: m.bio,
        preferred_theme: m.preferredTheme,
        notes: m.notes
      })
      .eq('id', m.id);
    if (error) {
      errors.members = error.message;
      return false;
    }
    const member = { ...m };
    const index = members.value.findIndex((item) => item.id === member.id);
    if (index === -1) {
      members.value.push(member);
    } else {
      members.value[index] = member;
    }
    return true;
  };

  const deactivateMember = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('members')) return false;
    errors.members = null;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'deactivated',
          is_online: false,
          current_status: 'offline'
        })
        .eq('id', id);
      if (error) {
        errors.members = error.message;
        return false;
      }

      // Cascading cleanups for the deactivated member
      await supabase.from('websites').update({ status: 'inactive' }).eq('created_by', id);
      await supabase.from('prompt_assignments').delete().eq('assigned_member_id', id);
      await supabase.from('project_members').delete().eq('member_id', id);
      await supabase.from('section_tasks').delete().eq('assigned_member_id', id);
      await supabase.from('quality_issues').delete().eq('assigned_to', id);
      await supabase.from('docs_assignments').delete().eq('assigned_to', id);

      // Refresh stores to update UI immediately
      await fetchMembers();
      await fetchWebsites(true);
      await fetchAssignments(true);
      await fetchSectionTasks(true);
      await fetchDocsAssignments();
      await fetchProjects(true);

      return true;
    } catch (err) {
      console.error('[data] deactivateMember:', err);
      errors.members = 'Could not deactivate user. Please try again.';
      return false;
    }
  };

  const softDeleteMember = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('members')) return false;
    errors.members = null;
    try {
      const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id });
      if (error) {
        console.error('[data] softDeleteMember RPC error:', error);
        errors.members = error.message;
        return false;
      }
      // Remove from local list immediately
      members.value = members.value.filter((m) => m.id !== id);
      return true;
    } catch (err) {
      console.error('[data] softDeleteMember:', err);
      errors.members = 'Could not delete user. Please try again.';
      return false;
    }
  };

  /** @deprecated Use deactivateMember or softDeleteMember instead. */
  const removeMember = async (_id: string): Promise<boolean> => {
    errors.members =
      'Deleting a profile requires removing the auth user. Set status to "Inactive" instead.';
    return false;
  };

  // ============= Folders =============
  const fetchFolders = async (force = false) => {
    if (!beginFetch('folders', force)) return;
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: true });
      if (error) {
        recordFetchError('folders', 'fetchFolders', error);
        return;
      }
      folders.value = (data as FolderRow[]).map(folderRowToFolder);
    } catch (err) {
      recordFetchError('folders', 'fetchFolders', err);
    } finally {
      finishFetch('folders');
    }
  };

  const upsertFolder = async (f: Folder): Promise<boolean> => {
    if (!ensureConfigured('folders')) return false;
    errors.folders = null;
    const row = folderToRow(f);
    const { error } = f.id
      ? await supabase.from('folders').update(row).eq('id', f.id)
      : await supabase.from('folders').insert(row);
    if (error) {
      errors.folders = error.message;
      return false;
    }
    await fetchFolders();
    return true;
  };

  const removeFolder = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('folders')) return false;
    errors.folders = null;
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) {
      errors.folders = error.message;
      return false;
    }
    folders.value = folders.value.filter((f) => f.id !== id);
    return true;
  };

  // ============= Websites (+ products) =============
  const fetchWebsites = async (force = false) => {
    if (!beginFetch('websites', force)) return;
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*, website_products(*), created_at')
        .order('name', { ascending: true });
      if (error) {
        recordFetchError('websites', 'fetchWebsites', error);
        return;
      }
      websites.value = (data as WebsiteRow[]).map((row) => {
        // sort children by position
        if (row.website_products) {
          row.website_products = [...row.website_products].sort((a, b) => a.position - b.position);
        }
        return websiteRowToWebsite(row);
      });
    } catch (err) {
      recordFetchError('websites', 'fetchWebsites', err);
    } finally {
      finishFetch('websites');
    }
  };

  const upsertWebsite = async (w: Website): Promise<string | null> => {
    if (!ensureConfigured('websites')) return null;
    errors.websites = null;
    const row = websiteToRow(w);
    let id = w.id;
    if (id) {
      const { error } = await supabase.from('websites').update(row).eq('id', id);
      if (error) {
        errors.websites = error.message;
        return null;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('websites')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        errors.websites = error.message;
        return null;
      }
      id = (inserted as { id: string }).id;
    }

    // Replace products: delete then insert
    const { error: delErr } = await supabase.from('website_products').delete().eq('website_id', id);
    if (delErr) {
      errors.websites = delErr.message;
      return null;
    }
    if (w.products.length > 0) {
      const productRows = w.products.map((p, i) => productToRow(p, id!, i));
      // strip undefined ids so postgres generates new ones
      const cleaned = productRows.map((p) => {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(p) as (keyof typeof p)[]) {
          if (p[k] !== undefined) out[k as string] = p[k];
        }
        return out;
      });
      const { error: insErr } = await supabase.from('website_products').insert(cleaned);
      if (insErr) {
        errors.websites = insErr.message;
        return null;
      }
    }

    await fetchWebsites();

    // Ensure followup slots exist for the saved website (fire-and-forget, no await)
    void (async () => {
      const followup = useFollowupStore();
      await Promise.all([followup.ensureBlogSlots(id!), followup.ensurePluginSlots(id!)]);
    })();

    return id ?? null;
  };

  const removeWebsite = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('websites')) return false;
    errors.websites = null;
    const { error } = await supabase.from('websites').delete().eq('id', id);
    if (error) {
      errors.websites = error.message;
      return false;
    }
    websites.value = websites.value.filter((w) => w.id !== id);
    return true;
  };

  // ============= Notes =============
  const fetchNotes = async (force = false) => {
    if (!beginFetch('notes', force)) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, related_type, related_id, folder_id, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) {
        recordFetchError('notes', 'fetchNotes', error);
        return;
      }
      notes.value = (data as NoteRow[]).map(noteRowToNote);
    } catch (err) {
      recordFetchError('notes', 'fetchNotes', err);
    } finally {
      finishFetch('notes');
    }
  };

  const upsertNote = async (n: Note): Promise<boolean> => {
    if (!ensureConfigured('notes')) return false;
    errors.notes = null;
    const row = noteToRow(n);
    const { error } = n.id
      ? await supabase.from('notes').update(row).eq('id', n.id)
      : await supabase.from('notes').insert(row);
    if (error) {
      errors.notes = error.message;
      return false;
    }
    await fetchNotes();
    return true;
  };

  const removeNote = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('notes')) return false;
    errors.notes = null;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      errors.notes = error.message;
      return false;
    }
    notes.value = notes.value.filter((n) => n.id !== id);
    return true;
  };

  // ============= Prompts =============
  const fetchPrompts = async (force = false) => {
    if (!beginFetch('prompts', force)) return;
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('id, title, category, page_group, section_type, topic_type, folder_id, prompt_type, prompt_mode, short_description, output_type, status, version, quality_status, parent_prompt_id, usage_count, approved_output_count, rejected_output_count, needs_fix_count, created_by, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) {
        recordFetchError('prompts', 'fetchPrompts', error);
        return;
      }
      prompts.value = (data as PromptRow[]).map(promptRowToPrompt);
    } catch (err) {
      recordFetchError('prompts', 'fetchPrompts', err);
    } finally {
      finishFetch('prompts');
    }
  };

  const upsertPrompt = async (p: Prompt): Promise<boolean> => {
    if (!ensureConfigured('prompts')) return false;
    errors.prompts = null;
    const row = promptToRow(p);
    const { error } = p.id
      ? await supabase.from('prompt_templates').update(row).eq('id', p.id)
      : await supabase.from('prompt_templates').insert(row);
    if (error) {
      errors.prompts = error.message;
      return false;
    }
    await fetchPrompts();
    return true;
  };

  const fetchPromptDetail = async (id: string): Promise<Prompt | null> => {
    if (!ensureConfigured('prompts')) return null;
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const p = promptRowToPrompt(data as PromptRow);
      // Update local state if present
      const idx = prompts.value.findIndex(item => item.id === p.id);
      if (idx !== -1) {
        prompts.value[idx] = p;
      } else {
        prompts.value.push(p);
      }
      return p;
    } catch (err) {
      console.error('[data] fetchPromptDetail failed', err);
      return null;
    }
  };

  const removePrompt = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('prompts')) return false;
    errors.prompts = null;
    const { error } = await supabase.from('prompt_templates').delete().eq('id', id);
    if (error) {
      errors.prompts = error.message;
      return false;
    }
    prompts.value = prompts.value.filter((p) => p.id !== id);
    return true;
  };

  const ensureBoardTaskPrompt = async (): Promise<string> => {
    const existing = prompts.value.find(
      (prompt) =>
        prompt.notes.includes('[system:work-board-task]') ||
        prompt.title === 'General Work Board Task'
    );
    if (existing) return existing.id;
    if (!ensureConfigured('prompts')) return '';

    errors.prompts = null;
    const { data: inserted, error } = await supabase
      .from('prompt_templates')
      .insert({
        title: 'General Work Board Task',
        category: 'work-board',
        page_group: 'work-board',
        section_type: 'General Task',
        topic_type: null,
        folder_id: null,
        prompt_type: 'section',
        prompt_mode: 'section',
        compatible_website_types: [],
        required_website_fields: [],
        required_product_fields: [],
        requires_products: 0,
        short_description: 'Default prompt used for general Work Board task cards.',
        locked_rules: '',
        editable_fields: [],
        template_content:
          'Complete the assigned task using the card title, description, links, checklist, and admin note.',
        default_values: {},
        output_type: 'text',
        status: 'approved',
        version: 1,
        quality_status: 'good',
        parent_prompt_id: null,
        notes: '[system:work-board-task] Default prompt used when a Work Board card is not tied to a prompt template.'
      })
      .select('*')
      .single();

    if (error) {
      errors.prompts = error.message;
      return '';
    }

    const prompt = promptRowToPrompt(inserted as PromptRow);
    prompts.value = [prompt, ...prompts.value];
    return prompt.id;
  };

  // Set folder_id for one or more prompts in a single round-trip.
  // Pass folderId = null to remove from a folder.
  const movePromptsToFolder = async (
    promptIds: string[],
    folderId: string | null
  ): Promise<boolean> => {
    if (!ensureConfigured('prompts')) return false;
    if (!promptIds.length) return true;
    errors.prompts = null;
    const { error } = await supabase
      .from('prompt_templates')
      .update({ folder_id: folderId })
      .in('id', promptIds);
    if (error) {
      errors.prompts = error.message;
      return false;
    }
    await fetchPrompts();
    return true;
  };

  // ============= Prompt quality (admin-only) =============
  const updatePromptQuality = async (
    promptId: string,
    quality: PromptQualityStatus
  ): Promise<boolean> => {
    if (!ensureConfigured('prompts')) return false;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errors.prompts = 'Only admins can change prompt quality.';
      return false;
    }
    errors.prompts = null;
    const { error } = await supabase
      .from('prompt_templates')
      .update({ quality_status: quality })
      .eq('id', promptId);
    if (error) {
      errors.prompts = error.message;
      return false;
    }
    const idx = prompts.value.findIndex((p) => p.id === promptId);
    if (idx >= 0) prompts.value[idx] = { ...prompts.value[idx], qualityStatus: quality };
    return true;
  };

  const archivePrompt = (promptId: string) => updatePromptQuality(promptId, 'archived');

  // Duplicate a prompt as a new version: same content, version+1,
  // parentPromptId points at the source. Status defaults to 'draft' so the
  // admin can polish before approving.
  const duplicatePromptAsNewVersion = async (sourceId: string): Promise<Prompt | null> => {
    if (!ensureConfigured('prompts')) return null;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errors.prompts = 'Only admins can duplicate prompts.';
      return null;
    }
    const source = prompts.value.find((p) => p.id === sourceId);
    if (!source) {
      errors.prompts = 'Source prompt not found.';
      return null;
    }
    errors.prompts = null;
    const row = {
      title: source.title,
      category: source.pageGroup || source.category,
      page_group: source.pageGroup || source.category,
      section_type: source.sectionType,
      topic_type: source.topicType,
      folder_id: source.folderId,
      prompt_type: source.promptType,
      prompt_mode: source.promptMode,
      compatible_website_types: source.compatibleWebsiteTypes,
      required_website_fields: source.requiredWebsiteFields,
      required_product_fields: source.requiredProductFields,
      requires_products: source.requiresProducts,
      short_description: source.shortDescription,
      locked_rules: source.lockedRules,
      editable_fields: source.editableFields,
      template_content: source.templateContent,
      default_values: source.defaultValues,
      output_type: source.outputType,
      status: 'draft' as PromptStatus,
      version: source.version + 1,
      quality_status: 'good' as PromptQualityStatus,
      parent_prompt_id: source.parentPromptId ?? source.id,
      notes: source.notes
    };
    const { data, error } = await supabase
      .from('prompt_templates')
      .insert(row)
      .select('*')
      .single();
    if (error) {
      errors.prompts = error.message;
      return null;
    }
    await fetchPrompts();
    return data ? prompts.value.find((p) => p.id === (data as { id: string }).id) ?? null : null;
  };

  // Replace the prompt on an existing assignment, log the swap, and bump
  // the active assignment status to 'needs_resubmission' so the team
  // member sees a clear "use the new prompt and resubmit" notice.
  const replacePromptForAssignment = async (params: {
    assignmentId: string;
    newPromptId: string;
    reason: PromptReplacementReason;
    adminNote: string;
    markOldQuality?: PromptQualityStatus | null;
  }): Promise<boolean> => {
    if (!ensureConfigured('promptReplacements')) return false;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errors.promptReplacements = 'Only admins can replace a prompt.';
      return false;
    }
    const assignment = assignments.value.find((a) => a.id === params.assignmentId);
    if (!assignment) {
      errors.promptReplacements = 'Assignment not found.';
      return false;
    }
    if (assignment.promptId === params.newPromptId) {
      errors.promptReplacements = 'New prompt is the same as the current one.';
      return false;
    }
    errors.promptReplacements = null;

    // 1) Insert the audit row
    const { error: insertError } = await supabase.from('prompt_replacements').insert({
      assignment_id: params.assignmentId,
      old_prompt_id: assignment.promptId,
      new_prompt_id: params.newPromptId,
      member_id: assignment.assignedMemberId,
      replaced_by: auth.user?.id ?? null,
      replacement_reason: params.reason,
      admin_note: params.adminNote
    });
    if (insertError) {
      errors.promptReplacements = insertError.message;
      return false;
    }

    // 2) Swap prompt + flip status on the assignment, clear the old pasted result
    const { error: assignmentError } = await supabase
      .from('prompt_assignments')
      .update({
        prompt_id: params.newPromptId,
        status: 'needs_resubmission',
        filled_values: {},
        pasted_result: '',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.assignmentId);
    if (assignmentError) {
      errors.promptReplacements = assignmentError.message;
      return false;
    }

    // 3) Optionally update the old prompt's quality flag in the same flow
    if (params.markOldQuality && params.markOldQuality !== 'good') {
      await updatePromptQuality(assignment.promptId, params.markOldQuality);
    }

    // 4) Activity log entry
    const oldPromptTitle = prompts.value.find((p) => p.id === assignment.promptId)?.title ?? 'old prompt';
    const newPromptTitle = prompts.value.find((p) => p.id === params.newPromptId)?.title ?? 'new prompt';
    await addActivityLog(
      'task_needs_fix',
      'assignment',
      params.assignmentId,
      `Admin replaced "${oldPromptTitle}" with "${newPromptTitle}". Reason: ${params.reason.replace(/_/g, ' ')}.`,
      assignment.assignedMemberId
    );

    await Promise.allSettled([fetchAssignments(), fetchPromptReplacements()]);
    return true;
  };

  const fetchPromptReplacements = async () => {
    if (!beginFetch('promptReplacements')) return;
    try {
      const { data, error } = await supabase
        .from('prompt_replacements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        recordFetchError('promptReplacements', 'fetchPromptReplacements', error);
        return;
      }
      promptReplacements.value = (data as PromptReplacementRow[]).map(
        promptReplacementRowToReplacement
      );
    } catch (err) {
      recordFetchError('promptReplacements', 'fetchPromptReplacements', err);
    } finally {
      finishFetch('promptReplacements');
    }
  };

  // ============= Projects (+ project_members) =============
  const fetchProjects = async (force = false) => {
    if (!beginFetch('projects', force)) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_members(member_id)')
        .order('created_at', { ascending: false });
      if (error) {
        recordFetchError('projects', 'fetchProjects', error);
        return;
      }
      projects.value = (data as ProjectRow[]).map(projectRowToProject);
    } catch (err) {
      recordFetchError('projects', 'fetchProjects', err);
    } finally {
      finishFetch('projects');
    }
  };

  const upsertProject = async (p: Project): Promise<boolean> => {
    if (!ensureConfigured('projects')) return false;
    errors.projects = null;
    const row = projectToRow(p);
    let id = p.id;
    if (id) {
      const { error } = await supabase.from('projects').update(row).eq('id', id);
      if (error) {
        errors.projects = error.message;
        return false;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('projects')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        errors.projects = error.message;
        return false;
      }
      id = (inserted as { id: string }).id;
    }

    // Sync project_members: replace
    const { error: delErr } = await supabase.from('project_members').delete().eq('project_id', id);
    if (delErr) {
      errors.projects = delErr.message;
      return false;
    }
    if (p.assignedMemberIds.length > 0) {
      const memRows = p.assignedMemberIds.map((mid) => ({ project_id: id, member_id: mid }));
      const { error: insErr } = await supabase.from('project_members').insert(memRows);
      if (insErr) {
        errors.projects = insErr.message;
        return false;
      }
    }

    await fetchProjects();
    return true;
  };

  const removeProject = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('projects')) return false;
    errors.projects = null;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      errors.projects = error.message;
      return false;
    }
    projects.value = projects.value.filter((p) => p.id !== id);
    return true;
  };

  // ============= Prompt Assignments =============
  const fetchAssignments = async (force = false) => {
    if (!beginFetch('assignments', force)) return;
    try {
      const { data, error } = await supabase
        .from('prompt_assignments')
        .select('id, prompt_id, project_id, website_id, assigned_member_id, assigned_by, status, filled_values, due_date, priority, admin_note, started_at, completed_at, assigned_at, updated_at')
        .order('assigned_at', { ascending: false });
      if (error) {
        recordFetchError('assignments', 'fetchAssignments', error);
        return;
      }
      assignments.value = (data as AssignmentRow[]).map(assignmentRowToAssignment);
    } catch (err) {
      recordFetchError('assignments', 'fetchAssignments', err);
    } finally {
      finishFetch('assignments');
    }
  };

  const fetchAllAssignmentsForBoard = async (): Promise<PromptAssignment[]> => {
    if (!supabaseConfigured) return [];
    try {
      const { data: rows, error } = await supabase.rpc('get_all_assignments');
      if (error) return [];
      return (rows as AssignmentRow[]).map(assignmentRowToAssignment);
    } catch {
      return [];
    }
  };

  const upsertAssignment = async (a: PromptAssignment): Promise<boolean> => {
    if (!ensureConfigured('assignments')) return false;
    errors.assignments = null;
    const auth = useAuthStore();
    
    // If it already has an ID, it's an update.
    const isUpdate = !!a.id;
    if (!isUpdate) a.id = uuid();
    
    // Optimistic UI update
    const idx = assignments.value.findIndex(existing => existing.id === a.id);
    if (idx !== -1) {
      assignments.value[idx] = { ...a };
    } else {
      assignments.value.unshift({ ...a });
    }
    
    // Only set assignedBy when creating a new assignment
    const row = assignmentToRow(a, isUpdate ? undefined : (auth.user?.id ?? null));
    
    const { error } = isUpdate
      ? await supabase.from('prompt_assignments').update(row).eq('id', a.id)
      : await supabase.from('prompt_assignments').insert(row);
      
    if (error) {
      errors.assignments = error.message;
      // Revert optimism if failed
      await fetchAssignments();
      return false;
    }
    // We do fetchAssignments in the background to sync without blocking UI
    fetchAssignments();
    return true;
  };

  const removeAssignment = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('assignments')) return false;
    errors.assignments = null;
    const { error } = await supabase.from('prompt_assignments').delete().eq('id', id);
    if (error) {
      errors.assignments = error.message;
      return false;
    }
    assignments.value = assignments.value.filter((a) => a.id !== id);
    return true;
  };

  const archiveAssignment = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('assignments')) return false;
    errors.assignments = null;
    const { error } = await supabase
      .from('prompt_assignments')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) {
      errors.assignments = error.message;
      return false;
    }
    assignments.value = assignments.value.filter((a) => a.id !== id);
    return true;
  };

  const uuid = () =>
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });

  const bulkCreateAssignments = async (
    rows: Array<Omit<PromptAssignment, 'id'>>
  ): Promise<{ created: number; failed: number; errors: string[]; data: PromptAssignment[] }> => {
    const result = { created: 0, failed: 0, errors: [] as string[], data: [] as PromptAssignment[] };
    if (!ensureConfigured('assignments') || rows.length === 0) return result;
    errors.assignments = null;
    const auth = useAuthStore();
    const uid = auth.user?.id ?? null;
    try {
      const dbRows = rows.map((a) => assignmentToRow({ ...a, id: uuid() }, uid));
      if (import.meta.env.DEV) console.log('[board] task create started, count=', dbRows.length);
      const { data: inserted, error } = await supabase
        .from('prompt_assignments')
        .insert(dbRows)
        .select();
      if (error) {
        result.failed = rows.length;
        result.errors.push(error.message);
        errors.assignments = error.message;
      } else {
        result.created = inserted?.length ?? rows.length;
        // ── Optimistic local update: push new assignments immediately ──
        const newAssignments = (inserted as any[]).map(assignmentRowToAssignment);
        newAssignments.forEach((a) => {
          if (!assignments.value.some((existing) => existing.id === a.id)) {
            assignments.value = [a, ...assignments.value];
          }
        });
        result.data = newAssignments;
        if (import.meta.env.DEV) console.log('[board] local state updated with', newAssignments.length, 'new tasks');
        // Background sync — don't await so the board updates immediately
        void fetchAssignments(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk assign failed.';
      result.failed = rows.length;
      result.errors.push(msg);
      errors.assignments = msg;
    }
    return result;
  };

  // ============= Section Tasks =============
  const fetchSectionTasks = async (force = false) => {
    if (!beginFetch('sectionTasks', force)) return;
    try {
      const { data, error } = await supabase
        .from('section_tasks')
        .select('*, project_pages(title, project_id, projects(name, deadline))')
        .order('updated_at', { ascending: false });
      if (error) {
        recordFetchError('sectionTasks', 'fetchSectionTasks', error);
        return;
      }
      sectionTasks.value = (data as SectionTaskRow[]).map(sectionTaskRowToTask);
    } catch (err) {
      recordFetchError('sectionTasks', 'fetchSectionTasks', err);
    } finally {
      finishFetch('sectionTasks');
    }
  };

  // ============= Submissions + review feedback =============
  const fetchSubmissions = async (force = false) => {
    if (!beginFetch('submissions', force)) return;
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, assignment_id, submitted_by, content, screenshot_url, status, submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(100);
      if (error) {
        recordFetchError('submissions', 'fetchSubmissions', error);
        return;
      }
      submissions.value = (data as SubmissionRow[]).map(submissionRowToSubmission);
    } catch (err) {
      recordFetchError('submissions', 'fetchSubmissions', err);
    } finally {
      finishFetch('submissions');
    }
  };

  const fetchReviewComments = async () => {
    if (!beginFetch('reviewComments')) return;
    try {
      const { data, error } = await supabase
        .from('review_comments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        recordFetchError('reviewComments', 'fetchReviewComments', error);
        return;
      }
      reviewComments.value = (data as ReviewCommentRow[]).map(reviewCommentRowToComment);
    } catch (err) {
      recordFetchError('reviewComments', 'fetchReviewComments', err);
    } finally {
      finishFetch('reviewComments');
    }
  };

  const submitAssignment = async (
    assignment: PromptAssignment,
    filledValues: Record<string, string>,
    content: string,
    screenshotUrl: string
  ): Promise<boolean> => {
    if (!ensureConfigured('submissions')) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.submissions = 'You must be signed in to submit work.';
      return false;
    }
    if (!content.trim()) {
      errors.submissions = 'Paste the AI output before submitting for review.';
      return false;
    }

    errors.submissions = null;
    const { error } = await supabase.from('submissions').insert({
      assignment_id: assignment.id,
      content,
      screenshot_url: screenshotUrl,
      status: 'submitted',
      submitted_by: auth.user.id
    });
    if (error) {
      errors.submissions = error.message;
      return false;
    }

    const nextAssignment: PromptAssignment = {
      ...assignment,
      filledValues,
      pastedResult: content,
      status: 'submitted'
    };
    await upsertAssignment(nextAssignment);
    const isResubmission = ['needs_fix', 'rejected', 'needs_resubmission'].includes(assignment.status);
    await addActivityLog(
      isResubmission ? 'resubmitted_work' : 'output_submitted',
      'assignment',
      assignment.id,
      isResubmission ? 'Work resubmitted for admin review.' : 'Output submitted for admin review.'
    );
    await Promise.allSettled([fetchSubmissions(), fetchAssignments()]);

    // Notify admins of the new submission in the background
    try {
      const prompt = prompts.value.find((p) => p.id === assignment.promptId);
      const promptName = prompt ? prompt.title : 'Task';
      const website = websites.value.find((w) => w.id === assignment.websiteId);
      const websiteDomain = website ? website.domain : 'WordPress';

      const title = isResubmission ? '📋 Resubmission Received' : '📋 New Submission Received';
      const message = `${auth.profile?.fullName || 'A member'} has ${isResubmission ? 'resubmitted' : 'submitted'} work for "${promptName}" on ${websiteDomain}.`;

      const { useNotificationsStore } = await import('@/stores/notifications');
      const notifs = useNotificationsStore();
      await notifs.createAdminNotification({
        actorId: auth.user.id,
        type: 'submission_received',
        title,
        message,
        link: '/reviews',
        taskId: assignment.id,
        relatedType: 'assignment',
        relatedId: assignment.id,
        relatedWebsiteId: assignment.websiteId ?? undefined,
      });
    } catch (e) {
      console.warn('[notification] failed to trigger admin notification:', e);
    }

    return true;
  };

  const reviewSubmission = async (
    submission: Submission,
    status: SubmissionStatus,
    feedback: string
  ): Promise<boolean> => {
    if (!ensureConfigured('submissions')) return false;
    const auth = useAuthStore();
    if (!auth.isAdmin || !auth.user?.id) {
      errors.submissions = 'Only admins can review submissions.';
      return false;
    }

    errors.submissions = null;
    const { error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', submission.id);
    if (error) {
      errors.submissions = error.message;
      return false;
    }

    const assignment = assignments.value.find((a) => a.id === submission.assignmentId);
    if (assignment) {
      await upsertAssignment({
        ...assignment,
        status,
        completedAt: status === 'approved' ? new Date().toISOString().slice(0, 10) : assignment.completedAt
      });
    }
    await addActivityLog(
      status === 'approved'
        ? 'task_approved'
        : status === 'needs_fix'
          ? 'task_needs_fix'
          : status === 'rejected'
            ? 'rejected_submission'
            : 'feedback_received',
      'submission',
      submission.id,
      status === 'approved'
        ? 'Submission approved.'
        : status === 'needs_fix'
          ? 'Submission marked needs fix.'
          : status === 'rejected'
            ? 'Submission rejected.'
          : 'Submission reviewed.',
      submission.submittedBy
    );

    if (feedback.trim()) {
      const { error: commentError } = await supabase.from('review_comments').insert({
        submission_id: submission.id,
        reviewer_id: auth.user.id,
        body: feedback.trim()
      });
      if (commentError) {
        errors.reviewComments = commentError.message;
        return false;
      }
    }

    await Promise.allSettled([fetchSubmissions(), fetchReviewComments(), fetchAssignments()]);

    // Notify the member about the review outcome in the background
    if (assignment) {
      try {
        const targetMemberId = submission.submittedBy || assignment.assignedMemberId;
        const prompt = prompts.value.find((p) => p.id === assignment.promptId);
        const promptName = prompt ? prompt.title : 'Task';
        const website = websites.value.find((w) => w.id === assignment.websiteId);
        const websiteDomain = website ? website.domain : 'WordPress';

        const notifType =
          status === 'approved'
            ? 'task_approved'
            : status === 'needs_fix'
              ? 'task_needs_fix'
              : 'work_reviewed';

        let title = '📋 Task Approved';
        let message = `Your submission for "${promptName}" on ${websiteDomain} was approved.`;

        if (status === 'needs_fix') {
          title = '📋 Task Needs Fix';
          message = `Your submission for "${promptName}" on ${websiteDomain} needs corrections: ${feedback.trim() || 'Please check feedback.'}`;
        } else if (status === 'rejected') {
          title = '📋 Submission Rejected';
          message = `Your submission for "${promptName}" on ${websiteDomain} was rejected. Feedback: ${feedback.trim() || 'Please contact supervisor.'}`;
        }

        const { useNotificationsStore } = await import('@/stores/notifications');
        const notifs = useNotificationsStore();
        await notifs.createNotification({
          recipientId: targetMemberId,
          actorId: auth.user.id,
          type: notifType,
          title,
          message,
          taskId: assignment.id,
          relatedType: 'task',
          relatedId: assignment.id,
          relatedWebsiteId: assignment.websiteId ?? undefined,
        });
      } catch (e) {
        console.warn('[notification] failed to trigger member notification:', e);
      }
    }

    return true;
  };

  // ============= Docs =============
  const fetchDocs = async (force = false) => {
    if (!beginFetch('docs', force)) return;
    try {
      const { data, error } = await supabase
        .from('docs')
        .select('id, title, description, content, category, folder_id, related_project_id, related_website_id, visibility, status, created_by, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) {
        recordFetchError('docs', 'fetchDocs', error);
        return;
      }
      docs.value = (data as TeamDocRow[]).map(teamDocRowToDoc);
    } catch (err) {
      recordFetchError('docs', 'fetchDocs', err);
    } finally {
      finishFetch('docs');
    }
  };

  const upsertDoc = async (doc: TeamDoc): Promise<boolean> => {
    if (!ensureConfigured('docs')) return false;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errors.docs = 'Only admins can edit docs.';
      return false;
    }
    errors.docs = null;
    const row = teamDocToRow(doc, doc.id ? undefined : auth.user?.id ?? null);
    const { error } = doc.id
      ? await supabase.from('docs').update(row).eq('id', doc.id)
      : await supabase.from('docs').insert(row);
    if (error) {
      errors.docs = error.message;
      return false;
    }
    await fetchDocs();
    return true;
  };

  const removeDoc = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('docs')) return false;
    errors.docs = null;
    const { error } = await supabase.from('docs').delete().eq('id', id);
    if (error) {
      errors.docs = error.message;
      return false;
    }
    docs.value = docs.value.filter((doc) => doc.id !== id);
    return true;
  };

  // ============= Monthly Reports =============
  const fetchMonthlyReports = async () => {
    if (!beginFetch('monthlyReports')) return;
    try {
      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) {
        recordFetchError('monthlyReports', 'fetchMonthlyReports', error);
        return;
      }
      monthlyReports.value = (data as MonthlyReportRow[]).map(monthlyReportRowToReport);
    } catch (err) {
      recordFetchError('monthlyReports', 'fetchMonthlyReports', err);
    } finally {
      finishFetch('monthlyReports');
    }
  };

  const upsertMonthlyReport = async (report: MonthlyReport): Promise<boolean> => {
    if (!ensureConfigured('monthlyReports')) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.monthlyReports = 'You must be signed in to submit a monthly report.';
      return false;
    }
    errors.monthlyReports = null;
    const row = monthlyReportToRow({
      ...report,
      memberId: report.memberId || auth.user.id
    });
    const { error } = report.id
      ? await supabase.from('monthly_reports').update(row).eq('id', report.id)
      : await supabase.from('monthly_reports').insert(row);
    if (error) {
      errors.monthlyReports = error.message;
      return false;
    }
    await addActivityLog(
      'monthly_report_submitted',
      'monthly_report',
      report.id || null,
      `Monthly report submitted for ${report.month}.`
    );
    await fetchMonthlyReports();
    return true;
  };

  // ============= Blockers =============
  const fetchBlockers = async (force = false) => {
    if (!beginFetch('blockers', force)) return;
    try {
      const { data, error } = await supabase
        .from('blockers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        recordFetchError('blockers', 'fetchBlockers', error);
        return;
      }
      blockers.value = (data as BlockerRow[]).map(blockerRowToBlocker);
    } catch (err) {
      recordFetchError('blockers', 'fetchBlockers', err);
    } finally {
      finishFetch('blockers');
    }
  };

  const upsertBlocker = async (blocker: Blocker): Promise<boolean> => {
    if (!ensureConfigured('blockers')) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.blockers = 'You must be signed in to report a blocker.';
      return false;
    }
    errors.blockers = null;
    const row = blockerToRow({
      ...blocker,
      memberId: blocker.memberId || auth.user.id
    });
    const { error } = blocker.id
      ? await supabase.from('blockers').update(row).eq('id', blocker.id)
      : await supabase.from('blockers').insert(row);
    if (error) {
      errors.blockers = error.message;
      return false;
    }
    await addActivityLog(
      'blocker_reported',
      'blocker',
      blocker.id || blocker.taskId,
      `Blocker reported: ${blocker.reason}`
    );
    await fetchBlockers();
    return true;
  };

  const resolveBlocker = async (blocker: Blocker, response: string): Promise<boolean> => {
    if (!ensureConfigured('blockers')) return false;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errors.blockers = 'Only admins can resolve blockers.';
      return false;
    }
    errors.blockers = null;
    const { error } = await supabase
      .from('blockers')
      .update({
        status: 'resolved',
        admin_response: response,
        resolved_at: new Date().toISOString()
      })
      .eq('id', blocker.id);
    if (error) {
      errors.blockers = error.message;
      return false;
    }
    await fetchBlockers();
    return true;
  };

  // ============= Activity Logs =============
  const fetchActivityLogs = async (force = false) => {
    if (!beginFetch('activityLogs', force)) return;
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, user_id, action, related_type, related_id, message, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        recordFetchError('activityLogs', 'fetchActivityLogs', error);
        return;
      }
      activityLogs.value = (data as ActivityLogRow[]).map(activityLogRowToActivity);
    } catch (err) {
      recordFetchError('activityLogs', 'fetchActivityLogs', err);
    } finally {
      finishFetch('activityLogs');
    }
  };

  const addActivityLog = async (
    action: ActivityAction,
    relatedType: ActivityLog['relatedType'],
    relatedId: string | null,
    message: string,
    userId?: string | null
  ): Promise<void> => {
    if (!supabaseConfigured) return;
    const auth = useAuthStore();
    const targetUserId = userId ?? auth.user?.id;
    if (!targetUserId) return;
    await auth.recordActivity(
      action,
      relatedType,
      relatedId,
      message,
      targetUserId,
      targetUserId === auth.user?.id
    );
  };

  const markAssignmentInProgress = async (assignment: PromptAssignment): Promise<boolean> => {
    const ok = await upsertAssignment({
      ...assignment,
      status: 'in_progress',
      startedAt: assignment.startedAt || new Date().toISOString().slice(0, 10)
    });
    if (ok) {
      await addActivityLog('task_started', 'assignment', assignment.id, 'Task marked in progress.');
    }
    return ok;
  };

  // ============= Docs Drive — folders =============
  const fetchDocsFolders = async () => {
    if (!beginFetch('docsFolders')) return;
    try {
      const { data, error } = await supabase
        .from('docs_folders')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) {
        recordFetchError('docsFolders', 'fetchDocsFolders', error);
        return;
      }
      docsFolders.value = (data as DocsFolderRow[]).map(docsFolderRowToFolder);
    } catch (err) {
      recordFetchError('docsFolders', 'fetchDocsFolders', err);
    } finally {
      finishFetch('docsFolders');
    }
  };

  const upsertDocsFolder = async (folder: DocsFolder): Promise<boolean> => {
    if (!ensureConfigured('docsFolders')) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.docsFolders = 'You must be signed in to create or edit folders.';
      return false;
    }
    const existingFolder = folder.id ? docsFolders.value.find((item) => item.id === folder.id) : null;
    if (!auth.isAdmin && folder.id && existingFolder?.createdBy !== auth.user.id) {
      errors.docsFolders = 'You can only edit folders you created.';
      return false;
    }
    errors.docsFolders = null;
    const row = docsFolderToRow(folder, folder.id ? undefined : auth.user?.id ?? null);
    const { error } = folder.id
      ? await supabase.from('docs_folders').update(row).eq('id', folder.id)
      : await supabase.from('docs_folders').insert(row);
    if (error) {
      errors.docsFolders = error.message;
      return false;
    }
    await fetchDocsFolders();
    return true;
  };

  const removeDocsFolder = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('docsFolders')) return false;
    const auth = useAuthStore();
    const folder = docsFolders.value.find((item) => item.id === id);
    if (!auth.user?.id) {
      errors.docsFolders = 'You must be signed in to delete folders.';
      return false;
    }
    if (!auth.isAdmin && folder?.createdBy !== auth.user.id) {
      errors.docsFolders = 'You can only delete folders you created.';
      return false;
    }
    errors.docsFolders = null;
    const { error } = await supabase.from('docs_folders').delete().eq('id', id);
    if (error) {
      errors.docsFolders = error.message;
      return false;
    }
    docsFolders.value = docsFolders.value.filter((f) => f.id !== id);
    // Folder cascade deletes children + assignments; refresh those caches too.
    await Promise.allSettled([fetchDocsFiles(), fetchDocsAssignments()]);
    return true;
  };

  // ============= Docs Drive — files =============
  const fetchDocsFiles = async () => {
    if (!beginFetch('docsFiles')) return;
    try {
      const { data, error } = await supabase
        .from('docs_files')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) {
        recordFetchError('docsFiles', 'fetchDocsFiles', error);
        return;
      }
      docsFiles.value = (data as DocsFileRow[]).map(docsFileRowToFile);
    } catch (err) {
      recordFetchError('docsFiles', 'fetchDocsFiles', err);
    } finally {
      finishFetch('docsFiles');
    }
  };

  const memberCanSaveToDocsFolder = (folderId: string, userId: string): boolean => {
    const targetFolder = docsFolders.value.find((folder) => folder.id === folderId);
    if (targetFolder?.createdBy === userId) return true;
    return docsAssignments.value.some(
      (assignment) =>
        assignment.assignedTo === userId &&
        assignment.assignmentType === 'folder' &&
        assignment.folderId === folderId &&
        assignment.status !== 'archived'
    );
  };

  const upsertDocsFile = async (file: DocsFile, opts: { skipRefetch?: boolean } = {}): Promise<boolean> => {
    if (!ensureConfigured('docsFiles')) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.docsFiles = 'You must be signed in to add files.';
      return false;
    }
    const existingFile = file.id ? docsFiles.value.find((item) => item.id === file.id) : null;
    if (!auth.isAdmin && file.id && existingFile?.createdBy !== auth.user.id) {
      errors.docsFiles = 'You can only edit files you created.';
      return false;
    }
    if (!auth.isAdmin && file.folderId && !memberCanSaveToDocsFolder(file.folderId, auth.user.id)) {
      errors.docsFiles = 'Team members can only save files inside folders they created or folders assigned to them.';
      return false;
    }
    errors.docsFiles = null;
    const fileWithMeta: DocsFile = { ...file, updatedBy: auth.user.id };
    const row = docsFileToRow(fileWithMeta, file.id ? undefined : auth.user?.id ?? null);
    const { error } = file.id
      ? await supabase.from('docs_files').update(row).eq('id', file.id)
      : await supabase.from('docs_files').insert(row);
    if (error) {
      errors.docsFiles = error.message;
      return false;
    }
    if (!file.id) {
      await addActivityLog('saved_link', 'page', null, `Saved docs file or link: ${file.title}.`);
    }
    if (opts.skipRefetch && file.id) {
      // Update in-place locally — much faster than refetching whole list.
      const idx = docsFiles.value.findIndex((d) => d.id === file.id);
      if (idx !== -1) {
        const now = new Date().toISOString();
        docsFiles.value[idx] = { ...docsFiles.value[idx], ...fileWithMeta, updatedAt: now };
      }
    } else {
      await fetchDocsFiles();
    }
    return true;
  };

  const removeDocsFile = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('docsFiles')) return false;
    const auth = useAuthStore();
    const file = docsFiles.value.find((item) => item.id === id);
    if (!auth.user?.id) {
      errors.docsFiles = 'You must be signed in to delete files.';
      return false;
    }
    if (!auth.isAdmin && file?.createdBy !== auth.user.id) {
      errors.docsFiles = 'You can only delete files you created.';
      return false;
    }
    errors.docsFiles = null;
    const { error } = await supabase.from('docs_files').delete().eq('id', id);
    if (error) {
      errors.docsFiles = error.message;
      return false;
    }
    docsFiles.value = docsFiles.value.filter((f) => f.id !== id);
    await fetchDocsAssignments();
    return true;
  };

  // ============= Docs Drive — assignments =============
  const fetchDocsAssignments = async () => {
    if (!beginFetch('docsAssignments')) return;
    try {
      const { data, error } = await supabase
        .from('docs_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        recordFetchError('docsAssignments', 'fetchDocsAssignments', error);
        return;
      }
      docsAssignments.value = (data as DocsAssignmentRow[]).map(docsAssignmentRowToAssignment);
    } catch (err) {
      recordFetchError('docsAssignments', 'fetchDocsAssignments', err);
    } finally {
      finishFetch('docsAssignments');
    }
  };

  const upsertDocsAssignment = async (
    assignment: DocsAssignment
  ): Promise<boolean> => {
    if (!ensureConfigured('docsAssignments')) return false;
    const auth = useAuthStore();
    errors.docsAssignments = null;
    const isCreating = !assignment.id;
    if (isCreating && !auth.isAdmin) {
      errors.docsAssignments = 'Only admins can assign docs.';
      return false;
    }
    const row = docsAssignmentToRow(
      assignment,
      isCreating ? auth.user?.id ?? null : undefined
    );
    const { error } = assignment.id
      ? await supabase.from('docs_assignments').update(row).eq('id', assignment.id)
      : await supabase.from('docs_assignments').insert(row);
    if (error) {
      errors.docsAssignments = error.message;
      return false;
    }
    await fetchDocsAssignments();
    return true;
  };

  const removeDocsAssignment = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('docsAssignments')) return false;
    errors.docsAssignments = null;
    const { error } = await supabase.from('docs_assignments').delete().eq('id', id);
    if (error) {
      errors.docsAssignments = error.message;
      return false;
    }
    docsAssignments.value = docsAssignments.value.filter((a) => a.id !== id);
    return true;
  };

  // Convenience: assign one folder/file to many members in one click.
  const assignDocsToMembers = async (params: {
    type: DocsAssignmentType;
    targetId: string;
    memberIds: string[];
    message: string;
    priority: DocsAssignmentPriority;
    dueDate: string;
    relatedProjectId: string | null;
    relatedWebsiteId: string | null;
  }): Promise<boolean> => {
    if (!ensureConfigured('docsAssignments')) return false;
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      errors.docsAssignments = 'Only admins can assign docs.';
      return false;
    }
    if (!params.memberIds.length) {
      errors.docsAssignments = 'Pick at least one member.';
      return false;
    }
    errors.docsAssignments = null;
    const rows = params.memberIds.map((mid) => ({
      assignment_type: params.type,
      folder_id: params.type === 'folder' ? params.targetId : null,
      file_id: params.type === 'file' ? params.targetId : null,
      assigned_to: mid,
      assigned_by: auth.user?.id ?? null,
      related_project_id: params.relatedProjectId,
      related_website_id: params.relatedWebsiteId,
      message: params.message,
      priority: params.priority,
      due_date: params.dueDate || null,
      status: 'sent'
    }));
    const { error } = await supabase.from('docs_assignments').insert(rows);
    if (error) {
      errors.docsAssignments = error.message;
      return false;
    }
    await fetchDocsAssignments();
    return true;
  };

  // Member-only: mark their own assignment Viewed / Used / Archived.
  const markDocsAssignmentStatus = async (
    assignmentId: string,
    status: DocsAssignmentStatus
  ): Promise<boolean> => {
    if (!ensureConfigured('docsAssignments')) return false;
    errors.docsAssignments = null;
    const { error } = await supabase
      .from('docs_assignments')
      .update({ status })
      .eq('id', assignmentId);
    if (error) {
      errors.docsAssignments = error.message;
      return false;
    }
    const idx = docsAssignments.value.findIndex((a) => a.id === assignmentId);
    if (idx >= 0) docsAssignments.value[idx] = { ...docsAssignments.value[idx], status };
    return true;
  };

  // ============= Resources =============
  const RESOURCES_BUCKET = 'resources';

  const fetchResources = async (force = false) => {
    if (!beginFetch('resources', force)) return;
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, title, type, description, folder_id, project_id, website_id, task_id, file_url, file_name, file_type, file_size, external_url, visibility, status, created_by, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) {
        recordFetchError('resources', 'fetchResources', error);
        return;
      }
      resources.value = (data as ResourceRow[]).map(resourceRowToResource);
    } catch (err) {
      recordFetchError('resources', 'fetchResources', err);
    } finally {
      finishFetch('resources');
    }
  };

  const upsertResource = async (resource: Resource): Promise<boolean> => {
    if (!ensureConfigured('resources')) return false;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.resources = 'You must be signed in to save a resource.';
      return false;
    }
    if (resource.id) {
      const existing = resources.value.find((r) => r.id === resource.id);
      const isOwner = existing?.createdBy === auth.user.id;
      if (!isOwner && !auth.isAdmin) {
        errors.resources = 'You can only edit resources you created.';
        return false;
      }
    } else if (resource.visibility === 'admin_only' && !auth.isAdmin) {
      errors.resources = 'Only admins can create admin-only resources.';
      return false;
    }
    errors.resources = null;
    const row = resourceToRow(resource, resource.id ? undefined : auth.user.id);
    const { error } = resource.id
      ? await supabase.from('resources').update(row).eq('id', resource.id)
      : await supabase.from('resources').insert(row);
    if (error) {
      errors.resources = error.message;
      return false;
    }
    if (!resource.id) {
      const action =
        resource.type === 'link' || resource.type === 'website_ref'
          ? 'saved_link'
          : 'created_resource';
      await addActivityLog(action, 'resource', null, `Created resource: ${resource.title || resource.fileName}.`);
    }
    await fetchResources();
    return true;
  };

  const fetchResourceDetail = async (id: string): Promise<Resource | null> => {
    if (!ensureConfigured('resources')) return null;
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const r = resourceRowToResource(data as ResourceRow);
      const idx = resources.value.findIndex(item => item.id === r.id);
      if (idx !== -1) {
        resources.value[idx] = r;
      } else {
        resources.value.push(r);
      }
      return r;
    } catch (err) {
      console.error('[data] fetchResourceDetail failed', err);
      return null;
    }
  };

  const removeResource = async (id: string): Promise<boolean> => {
    if (!ensureConfigured('resources')) return false;
    const auth = useAuthStore();
    const target = resources.value.find((r) => r.id === id);
    if (!target) return false;
    const isOwner = target.createdBy === auth.user?.id;
    if (!isOwner && !auth.isAdmin) {
      errors.resources = 'You can only delete resources you created.';
      return false;
    }
    errors.resources = null;
    // Best-effort delete the underlying storage object first.
    if (target.filePath) {
      await supabase.storage.from(RESOURCES_BUCKET).remove([target.filePath]).catch(() => null);
    }
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      errors.resources = error.message;
      return false;
    }
    resources.value = resources.value.filter((r) => r.id !== id);
    return true;
  };

  // Upload a file to Supabase Storage. Returns metadata to write into a Resource row,
  // or null if the upload failed (errors.resources is set).
  const uploadResourceFile = async (
    file: File
  ): Promise<{ path: string; name: string; type: string; size: number } | null> => {
    if (!ensureConfigured('resources')) return null;
    const auth = useAuthStore();
    if (!auth.user?.id) {
      errors.resources = 'You must be signed in to upload a file.';
      return null;
    }
    errors.resources = null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const random = Math.random().toString(36).slice(2, 9);
    const path = `${auth.user.id}/${Date.now()}-${random}-${safeName}`;
    const { error } = await supabase.storage
      .from(RESOURCES_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });
    if (error) {
      errors.resources = error.message;
      return null;
    }
    await addActivityLog('uploaded_file', 'resource', null, `Uploaded file: ${file.name}.`);
    return {
      path,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    };
  };

  // Generate a short-lived signed URL so the user can view/download a private file.
  const getResourceDownloadUrl = async (
    resourceOrPath: Resource | string,
    expiresIn = 3600
  ): Promise<string | null> => {
    if (!ensureConfigured('resources')) return null;
    const path = typeof resourceOrPath === 'string' ? resourceOrPath : resourceOrPath.filePath;
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(RESOURCES_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) {
      errors.resources = error.message;
      return null;
    }
    return data?.signedUrl ?? null;
  };

  // ============= Favicon upload =============
  const uploadFavicon = async (file: File): Promise<string | null> => {
    const auth = useAuthStore();
    if (!auth.user?.id || !supabaseConfigured) return null;
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `favicons/${auth.user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
      contentType: file.type || 'image/png',
    });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl ?? null;
  };

  // ============= Bulk loader for the dashboard =============
  const fetchAll = async (force = false) => {
    if (!beginFetch('all', force)) return;
    try {
      await Promise.allSettled([
        fetchMembers(force),
        fetchProjects(force),
        fetchWebsites(force),
        fetchPrompts(force),
        fetchAssignments(force),
        fetchSectionTasks(force),
        fetchSubmissions(force),
        fetchBlockers(force),
        fetchActivityLogs(force),
        fetchResources(force)
      ]);
      lastFetchTime.all = Date.now();
    } catch (err) {
      console.warn('[data] fetchAll failed', err);
    } finally {
      finishFetch('all');
    }
  };

  const fetchDashboardSummary = async (force = false) => {
    await Promise.allSettled([
      fetchMembers(force),
      fetchAssignments(force),
      fetchProjects(force),
      fetchBlockers(force),
      fetchSubmissions(force)
    ]);
  };

  const teamMemberSummaries = ref<TeamMemberSummary[]>([]);
  const loadingTeamSummary = ref(false);
  const teamMemberSummaryError = ref<string | null>(null);

  const normalizePresenceStatus = (status: string | null | undefined): MemberPresenceStatus => {
    if (status === 'online' || status === 'away' || status === 'offline') return status;
    return 'offline';
  };

  const emptyTeamMemberSummary = (member: Member): TeamMemberSummary => ({
    memberId: member.id,
    fullName: member.fullName || member.email || 'Team member',
    role: member.role || 'member',
    email: member.email || '',
    status: member.status || 'active',
    avatarUrl: member.avatarUrl || null,
    currentStatus: normalizePresenceStatus(member.currentStatus || (member.isOnline ? 'online' : 'offline')),
    lastActiveAt: member.lastActiveAt || null,
    createdAt: member.createdAt || '',
    followupsDone: 0,
    followupsTotal: 0,
    followupsPending: 0,
    followupsMissed: 0,
    followupsNotRequired: 0,
    followupsAutoCompleted: 0,
    tasksInProgress: 0,
    tasksWaitingReview: 0,
    tasksCompleted: 0,
    tasksOverdue: 0,
    qiAssigned: 0,
    qiFixed: 0,
    qiWaitingReview: 0,
    qiNeedsFix: 0,
    completedWorkCount: 0
  });

  const fallbackTeamMemberSummaries = () =>
    members.value
      .filter(isDashboardVisibleMember)
      .map(emptyTeamMemberSummary)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const rowToTeamMemberSummary = (row: any): TeamMemberSummary => ({
    memberId: row.member_id,
    fullName: row.full_name || row.email || 'Team member',
    role: row.role || 'member',
    email: row.email || '',
    status: row.status || 'active',
    avatarUrl: row.avatar_url || null,
    currentStatus: normalizePresenceStatus(row.current_status),
    lastActiveAt: row.last_active_at || null,
    createdAt: row.created_at || '',
    followupsDone: Number(row.followups_done) || 0,
    followupsTotal: Number(row.followups_total) || 0,
    followupsPending: Number(row.followups_pending) || 0,
    followupsMissed: Number(row.followups_missed) || 0,
    followupsNotRequired: Number(row.followups_not_required) || 0,
    followupsAutoCompleted: Number(row.followups_auto_completed) || 0,
    tasksInProgress: Number(row.tasks_in_progress) || 0,
    tasksWaitingReview: Number(row.tasks_waiting_review) || 0,
    tasksCompleted: Number(row.tasks_completed) || 0,
    tasksOverdue: Number(row.tasks_overdue) || 0,
    qiAssigned: Number(row.qi_assigned) || 0,
    qiFixed: Number(row.qi_fixed) || 0,
    qiWaitingReview: Number(row.qi_waiting_review) || 0,
    qiNeedsFix: Number(row.qi_needs_fix) || 0,
    completedWorkCount: Number(row.completed_work_count) || 0
  });

  const fetchTeamMemberSummary = async (startDate: string, endDate: string) => {
    loadingTeamSummary.value = true;
    teamMemberSummaryError.value = null;
    try {
      const auth = useAuthStore();

      if (!isAdminRole(auth.profile?.role)) {
        teamMemberSummaries.value = [];
        teamMemberSummaryError.value = 'You do not have permission to view team member details.';
        return;
      }

      if (members.value.length === 0) {
        await fetchMembers(true);
      }

      if (!supabaseConfigured) {
        const fallback = fallbackTeamMemberSummaries();
        teamMemberSummaries.value = fallback;
        teamMemberSummaryError.value = fallback.length > 0
          ? 'Could not load summary counts.'
          : 'Could not load team member details.';
        return;
      }

      const { data, error } = await supabase.rpc('get_team_member_dashboard_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) {
        console.error('[data] fetchTeamMemberSummary RPC error:', error);
        const fallback = fallbackTeamMemberSummaries();
        teamMemberSummaries.value = fallback;
        teamMemberSummaryError.value = fallback.length > 0
          ? 'Could not load summary counts.'
          : 'Could not load team member details.';
        return;
      }
      const summaries = (data || [])
        .map(rowToTeamMemberSummary)
        .filter(isDashboardVisibleMember);
      teamMemberSummaries.value = summaries.length > 0 ? summaries : fallbackTeamMemberSummaries();
    } catch (err) {
      console.error('[data] fetchTeamMemberSummary error:', err);
      const fallback = fallbackTeamMemberSummaries();
      teamMemberSummaries.value = fallback;
      teamMemberSummaryError.value = fallback.length > 0
        ? 'Could not load summary counts.'
        : 'Could not load team member details.';
    } finally {
      loadingTeamSummary.value = false;
    }
  };

  const fetchMemberDetailedData = async (memberId: string, startDate: string, endDate: string) => {
    try {
      const [logsRes, tasksRes, qiRes] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('id, user_id, action, related_type, related_id, message, created_at')
          .eq('user_id', memberId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('prompt_assignments')
          .select('id, prompt_id, project_id, website_id, assigned_member_id, assigned_by, status, filled_values, pasted_result, due_date, priority, admin_note, started_at, completed_at, assigned_at, updated_at')
          .eq('assigned_member_id', memberId)
          .gte('due_date', startDate)
          .lte('due_date', endDate)
          .order('due_date', { ascending: true }),
        supabase
          .from('quality_issues')
          .select('id, website_id, title, description, page_url, issue_type, priority, status, assigned_to, screenshot_url, due_date, created_by, created_at, updated_at, approved_by, approved_at, is_archived')
          .eq('assigned_to', memberId)
          .eq('is_archived', false)
          .or(`due_date.is.null,and(due_date.gte.${startDate},due_date.lte.${endDate})`)
          .order('created_at', { ascending: false })
      ]);

      if (logsRes.error) console.error('[data] detailed logs fetch error:', logsRes.error);
      if (tasksRes.error) console.error('[data] detailed tasks fetch error:', tasksRes.error);
      if (qiRes.error) console.error('[data] detailed QI fetch error:', qiRes.error);

      return {
        activities: (logsRes.data || []).map(activityLogRowToActivity),
        tasks: (tasksRes.data || []).map(assignmentRowToAssignment),
        qualityIssues: (qiRes.data || []).map((r: any) => ({
          id: r.id,
          websiteId: r.website_id,
          title: r.title,
          description: r.description ?? '',
          pageUrl: r.page_url ?? '',
          issueType: r.issue_type,
          priority: r.priority,
          status: r.status,
          assignedTo: r.assigned_to,
          screenshotUrl: r.screenshot_url,
          dueDate: r.due_date,
          createdBy: r.created_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          isArchived: r.is_archived || false
        }))
      };
    } catch (err) {
      console.error('[data] fetchMemberDetailedData error:', err);
      return { activities: [], tasks: [], qualityIssues: [] };
    }
  };

  // ============= Derived =============
  const totalMembers = computed(() => members.value.length);
  const totalProjects = computed(() => projects.value.length);
  const totalWebsites = computed(() => websites.value.length);
  const totalPrompts = computed(() => prompts.value.length);
  const pendingTasks = computed(
    () =>
      assignments.value.filter((a) => a.status === 'pending' || a.status === 'in_progress').length
  );
  const pendingReviews = computed(
    () => submissions.value.filter((s) => s.status === 'submitted').length
  );

  const promptCountByFolder = computed(() => (folderId: string) =>
    prompts.value.filter((p) => p.folderId === folderId).length
  );

  const currentUserId = computed(() => useAuthStore().user?.id ?? null);
  const assignmentCollaborators = (assignment: PromptAssignment): string[] => {
    try {
      const raw = assignment.filledValues.__board_collaborators || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  };
  const myAssignments = computed(() =>
    assignments.value.filter(
      (a) =>
        a.assignedMemberId === currentUserId.value ||
        (!!currentUserId.value && assignmentCollaborators(a).includes(currentUserId.value))
    )
  );
  const mySectionTasks = computed(() =>
    sectionTasks.value.filter((t) => t.assignedMemberId === currentUserId.value)
  );
  const mySubmissions = computed(() =>
    submissions.value.filter((s) => s.submittedBy === currentUserId.value)
  );
  const myPendingSubmissions = computed(
    () => mySubmissions.value.filter((s) => s.status === 'submitted').length
  );
  const myNeedsFixCount = computed(
    () =>
      myAssignments.value.filter((a) => a.status === 'needs_fix').length +
      mySubmissions.value.filter((s) => s.status === 'needs_fix').length
  );
  const myApprovedCount = computed(
    () =>
      myAssignments.value.filter((a) => a.status === 'approved').length +
      mySubmissions.value.filter((s) => s.status === 'approved').length
  );
  const myOpenBlockers = computed(() =>
    blockers.value.filter((b) => b.memberId === currentUserId.value && b.status === 'open')
  );
  const myActivityLogs = computed(() =>
    activityLogs.value.filter((log) => log.userId === currentUserId.value).slice(0, 8)
  );
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const assignmentDueDate = (assignment: PromptAssignment) =>
    assignment.dueDate || projectById(assignment.projectId)?.deadline || '';
  const myTodayAssignments = computed(() =>
    myAssignments.value.filter((assignment) => {
      const due = assignmentDueDate(assignment);
      return (
        assignment.priority === 'urgent' ||
        due === todayIso() ||
        assignment.status === 'needs_fix'
      );
    })
  );
  const myActiveTaskCount = computed(
    () =>
      myAssignments.value.filter((a) => ['pending', 'in_progress', 'needs_fix'].includes(a.status))
        .length + mySectionTasks.value.filter((t) => !['approved', 'completed'].includes(t.status)).length
  );
  const mySidebarTodayCount = computed(() => myTodayAssignments.value.length);
  const mySidebarFeedbackCount = computed(
    () =>
      mySubmissions.value.filter((s) => s.status === 'needs_fix' || s.status === 'rejected').length
  );

  // ============= Lookups =============
  const memberById = (id: string) => members.value.find((m) => m.id === id);
  const websiteById = (id: string | null | undefined) =>
    id ? websites.value.find((w) => w.id === id) : undefined;
  const folderById = (id: string | null | undefined) =>
    id ? folders.value.find((f) => f.id === id) : undefined;
  const projectById = (id: string | null | undefined) =>
    id ? projects.value.find((p) => p.id === id) : undefined;
  const promptById = (id: string | null | undefined) =>
    id ? prompts.value.find((p) => p.id === id) : undefined;
  const getUserAssignedWebsiteIds = (userId: string) => {
    return websites.value.filter((w) => w.createdBy === userId).map((w) => w.id);
  };

  // ============= Activity (derived from latest updates) =============
  const activity = computed(() => {
    const items: { id: string; text: string; timestamp: string }[] = [];
    const recent = [...prompts.value]
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
      .slice(0, 3);
    recent.forEach((p) => {
      items.push({
        id: 'prompt-' + p.id,
        text: `Prompt "${p.title}" — ${p.status}`,
        timestamp: p.updatedAt
      });
    });
    const recentProjects = [...projects.value]
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
      .slice(0, 3);
    recentProjects.forEach((p) => {
      items.push({
        id: 'proj-' + p.id,
        text: `Project "${p.name}" — ${p.status.replace('_', ' ')}`,
        timestamp: p.createdAt
      });
    });
    return items.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1)).slice(0, 6);
  });

  // ============= Reset (used on logout) =============
  const reset = () => {
    members.value = [];
    projects.value = [];
    folders.value = [];
    websites.value = [];
    notes.value = [];
    prompts.value = [];
    assignments.value = [];
    sectionTasks.value = [];
    submissions.value = [];
    reviewComments.value = [];
    docs.value = [];
    monthlyReports.value = [];
    blockers.value = [];
    activityLogs.value = [];
    docsFolders.value = [];
    docsFiles.value = [];
    docsAssignments.value = [];
    resources.value = [];
    promptReplacements.value = [];
    fetchWatchdogs.forEach((timer) => clearTimeout(timer));
    fetchWatchdogs.clear();
    (Object.keys(loading) as EntityKey[]).forEach((k) => (loading[k] = false));
    (Object.keys(errors) as EntityKey[]).forEach((k) => (errors[k] = null));
  };

  const handleRealtimePayload = (payload: { eventType: string; table: string; new: any; old: any }) => {
    const { eventType, table, new: newRow, old: oldRow } = payload;
    
    // Map table names to local ref arrays and conversion functions
    const tableMap: Record<string, { list: any; toObj: (r: any) => any }> = {
      profiles: { list: members, toObj: profileToMember },
      projects: { list: projects, toObj: projectRowToProject },
      folders: { list: folders, toObj: folderRowToFolder },
      websites: { list: websites, toObj: websiteRowToWebsite },
      notes: { list: notes, toObj: noteRowToNote },
      prompt_templates: { list: prompts, toObj: promptRowToPrompt },
      prompt_assignments: { list: assignments, toObj: assignmentRowToAssignment },
      section_tasks: { list: sectionTasks, toObj: sectionTaskRowToTask },
      submissions: { list: submissions, toObj: submissionRowToSubmission },
      review_comments: { list: reviewComments, toObj: reviewCommentRowToComment },
      docs: { list: docs, toObj: teamDocRowToDoc },
      monthly_reports: { list: monthlyReports, toObj: monthlyReportRowToReport },
      blockers: { list: blockers, toObj: blockerRowToBlocker },
      activity_logs: { list: activityLogs, toObj: activityLogRowToActivity },
      docs_folders: { list: docsFolders, toObj: docsFolderRowToFolder },
      docs_files: { list: docsFiles, toObj: docsFileRowToFile },
      docs_assignments: { list: docsAssignments, toObj: docsAssignmentRowToAssignment },
      resources: { list: resources, toObj: resourceRowToResource },
      prompt_replacements: { list: promptReplacements, toObj: promptReplacementRowToReplacement }
    };

    const config = tableMap[table];
    if (!config) return;

    if (import.meta.env.DEV) console.log(`[realtime] ${eventType} on ${table}`, newRow?.id ?? oldRow?.id);

    if (eventType === 'INSERT') {
      const obj = config.toObj(newRow);
      // Avoid duplicates
      if (!config.list.value.some((i: any) => i.id === obj.id)) {
        config.list.value.unshift(obj);
      }
    } else if (eventType === 'UPDATE') {
      const obj = config.toObj(newRow);
      const idx = config.list.value.findIndex((i: any) => i.id === obj.id);
      if (idx !== -1) {
        config.list.value[idx] = obj;
      } else {
        // If not in list, maybe it should be (e.g. status change made it visible)
        config.list.value.push(obj);
      }
    } else if (eventType === 'DELETE') {
      const id = oldRow?.id || newRow?.id;
      if (id) {
        config.list.value = config.list.value.filter((i: any) => i.id !== id);
      }
    }
  };

  // ============= Website Product Docs =============
  const fetchWebsiteProductDocs = async (websiteId: string): Promise<void> => {
    const { data: rows, error } = await supabase
      .from('website_product_docs')
      .select('doc_id')
      .eq('website_id', websiteId);
    if (!error && rows) {
      websiteProductDocs.value = {
        ...websiteProductDocs.value,
        [websiteId]: (rows as { doc_id: string }[]).map((r) => r.doc_id)
      };
    }
  };

  const setWebsiteProductDocs = async (websiteId: string, docIds: string[]): Promise<boolean> => {
    const userId = useAuthStore().user?.id;
    const { error: delErr } = await supabase
      .from('website_product_docs')
      .delete()
      .eq('website_id', websiteId);
    if (delErr) return false;
    if (docIds.length > 0) {
      const rows = docIds.map((docId) => ({
        website_id: websiteId,
        doc_id: docId,
        created_by: userId ?? null
      }));
      const { error: insErr } = await supabase.from('website_product_docs').insert(rows);
      if (insErr) return false;
    }
    websiteProductDocs.value = { ...websiteProductDocs.value, [websiteId]: docIds };
    return true;
  };

  return {
    // entities
    members,
    websites,
    folders,
    prompts,
    projects,
    notes,
    assignments,
    sectionTasks,
    submissions,
    reviewComments,
    docs,
    monthlyReports,
    blockers,
    activityLogs,
    docsFolders,
    docsFiles,
    docsAssignments,
    resources,
    promptReplacements,
    websiteProductDocs,
    activity,
    // status
    loading,
    errors,
    dataLoading,
    // derived
    totalMembers,
    totalProjects,
    totalWebsites,
    totalPrompts,
    pendingTasks,
    pendingReviews,
    promptCountByFolder,
    myAssignments,
    mySectionTasks,
    mySubmissions,
    myPendingSubmissions,
    myNeedsFixCount,
    myApprovedCount,
    myOpenBlockers,
    myActivityLogs,
    myTodayAssignments,
    myActiveTaskCount,
    mySidebarTodayCount,
    mySidebarFeedbackCount,
    // fetchers
    fetchMembers,
    fetchMemberProfile,
    fetchProjects,
    fetchFolders,
    fetchWebsites,
    fetchNotes,
    fetchPrompts,
    fetchPromptDetail,
    fetchAssignments,
    fetchAllAssignmentsForBoard,
    fetchSectionTasks,
    fetchSubmissions,
    fetchReviewComments,
    fetchDocs,
    fetchMonthlyReports,
    fetchBlockers,
    fetchActivityLogs,
    fetchDocsFolders,
    fetchDocsFiles,
    fetchDocsAssignments,
    fetchResources,
    fetchResourceDetail,
    fetchPromptReplacements,
    fetchAll,
    fetchDashboardSummary,
    teamMemberSummaries,
    loadingTeamSummary,
    teamMemberSummaryError,
    fetchTeamMemberSummary,
    fetchMemberDetailedData,
    // mutations
    handleRealtimePayload,
    upsertMember,
    deactivateMember,
    softDeleteMember,
    removeMember,
    upsertProject,
    removeProject,
    upsertFolder,
    removeFolder,
    upsertWebsite,
    removeWebsite,
    upsertNote,
    removeNote,
    upsertPrompt,
    removePrompt,
    ensureBoardTaskPrompt,
    movePromptsToFolder,
    upsertAssignment,
    bulkCreateAssignments,
    removeAssignment,
    archiveAssignment,
    submitAssignment,
    reviewSubmission,
    upsertDoc,
    removeDoc,
    upsertDocsFolder,
    removeDocsFolder,
    upsertDocsFile,
    removeDocsFile,
    upsertDocsAssignment,
    removeDocsAssignment,
    assignDocsToMembers,
    markDocsAssignmentStatus,
    upsertResource,
    updatePromptQuality,
    archivePrompt,
    duplicatePromptAsNewVersion,
    replacePromptForAssignment,
    removeResource,
    uploadResourceFile,
    getResourceDownloadUrl,
    uploadFavicon,
    upsertMonthlyReport,
    upsertBlocker,
    resolveBlocker,
    addActivityLog,
    markAssignmentInProgress,
    fetchWebsiteProductDocs,
    setWebsiteProductDocs,
    // lookups
    memberById,
    websiteById,
    folderById,
    projectById,
    promptById,
    getUserAssignedWebsiteIds,
    // lifecycle
    reset
  };
});

export const getUserAssignedWebsiteIds = (userId: string, websites: Website[]): string[] => {
  return websites.filter((w) => w.createdBy === userId).map((w) => w.id);
};

export type { Status };
