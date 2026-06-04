<template>
  <div class="qcd-page">
    <section class="qcd-welcome card card-pad">
      <div>
        <h1>Quality Checker Dashboard</h1>
        <p>Review assigned websites, report issues, and track website quality problems.</p>
      </div>
      <RouterLink class="btn-primary" to="/quality-check">
        Open Quality Check
      </RouterLink>
    </section>

    <LoadingBlock
      :loading="loading"
      :error="error"
      :retry="loadDashboard"
    >
      <section class="qcd-summary" aria-label="Quality check summary">
        <article v-for="card in summaryCards" :key="card.label" class="qcd-summary-card card card-pad">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </article>
      </section>

      <section class="qcd-actions card card-pad">
        <RouterLink class="btn-primary" to="/quality-check">
          Open Quality Check
        </RouterLink>
        <RouterLink class="btn-secondary" to="/quality-check">
          Report New Issue
        </RouterLink>
        <button class="btn-secondary" type="button" @click="scrollToReports">
          View My Reported Issues
        </button>
      </section>

      <section class="qcd-section">
        <div class="qcd-section-head">
          <h2>Need Fixed</h2>
        </div>

        <div v-if="needsFixIssues.length" class="qcd-issue-list">
          <article v-for="issue in needsFixIssues" :key="issue.id" class="qcd-issue-card card">
            <img
              v-if="issue.screenshotUrl"
              class="qcd-thumb"
              :src="issue.screenshotUrl"
              :alt="issue.title"
              loading="lazy"
            />
            <div class="qcd-issue-body">
              <div class="qcd-issue-top">
                <div>
                  <span class="qcd-site-name">{{ websiteName(issue.websiteId) }}</span>
                  <h3>{{ issue.title }}</h3>
                </div>
                <span class="qcd-status" :class="`qcd-status--${issue.status}`">{{ statusLabel(issue.status) }}</span>
              </div>
              <p>{{ issue.description || 'No description added.' }}</p>
              <div class="qcd-card-actions">
                <a
                  v-if="issue.pageUrl"
                  class="btn-secondary qcd-link-btn"
                  :href="normalizeUrl(issue.pageUrl)"
                  target="_blank"
                  rel="noopener"
                >
                  Page URL
                </a>
                <RouterLink class="btn-primary qcd-link-btn" :to="qualityIssueLink(issue)">
                  Open Issue
                </RouterLink>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="No issues need fixing yet."
          description="Open quality issues that still need work will appear here."
        />
      </section>

      <section class="qcd-section">
        <div class="qcd-section-head">
          <h2>Managed Websites</h2>
        </div>

        <div v-if="reviewWebsites.length" class="qcd-websites">
          <article v-for="website in reviewWebsites" :key="website.id" class="qcd-website-card card card-pad">
            <div class="qcd-website-main">
              <img
                v-if="website.faviconUrl"
                class="qcd-favicon"
                :src="website.faviconUrl"
                :alt="website.name"
                loading="lazy"
              />
              <span v-else class="qcd-favicon qcd-favicon-fallback">{{ websiteInitials(website) }}</span>
              <div>
                <h3>{{ website.name || website.domain || 'Untitled website' }}</h3>
                <p>{{ website.domain || 'No domain saved' }}</p>
              </div>
            </div>
            <div class="qcd-website-meta">
              <span>{{ className(website.qualityClassId) }}</span>
              <strong>{{ openIssueCount(website.id) }} open</strong>
            </div>
            <RouterLink class="btn-secondary qcd-open-board" :to="`/quality-check/${website.id}`">
              Open Board
            </RouterLink>
          </article>
        </div>

        <EmptyState
          v-else
          title="No websites assigned for review yet."
          description="Websites assigned to your Quality Checker account will appear here."
        />
      </section>

      <section class="qcd-section">
        <div class="qcd-section-head">
          <h2>Recently Approved</h2>
        </div>

        <div v-if="recentlyApprovedIssues.length" class="qcd-issue-list">
          <article v-for="issue in recentlyApprovedIssues" :key="issue.id" class="qcd-issue-card card">
            <img
              v-if="issue.screenshotUrl"
              class="qcd-thumb"
              :src="issue.screenshotUrl"
              :alt="issue.title"
              loading="lazy"
            />
            <div class="qcd-issue-body">
              <div class="qcd-issue-top">
                <div>
                  <span class="qcd-site-name">{{ websiteName(issue.websiteId) }}</span>
                  <h3>{{ issue.title }}</h3>
                </div>
                <span class="qcd-status" :class="`qcd-status--${issue.status}`">{{ statusLabel(issue.status) }}</span>
              </div>
              <p>{{ issue.description || 'No description added.' }}</p>
              <div class="qcd-card-actions">
                <a
                  v-if="issue.pageUrl"
                  class="btn-secondary qcd-link-btn"
                  :href="normalizeUrl(issue.pageUrl)"
                  target="_blank"
                  rel="noopener"
                >
                  Page URL
                </a>
                <RouterLink class="btn-primary qcd-link-btn" :to="qualityIssueLink(issue)">
                  Open Issue
                </RouterLink>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="No approved issues yet."
          description="Approved quality fixes will appear here."
        />
      </section>

      <section ref="reportsRef" class="qcd-section">
        <div class="qcd-section-head">
          <h2>Recent Reports</h2>
        </div>

        <div v-if="reportedIssues.length" class="qcd-report-list card">
          <button
            v-for="issue in reportedIssues"
            :key="issue.id"
            class="qcd-report-row"
            type="button"
            @click="openIssue(issue)"
          >
            <span>{{ issue.title }}</span>
            <span>{{ websiteName(issue.websiteId) }}</span>
            <span class="qcd-status" :class="`qcd-status--${issue.status}`">{{ statusLabel(issue.status) }}</span>
            <time>{{ formatDate(issue.createdAt) }}</time>
          </button>
        </div>

        <EmptyState
          v-else
          title="No reports created yet."
          description="Issues you report from Quality Check will appear here."
        />
      </section>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import type { QualityIssue, QualityIssueStatus } from '@/stores/qualityCheck';

interface DashboardWebsite {
  id: string;
  name: string;
  domain: string;
  faviconUrl: string;
  qualityClassId: string | null;
}

interface DashboardClass {
  id: string;
  name: string;
}

interface QualityCheckerAssignment {
  id: string;
  userId: string;
  scopeKind: 'class' | 'website';
  scopeId: string;
}

type IssueRow = {
  id: string;
  website_id: string;
  title: string;
  description: string;
  page_url: string;
  issue_type: QualityIssue['issueType'];
  priority: QualityIssue['priority'];
  status: QualityIssueStatus;
  assigned_to: string | null;
  screenshot_url: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
};

const auth = useAuthStore();
const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const issues = ref<QualityIssue[]>([]);
const websites = ref<DashboardWebsite[]>([]);
const classes = ref<DashboardClass[]>([]);
const assignments = ref<QualityCheckerAssignment[]>([]);
const reportsRef = ref<HTMLElement | null>(null);

const rowToIssue = (row: IssueRow): QualityIssue => ({
  id: row.id,
  websiteId: row.website_id,
  title: row.title,
  description: row.description ?? '',
  pageUrl: row.page_url ?? '',
  issueType: row.issue_type,
  priority: row.priority,
  status: row.status,
  assignedTo: row.assigned_to,
  screenshotUrl: row.screenshot_url,
  dueDate: row.due_date,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
});

const mergeById = <T extends { id: string }>(items: T[]) =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

const fetchAssignedWebsites = async (websiteIds: string[], classIds: string[]) => {
  const batches: DashboardWebsite[] = [];

  if (websiteIds.length) {
    const { data, error: websitesError } = await supabase
      .from('websites')
      .select('id,name,domain,favicon_url,quality_class_id')
      .in('id', websiteIds);

    if (websitesError) throw websitesError;
    batches.push(
      ...((data ?? []).map((row) => ({
        id: row.id,
        name: row.name ?? '',
        domain: row.domain ?? '',
        faviconUrl: row.favicon_url ?? '',
        qualityClassId: row.quality_class_id ?? null,
      })) as DashboardWebsite[])
    );
  }

  if (classIds.length) {
    const { data, error: websitesError } = await supabase
      .from('websites')
      .select('id,name,domain,favicon_url,quality_class_id')
      .in('quality_class_id', classIds);

    if (websitesError) throw websitesError;
    batches.push(
      ...((data ?? []).map((row) => ({
        id: row.id,
        name: row.name ?? '',
        domain: row.domain ?? '',
        faviconUrl: row.favicon_url ?? '',
        qualityClassId: row.quality_class_id ?? null,
      })) as DashboardWebsite[])
    );
  }

  return mergeById(batches);
};

const fetchIssuesForDashboard = async (uid: string, websiteIds: string[]) => {
  const batches: QualityIssue[] = [];

  const { data: ownRows, error: ownError } = await supabase
    .from('quality_issues')
    .select('id,website_id,title,description,page_url,issue_type,priority,status,assigned_to,screenshot_url,due_date,created_by,created_at,updated_at,approved_by,approved_at')
    .or(`assigned_to.eq.${uid},created_by.eq.${uid}`)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (ownError) throw ownError;
  batches.push(...((ownRows ?? []).map((row) => rowToIssue(row as IssueRow))));

  if (websiteIds.length) {
    const { data: websiteRows, error: websiteError } = await supabase
      .from('quality_issues')
      .select('id,website_id,title,description,page_url,issue_type,priority,status,assigned_to,screenshot_url,due_date,created_by,created_at,updated_at,approved_by,approved_at')
      .in('website_id', websiteIds)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (websiteError) throw websiteError;
    batches.push(...((websiteRows ?? []).map((row) => rowToIssue(row as IssueRow))));
  }

  return mergeById(batches).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
};

const loadDashboard = async () => {
  if (!supabaseConfigured || !auth.user?.id) return;
  loading.value = true;
  error.value = null;
  try {
    const uid = auth.user.id;

    const { data: assignmentRows, error: assignmentsError } = await supabase
      .from('quality_checker_assignments')
      .select('id,user_id,scope_kind,scope_id')
      .eq('user_id', uid);

    if (assignmentsError) {
      console.warn('[quality-checker-dashboard] assignments unavailable', assignmentsError.message);
      assignments.value = [];
    } else {
      assignments.value = (assignmentRows ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        scopeKind: row.scope_kind,
        scopeId: row.scope_id,
      }));
    }

    const directWebsiteIds = assignments.value
      .filter((assignment) => assignment.scopeKind === 'website')
      .map((assignment) => assignment.scopeId);
    const directClassIds = assignments.value
      .filter((assignment) => assignment.scopeKind === 'class')
      .map((assignment) => assignment.scopeId);

    websites.value = await fetchAssignedWebsites(directWebsiteIds, directClassIds);
    const assignedWebsiteIds = websites.value.map((website) => website.id);
    issues.value = await fetchIssuesForDashboard(uid, assignedWebsiteIds);

    const issueOnlyWebsiteIds = issues.value
      .map((issue) => issue.websiteId)
      .filter((id) => !assignedWebsiteIds.includes(id));

    if (issueOnlyWebsiteIds.length) {
      websites.value = mergeById([
        ...websites.value,
        ...(await fetchAssignedWebsites(issueOnlyWebsiteIds, [])),
      ]);
    }

    const classIds = Array.from(new Set([
      ...directClassIds,
      ...websites.value.map((website) => website.qualityClassId).filter((id): id is string => !!id),
    ]));

    if (classIds.length === 0) {
      classes.value = [];
      return;
    }

    const { data: classRows, error: classesError } = await supabase
      .from('quality_classes')
      .select('id,name')
      .in('id', classIds);

    if (classesError) {
      error.value = classesError.message;
      return;
    }

    classes.value = (classRows ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? 'Class folder',
    }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load quality checker dashboard.';
  } finally {
    loading.value = false;
  }
};

const needsFixIssues = computed(() =>
  issues.value
    .filter((issue) => issue.status === 'new_issue' || issue.status === 'in_progress')
    .slice(0, 8)
);

const recentlyApprovedIssues = computed(() =>
  issues.value
    .filter((issue) => issue.status === 'approved')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 6)
);

const reportedIssues = computed(() =>
  issues.value
    .filter((issue) => issue.createdBy === auth.user?.id)
    .slice(0, 8)
);

const reviewWebsites = computed(() => {
  return websites.value;
});

const openStatuses = new Set<QualityIssueStatus>(['new_issue', 'in_progress', 'needs_review']);
const needsFixStatuses = new Set<QualityIssueStatus>(['new_issue', 'in_progress']);
const todayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);

const summaryCards = computed(() => [
  { label: 'Managed Websites', value: reviewWebsites.value.length },
  { label: 'Open Issues', value: issues.value.filter((issue) => openStatuses.has(issue.status)).length },
  { label: 'Needs Fix', value: issues.value.filter((issue) => needsFixStatuses.has(issue.status)).length },
  { label: 'Fixed', value: issues.value.filter((issue) => issue.status === 'fixed').length },
  { label: 'Waiting Review', value: issues.value.filter((issue) => issue.status === 'needs_review').length },
  { label: 'Approved', value: issues.value.filter((issue) => issue.status === 'approved').length },
  {
    label: 'Reported Today',
    value: issues.value.filter((issue) => issue.createdBy === auth.user?.id && issue.createdAt.slice(0, 10) === todayKey()).length,
  },
  {
    label: 'Reported This Month',
    value: issues.value.filter((issue) => issue.createdBy === auth.user?.id && issue.createdAt.slice(0, 7) === monthKey()).length,
  },
]);

const websiteById = computed(() => new Map(websites.value.map((website) => [website.id, website])));
const classById = computed(() => new Map(classes.value.map((cls) => [cls.id, cls])));

const websiteName = (websiteId: string) => {
  const website = websiteById.value.get(websiteId);
  return website?.name || website?.domain || 'Untitled website';
};

const className = (classId: string | null) =>
  classId ? classById.value.get(classId)?.name ?? 'Class folder' : 'No class';

const openIssueCount = (websiteId: string) =>
  issues.value.filter((issue) => issue.websiteId === websiteId && openStatuses.has(issue.status)).length;

const statusLabel = (status: QualityIssueStatus) => ({
  new_issue: 'New Issue',
  in_progress: 'In Progress',
  fixed: 'Fixed',
  needs_review: 'Needs Review',
  approved: 'Approved',
}[status]);

const normalizeUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

const qualityIssueLink = (issue: QualityIssue) =>
  `/quality-check/${issue.websiteId}?issue=${issue.id}`;

const openIssue = (issue: QualityIssue) => {
  void router.push(qualityIssueLink(issue));
};

const websiteInitials = (website: DashboardWebsite) =>
  (website.name || website.domain || '?')
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const scrollToReports = () => {
  reportsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

onMounted(loadDashboard);
</script>

<style scoped>
.qcd-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.qcd-welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.qcd-welcome h1,
.qcd-section-head h2,
.qcd-issue-card h3,
.qcd-website-card h3 {
  margin: 0;
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
}

.qcd-welcome h1 {
  font-size: 1.45rem;
  font-weight: 850;
}

.qcd-welcome p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.qcd-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.qcd-summary-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.8rem 1rem; /* denser than card-pad for a compact KPI */
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.qcd-summary-card:hover {
  border-color: color-mix(in srgb, var(--primary) 24%, var(--border));
}

.qcd-summary-card span,
.qcd-site-name,
.qcd-website-meta span,
.qcd-report-row time {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.qcd-summary-card strong {
  color: var(--text-main);
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.qcd-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.qcd-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.qcd-section-head h2 {
  font-size: 1rem;
  font-weight: 800;
}

.qcd-issue-list,
.qcd-websites {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.qcd-issue-card {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  overflow: hidden;
}

.qcd-thumb {
  width: 116px;
  height: 100%;
  min-height: 150px;
  object-fit: cover;
  border-right: 1px solid var(--border);
  background: var(--soft-bg);
}

.qcd-issue-body {
  padding: 1rem;
  min-width: 0;
}

.qcd-issue-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.qcd-issue-card h3,
.qcd-website-card h3 {
  font-size: 0.95rem;
  font-weight: 800;
}

.qcd-issue-card p,
.qcd-website-card p {
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.86rem;
  line-height: 1.45;
}

.qcd-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.qcd-link-btn,
.qcd-open-board {
  justify-content: center;
}

.qcd-status {
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 8px;
  padding: 0.18rem 0.45rem;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  background: var(--soft-bg);
}

.qcd-status--new_issue,
.qcd-status--in_progress {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}

.qcd-status--fixed,
.qcd-status--needs_review {
  color: #16a34a;
  background: rgba(34, 197, 94, 0.12);
}

.qcd-status--approved {
  color: #15803d;
  background: rgba(22, 163, 74, 0.14);
}

.qcd-website-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.qcd-website-main {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  min-width: 0;
}

.qcd-favicon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 8px;
  object-fit: cover;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.qcd-favicon-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  font-weight: 850;
}

.qcd-website-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.qcd-website-meta strong {
  color: var(--text-main);
}

.qcd-report-list {
  overflow: hidden;
}

.qcd-report-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) minmax(140px, 1fr) auto auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text-main);
  padding: 0.8rem 1rem;
  text-align: left;
  cursor: pointer;
}

.qcd-report-row:last-child {
  border-bottom: 0;
}

.qcd-report-row:hover {
  background: var(--soft-bg);
}

.qcd-report-row span:first-child {
  font-weight: 750;
}

@media (max-width: 1180px) {
  .qcd-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .qcd-welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .qcd-summary,
  .qcd-issue-list,
  .qcd-websites {
    grid-template-columns: 1fr;
  }

  .qcd-report-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .qcd-issue-card {
    grid-template-columns: 1fr;
  }

  .qcd-thumb {
    width: 100%;
    height: 150px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
</style>
