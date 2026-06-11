<template>
  <div class="task-alerts-page">
    <PageHeader title="Task Alerts & Notifications" subtitle="Create and push targeted task alerts to specific team members and track acknowledgements.">
      <template #actions>
        <button class="btn-primary" type="button" @click="activeTab = 'create'">
          Create Alert
        </button>
      </template>
    </PageHeader>

    <div class="tabs-row mb-5">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'create' }"
        @click="activeTab = 'create'"
      >
        Create Task Alert
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'list' }"
        @click="activeTab = 'list'"
      >
        Published Alerts & Tracking
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'drafts' }"
        @click="activeTab = 'drafts'"
      >
        Drafts
      </button>
    </div>

    <!-- CREATE ALERT TAB -->
    <div v-if="activeTab === 'create'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 card p-6">
        <h3 class="section-title mb-4">New Task Alert Form</h3>
        
        <form @submit.prevent="saveAlert(true)" class="flex flex-col gap-4">
          <!-- Alert Source selector -->
          <div class="grid grid-cols-1 gap-4">
            <div class="form-group">
              <label class="label mb-1 font-semibold text-xs text-text-muted">ALERT SOURCE <span class="text-status-needs-fix-fg">*</span></label>
              <select v-model="alertSource" class="input" @change="onAlertSourceChange" required>
                <option value="custom">Custom Alert</option>
                <option value="workboard">Workboard Task</option>
                <option value="quality_check">Quality Check Task</option>
              </select>
            </div>
          </div>

          <div v-if="alertSource === 'workboard'" class="form-group">
            <label class="label mb-1 font-semibold text-xs text-text-muted">SELECT WORKBOARD CARD <span class="text-status-needs-fix-fg">*</span></label>
            <select v-model="selectedWorkboardCardId" class="input" required>
              <option :value="null">-- Select a Card --</option>
              <option v-for="card in activeWorkboardCards" :key="card.id" :value="card.id">
                {{ getCardLabel(card) }}
              </option>
            </select>
          </div>

          <div v-if="alertSource === 'quality_check'" class="form-group">
            <label class="label mb-1 font-semibold text-xs text-text-muted">SELECT QUALITY CHECK CARD <span class="text-status-needs-fix-fg">*</span></label>
            <select v-model="selectedQualityIssueId" class="input" required>
              <option :value="null">-- Select an Issue --</option>
              <option v-for="issue in activeQualityIssues" :key="issue.id" :value="issue.id">
                {{ issue.title }} ({{ websiteName(issue.websiteId) }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="label mb-1 font-semibold text-xs text-text-muted">ALERT ID (Unique ID) <span class="text-status-needs-fix-fg">*</span></label>
              <input v-model="form.alertId" class="input" placeholder="e.g. quality-check-homepage-v1" required />
            </div>

            <div class="form-group">
              <label class="label mb-1 font-semibold text-xs text-text-muted">ALERT TYPE <span class="text-status-needs-fix-fg">*</span></label>
              <select v-model="form.alertType" class="input" required>
                <option value="New Task">New Task</option>
                <option value="Quality Check">Quality Check</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Urgent Fix">Urgent Fix</option>
                <option value="Reminder">Reminder</option>
                <option value="Website Review">Website Review</option>
                <option value="Deadline Alert">Deadline Alert</option>
              </select>
            </div>
          </div>

          <div v-if="alertSource === 'custom'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="label mb-1 font-semibold text-xs text-text-muted">PRIORITY <span class="text-status-needs-fix-fg">*</span></label>
              <select v-model="form.priority" class="input" required>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div class="form-group">
              <label class="label mb-1 font-semibold text-xs text-text-muted">RELATED ITEM LINK (OPTIONAL)</label>
              <div class="flex gap-2">
                <select v-model="form.relatedType" class="input w-1/3">
                  <option :value="null">None</option>
                  <option value="workboard_task">Task</option>
                  <option value="quality_check_item">Quality Issue</option>
                  <option value="followup_item">Follow Up</option>
                </select>
                <select v-model="form.relatedId" class="input flex-1" :disabled="!form.relatedType">
                  <option :value="null">— Select Item —</option>
                  <option v-for="item in relatedOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="alertSource === 'custom'" class="form-group">
            <label class="label mb-1 font-semibold text-xs text-text-muted">TITLE <span class="text-status-needs-fix-fg">*</span></label>
            <input v-model="form.title" class="input" placeholder="e.g. QUALITY ISSUE FOUND ON PRODUCT PAGE" required />
          </div>

          <div class="form-group">
            <label class="label mb-1 font-semibold text-xs text-text-muted">MESSAGE <span class="text-status-needs-fix-fg">*</span></label>
            <textarea v-model="form.message" class="input min-h-[100px]" placeholder="Provide task context, page issues or fix instructions..." required />
          </div>

          <!-- RECIPIENT SELECTION -->
          <div v-if="alertSource === 'custom'" class="form-group border-t border-border/60 pt-4 mt-2">
            <label class="label mb-2 font-bold text-xs text-text-main flex justify-between items-center">
              <span>TARGET RECIPIENTS (Total selected: <strong class="text-primary">{{ selectedRecipients.length }}</strong>)</span>
              <span class="text-text-muted text-[11px] font-normal">Choose specific members, department or leads</span>
            </label>

            <!-- Quick Selection Filters -->
            <div class="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                v-for="dept in departments"
                :key="dept"
                class="btn-filter-tag"
                @click="selectEntireDepartment(dept)"
              >
                + Entire {{ deptLabel(dept) }}
              </button>
              <button
                type="button"
                v-for="dept in departments"
                :key="`leads:${dept}`"
                class="btn-filter-tag btn-filter-tag--leads"
                @click="selectTeamLeadsOnly(dept)"
              >
                + {{ deptLabel(dept) }} Leads
              </button>
              <button type="button" class="btn-filter-clear ml-auto" @click="selectedRecipients = []">
                Clear All
              </button>
            </div>

            <!-- Member Grid -->
            <div class="recipient-grid border border-border/80 rounded-xl p-3 max-h-[160px] overflow-y-auto">
              <label
                v-for="m in activeMembers"
                :key="m.id"
                class="recipient-checkbox-row"
                :class="{ 'recipient-checkbox-row--selected': selectedRecipients.includes(m.id) }"
              >
                <input
                  type="checkbox"
                  :value="m.id"
                  v-model="selectedRecipients"
                  class="checkbox-input"
                />
                <span class="recipient-avatar">
                  <img v-if="m.avatarUrl" :src="m.avatarUrl" :alt="m.fullName" />
                  <span v-else>{{ initials(m.fullName) }}</span>
                </span>
                <div class="recipient-info">
                  <strong class="recipient-name">{{ m.fullName }}</strong>
                  <span class="recipient-dept-role">{{ deptLabel(m.department) }} · {{ m.position || m.role }}</span>
                </div>
              </label>
            </div>
          </div>

          <div v-if="alertError" class="text-status-needs-fix-fg text-sm font-semibold mt-2">
            {{ alertError }}
          </div>

          <div class="flex items-center gap-3 mt-4 border-t border-border/60 pt-4">
            <button
              type="button"
              class="btn-secondary px-5"
              @click="togglePreview = !togglePreview"
            >
              {{ togglePreview ? 'Hide Preview' : 'Preview Banner' }}
            </button>
            <button
              type="button"
              class="btn-secondary px-5 ml-auto"
              :disabled="saving"
              @click="saveAlert(false)"
            >
              Save Draft
            </button>
            <button
              type="submit"
              class="btn-primary px-6"
              :disabled="saving"
            >
              {{ saving ? 'Publishing...' : 'Publish Alert' }}
            </button>
          </div>
        </form>
      </div>

      <!-- PREVIEW PANEL -->
      <div class="card p-6 flex flex-col justify-between" :class="{ 'opacity-50': !togglePreview }">
        <div>
          <h3 class="section-title mb-1.5">Live Preview</h3>
          <p class="text-xs text-text-muted mb-4">Exactly how the employee will see the alert popup upon logging in.</p>
        </div>

        <div class="preview-banner-container border border-dashed border-border/80 rounded-2xl p-6 bg-soft/10 flex items-center justify-center min-h-[300px]">
          <div v-if="togglePreview" class="preview-modal" :class="`preview-modal--priority-${form.priority.toLowerCase()}`">
            <div class="preview-glow" />
            <div class="preview-header">
              <div class="preview-icon-wrap" :class="`preview-icon-wrap--${form.priority.toLowerCase()}`">
                <svg v-if="form.priority === 'Critical' || form.priority === 'High'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m12 5 .01-.011M12 9v4"/><circle cx="12" cy="12" r="10"/><path d="M12 17h.01"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <div>
                <div class="preview-badge" :class="`preview-badge--${form.priority.toLowerCase()}`">
                  {{ form.priority }} Priority Alert
                </div>
                <span class="preview-type">{{ form.alertType }}</span>
              </div>
            </div>
            <div class="preview-content">
              <h4 class="preview-title">{{ form.title || 'ALERT TITLE HERE' }}</h4>
              <p class="preview-message">{{ form.message || 'Write a message to see description preview...' }}</p>
            </div>
            <div class="preview-footer-info">
              <span class="preview-author">Assigned by <strong>{{ auth.profile?.fullName || 'Admin' }}</strong></span>
              <span class="preview-date">Today</span>
            </div>
            <div class="preview-actions">
              <button v-if="form.relatedType" class="preview-btn-open" :class="`preview-btn-open--${form.priority.toLowerCase()}`" type="button">Open Task</button>
              <button class="preview-btn-gotit" type="button">Got It</button>
            </div>
          </div>
          <span v-else class="text-xs text-text-muted">Click 'Preview Banner' to visualize overlay.</span>
        </div>
      </div>
    </div>

    <!-- PUBLISHED LIST & TRACKING TAB -->
    <div v-if="activeTab === 'list'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Alerts Sidebar List -->
      <div class="card p-4 flex flex-col gap-3 h-[600px]">
        <h3 class="section-title">Active Alerts</h3>
        <div class="alerts-list overflow-y-auto flex-1 flex flex-col gap-2">
          <button
            v-for="alert in publishedAlerts"
            :key="alert.id"
            class="alert-list-card"
            :class="{ 'alert-list-card--active': selectedAlert?.id === alert.id }"
            @click="selectAlertForTracking(alert)"
          >
            <div class="flex justify-between items-center mb-1">
              <span class="text-[10px] uppercase font-bold text-text-muted">{{ alert.alertType }}</span>
              <span class="badge" :class="`badge--${alert.priority.toLowerCase()}`">{{ alert.priority }}</span>
            </div>
            <h4 class="alert-card-title truncate">{{ alert.title }}</h4>
            <div class="text-[11px] text-text-muted mt-1">
              Pushed: {{ formattedDate(alert.publishedAt || alert.createdAt) }}
            </div>
          </button>
          <div v-if="publishedAlerts.length === 0" class="text-center text-text-muted text-sm py-10">
            No published alerts yet.
          </div>
        </div>
      </div>

      <!-- Receipts Tracking & Delivery Status -->
      <div class="lg:col-span-2 card p-6 flex flex-col gap-4 h-[600px]">
        <template v-if="selectedAlert">
          <div class="flex justify-between items-start border-b border-border/60 pb-3">
            <div>
              <h3 class="section-title text-base">{{ selectedAlert.title }}</h3>
              <p class="text-xs text-text-muted mt-1">{{ selectedAlert.message }}</p>
            </div>
            <div class="flex gap-2">
              <button class="btn-secondary h-9 text-xs px-3" type="button" @click="repushAlertFlow(null)">
                Repush All Pending
              </button>
            </div>
          </div>

          <!-- Stats Bar -->
          <div class="grid grid-cols-3 gap-4">
            <div class="metric-box bg-soft/40">
              <span class="metric-label">Total Recipients</span>
              <strong class="metric-value">{{ receipts.length }}</strong>
            </div>
            <div class="metric-box bg-status-approved-bg/10 border-status-approved-bg/25">
              <span class="metric-label text-status-approved-fg">Acknowledged</span>
              <strong class="metric-value text-status-approved-fg">{{ acknowledgedReceipts.length }}</strong>
            </div>
            <div class="metric-box bg-status-needs-fix-bg/10 border-status-needs-fix-bg/25">
              <span class="metric-label text-status-needs-fix-fg">Pending</span>
              <strong class="metric-value text-status-needs-fix-fg">{{ pendingReceipts.length }}</strong>
            </div>
          </div>

          <!-- Detailed User Lists -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <!-- Acknowledged Column -->
            <div class="flex flex-col min-h-0">
              <h4 class="section-title text-xs text-status-approved-fg mb-2">Acknowledged ({{ acknowledgedReceipts.length }})</h4>
              <div class="table-container flex-1 overflow-y-auto border border-border/60 rounded-xl">
                <div v-for="r in acknowledgedReceipts" :key="r.id" class="receipt-row">
                  <div class="flex items-center gap-2">
                    <span class="avatar-sm flex-shrink-0">
                      <span v-if="memberName(r.userId)">{{ initials(memberName(r.userId)) }}</span>
                    </span>
                    <div>
                      <strong class="text-xs block text-text-main">{{ memberName(r.userId) }}</strong>
                      <span class="text-[10px] text-text-muted">Got It</span>
                    </div>
                  </div>
                  <div class="text-right text-[10px] text-text-muted">
                    {{ formattedDate(r.acknowledgedAt) }}
                  </div>
                </div>
                <div v-if="acknowledgedReceipts.length === 0" class="text-center text-text-muted text-xs py-8">
                  No acknowledgements yet.
                </div>
              </div>
            </div>

            <!-- Pending Column -->
            <div class="flex flex-col min-h-0">
              <h4 class="section-title text-xs text-status-needs-fix-fg mb-2">Pending / Escalated ({{ pendingReceipts.length }})</h4>
              <div class="table-container flex-1 overflow-y-auto border border-border/60 rounded-xl">
                <div v-for="r in pendingReceipts" :key="r.id" class="receipt-row flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <span class="avatar-sm flex-shrink-0">
                      <span v-if="memberName(r.userId)">{{ initials(memberName(r.userId)) }}</span>
                    </span>
                    <div>
                      <strong class="text-xs block text-text-main">{{ memberName(r.userId) }}</strong>
                      <span class="text-[10px] text-status-needs-fix-fg">Not Acknowledged</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="r.escalationLevel > 0" class="badge badge--critical text-[9px] px-1 py-0.5">
                      Escalated L{{ r.escalationLevel }}
                    </span>
                    <button class="btn-repush-single" title="Repush to user" @click="repushAlertFlow(r.userId)">
                      Repush
                    </button>
                  </div>
                </div>
                <div v-if="pendingReceipts.length === 0" class="text-center text-text-muted text-xs py-8">
                  All users acknowledged.
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-center text-text-muted text-sm py-20 flex-1 flex items-center justify-center">
          Select an active task alert from the sidebar to track its receipts and delivery status.
        </div>
      </div>
    </div>

    <!-- DRAFTS TAB -->
    <div v-if="activeTab === 'drafts'" class="card p-6">
      <h3 class="section-title mb-4">Saved Draft Alerts</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="draft in draftAlerts" :key="draft.id" class="card p-4 flex flex-col gap-3 justify-between border-border/80">
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-[10px] uppercase font-bold text-text-muted">{{ draft.alertType }}</span>
              <span class="badge" :class="`badge--${draft.priority.toLowerCase()}`">{{ draft.priority }}</span>
            </div>
            <h4 class="alert-card-title truncate text-sm">{{ draft.title }}</h4>
            <p class="text-xs text-text-muted line-clamp-2 mt-1">{{ draft.message }}</p>
          </div>
          <div class="flex items-center justify-between border-t border-border/60 pt-3 mt-2">
            <span class="text-[10px] text-text-muted">Saved: {{ formattedDate(draft.createdAt) }}</span>
            <div class="flex gap-2">
              <button class="btn-secondary h-8 px-3 text-xs" type="button" @click="editDraft(draft)">
                Edit / Publish
              </button>
            </div>
          </div>
        </div>
        <div v-if="draftAlerts.length === 0" class="text-center text-text-muted text-sm py-10 w-full col-span-full">
          No saved draft alerts.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useTaskAlertsStore, type TaskAlert, type TaskAlertReceipt } from '@/stores/taskAlerts';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useQualityCheckStore } from '@/stores/qualityCheck';

const store = useTaskAlertsStore();
const auth = useAuthStore();
const data = useDataStore();
const qc = useQualityCheckStore();

const activeTab = ref<'create' | 'list' | 'drafts'>('create');
const togglePreview = ref(true);
const saving = ref(false);
const alertError = ref('');

const selectedRecipients = ref<string[]>([]);
const selectedAlert = ref<TaskAlert | null>(null);
const receipts = ref<TaskAlertReceipt[]>([]);

const alertSource = ref<'custom' | 'workboard' | 'quality_check'>('custom');
const selectedWorkboardCardId = ref<string | null>(null);
const selectedQualityIssueId = ref<string | null>(null);

const activeWorkboardCards = computed(() =>
  data.assignments.filter((a) => a.isArchived !== true && a.status !== 'approved')
);

const activeQualityIssues = computed(() =>
  qc.issues.filter((i) => i.isArchived !== true && !['closed', 'approved'].includes(i.status))
);

const getCardLabel = (card: any) => {
  const prompt = data.promptById(card.promptId);
  const title = card.filledValues?.__board_title || prompt?.title || 'Untitled Task';
  const member = data.memberById(card.assignedMemberId);
  const assignee = member ? `(Assigned: ${member.fullName || member.email})` : '(Unassigned)';
  return `${title} ${assignee}`;
};

const websiteName = (id: string) => {
  return data.websites.find((w) => w.id === id)?.name || 'Unknown Website';
};

const onAlertSourceChange = () => {
  selectedWorkboardCardId.value = null;
  selectedQualityIssueId.value = null;
  selectedRecipients.value = [];
  form.title = '';
  form.message = '';
  form.relatedType = null;
  form.relatedId = null;
};

watch(selectedWorkboardCardId, (cardId) => {
  if (!cardId) return;
  const card = data.assignments.find((a) => a.id === cardId);
  if (!card) return;
  const prompt = data.promptById(card.promptId);
  const title = card.filledValues?.__board_title || prompt?.title || 'Untitled Task';
  const desc = card.filledValues?.__board_description || card.filledValues?.__board_short_description || prompt?.shortDescription || '';
  
  form.alertId = `wb-task-${card.id.slice(0, 8)}`;
  form.alertType = 'New Task';
  form.priority = card.priority ? (card.priority.charAt(0).toUpperCase() + card.priority.slice(1)) as any : 'High';
  form.title = title;
  form.message = desc;
  form.relatedType = 'workboard_task';
  form.relatedId = card.id;

  if (card.assignedMemberId) {
    selectedRecipients.value = [card.assignedMemberId];
  } else {
    selectedRecipients.value = [];
  }
});

watch(selectedQualityIssueId, (issueId) => {
  if (!issueId) return;
  const issue = qc.issues.find((i) => i.id === issueId);
  if (!issue) return;

  form.alertId = `qc-task-${issue.id.slice(0, 8)}`;
  form.alertType = 'Quality Check';
  
  let mappedPriority: any = 'High';
  if (issue.priority === 'urgent') mappedPriority = 'Critical';
  else if (issue.priority === 'high') mappedPriority = 'High';
  else if (issue.priority === 'normal') mappedPriority = 'Medium';
  else if (issue.priority === 'low') mappedPriority = 'Low';

  form.priority = mappedPriority;
  form.title = issue.title;
  form.message = issue.description || '';
  form.relatedType = 'quality_check_item';
  form.relatedId = issue.id;

  if (issue.assignedTo) {
    selectedRecipients.value = [issue.assignedTo];
  } else {
    selectedRecipients.value = [];
  }
});

const form = reactive({
  id: undefined as string | undefined,
  alertId: '',
  alertType: 'New Task' as TaskAlert['alertType'],
  priority: 'High' as TaskAlert['priority'],
  title: '',
  message: '',
  relatedType: null as TaskAlert['relatedType'],
  relatedId: null as TaskAlert['relatedId'],
});

const departments = ['website_team', 'seo_team', 'marketing', 'tester'];

const activeMembers = computed(() =>
  data.members.filter((m) => m.status === 'active' && m.role !== 'admin' && m.role !== 'owner')
);

const publishedAlerts = computed(() => store.alerts.filter((a) => a.status === 'published'));
const draftAlerts = computed(() => store.alerts.filter((a) => a.status === 'draft'));

const acknowledgedReceipts = computed(() => receipts.value.filter((r) => r.status === 'acknowledged'));
const pendingReceipts = computed(() => receipts.value.filter((r) => r.status === 'pending'));

// Generate related options based on selection type
const relatedOptions = computed(() => {
  if (form.relatedType === 'workboard_task') {
    return data.assignments.map((a) => ({
      value: a.id,
      label: `${memberName(a.assignedMemberId)}: ${data.promptById(a.promptId)?.title || 'Task'}`,
    }));
  }
  if (form.relatedType === 'quality_check_item') {
    return qc.issues.map((i) => ({
      value: i.id,
      label: `QC: ${i.title}`,
    }));
  }
  return [];
});

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const deptLabel = (dept?: string) => {
  if (!dept) return 'Other';
  if (dept === 'website_team') return 'Web Team';
  if (dept === 'seo_team') return 'SEO Team';
  return dept.charAt(0).toUpperCase() + dept.slice(1);
};

const memberName = (id: string | null) => {
  if (!id) return 'Unknown';
  return data.memberById(id)?.fullName || 'Team member';
};

const formattedDate = (dStr?: string | null) => {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

// Selection helpers
const selectEntireDepartment = (dept: string) => {
  const ids = activeMembers.value.filter((m) => m.department === dept).map((m) => m.id);
  // Add without duplicates
  selectedRecipients.value = Array.from(new Set([...selectedRecipients.value, ...ids]));
};

const selectTeamLeadsOnly = (dept: string) => {
  const ids = activeMembers.value
    .filter((m) => m.department === dept && (m.role === 'head' || m.role === 'supervisor'))
    .map((m) => m.id);
  selectedRecipients.value = Array.from(new Set([...selectedRecipients.value, ...ids]));
};

// Save draft or publish alert
const saveAlert = async (isPublish: boolean) => {
  alertError.value = '';
  if (!form.alertId.trim()) { alertError.value = 'Alert ID is required.'; return; }
  if (!form.title.trim()) { alertError.value = 'Title is required.'; return; }
  if (!form.message.trim()) { alertError.value = 'Message is required.'; return; }
  if (selectedRecipients.value.length === 0) {
    if (alertSource.value !== 'custom') {
      alertError.value = 'This card is unassigned. Please assign it to someone first.';
    } else {
      alertError.value = 'Please select at least one recipient.';
    }
    return;
  }

  saving.value = true;
  try {
    const payload = {
      id: form.id,
      alertId: form.alertId,
      alertType: form.alertType,
      priority: form.priority,
      title: form.title,
      message: form.message,
      relatedType: form.relatedType,
      relatedId: form.relatedId,
      status: (isPublish ? 'published' : 'draft') as TaskAlert['status'],
    };

    const res = await store.createOrUpdateAlert(payload, selectedRecipients.value);
    if (res) {
      // Clear form on success
      Object.assign(form, {
        id: undefined,
        alertId: '',
        alertType: 'New Task',
        priority: 'High',
        title: '',
        message: '',
        relatedType: null,
        relatedId: null,
      });
      selectedRecipients.value = [];
      alertSource.value = 'custom';
      selectedWorkboardCardId.value = null;
      selectedQualityIssueId.value = null;
      activeTab.value = isPublish ? 'list' : 'drafts';
      if (isPublish) {
        selectedAlert.value = res;
        await loadReceipts(res.id);
      }
    }
  } catch (err: any) {
    alertError.value = err.message || 'Action failed.';
  } finally {
    saving.value = false;
  }
};

const loadReceipts = async (alertId: string) => {
  receipts.value = await store.fetchReceipts(alertId);
};

const selectAlertForTracking = async (alert: TaskAlert) => {
  selectedAlert.value = alert;
  await loadReceipts(alert.id);
};

const repushAlertFlow = async (targetUserId: string | null) => {
  if (!selectedAlert.value) return;
  const ids = targetUserId ? [targetUserId] : undefined;
  const success = await store.repushAlert(selectedAlert.value.id, ids);
  if (success) {
    await loadReceipts(selectedAlert.value.id);
  }
};

const editDraft = (draft: TaskAlert) => {
  // Populate form with draft properties
  Object.assign(form, {
    id: draft.id,
    alertId: draft.alertId,
    alertType: draft.alertType,
    priority: draft.priority,
    title: draft.title,
    message: draft.message,
    relatedType: draft.relatedType,
    relatedId: draft.relatedId,
  });

  // Prefill recipients list from draft receipts
  void store.fetchReceipts(draft.id).then((recs) => {
    selectedRecipients.value = recs.map((r) => r.userId);
  });

  activeTab.value = 'create';
};

onMounted(async () => {
  await Promise.all([
    store.fetchAlerts(),
    data.fetchMembers(),
    data.fetchAssignments(),
    qc.fetchIssues(),
  ]);

  // If there is already a published alert, select the first one for tracking
  if (publishedAlerts.value.length > 0) {
    selectedAlert.value = publishedAlerts.value[0];
    await loadReceipts(selectedAlert.value.id);
  }
});
</script>

<style scoped>
.task-alerts-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tabs-row {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 2px;
}

.tab-btn {
  font-family: 'Outfit', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.6rem 1.25rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.label {
  display: block;
}

.input {
  width: 100%;
}

.btn-filter-tag {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-filter-tag:hover {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary);
}

.btn-filter-tag--leads {
  color: #c084fc;
}
.btn-filter-tag--leads:hover {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
  border-color: #c084fc;
}

.btn-filter-clear {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  border: none;
  background: transparent;
  cursor: pointer;
}
.btn-filter-clear:hover {
  color: var(--text-main);
  text-decoration: underline;
}

.recipient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.recipient-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s;
}

.recipient-checkbox-row:hover {
  border-color: var(--primary);
}

.recipient-checkbox-row--selected {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.checkbox-input {
  width: 14px;
  height: 14px;
  accent-color: var(--primary);
}

.recipient-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--soft-bg);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 850;
  overflow: hidden;
  border: 1px solid var(--border);
}
.recipient-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recipient-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recipient-name {
  font-size: 0.75rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recipient-dept-role {
  font-size: 0.65rem;
  color: var(--text-muted);
}

/* Preview Modal Mockup Styles */
.preview-modal {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.3);
  padding: 1.25rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.preview-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 4px 4px 0 0;
}
.preview-modal--priority-critical::before { background: #ef4444; }
.preview-modal--priority-high::before { background: #f97316; }
.preview-modal--priority-medium::before { background: #3b82f6; }
.preview-modal--priority-low::before { background: #10b981; }

.preview-glow {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 120px;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.1;
  pointer-events: none;
}
.preview-modal--priority-critical .preview-glow { background: #ef4444; }
.preview-modal--priority-high .preview-glow { background: #f97316; }
.preview-modal--priority-medium .preview-glow { background: #3b82f6; }
.preview-modal--priority-low .preview-glow { background: #10b981; }

.preview-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.preview-icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-icon-wrap--critical { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
.preview-icon-wrap--high { background: rgba(249, 115, 22, 0.15); color: #fdba74; }
.preview-icon-wrap--medium { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
.preview-icon-wrap--low { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }

.preview-badge {
  font-family: 'Outfit', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  width: max-content;
  line-height: 1;
}
.preview-badge--critical { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
.preview-badge--high { background: rgba(249, 115, 22, 0.15); color: #fdba74; }
.preview-badge--medium { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
.preview-badge--low { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }

.preview-type {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  margin-top: 0.15rem;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preview-title {
  font-size: 0.95rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.preview-message {
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.preview-footer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.55rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.preview-btn-gotit {
  font-size: 0.78rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
}

.preview-btn-open {
  font-size: 0.78rem;
  font-weight: 700;
  border: none;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  color: #ffffff;
}
.preview-btn-open--critical { background: #ef4444; }
.preview-btn-open--high { background: #f97316; }
.preview-btn-open--medium { background: #3b82f6; }
.preview-btn-open--low { background: #10b981; }

/* Alert list sidebar cards */
.alert-list-card {
  width: 100%;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.alert-list-card:hover {
  border-color: var(--primary);
}

.alert-list-card--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.alert-card-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.badge {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  line-height: 1;
}

.badge--critical { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
.badge--high { background: rgba(249, 115, 22, 0.15); color: #fdba74; }
.badge--medium { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
.badge--low { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }

/* Receipts layout */
.metric-box {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.metric-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--text-main);
  margin-top: 0.15rem;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: var(--card-bg);
}
.receipt-row:last-child {
  border-bottom: none;
}

.btn-repush-single {
  font-family: 'Outfit', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  border: 1px solid var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-repush-single:hover {
  background: var(--primary);
  color: white;
}
</style>
