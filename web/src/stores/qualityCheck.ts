import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QualityIssueStatus =
  | 'new_issue' | 'in_progress' | 'fixed' | 'needs_review' | 'approved';

export type QualityIssueType =
  | 'button_fix' | 'broken_link' | 'mobile_responsive' | 'ux_ui_problem'
  | 'spacing_issue' | 'text_content_issue' | 'image_issue'
  | 'header_footer_issue' | 'product_page_issue' | 'other';

export type QualityIssuePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface QualityIssue {
  id: string;
  websiteId: string;
  title: string;
  description: string;
  pageUrl: string;
  issueType: QualityIssueType;
  priority: QualityIssuePriority;
  status: QualityIssueStatus;
  assignedTo: string | null;
  screenshotUrl: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface QualityIssueComment {
  id: string;
  issueId: string;
  userId: string;
  message: string;
  screenshotUrl: string | null;
  createdAt: string;
}

export interface CreateIssueInput {
  websiteId: string;
  title: string;
  description?: string;
  pageUrl?: string;
  issueType?: QualityIssueType;
  priority?: QualityIssuePriority;
  assignedTo?: string | null;
  screenshotUrl?: string | null;
  dueDate?: string | null;
}

// Static lists used by the UI selects
export const QUALITY_ISSUE_TYPES: { value: QualityIssueType; label: string }[] = [
  { value: 'button_fix',          label: 'Button Fix' },
  { value: 'broken_link',         label: 'Broken Link' },
  { value: 'mobile_responsive',   label: 'Mobile Responsive' },
  { value: 'ux_ui_problem',       label: 'UX/UI Problem' },
  { value: 'spacing_issue',       label: 'Spacing Issue' },
  { value: 'text_content_issue',  label: 'Text / Content Issue' },
  { value: 'image_issue',         label: 'Image Issue' },
  { value: 'header_footer_issue', label: 'Header / Footer Issue' },
  { value: 'product_page_issue',  label: 'Product Page Issue' },
  { value: 'other',               label: 'Other' }
];

export const QUALITY_STATUS_COLUMNS: { value: QualityIssueStatus; label: string }[] = [
  { value: 'new_issue', label: 'New Issue' },
  { value: 'fixed',     label: 'Fixed' },
  { value: 'approved',  label: 'Approved' },
];

// ─── Row mappers ──────────────────────────────────────────────────────────────

interface IssueRow {
  id: string;
  website_id: string;
  title: string;
  description: string;
  page_url: string;
  issue_type: QualityIssueType;
  priority: QualityIssuePriority;
  status: QualityIssueStatus;
  assigned_to: string | null;
  screenshot_url: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

const rowToIssue = (r: IssueRow): QualityIssue => ({
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
  approvedAt: r.approved_at
});

interface CommentRow {
  id: string;
  issue_id: string;
  user_id: string;
  message: string;
  screenshot_url: string | null;
  created_at: string;
}

const rowToComment = (r: CommentRow): QualityIssueComment => ({
  id: r.id,
  issueId: r.issue_id,
  userId: r.user_id,
  message: r.message,
  screenshotUrl: r.screenshot_url,
  createdAt: r.created_at
});

// ─── Class folder types/mappers ──────────────────────────────────────────────

export interface QualityClass {
  id: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const rowToClass = (r: ClassRow): QualityClass => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  color: r.color || '#3f8dfe',
  sortOrder: r.sort_order ?? 0,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const useQualityCheckStore = defineStore('qualityCheck', () => {
  const issues   = ref<QualityIssue[]>([]);
  const comments = ref<QualityIssueComment[]>([]);
  const classes  = ref<QualityClass[]>([]);
  // websiteId → classId map (cached so the board can filter without joining)
  const websiteClassMap = ref<Map<string, string | null>>(new Map());
  // Track which classes have had their full board loaded so we don't refetch
  const loadedClassIds = ref<Set<string>>(new Set());
  const loading  = ref(false);
  const error    = ref<string | null>(null);
  const SCREENSHOT_BUCKET = 'quality-screenshots';

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

  // ── Classes (folders) ─────────────────────────────────────────────────────
  const fetchClasses = async () => {
    if (!supabaseConfigured) return;
    const { data, error: err } = await supabase
      .from('quality_classes')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (err) { console.error('[qualityCheck] fetchClasses', err.message); return; }
    classes.value = (data ?? []).map(rowToClass);
  };

  const fetchWebsiteClassMap = async () => {
    if (!supabaseConfigured) return;
    const { data, error: err } = await supabase
      .from('websites')
      .select('id,quality_class_id');
    if (err) { console.error('[qualityCheck] fetchWebsiteClassMap', err.message); return; }
    const m = new Map<string, string | null>();
    (data ?? []).forEach((r: { id: string; quality_class_id: string | null }) => {
      m.set(r.id, r.quality_class_id);
    });
    websiteClassMap.value = m;
  };

  const createClass = async (input: { name: string; description?: string; color?: string }): Promise<QualityClass | null> => {
    if (!supabaseConfigured) return null;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const { data, error: err } = await supabase
      .from('quality_classes')
      .insert({
        name: input.name.trim(),
        description: input.description ?? '',
        color: input.color ?? '#3f8dfe',
        sort_order: classes.value.length,
        created_by: uid
      })
      .select()
      .single();
    if (err || !data) { error.value = err?.message ?? 'Could not create class.'; return null; }
    const cls = rowToClass(data);
    if (!classes.value.some((c) => c.id === cls.id)) {
      classes.value = [...classes.value, cls];
    }
    return cls;
  };

  const updateClass = async (id: string, patch: Partial<Pick<QualityClass, 'name' | 'description' | 'color' | 'sortOrder'>>): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const row: Record<string, unknown> = {};
    if (patch.name        !== undefined) row['name']        = patch.name.trim();
    if (patch.description !== undefined) row['description'] = patch.description;
    if (patch.color       !== undefined) row['color']       = patch.color;
    if (patch.sortOrder   !== undefined) row['sort_order']  = patch.sortOrder;
    const { data, error: err } = await supabase
      .from('quality_classes')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (err || !data) { error.value = err?.message ?? 'Could not update class.'; return false; }
    const cls = rowToClass(data);
    const idx = classes.value.findIndex((c) => c.id === id);
    if (idx !== -1) classes.value[idx] = cls;
    return true;
  };

  const deleteClass = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const { error: err } = await supabase.from('quality_classes').delete().eq('id', id);
    if (err) { error.value = err.message; return false; }
    classes.value = classes.value.filter((c) => c.id !== id);
    // Websites that referenced this class are set to null by the FK rule.
    const m = new Map(websiteClassMap.value);
    m.forEach((v, k) => { if (v === id) m.set(k, null); });
    websiteClassMap.value = m;
    return true;
  };

  /** Move a website into (or out of) a class folder. */
  const setWebsiteClass = async (websiteId: string, classId: string | null): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const { error: err } = await supabase
      .from('websites')
      .update({ quality_class_id: classId })
      .eq('id', websiteId);
    if (err) { error.value = err.message; return false; }
    const m = new Map(websiteClassMap.value);
    m.set(websiteId, classId);
    websiteClassMap.value = m;
    return true;
  };

  /**
   * Move many websites into (or out of) a class folder in one call.
   * Pass `classId = null` to unassign. Returns true on success.
   */
  const setWebsiteClassBulk = async (
    websiteIds: string[],
    classId: string | null
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    if (websiteIds.length === 0) return true;
    const { error: err } = await supabase
      .from('websites')
      .update({ quality_class_id: classId })
      .in('id', websiteIds);
    if (err) { error.value = err.message; return false; }
    const m = new Map(websiteClassMap.value);
    websiteIds.forEach((id) => m.set(id, classId));
    websiteClassMap.value = m;
    // Invalidate cached lazy-loads so the new class board refetches its issues
    const next = new Set(loadedClassIds.value);
    next.delete(classId ?? '__none__');
    loadedClassIds.value = next;
    return true;
  };

  const classOf = (websiteId: string): string | null =>
    websiteClassMap.value.get(websiteId) ?? null;

  const issuesForClass = (classId: string | null) =>
    issues.value.filter((i) => classOf(i.websiteId) === classId);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchIssues = async (websiteId?: string) => {
    if (!supabaseConfigured) return;
    loading.value = true;
    error.value   = null;
    try {
      // Explicit columns — only the fields rowToIssue reads.
      let q = supabase
        .from('quality_issues')
        .select('id,website_id,title,description,page_url,issue_type,priority,status,assigned_to,screenshot_url,due_date,created_by,created_at,updated_at,approved_by,approved_at')
        .order('updated_at', { ascending: false });
      if (websiteId) q = q.eq('website_id', websiteId);
      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      const mapped = (data ?? []).map(rowToIssue);
      if (websiteId) {
        const other = issues.value.filter((i) => i.websiteId !== websiteId);
        issues.value = [...other, ...mapped];
      } else {
        issues.value = mapped;
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Could not load issues.';
    } finally {
      loading.value = false;
    }
  };

  /**
   * Lazy class-scoped fetch. Loads only the issues for websites in the given
   * class (or the unclassified bucket when classId === null). Skipped if
   * already loaded for this session. Uses the website→class map cache.
   */
  const fetchIssuesForClass = async (classId: string | null, force = false): Promise<void> => {
    if (!supabaseConfigured) return;
    const key = classId ?? '__none__';
    if (!force && loadedClassIds.value.has(key)) return;
    // Ensure we know which websites belong to the class
    if (websiteClassMap.value.size === 0) await fetchWebsiteClassMap();
    const ids: string[] = [];
    websiteClassMap.value.forEach((v, k) => {
      if (v === classId) ids.push(k);
    });
    if (ids.length === 0) {
      loadedClassIds.value = new Set([...loadedClassIds.value, key]);
      return;
    }
    loading.value = true;
    error.value   = null;
    try {
      // Explicit columns — only the fields rowToIssue reads.
      const { data, error: err } = await supabase
        .from('quality_issues')
        .select('id,website_id,title,description,page_url,issue_type,priority,status,assigned_to,screenshot_url,due_date,created_by,created_at,updated_at,approved_by,approved_at')
        .in('website_id', ids)
        .order('updated_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      const mapped = (data ?? []).map(rowToIssue);
      // Merge: replace any issue rows we have for these websites with the
      // fresh data; keep issues for other websites untouched.
      const idsSet = new Set(ids);
      const other  = issues.value.filter((i) => !idsSet.has(i.websiteId));
      issues.value = [...other, ...mapped];
      loadedClassIds.value = new Set([...loadedClassIds.value, key]);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Could not load class issues.';
    } finally {
      loading.value = false;
    }
  };

  const fetchComments = async (issueId: string) => {
    if (!supabaseConfigured) return;
    // Explicit columns — only the fields rowToComment reads.
    const { data, error: err } = await supabase
      .from('quality_issue_comments')
      .select('id,issue_id,user_id,message,screenshot_url,created_at')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });
    if (err) { console.error('[qualityCheck] fetchComments', err.message); return; }
    const mapped = (data ?? []).map(rowToComment);
    const other  = comments.value.filter((c) => c.issueId !== issueId);
    comments.value = [...other, ...mapped];
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createIssue = async (input: CreateIssueInput): Promise<QualityIssue | null> => {
    if (!supabaseConfigured) return null;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { error.value = 'Not signed in.'; return null; }
    const row = {
      website_id:     input.websiteId,
      title:          input.title.trim(),
      description:    input.description ?? '',
      page_url:       input.pageUrl ?? '',
      issue_type:     input.issueType ?? 'other',
      priority:       input.priority ?? 'normal',
      assigned_to:    input.assignedTo ?? null,
      screenshot_url: input.screenshotUrl ?? null,
      due_date:       input.dueDate ?? null,
      created_by:     uid
    };
    const { data, error: err } = await supabase
      .from('quality_issues')
      .insert(row)
      .select()
      .single();
    if (err || !data) {
      console.error('[qualityCheck] createIssue', err?.message);
      error.value = err?.message ?? 'Could not create issue.';
      return null;
    }
    const issue = rowToIssue(data);
    issues.value = [issue, ...issues.value];
    const auth = useAuthStore();
    if (!auth.isAdmin) {
      const notifs = useNotificationsStore();
      const website = await websiteLabel(issue.websiteId);
      void notifs.createAdminNotification({
        actorId: auth.user?.id,
        type: 'quality_issue_reported',
        title: 'New quality issue reported',
        message: `${actorName()} reported an issue on ${website}.`,
        link: '/work-board/quality-check',
        relatedType: 'quality_issue',
        relatedId: issue.id,
        relatedWebsiteId: issue.websiteId,
        relatedIssueId: issue.id,
      });
    }
    return issue;
  };

  const uploadIssueScreenshot = async (file: File): Promise<string | null> => {
    if (!supabaseConfigured) return null;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      error.value = 'Not signed in.';
      return null;
    }
    if (!file.type.startsWith('image/')) {
      error.value = 'Please upload an image file.';
      return null;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const random = Math.random().toString(36).slice(2, 9);
    const path = `${uid}/${Date.now()}-${random}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    if (uploadErr) {
      error.value = uploadErr.message;
      return null;
    }

    const { data } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const updateIssue = async (
    id: string,
    patch: Partial<Omit<QualityIssue, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const row: Record<string, unknown> = {};
    if (patch.websiteId     !== undefined) row['website_id']     = patch.websiteId;
    if (patch.title         !== undefined) row['title']          = patch.title;
    if (patch.description   !== undefined) row['description']    = patch.description;
    if (patch.pageUrl       !== undefined) row['page_url']       = patch.pageUrl;
    if (patch.issueType     !== undefined) row['issue_type']     = patch.issueType;
    if (patch.priority      !== undefined) row['priority']       = patch.priority;
    if (patch.status        !== undefined) row['status']         = patch.status;
    if (patch.assignedTo    !== undefined) row['assigned_to']    = patch.assignedTo;
    if (patch.screenshotUrl !== undefined) row['screenshot_url'] = patch.screenshotUrl;
    if (patch.dueDate       !== undefined) row['due_date']       = patch.dueDate;
    const previous = issues.value.find((i) => i.id === id) ?? null;
    const { data, error: err } = await supabase
      .from('quality_issues')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (err || !data) {
      console.error('[qualityCheck] updateIssue', err?.message);
      error.value = err?.message ?? 'Could not update issue.';
      return false;
    }
    const issue = rowToIssue(data);
    const idx = issues.value.findIndex((i) => i.id === id);
    if (idx !== -1) issues.value[idx] = issue;
    const auth = useAuthStore();
    // Notify admins/heads when a member marks a card Fixed OR sends it to
    // Waiting Review — both signal "please look at this". Only fire on the
    // transition into that state (not on every save) to avoid duplicate pings.
    const reviewSignal =
      (patch.status === 'fixed' && previous?.status !== 'fixed') ||
      (patch.status === 'needs_review' && previous?.status !== 'needs_review');
    if (!auth.isAdmin && reviewSignal) {
      const waiting = patch.status === 'needs_review';
      const notifs = useNotificationsStore();
      void notifs.createAdminNotification({
        actorId: auth.user?.id,
        type: 'quality_issue_fixed',
        title: waiting ? 'Quality issue waiting for review' : 'Quality issue marked fixed',
        message: waiting
          ? `${actorName()} sent "${issue.title}" for review.`
          : `${actorName()} marked "${issue.title}" as fixed.`,
        link: '/work-board/quality-check',
        relatedType: 'quality_issue',
        relatedId: issue.id,
        relatedWebsiteId: issue.websiteId,
        relatedIssueId: issue.id,
      });
    }
    return true;
  };

  const moveStatus = (id: string, status: QualityIssueStatus) =>
    updateIssue(id, { status });

  const deleteIssue = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const { error: err } = await supabase.from('quality_issues').delete().eq('id', id);
    if (err) { error.value = err.message; return false; }
    issues.value = issues.value.filter((i) => i.id !== id);
    return true;
  };

  const addComment = async (
    issueId: string,
    message: string,
    screenshotUrl?: string | null
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return false;
    const { data, error: err } = await supabase
      .from('quality_issue_comments')
      .insert({
        issue_id: issueId,
        user_id: uid,
        message: message.trim(),
        screenshot_url: screenshotUrl ?? null
      })
      .select()
      .single();
    if (err || !data) { console.error('[qualityCheck] addComment', err?.message); return false; }
    comments.value = [...comments.value, rowToComment(data)];
    return true;
  };

  // ── Selectors ──────────────────────────────────────────────────────────────
  const issuesForWebsite = (websiteId: string) =>
    issues.value.filter((i) => i.websiteId === websiteId);

  const commentsForIssue = (issueId: string) =>
    comments.value.filter((c) => c.issueId === issueId);

  // ── Realtime payload (shape matches realtimeService) ───────────────────────
  function handleRealtimePayload(payload: {
    eventType: string;
    table: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) {
    const { eventType, table, new: newRow, old: oldRow } = payload;
    if (table === 'quality_issues') {
      if (eventType === 'INSERT') {
        const obj = rowToIssue(newRow as unknown as IssueRow);
        if (!issues.value.some((i) => i.id === obj.id)) {
          issues.value = [obj, ...issues.value];
        }
      } else if (eventType === 'UPDATE') {
        const obj = rowToIssue(newRow as unknown as IssueRow);
        const idx = issues.value.findIndex((i) => i.id === obj.id);
        if (idx !== -1) issues.value = issues.value.map((i) => (i.id === obj.id ? obj : i));
        else issues.value = [obj, ...issues.value];
      } else if (eventType === 'DELETE') {
        const id = (oldRow?.id as string) || (newRow?.id as string);
        if (id) issues.value = issues.value.filter((i) => i.id !== id);
      }
    } else if (table === 'quality_issue_comments') {
      if (eventType === 'INSERT') {
        const obj = rowToComment(newRow as unknown as CommentRow);
        if (!comments.value.some((c) => c.id === obj.id)) {
          comments.value = [...comments.value, obj];
        }
      } else if (eventType === 'DELETE') {
        const id = (oldRow?.id as string) || (newRow?.id as string);
        if (id) comments.value = comments.value.filter((c) => c.id !== id);
      }
    } else if (table === 'quality_classes') {
      if (eventType === 'INSERT') {
        const obj = rowToClass(newRow as unknown as ClassRow);
        if (!classes.value.some((c) => c.id === obj.id)) {
          classes.value = [...classes.value, obj];
        }
      } else if (eventType === 'UPDATE') {
        const obj = rowToClass(newRow as unknown as ClassRow);
        const idx = classes.value.findIndex((c) => c.id === obj.id);
        if (idx !== -1) classes.value = classes.value.map((c) => (c.id === obj.id ? obj : c));
      } else if (eventType === 'DELETE') {
        const id = (oldRow?.id as string) || (newRow?.id as string);
        if (id) classes.value = classes.value.filter((c) => c.id !== id);
      }
    } else if (table === 'websites') {
      // Keep website→class map fresh when a website is reassigned to a class
      const id = (newRow?.id as string) || (oldRow?.id as string);
      if (eventType === 'DELETE' && id) {
        const m = new Map(websiteClassMap.value);
        m.delete(id);
        websiteClassMap.value = m;
      } else if (id) {
        const classId = (newRow?.['quality_class_id'] as string | null) ?? null;
        const m = new Map(websiteClassMap.value);
        m.set(id, classId);
        websiteClassMap.value = m;
      }
    }
  }

  return {
    issues,
    comments,
    classes,
    websiteClassMap,
    loading,
    error,
    fetchIssues,
    fetchIssuesForClass,
    fetchComments,
    fetchClasses,
    fetchWebsiteClassMap,
    createIssue,
    uploadIssueScreenshot,
    updateIssue,
    moveStatus,
    deleteIssue,
    addComment,
    createClass,
    updateClass,
    deleteClass,
    setWebsiteClass,
    setWebsiteClassBulk,
    classOf,
    issuesForClass,
    issuesForWebsite,
    commentsForIssue,
    handleRealtimePayload
  };
});
