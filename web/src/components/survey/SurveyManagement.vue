<template>
  <div class="card card-pad">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="section-title mb-1">{{ $t('survey.title') }}</h3>
        <p class="helper">{{ $t('survey.subtitle') }}</p>
      </div>
      <label class="survey-switch" :title="campaign?.is_active ? $t('survey.campaignOn') : $t('survey.campaignOff')">
        <input type="checkbox" :checked="!!campaign?.is_active" :disabled="saving" @change="toggleActive" />
        <span class="survey-switch-track"><span class="survey-switch-thumb" /></span>
        <span class="ml-2 text-xs font-semibold" :class="campaign?.is_active ? 'text-primary' : 'text-text-muted'">
          {{ campaign?.is_active ? $t('survey.on') : $t('survey.off') }}
        </span>
      </label>
    </div>

    <p v-if="store.adminError" class="mt-3 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-3 py-2 text-xs text-status-needs-fix-fg">
      {{ store.adminError }}
    </p>

    <!-- Settings -->
    <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <label class="label">{{ $t('survey.surveyTitle') }}</label>
        <input v-model="settings.title" class="input" :placeholder="$t('survey.surveyTitlePlaceholder')" />
      </div>
      <div>
        <label class="label">{{ $t('survey.shortMessage') }}</label>
        <input v-model="settings.description" class="input" :placeholder="$t('survey.shortMessagePlaceholder')" />
      </div>
    </div>
    <div class="mt-4">
      <label class="label">{{ $t('survey.whoReceives') }}</label>
      <div class="mt-1 flex flex-wrap gap-2">
        <button
          v-for="r in audienceRoleOptions"
          :key="r.value"
          type="button"
          :class="['survey-aud-chip', settings.audience_roles.includes(r.value) && 'is-active']"
          @click="toggleAudience(r.value)"
        >{{ r.label }}</button>
      </div>
    </div>
    <div class="mt-4 flex items-center gap-2">
      <button class="btn-primary" type="button" :disabled="saving" @click="saveSettings">{{ $t('survey.saveSurvey') }}</button>
      <span v-if="savedMsg" class="text-xs text-primary">{{ savedMsg }}</span>
    </div>

    <!-- Preview & Test (safe QA) -->
    <div class="mt-5 rounded-card border border-border bg-soft/30 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="label">{{ $t('survey.previewAs') }}</label>
          <select v-model="previewRole" class="input survey-filter">
            <option value="team_member">{{ roleLabel('team_member') }}</option>
            <option value="assistant_head">{{ roleLabel('assistant_head') }}</option>
            <option value="quality_checker">{{ roleLabel('quality_checker') }}</option>
            <option value="head">{{ roleLabel('head') }}</option>
          </select>
        </div>
        <span class="survey-aud-note" :class="previewInAudience ? 'is-ok' : 'is-no'">
          {{ previewInAudience ? $t('survey.inAudience') : $t('survey.notInAudience') }}
        </span>
        <button class="btn-primary" type="button" @click="openPreview">{{ $t('survey.previewTest') }}</button>
      </div>
      <p class="helper mt-2" v-html="$t('survey.previewTestDesc')"></p>
    </div>

    <!-- Stat cards -->
    <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div class="survey-stat"><div class="survey-stat-num">{{ store.stats.received }}</div><div class="survey-stat-lbl">{{ $t('survey.received') }}</div></div>
      <div class="survey-stat"><div class="survey-stat-num">{{ store.stats.opened }}</div><div class="survey-stat-lbl">{{ $t('survey.opened') }}</div></div>
      <div class="survey-stat"><div class="survey-stat-num text-purple-500">{{ store.stats.inProgress }}</div><div class="survey-stat-lbl">{{ $t('survey.inProgress') }}</div></div>
      <div class="survey-stat"><div class="survey-stat-num">{{ store.stats.skipped }}</div><div class="survey-stat-lbl">{{ $t('survey.skipped') }}</div></div>
      <div class="survey-stat"><div class="survey-stat-num text-primary">{{ store.stats.submitted }}</div><div class="survey-stat-lbl">{{ $t('survey.submitted') }}</div></div>
      <div class="survey-stat"><div class="survey-stat-num">{{ store.stats.notResponded }}</div><div class="survey-stat-lbl">{{ $t('survey.notResponded') }}</div></div>
    </div>

    <!-- View switch -->
    <div class="mt-6 flex items-center justify-between gap-3">
      <div class="survey-tabs">
        <button type="button" :class="['survey-tab', view === 'responses' && 'is-active']" @click="view = 'responses'">{{ $t('survey.responses') }} ({{ responsesCount }})</button>
        <button type="button" :class="['survey-tab', view === 'people' && 'is-active']" @click="view = 'people'">{{ $t('survey.recipients') }} ({{ store.adminRecipients.length }})</button>
      </div>
      <div v-if="view === 'responses'" class="flex items-center gap-3">
        <label class="survey-check">
          <input type="checkbox" v-model="showTestResponses" />
          {{ $t('survey.showTestResponses') }}<span v-if="testCount"> ({{ testCount }})</span>
        </label>
        <button class="btn-secondary px-3 py-1.5 text-xs" type="button" :disabled="!filteredResponses.length" @click="exportCsv">{{ $t('survey.exportCsv') }}</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="mt-3 flex flex-wrap items-end gap-2">
      <input v-model="filters.search" class="input survey-filter" :placeholder="$t('survey.searchPlaceholder')" />
      <select v-model="filters.role" class="input survey-filter">
        <option value="">{{ $t('survey.allRoles') }}</option>
        <option v-for="r in roleFilterOptions" :key="r" :value="r">{{ roleLabel(r) }}</option>
      </select>
      <template v-if="view === 'responses'">
        <select v-model="filters.dashboard" class="input survey-filter">
          <option value="">{{ $t('survey.allPages') }}</option>
          <option v-for="o in surveyOptions.dashboards" :key="o.value" :value="o.value">{{ locale === 'km' ? o.kh : o.en }}</option>
        </select>
        <select v-model="filters.feedbackType" class="input survey-filter">
          <option value="">{{ $t('survey.allTypes') }}</option>
          <option v-for="o in surveyOptions.feedbackTypes" :key="o.value" :value="o.value">{{ locale === 'km' ? o.kh : o.en }}</option>
        </select>
        <select v-model="filters.language" class="input survey-filter">
          <option value="">{{ $t('survey.anyLanguage') }}</option>
          <option value="en">{{ $t('survey.english') }}</option>
          <option value="kh">{{ $t('survey.khmer') }}</option>
        </select>
      </template>
      <select v-else v-model="filters.status" class="input survey-filter">
        <option value="">{{ $t('survey.allStatuses') }}</option>
        <option value="received">{{ $t('survey.received') }}</option>
        <option value="opened">{{ $t('survey.opened') }}</option>
        <option value="draft">{{ $t('survey.inProgress') }}</option>
        <option value="skipped">{{ $t('survey.skipped') }}</option>
        <option value="submitted">{{ $t('survey.submitted') }}</option>
      </select>
      <input v-model="filters.from" type="date" class="input survey-filter" />
      <input v-model="filters.to" type="date" class="input survey-filter" />
    </div>

    <!-- Responses table -->
    <div v-if="view === 'responses'" class="mt-3 overflow-x-auto">
      <table class="survey-table">
        <thead>
          <tr>
            <th>{{ $t('survey.user') }}</th>
            <th>{{ $t('survey.role') }}</th>
            <th>{{ $t('survey.pages') }}</th>
            <th>{{ $t('survey.type') }}</th>
            <th>{{ $t('survey.ease') }}</th>
            <th>{{ $t('survey.speed') }}</th>
            <th>{{ $t('survey.submitted') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredResponses" :key="r.id">
            <td class="font-medium text-text-main">
              {{ memberName(r.user_id) }}
              <span v-if="r.is_test_response" class="survey-test-badge">{{ $t('survey.testResponseBadge') }}</span>
            </td>
            <td><span class="survey-role" :class="roleBadgeClass(memberRole(r.user_id))">{{ roleLabel(memberRole(r.user_id)) }}</span></td>
            <td class="max-w-[200px] truncate" :title="formatDashboards(r.dashboard_keys, r.dashboard_key)">
              {{ formatDashboards(r.dashboard_keys, r.dashboard_key) }}
            </td>
            <td>{{ lbl(surveyOptions.feedbackTypes, r.feedback_type) }}</td>
            <td>{{ lbl(surveyOptions.ease, r.ease_rating) }}</td>
            <td>{{ lbl(surveyOptions.speed, r.speed_rating) }}</td>
            <td class="whitespace-nowrap text-text-muted">{{ fmtDate(r.created_at) }}</td>
            <td class="whitespace-nowrap">
              <button class="btn-ghost px-2 py-1 text-xs" type="button" @click="viewing = r">{{ $t('survey.view') }}</button>
              <button v-if="r.is_test_response" class="btn-ghost px-2 py-1 text-xs text-status-needs-fix-fg" type="button" @click="removeTest(r)">{{ $t('survey.delete') }}</button>
            </td>
          </tr>
          <tr v-if="!filteredResponses.length"><td colspan="8" class="py-8 text-center text-sm text-text-muted">{{ $t('survey.noResponses') }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- People table -->
    <div v-else class="mt-3 overflow-x-auto">
      <table class="survey-table">
        <thead>
          <tr>
            <th>{{ $t('survey.user') }}</th>
            <th>{{ $t('survey.role') }}</th>
            <th>{{ $t('survey.status') }}</th>
            <th>{{ $t('survey.opened') }}</th>
            <th>{{ $t('survey.skipped') }}</th>
            <th>{{ $t('survey.submitted') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredPeople" :key="p.id">
            <td class="font-medium text-text-main">{{ memberName(p.user_id) }}</td>
            <td><span class="survey-role" :class="roleBadgeClass(memberRole(p.user_id))">{{ roleLabel(memberRole(p.user_id)) }}</span></td>
            <td><span class="survey-status" :class="`survey-status--${p.status}`">{{ $t('survey.' + p.status) }}</span></td>
            <td class="whitespace-nowrap text-text-muted">{{ fmtDate(p.opened_at) }}</td>
            <td class="whitespace-nowrap text-text-muted">{{ fmtDate(p.skipped_at) }}</td>
            <td class="whitespace-nowrap text-text-muted">{{ fmtDate(p.submitted_at) }}</td>
          </tr>
          <tr v-if="!filteredPeople.length"><td colspan="6" class="py-8 text-center text-sm text-text-muted">{{ $t('survey.noRecipients') }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- View response modal -->
  <Modal :open="!!viewing" :title="viewing ? memberName(viewing.user_id) : $t('survey.view')" :subtitle="$t('survey.surveyResponseSubtitle')" size="lg" @close="viewing = null">
    <div v-if="viewing" class="space-y-4">
      <div v-if="viewing.is_test_response" class="rounded-card border border-status-submitted-bg bg-status-submitted-bg/30 px-3 py-2 text-xs font-semibold text-status-submitted-fg">
        {{ $t('survey.testResponseDesc') }}
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="survey-kv"><div class="survey-kv-l">{{ $t('survey.role') }}</div><div class="survey-kv-v">{{ roleLabel(memberRole(viewing.user_id)) }}</div></div>
        <div class="survey-kv"><div class="survey-kv-l">{{ $t('survey.language') }}</div><div class="survey-kv-v">{{ viewing.language === 'kh' ? $t('survey.khmer') : $t('survey.english') }}</div></div>
        <div class="survey-kv">
          <div class="survey-kv-l">{{ $t('survey.pages') }}</div>
          <div class="survey-kv-v text-ellipsis overflow-hidden" :title="formatDashboards(viewing.dashboard_keys, viewing.dashboard_key)">
            {{ formatDashboards(viewing.dashboard_keys, viewing.dashboard_key) }}
          </div>
        </div>
        <div class="survey-kv">
          <div class="survey-kv-l">{{ $t('survey.moodTags') }}</div>
          <div class="survey-kv-v">{{ formatMoodTags(viewing.mood_tags) }}</div>
        </div>
        <div class="survey-kv"><div class="survey-kv-l">{{ $t('survey.ease') }}</div><div class="survey-kv-v">{{ lbl(surveyOptions.ease, viewing.ease_rating) }}</div></div>
        <div class="survey-kv"><div class="survey-kv-l">{{ $t('survey.speed') }}</div><div class="survey-kv-v">{{ lbl(surveyOptions.speed, viewing.speed_rating) }}</div></div>
        <div class="survey-kv"><div class="survey-kv-l">{{ $t('survey.designVisual') }}</div><div class="survey-kv-v">{{ lbl(surveyOptions.usefulness, viewing.usefulness_rating) }}</div></div>
      </div>

      <div v-if="viewing.issue_tags && viewing.issue_tags.length" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.problemsIssues') }}</div>
        <div class="mt-1 flex flex-wrap gap-1">
          <span v-for="t in viewing.issue_tags" :key="t" class="px-2 py-0.5 rounded-full text-xs bg-status-needs-fix-bg/20 text-status-needs-fix-fg border border-status-needs-fix-bg/40">
            {{ lbl([...surveyOptions.commonProblems, ...surveyOptions.workflowFeedback], t) }}
          </span>
        </div>
      </div>

      <div v-if="viewing.improvement_tags && viewing.improvement_tags.length" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.requestedImprovements') }}</div>
        <div class="mt-1 flex flex-wrap gap-1">
          <span v-for="t in viewing.improvement_tags" :key="t" class="px-2 py-0.5 rounded-full text-xs bg-primary-soft text-primary border border-primary/20">
            {{ lbl(surveyOptions.improvements, t) }}
          </span>
        </div>
      </div>

      <div v-if="viewing.generated_summary" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.generatedSummary') }}</div>
        <p class="survey-kv-text font-mono text-xs bg-soft/20 p-2.5 rounded-card border border-border whitespace-pre-wrap leading-relaxed">{{ viewing.generated_summary }}</p>
      </div>

      <div v-if="viewing.custom_note" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.customNote') }}</div>
        <p class="survey-kv-text">{{ viewing.custom_note }}</p>
      </div>

      <!-- Fallback values for older DB records -->
      <div v-if="!viewing.generated_summary && viewing.problem_text" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.problemLegacy') }}</div>
        <p class="survey-kv-text">{{ viewing.problem_text }}</p>
      </div>
      <div v-if="(!viewing.issue_tags || !viewing.issue_tags.length) && viewing.fix_request_text" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.wantsFixedLegacy') }}</div>
        <p class="survey-kv-text">{{ viewing.fix_request_text }}</p>
      </div>
      <div v-if="(!viewing.improvement_tags || !viewing.improvement_tags.length) && viewing.feature_request_text" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.featureIdeaLegacy') }}</div>
        <p class="survey-kv-text">{{ viewing.feature_request_text }}</p>
      </div>
      <div v-if="!viewing.custom_note && viewing.extra_text" class="survey-kv">
        <div class="survey-kv-l">{{ $t('survey.extraNoteLegacy') }}</div>
        <p class="survey-kv-text">{{ viewing.extra_text }}</p>
      </div>

      <div v-if="viewing.screenshot_url">
        <div class="survey-kv-l mb-1">{{ $t('Screenshot') }}</div>
        <a :href="viewing.screenshot_url" target="_blank" rel="noopener">
          <img :src="viewing.screenshot_url" alt="screenshot" class="max-h-72 rounded-card border border-border object-contain" />
        </a>
      </div>
    </div>
    <template #footer>
      <button class="btn-secondary" type="button" @click="viewing = null">{{ $t('survey.close') }}</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/ui/Modal.vue';
import { useSurveyStore, type SurveyResponse, type SurveyRecipient } from '@/stores/survey';
import { useDataStore } from '@/stores/data';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { debounceRealtime } from '@/services/realtimeService';
import { surveyOptions, audienceRoleOptions, type SurveyOption } from '@/lib/surveyI18n';
import { roleLabel, roleBadgeClass, normalizeRole } from '@/lib/roles';

const { t, locale } = useI18n();
const store = useSurveyStore();
const data = useDataStore();

const view = ref<'responses' | 'people'>('responses');
const viewing = ref<SurveyResponse | null>(null);
const saving = ref(false);
const savedMsg = ref('');

// Preview & test
const previewRole = ref('team_member');
const showTestResponses = ref(false);

const previewInAudience = computed(() => {
  const r = previewRole.value;
  const aud = settings.audience_roles;
  if (aud.includes(r)) return true;
  if ((r === 'team_member' || r === 'member') && (aud.includes('team_member') || aud.includes('member'))) return true;
  return false;
});
const openPreview = () => store.startPreview(previewRole.value);

const testCount = computed(() => store.adminResponses.filter((r) => r.is_test_response).length);
const responsesCount = computed(() =>
  store.adminResponses.filter((r) => showTestResponses.value || !r.is_test_response).length
);

const removeTest = async (r: SurveyResponse) => {
  if (!confirm(t('survey.confirmDeleteTest'))) return;
  await store.deleteResponse(r.id);
};

const settings = reactive({
  title: '',
  description: '',
  audience_roles: [] as string[]
});

const campaign = computed(() => store.activeAdminCampaign);

const syncSettings = () => {
  const c = campaign.value;
  settings.title = c?.title ?? 'Help us improve KiuQ Website Team';
  settings.description = c?.description ?? 'Tell us what is hard, what is good, and what you want us to fix.';
  settings.audience_roles = [...(c?.audience_roles ?? ['team_member', 'assistant_head', 'quality_checker'])];
};
watch(campaign, syncSettings, { immediate: true });

const toggleAudience = (value: string) => {
  const i = settings.audience_roles.indexOf(value);
  if (i === -1) settings.audience_roles.push(value);
  else settings.audience_roles.splice(i, 1);
};

const flash = (msg: string) => { savedMsg.value = msg; setTimeout(() => { savedMsg.value = ''; }, 2500); };

const saveSettings = async () => {
  saving.value = true;
  const ok = await store.saveCampaign({
    title: settings.title.trim() || 'Help us improve KiuQ Website Team',
    description: settings.description.trim(),
    audience_roles: settings.audience_roles
  });
  saving.value = false;
  if (ok) flash(t('survey.saved'));
};

const toggleActive = async (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked;
  saving.value = true;
  await store.saveCampaign({ is_active: checked });
  saving.value = false;
  flash(checked ? t('survey.campaignOnToast') : t('survey.campaignOffToast'));
};

// ── Lookups ────────────────────────────────────────────────────────────────
const memberName = (id: string) => {
  const m = data.memberById(id);
  return m?.fullName || m?.email || 'Unknown user';
};
const memberRole = (id: string) => data.memberById(id)?.role ?? 'member';
const lbl = (list: SurveyOption[], value: string | null) => {
  if (!value) return '—';
  const item = list.find((o) => o.value === value);
  if (!item) return value;
  return locale.value === 'km' ? item.kh : item.en;
};
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const roleFilterOptions = computed(() => {
  const ids = view.value === 'responses' ? store.adminResponses.map((r) => r.user_id) : store.adminRecipients.map((r) => r.user_id);
  const roles = new Set(ids.map((id) => normalizeRole(memberRole(id))));
  return [...roles];
});

// Helper to format dashboards array
const formatDashboards = (keys: string[] | null, fallbackKey: string | null) => {
  const list = keys && keys.length > 0 ? keys : (fallbackKey ? [fallbackKey] : []);
  if (list.length === 0) return '—';
  return list.map((k) => lbl(surveyOptions.dashboards, k)).join(', ');
};

// Helper to format mood tags
const formatMoodTags = (tags: string[] | null) => {
  if (!tags || tags.length === 0) return '—';
  return tags.map((t) => {
    const emoji = moodSmiley(t);
    const label = lbl(surveyOptions.moods, t);
    return `${emoji} ${label}`;
  }).join(', ');
};

const moodSmiley = (val: string) => {
  switch (val) {
    case 'good': return '😊';
    case 'okay': return '😐';
    case 'annoying': return '😤';
    case 'confusing': return '😕';
    case 'slow': return '⏳';
    case 'broken': return '💥';
    default: return '💬';
  }
};

// ── Filters ──────────────────────────────────────────────────────────────
const filters = reactive({ search: '', role: '', dashboard: '', feedbackType: '', language: '', status: '', from: '', to: '' });

const matchesCommon = (userId: string, dateIso: string | null) => {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const m = data.memberById(userId);
    const hay = `${m?.fullName ?? ''} ${m?.email ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.role && normalizeRole(memberRole(userId)) !== filters.role) return false;
  if (filters.from && dateIso && dateIso.slice(0, 10) < filters.from) return false;
  if (filters.to && dateIso && dateIso.slice(0, 10) > filters.to) return false;
  return true;
};

const filteredResponses = computed(() =>
  store.adminResponses.filter((r) => {
    if (!showTestResponses.value && r.is_test_response) return false;
    if (!matchesCommon(r.user_id, r.created_at)) return false;
    if (filters.dashboard) {
      const matchLegacy = r.dashboard_key === filters.dashboard;
      const matchArray = r.dashboard_keys && r.dashboard_keys.includes(filters.dashboard);
      if (!matchLegacy && !matchArray) return false;
    }
    if (filters.feedbackType && r.feedback_type !== filters.feedbackType) return false;
    if (filters.language && r.language !== filters.language) return false;
    return true;
  })
);

const filteredPeople = computed(() =>
  store.adminRecipients.filter((p: SurveyRecipient) => {
    if (!matchesCommon(p.user_id, p.received_at)) return false;
    if (filters.status && p.status !== filters.status) return false;
    return true;
  })
);

// ── CSV export ───────────────────────────────────────────────────────────
const exportCsv = () => {
  const headers = [
    'Name', 'Email', 'Role', 'Pages (New)', 'Issues', 'Improvements', 'Moods', 'Summary', 'Custom Note',
    'Page (Legacy)', 'Type (Legacy)', 'Ease', 'Speed', 'Design', 'Problem (Legacy)', 'Wants fixed (Legacy)', 'Feature idea (Legacy)', 'Extra (Legacy)', 'Language', 'Submitted'
  ];
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const rows = filteredResponses.value.map((r) => {
    const m = data.memberById(r.user_id);
    return [
      m?.fullName ?? '',
      m?.email ?? '',
      roleLabel(memberRole(r.user_id)),
      (r.dashboard_keys || []).map(k => lbl(surveyOptions.dashboards, k)).join(', '),
      (r.issue_tags || []).map(t => lbl([...surveyOptions.commonProblems, ...surveyOptions.workflowFeedback], t)).join(', '),
      (r.improvement_tags || []).map(t => lbl(surveyOptions.improvements, t)).join(', '),
      (r.mood_tags || []).map(t => lbl(surveyOptions.moods, t)).join(', '),
      r.generated_summary ?? '',
      r.custom_note ?? '',
      lbl(surveyOptions.dashboards, r.dashboard_key),
      lbl(surveyOptions.feedbackTypes, r.feedback_type),
      lbl(surveyOptions.ease, r.ease_rating),
      lbl(surveyOptions.speed, r.speed_rating),
      lbl(surveyOptions.usefulness, r.usefulness_rating),
      r.problem_text ?? '',
      r.fix_request_text ?? '',
      r.feature_request_text ?? '',
      r.extra_text ?? '',
      r.language,
      new Date(r.created_at).toISOString()
    ].map(esc).join(',');
  });
  const csv = [headers.map(esc).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Realtime: refresh when responses/recipients/campaign change ────────────
// Dedicated channel (not the shared app channel) so a binding error can never
// affect the rest of the app's realtime.
const refresh = debounceRealtime(() => { void store.refreshAdmin(); }, 500);
let adminChannel: ReturnType<typeof supabase.channel> | null = null;

onMounted(() => {
  void data.fetchMembers();
  void store.refreshAdmin();
  if (supabaseConfigured) {
    adminChannel = supabase
      .channel('survey-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_responses' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_recipients' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_campaigns' }, () => refresh())
      .subscribe();
  }
});

onBeforeUnmount(() => {
  if (adminChannel) {
    void supabase.removeChannel(adminChannel);
    adminChannel = null;
  }
});
</script>

<style scoped>
.survey-switch { display: inline-flex; align-items: center; cursor: pointer; }
.survey-switch input { display: none; }
.survey-switch-track {
  position: relative; width: 2.4rem; height: 1.35rem; border-radius: 9999px;
  background: var(--border); transition: background 0.18s ease;
}
.survey-switch-thumb {
  position: absolute; top: 2px; left: 2px; width: 1.05rem; height: 1.05rem; border-radius: 9999px;
  background: var(--card-elevated-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform 0.18s ease;
}
.survey-switch input:checked + .survey-switch-track { background: var(--primary, #15D6C2); }
.survey-switch input:checked + .survey-switch-track .survey-switch-thumb { transform: translateX(1.05rem); }

.survey-aud-chip {
  border: 1px solid var(--border); background: transparent; color: var(--text-main);
  font-size: 0.78rem; font-weight: 500; padding: 0.35rem 0.7rem; border-radius: 0.5rem; cursor: pointer;
}
.survey-aud-chip.is-active { background: var(--primary, #15D6C2); border-color: var(--primary, #15D6C2); color: #04201d; font-weight: 700; }

.survey-aud-note { font-size: 0.78rem; font-weight: 600; }
.survey-aud-note.is-ok { color: var(--primary, #15D6C2); }
.survey-aud-note.is-no { color: var(--text-muted); }

.survey-check { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--text-muted); cursor: pointer; }

.survey-test-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.05rem 0.35rem;
  border-radius: 0.35rem;
  background: rgba(245, 158, 11, 0.18);
  color: #92400e;
  vertical-align: middle;
}
:root[data-theme='dark-gray'] .survey-test-badge { color: #fbbf24; }

.survey-stat { border: 1px solid var(--border); border-radius: 0.7rem; padding: 0.75rem 0.9rem; background: var(--soft-bg, transparent); }
.survey-stat-num { font-size: 1.3rem; font-weight: 800; color: var(--text-main); line-height: 1.1; }
.survey-stat-lbl { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem; }

.survey-tabs { display: inline-flex; gap: 0.25rem; }
.survey-tab { border: 1px solid var(--border); background: transparent; color: var(--text-muted); font-size: 0.78rem; font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 0.5rem; cursor: pointer; }
.survey-tab.is-active { background: var(--primary, #15D6C2); border-color: var(--primary, #15D6C2); color: #04201d; }

.survey-filter { height: 2.25rem; font-size: 0.8rem; max-width: 12rem; }

.survey-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.survey-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
.survey-table td { padding: 0.55rem 0.6rem; border-bottom: 1px solid var(--border); color: var(--text-main); vertical-align: middle; }
.survey-role { display: inline-block; font-size: 0.68rem; font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 9999px; }
.survey-status { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 9999px; text-transform: capitalize; background: var(--soft-bg); color: var(--text-muted); }
.survey-status--submitted { background: rgba(21,214,194,0.15); color: var(--primary, #15D6C2); }
.survey-status--skipped { background: rgba(245,158,11,0.15); color: #b45309; }
.survey-status--draft { background: rgba(168,85,247,0.15); color: #a855f7; }

.survey-kv-l { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.survey-kv-v { font-size: 0.85rem; font-weight: 600; color: var(--text-main); }
.survey-kv-text { font-size: 0.85rem; color: var(--text-main); white-space: pre-wrap; line-height: 1.5; margin-top: 0.15rem; }
</style>
