import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { normalizeRole } from '@/lib/roles';
import { optimizeImage } from '@/utils/imageOptimizer';
import type { SurveyLang } from '@/lib/surveyI18n';

export interface SurveyCampaign {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  audience_roles: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RecipientStatus = 'received' | 'opened' | 'skipped' | 'draft' | 'submitted';

export interface SurveyRecipient {
  id: string;
  campaign_id: string;
  user_id: string;
  status: RecipientStatus;
  received_at: string;
  opened_at: string | null;
  skipped_at: string | null;
  submitted_at: string | null;
  last_seen_at: string;
}

export interface SurveyResponse {
  id: string;
  campaign_id: string;
  user_id: string;
  language: string;
  dashboard_key: string | null;
  feedback_type: string | null;
  ease_rating: string | null;
  speed_rating: string | null;
  usefulness_rating: string | null;
  problem_text: string | null;
  fix_request_text: string | null;
  feature_request_text: string | null;
  extra_text: string | null;
  screenshot_url: string | null;
  is_test_response: boolean;
  created_at: string;
  updated_at: string;
  // new fields
  dashboard_keys: string[];
  issue_tags: string[];
  improvement_tags: string[];
  mood_tags: string[];
  generated_summary: string | null;
  custom_note: string | null;
}

export interface SurveyDraft {
  step: number;
  language: SurveyLang;
  dashboard_keys: string[];
  issue_tags: string[];
  improvement_tags: string[];
  mood_tags: string[];
  generated_summary: string;
  custom_note: string;
  ease_rating: string;
  speed_rating: string;
  usefulness_rating: string;
  screenshot_url: string;
  // legacy fallbacks
  dashboard_key: string;
  feedback_type: string;
  problem_text: string;
  fix_request_text: string;
  feature_request_text: string;
  extra_text: string;
}

export const emptyDraft = (): SurveyDraft => ({
  step: 1,
  language: 'en',
  dashboard_keys: [],
  issue_tags: [],
  improvement_tags: [],
  mood_tags: [],
  generated_summary: '',
  custom_note: '',
  ease_rating: '',
  speed_rating: '',
  usefulness_rating: '',
  screenshot_url: '',
  dashboard_key: '',
  feedback_type: '',
  problem_text: '',
  fix_request_text: '',
  feature_request_text: '',
  extra_text: ''
});

export const isDraftStarted = (d: SurveyDraft | null): boolean => {
  if (!d) return false;
  return (
    (d.dashboard_keys && d.dashboard_keys.length > 0) ||
    (d.issue_tags && d.issue_tags.length > 0) ||
    (d.improvement_tags && d.improvement_tags.length > 0) ||
    (d.mood_tags && d.mood_tags.length > 0) ||
    d.ease_rating !== '' ||
    d.speed_rating !== '' ||
    d.usefulness_rating !== '' ||
    d.custom_note.trim() !== '' ||
    d.screenshot_url !== ''
  );
};

const SNOOZE_MS = 24 * 60 * 60 * 1000; // 1 day — after this the banner may show again
const nowIso = () => new Date().toISOString();

export const useSurveyStore = defineStore('survey', () => {
  const auth = useAuthStore();

  // ── Member-facing state ──────────────────────────────────────────────────
  const activeCampaign = ref<SurveyCampaign | null>(null);
  const myRecipient = ref<SurveyRecipient | null>(null);
  const isSnoozed = ref(false);
  const justSubmitted = ref(false);
  const submitting = ref(false);
  const draftStatus = ref<'idle' | 'saving' | 'saved'>('idle');

  // ── Preview / test mode (Owner / Admin / Head / Supervisor only) ─────────
  // When on, the survey opens "exactly like a team member sees it" but submits
  // are saved as test responses and never touch real recipient tracking.
  const previewMode = ref(false);
  const previewRole = ref('team_member');
  const previewSeq = ref(0); // bumped to ask the global widget to open the preview

  // ── Admin state ──────────────────────────────────────────────────────────
  const campaigns = ref<SurveyCampaign[]>([]);
  const adminRecipients = ref<SurveyRecipient[]>([]);
  const adminResponses = ref<SurveyResponse[]>([]);
  const adminLoading = ref(false);
  const adminError = ref<string | null>(null);

  // ── Local keys (per campaign + user) ─────────────────────────────────────
  const draftKey = () => {
    const cid = activeCampaign.value?.id ?? activeAdminCampaign.value?.id ?? 'none';
    const uid = auth.user?.id ?? 'anon';
    if (previewMode.value) {
      return `survey_test_draft_${cid}_${previewRole.value}_${uid}`;
    }
    return `survey_draft_${cid}_${uid}`;
  };
  const snoozeKey = () => `kiuq_survey_snooze_${activeCampaign.value?.id ?? 'none'}_${auth.user?.id ?? 'anon'}`;

  const recomputeSnoozed = () => {
    if (typeof localStorage === 'undefined') { isSnoozed.value = false; return; }
    const ts = Number(localStorage.getItem(snoozeKey()) || 0);
    isSnoozed.value = ts > 0 && Date.now() - ts < SNOOZE_MS;
  };
  const setSnooze = () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(snoozeKey(), String(Date.now()));
    isSnoozed.value = true;
  };
  const clearSnooze = () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(snoozeKey());
    isSnoozed.value = false;
  };

  // ── Draft (localStorage) ─────────────────────────────────────────────────
  const loadDraft = (): SurveyDraft | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(draftKey());
      if (!raw) return null;
      return { ...emptyDraft(), ...(JSON.parse(raw) as Partial<SurveyDraft>) };
    } catch {
      return null;
    }
  };
  const saveDraft = (draft: SurveyDraft) => {
    if (typeof localStorage === 'undefined') return;
    draftStatus.value = 'saving';
    try {
      localStorage.setItem(draftKey(), JSON.stringify(draft));
      draftStatus.value = 'saved';
      void syncDraftDatabaseStatus(draft);
    } catch {
      draftStatus.value = 'idle';
    }
  };
  const clearDraft = () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(draftKey());
    draftStatus.value = 'idle';
  };

  // ── Eligibility ──────────────────────────────────────────────────────────
  const inAudience = computed(() => {
    const c = activeCampaign.value;
    if (!c) return false;
    const role = normalizeRole(auth.profile?.role);
    const aud = c.audience_roles ?? [];
    if (aud.includes(role)) return true;
    // 'team_member' and the legacy 'member' role are the same audience.
    if ((role === 'member' || role === 'team_member') && (aud.includes('member') || aud.includes('team_member'))) {
      return true;
    }
    return false;
  });

  const hasSubmitted = computed(() => myRecipient.value?.status === 'submitted');
  const available = computed(() => !!activeCampaign.value && inAudience.value && !hasSubmitted.value);
  /** Full banner: available, not snoozed, and not already finished this session. */
  const showBanner = computed(() => available.value && !isSnoozed.value && !justSubmitted.value);
  /** Floating icon: available but snoozed (banner hidden) — quiet re-entry point. */
  const showFloatingIcon = computed(() => available.value && isSnoozed.value && !justSubmitted.value);

  // ── Member fetch / tracking ──────────────────────────────────────────────
  const fetchActiveCampaign = async () => {
    if (!supabaseConfigured || !auth.user?.id) return;
    const { data, error } = await supabase
      .from('survey_campaigns')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      if (import.meta.env.DEV) console.warn('[survey] fetchActiveCampaign failed', error.message);
      return;
    }
    activeCampaign.value = (data?.[0] as SurveyCampaign) ?? null;
    recomputeSnoozed();
  };

  /** Make sure this user has a recipient row (status 'received') for the active campaign. */
  const ensureRecipient = async () => {
    const c = activeCampaign.value;
    const uid = auth.user?.id;
    if (!supabaseConfigured || !c || !uid || !inAudience.value) return;
    const { data: existing } = await supabase
      .from('survey_recipients')
      .select('*')
      .eq('campaign_id', c.id)
      .eq('user_id', uid)
      .limit(1);
    const row = existing?.[0] as SurveyRecipient | undefined;
    if (row) {
      myRecipient.value = row;
      // best-effort touch; ignore failures
      void supabase.from('survey_recipients').update({ last_seen_at: nowIso() }).eq('id', row.id);
      return;
    }
    const { data: inserted, error } = await supabase
      .from('survey_recipients')
      .insert({ campaign_id: c.id, user_id: uid, status: 'received' })
      .select('*')
      .single();
    if (!error && inserted) myRecipient.value = inserted as SurveyRecipient;
  };

  const patchRecipient = async (patch: Partial<SurveyRecipient>) => {
    const r = myRecipient.value;
    if (!r) return;
    myRecipient.value = { ...r, ...patch };
    if (supabaseConfigured) {
      void supabase.from('survey_recipients').update(patch).eq('id', r.id);
    }
  };

  const syncDraftDatabaseStatus = async (draft: SurveyDraft) => {
    if (previewMode.value) return;
    const r = myRecipient.value;
    if (!r) return;
    const started = isDraftStarted(draft);
    if (started) {
      if (r.status !== 'draft' && r.status !== 'submitted') {
        await patchRecipient({ status: 'draft', last_seen_at: nowIso() });
      }
    } else {
      if (r.status === 'draft') {
        await patchRecipient({ status: 'opened', last_seen_at: nowIso() });
      }
    }
  };

  const markOpened = async () => {
    if (previewMode.value) return;
    const r = myRecipient.value;
    if (!r || r.status !== 'received') return;
    await patchRecipient({ status: 'opened', opened_at: nowIso(), last_seen_at: nowIso() });
  };

  const markSkipped = async () => {
    if (previewMode.value) return;
    const r = myRecipient.value;
    if (r && r.status !== 'submitted') {
      const draft = loadDraft();
      const started = isDraftStarted(draft);
      const targetStatus = started ? 'draft' : 'skipped';
      await patchRecipient({
        status: targetStatus,
        skipped_at: targetStatus === 'skipped' ? nowIso() : r.skipped_at,
        last_seen_at: nowIso()
      });
    }
    setSnooze();
  };

  const snoozeFromModalClose = () => {
    setSnooze();
  };

  // ── Screenshot upload (reuses the public team-images bucket) ──────────────
  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const uid = auth.user?.id;
    if (!supabaseConfigured || !uid) return null;
    let toUpload: File = file;
    try {
      const result = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetSizeKB: 200,
        maxSizeKB: 400
      });
      toUpload = result.file;
    } catch {
      // fall back to the raw file if optimization fails
    }
    const path = `${uid}/survey/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
    const { error } = await supabase.storage.from('team-images').upload(path, toUpload, {
      cacheControl: '31536000',
      upsert: false
    });
    if (error) {
      if (import.meta.env.DEV) console.error('[survey] screenshot upload failed', error.message);
      return null;
    }
    const { data } = supabase.storage.from('team-images').getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const submitResponse = async (draft: SurveyDraft): Promise<boolean> => {
    const c = activeCampaign.value;
    const uid = auth.user?.id;
    if (!supabaseConfigured || !c || !uid || submitting.value) return false;
    submitting.value = true;
    try {
      const firstDashboard = draft.dashboard_keys[0] || null;
      const compiledFeedbackType = draft.issue_tags.includes('something_broken') ? 'bug'
        : draft.improvement_tags.length > 0 ? 'feature_idea'
        : 'ui_ux';

      const payload = {
        campaign_id: c.id,
        user_id: uid,
        language: draft.language,
        dashboard_key: firstDashboard,
        feedback_type: compiledFeedbackType,
        ease_rating: draft.ease_rating || null,
        speed_rating: draft.speed_rating || null,
        usefulness_rating: draft.usefulness_rating || null,
        problem_text: draft.generated_summary.trim() || null,
        fix_request_text: draft.issue_tags.join(', ') || null,
        feature_request_text: draft.improvement_tags.join(', ') || null,
        extra_text: draft.custom_note.trim() || null,
        screenshot_url: draft.screenshot_url || null,
        // new fields
        dashboard_keys: draft.dashboard_keys,
        issue_tags: draft.issue_tags,
        improvement_tags: draft.improvement_tags,
        mood_tags: draft.mood_tags,
        generated_summary: draft.generated_summary,
        custom_note: draft.custom_note
      };
      const { error } = await supabase.from('survey_responses').insert(payload);
      if (error) {
        if (import.meta.env.DEV) console.error('[survey] submit failed', error.message);
        return false;
      }
      await patchRecipient({ status: 'submitted', submitted_at: nowIso(), last_seen_at: nowIso() });
      clearDraft();
      clearSnooze();
      justSubmitted.value = true;
      return true;
    } finally {
      submitting.value = false;
    }
  };

  const submitTestResponse = async (draft: SurveyDraft): Promise<boolean> => {
    const c = activeCampaign.value ?? activeAdminCampaign.value;
    const uid = auth.user?.id;
    if (!supabaseConfigured || !c || !uid || submitting.value) return false;
    submitting.value = true;
    try {
      const firstDashboard = draft.dashboard_keys[0] || null;
      const compiledFeedbackType = draft.issue_tags.includes('something_broken') ? 'bug'
        : draft.improvement_tags.length > 0 ? 'feature_idea'
        : 'ui_ux';

      const payload = {
        campaign_id: c.id,
        user_id: uid,
        language: draft.language,
        dashboard_key: firstDashboard,
        feedback_type: compiledFeedbackType,
        ease_rating: draft.ease_rating || null,
        speed_rating: draft.speed_rating || null,
        usefulness_rating: draft.usefulness_rating || null,
        problem_text: draft.generated_summary.trim() || null,
        fix_request_text: draft.issue_tags.join(', ') || null,
        feature_request_text: draft.improvement_tags.join(', ') || null,
        extra_text: draft.custom_note.trim() || null,
        screenshot_url: draft.screenshot_url || null,
        is_test_response: true,
        // new fields
        dashboard_keys: draft.dashboard_keys,
        issue_tags: draft.issue_tags,
        improvement_tags: draft.improvement_tags,
        mood_tags: draft.mood_tags,
        generated_summary: draft.generated_summary,
        custom_note: draft.custom_note
      };
      const { error } = await supabase.from('survey_responses').insert(payload);
      if (error) {
        if (import.meta.env.DEV) console.error('[survey] test submit failed', error.message);
        return false;
      }
      clearDraft();
      justSubmitted.value = true;
      return true;
    } finally {
      submitting.value = false;
    }
  };

  // ── Preview control (driven from the admin Settings panel) ───────────────
  const startPreview = (role: string) => {
    previewRole.value = role || 'team_member';
    previewMode.value = true;
    justSubmitted.value = false;
    previewSeq.value += 1; // tells the global widget to open the preview
  };

  const stopPreview = () => {
    previewMode.value = false;
    justSubmitted.value = false;
  };

  /** Called once on app start (after auth is ready) for the signed-in member. */
  const initMember = async () => {
    justSubmitted.value = false;
    await fetchActiveCampaign();
    if (!activeCampaign.value) {
      myRecipient.value = null;
      return;
    }
    await ensureRecipient();
    recomputeSnoozed();
  };

  const resetMember = () => {
    activeCampaign.value = null;
    myRecipient.value = null;
    isSnoozed.value = false;
    justSubmitted.value = false;
  };

  // ── Admin ────────────────────────────────────────────────────────────────
  const activeAdminCampaign = computed<SurveyCampaign | null>(
    () => campaigns.value.find((c) => c.is_active) ?? campaigns.value[0] ?? null
  );

  const stats = computed(() => {
    const r = adminRecipients.value;
    const received = r.length;
    const opened = r.filter((x) => !!x.opened_at || x.status === 'opened').length;
    const skipped = r.filter((x) => x.status === 'skipped' || !!x.skipped_at).length;
    const inProgress = r.filter((x) => x.status === 'draft').length;
    const submitted = r.filter((x) => x.status === 'submitted' || !!x.submitted_at).length;
    return { received, opened, skipped, inProgress, submitted, notResponded: Math.max(received - submitted, 0) };
  });

  const fetchCampaigns = async () => {
    if (!supabaseConfigured) return;
    const { data } = await supabase.from('survey_campaigns').select('*').order('created_at', { ascending: false });
    campaigns.value = (data as SurveyCampaign[]) ?? [];
  };

  const refreshAdmin = async () => {
    if (!supabaseConfigured || !auth.isAdmin) return;
    adminLoading.value = true;
    adminError.value = null;
    try {
      await fetchCampaigns();
      const c = activeAdminCampaign.value;
      if (!c) {
        adminRecipients.value = [];
        adminResponses.value = [];
        return;
      }
      const [{ data: recips, error: rErr }, { data: resps, error: pErr }] = await Promise.all([
        supabase.from('survey_recipients').select('*').eq('campaign_id', c.id),
        supabase.from('survey_responses').select('*').eq('campaign_id', c.id).order('created_at', { ascending: false })
      ]);
      if (rErr || pErr) adminError.value = (rErr ?? pErr)?.message ?? 'Could not load survey data.';
      adminRecipients.value = (recips as SurveyRecipient[]) ?? [];
      adminResponses.value = (resps as SurveyResponse[]) ?? [];
    } finally {
      adminLoading.value = false;
    }
  };

  const saveCampaign = async (patch: Partial<Pick<SurveyCampaign, 'title' | 'description' | 'audience_roles' | 'is_active'>>): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    let target = activeAdminCampaign.value;
    // If turning a campaign active, deactivate the others first (single active survey).
    if (patch.is_active === true && target) {
      await supabase.from('survey_campaigns').update({ is_active: false }).neq('id', target.id);
    }
    if (!target) {
      const { data, error } = await supabase
        .from('survey_campaigns')
        .insert({ ...patch, created_by: auth.user?.id ?? null })
        .select('*')
        .single();
      if (error) { adminError.value = error.message; return false; }
      target = data as SurveyCampaign;
    } else {
      const { error } = await supabase.from('survey_campaigns').update(patch).eq('id', target.id);
      if (error) { adminError.value = error.message; return false; }
    }
    await refreshAdmin();
    return true;
  };

  /** Remove a response (used to clean up test responses). */
  const deleteResponse = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const { error } = await supabase.from('survey_responses').delete().eq('id', id);
    if (error) { adminError.value = error.message; return false; }
    adminResponses.value = adminResponses.value.filter((r) => r.id !== id);
    return true;
  };

  return {
    // member state
    activeCampaign,
    myRecipient,
    isSnoozed,
    justSubmitted,
    submitting,
    draftStatus,
    inAudience,
    hasSubmitted,
    available,
    showBanner,
    showFloatingIcon,
    // preview / test mode
    previewMode,
    previewRole,
    previewSeq,
    startPreview,
    stopPreview,
    submitTestResponse,
    // member actions
    initMember,
    resetMember,
    fetchActiveCampaign,
    ensureRecipient,
    markOpened,
    markSkipped,
    snoozeFromModalClose,
    uploadScreenshot,
    submitResponse,
    loadDraft,
    saveDraft,
    clearDraft,
    recomputeSnoozed,
    // admin state
    campaigns,
    adminRecipients,
    adminResponses,
    adminLoading,
    adminError,
    activeAdminCampaign,
    stats,
    // admin actions
    fetchCampaigns,
    refreshAdmin,
    saveCampaign,
    deleteResponse
  };
});
