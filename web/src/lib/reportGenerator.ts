import { type ProfileRow } from '@/lib/db';
import { isFollowupParticipant } from '@/lib/roles';

export interface ReportMemberInfo {
  fullName: string;
  position: string;
  department: string;
  reportingPeriod: string;
  generatedDate: string;
  preparedBy: string;
  classification: string;
}

export interface ReportSummaryMetrics {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  qualityChecksCompleted: number;
  followUpsCompleted: string; // "X/Y"
  summaryParagraph: string;
}

export interface ReportWorkTask {
  name: string;
  description: string;
  project: string;
  assignedDate: string;
  completedDate: string;
  status: string;
}

export interface ReportQualityCheck {
  title: string;
  date: string;
  result: string;
  status: string;
  notes: string;
}

export interface ReportFollowupActivity {
  type: string;
  scheduledDate: string;
  status: string;
  notes: string;
}

export interface ReportManagerNotes {
  observations: string[];
  customNotes: string;
  isBulkSheet: boolean;
}

export interface MemberReportObject {
  memberId: string;
  memberInfo: ReportMemberInfo;
  metrics: ReportSummaryMetrics;
  workTasks: ReportWorkTask[];
  qualityChecks: ReportQualityCheck[];
  followups: ReportFollowupActivity[];
  managerNotes: ReportManagerNotes;
}

export interface TeamReportObject {
  reportingPeriod: string;
  generatedDate: string;
  preparedBy: string;
  classification: string;
  activeMembersCount: number;
  totalTasksCompleted: number;
  totalTasksPending: number;
  totalTasksOverdue: number;
  totalQualityChecksApproved: number;
  totalFollowupsCompleted: number;
  teamSummaryParagraph: string;
  memberBreakdown: Array<{
    name: string;
    position: string;
    completed: string;
    inProgress: string;
    overdue: string;
    followups: string;
  }>;
  memberBooklets: MemberReportObject[];
}

// Helper: Format Date
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-');
  if (parts.length !== 3) return clean;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Helpers to resolve metadata names from raw data stores
function getMemberName(id: string | null, dataStore: any): string {
  if (!id) return 'Unassigned';
  const m = dataStore.members.find((x: any) => x.id === id);
  return m ? m.fullName : id;
}

function getWebsiteName(id: string | null, dataStore: any): string {
  if (!id) return 'General/None';
  const w = dataStore.websites.find((x: any) => x.id === id);
  return w ? w.name : id;
}

function getProjectName(id: string | null, dataStore: any): string {
  if (!id) return 'General/None';
  const p = dataStore.projects.find((x: any) => x.id === id);
  return p ? p.name : id;
}

function getTaskTitle(promptId: string, dataStore: any): string {
  const p = dataStore.prompts.find((x: any) => x.id === promptId);
  return p ? p.title : 'Assigned task';
}

function getTaskDescription(promptId: string, dataStore: any): string {
  const p = dataStore.prompts.find((x: any) => x.id === promptId);
  return p ? p.shortDescription : '';
}

function getMemberPosition(id: string | null, dataStore: any): string {
  if (!id) return 'Team Member';
  const m = dataStore.members.find((x: any) => x.id === id);
  return m?.position || 'Team Member';
}

function getMemberDepartment(id: string | null, dataStore: any): string {
  const position = getMemberPosition(id, dataStore).toLowerCase();
  if (position.includes('seo') || position.includes('optimizer')) return 'Search Engine Optimization';
  if (position.includes('writer') || position.includes('content') || position.includes('copy')) return 'Content Management';
  if (position.includes('dev') || position.includes('engineer') || position.includes('code') || position.includes('programmer')) return 'Web Development & Engineering';
  if (position.includes('design') || position.includes('artist') || position.includes('creative')) return 'Creative Design';
  if (position.includes('admin') || position.includes('owner') || position.includes('super') || position.includes('lead') || position.includes('head') || position.includes('manager')) return 'Operations Management';
  if (position.includes('quality') || position.includes('reviewer') || position.includes('checker') || position.includes('audit')) return 'Quality Assurance';
  return 'Operations & Support';
}

// Date Range Helper
function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return d >= start && d <= end;
}

function ebayCompletionLabel(entry: any): string {
  if (entry?.completionSource === 'admin_auto_fill' || entry?.completion_source === 'admin_auto_fill') {
    return 'Admin Auto Completed';
  }
  if (entry?.completionSource === 'not_required_today' || entry?.completion_source === 'not_required_today') {
    return 'Not Required Today';
  }
  if (entry?.completionSource === 'admin_manual' || entry?.completion_source === 'admin_manual') {
    return 'Admin Completed';
  }
  return 'Completed by Member';
}

// Extraction logic for a specific member's dataset
function getMemberAssignmentsForPeriod(memberId: string, start: string, end: string, dataStore: any): any[] {
  return dataStore.assignments.filter((a: any) => {
    if (a.assignedMemberId !== memberId) return false;
    const isCompleted = ['approved', 'completed', 'submitted'].includes(a.status);
    const dateStr = (a.completedAt || a.updatedAt || a.assignedAt || '').split('T')[0];
    const assignDateStr = (a.assignedAt || '').split('T')[0];
    if (isCompleted) {
      return dateStr >= start && dateStr <= end;
    } else {
      return assignDateStr <= end && assignDateStr !== '';
    }
  });
}

function getMemberAssignmentsGrouped(memberId: string, start: string, end: string, dataStore: any) {
  const list = getMemberAssignmentsForPeriod(memberId, start, end, dataStore);
  const todayStr = new Date().toISOString().split('T')[0];
  const completed = list.filter((a: any) => ['approved', 'completed', 'submitted'].includes(a.status));
  const overdue = list.filter((a: any) =>
    !['approved', 'completed', 'submitted'].includes(a.status) &&
    a.dueDate && a.dueDate < todayStr
  );
  const postponed = list.filter((a: any) =>
    a.status === 'postponed' &&
    !(a.dueDate && a.dueDate < todayStr)
  );
  const inProgress = list.filter((a: any) =>
    !['approved', 'completed', 'submitted'].includes(a.status) &&
    a.status !== 'postponed' &&
    !(a.dueDate && a.dueDate < todayStr)
  );
  return { completed, inProgress, postponed, overdue };
}

function getMemberQualityIssues(memberId: string, start: string, end: string, qualityCheckStore: any): any[] {
  return qualityCheckStore.issues.filter((i: any) =>
    i.assignedTo === memberId &&
    i.createdAt.split('T')[0] >= start &&
    i.createdAt.split('T')[0] <= end
  );
}

function getCombinedFollowupRows(start: string, end: string, dataStore: any, followupStore: any): any[] {
  const rows: any[] = [];
  dataStore.members.forEach((member: any) => {
    const memberId = member.id;
    const memberWebsiteIds = new Set(
      dataStore.websites.filter((w: any) => w.createdBy === memberId).map((w: any) => w.id)
    );

    // Blog
    followupStore.blogSlots.forEach((s: any) => {
      if ((s.assignedTo === memberId || (s.websiteId && memberWebsiteIds.has(s.websiteId))) &&
          s.scheduledDate >= start && s.scheduledDate <= end) {
        rows.push({
          id: s.id,
          type: 'Blog Follow-Up',
          websiteId: s.websiteId,
          assignedTo: s.assignedTo || memberId,
          scheduledDate: s.scheduledDate,
          status: s.status,
          notes: s.notes || s.blogTitle || ''
        });
      }
    });

    // Speed
    followupStore.speedSlots.forEach((s: any) => {
      if ((s.assignedTo === memberId || (s.websiteId && memberWebsiteIds.has(s.websiteId))) &&
          s.weekStart >= start && s.weekStart <= end) {
        rows.push({
          id: s.id,
          type: 'Website Optimization Follow-Up',
          websiteId: s.websiteId,
          assignedTo: s.assignedTo || memberId,
          scheduledDate: s.weekStart,
          status: s.status,
          notes: s.notes || (s.beforeScore ? `Scores: ${s.beforeScore} ➔ ${s.afterScore}` : '')
        });
      }
    });

    // Plugins
    followupStore.pluginSlots.forEach((s: any) => {
      if ((s.assignedTo === memberId || (s.websiteId && memberWebsiteIds.has(s.websiteId))) &&
          s.weekStart >= start && s.weekStart <= end) {
        rows.push({
          id: s.id,
          type: 'Plugin Update Follow-Up',
          websiteId: s.websiteId,
          assignedTo: s.assignedTo || memberId,
          scheduledDate: s.weekStart,
          status: s.status,
          notes: s.notes || (s.pluginsUpdatedCount ? `Updated: ${s.pluginsUpdatedCount} | ${s.pluginNames}` : '')
        });
      }
    });

    // eBay
    followupStore.ebayEntries.forEach((s: any) => {
      if (s.userId === memberId && s.date >= start && s.date <= end) {
        const sourceLabel = ebayCompletionLabel(s);
        rows.push({
          id: s.id,
          type: 'eBay Follow-Up',
          websiteId: null,
          assignedTo: s.userId,
          scheduledDate: s.date,
          status: s.status,
          notes: `${sourceLabel} on ${s.dayName}${s.reason ? ` — ${s.reason}` : ''}`
        });
      }
    });
  });

  return rows.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
}

function getMemberFollowupRows(memberId: string, start: string, end: string, dataStore: any, followupStore: any): any[] {
  return getCombinedFollowupRows(start, end, dataStore, followupStore).filter(s => s.assignedTo === memberId);
}

// ----------------------------------------------------
// ARCHITECTURE STEP 1 & 2: Build Structured Report Object
// ----------------------------------------------------
export function buildMemberReportObject(params: {
  memberId: string;
  startDate: string;
  endDate: string;
  preparedBy: string;
  customNotes?: string;
  selectedObservations?: string[];
  isBulkSheet?: boolean;
  stores: { dataStore: any; qualityCheckStore: any; followupStore: any };
}): MemberReportObject {
  const { memberId, startDate, endDate, preparedBy, customNotes = '', selectedObservations = [], isBulkSheet = false, stores } = params;
  const { dataStore, qualityCheckStore, followupStore } = stores;

  const fullName = getMemberName(memberId, dataStore);
  const position = getMemberPosition(memberId, dataStore);
  const department = getMemberDepartment(memberId, dataStore);
  const periodStr = `${formatDate(startDate)} — ${formatDate(endDate)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const assignmentsForPeriod = getMemberAssignmentsForPeriod(memberId, startDate, endDate, dataStore);
  const grouped = getMemberAssignmentsGrouped(memberId, startDate, endDate, dataStore);
  const qualityIssues = getMemberQualityIssues(memberId, startDate, endDate, qualityCheckStore);
  const followupRows = getMemberFollowupRows(memberId, startDate, endDate, dataStore, followupStore);

  const completedFollowupsCount = followupRows.filter(s => s.status === 'done' || s.status === 'late').length;
  const followUpsFraction = `${completedFollowupsCount}/${followupRows.length}`;

  // Step 2 Summary Paragraph
  const summaryParagraph = `This performance report documents the official operational activities and work records of ${fullName} during the reporting period from ${formatDate(startDate)} to ${formatDate(endDate)}. Out of a total of ${assignmentsForPeriod.length} assigned tasks, ${grouped.completed.length} were successfully completed, with ${grouped.inProgress.length} currently in progress and ${grouped.overdue.length} overdue. A total of ${qualityIssues.filter(i => i.status === 'approved').length} quality audits passed verification, and ${completedFollowupsCount} follow-up checks were performed. This record serves as the official accountability registry for executive management review.`;

  const memberInfo: ReportMemberInfo = {
    fullName,
    position,
    department,
    reportingPeriod: periodStr,
    generatedDate: formatDate(todayStr),
    preparedBy,
    classification: 'Executive Management Review Only'
  };

  const metrics: ReportSummaryMetrics = {
    tasksAssigned: assignmentsForPeriod.length,
    tasksCompleted: grouped.completed.length,
    tasksInProgress: grouped.inProgress.length,
    tasksOverdue: grouped.overdue.length,
    qualityChecksCompleted: qualityIssues.filter(i => i.status === 'approved').length,
    followUpsCompleted: followUpsFraction,
    summaryParagraph
  };

  const workTasks: ReportWorkTask[] = assignmentsForPeriod.map(a => ({
    name: getTaskTitle(a.promptId, dataStore),
    description: getTaskDescription(a.promptId, dataStore) || 'No description',
    project: getProjectName(a.projectId, dataStore),
    assignedDate: formatDate(a.assignedAt),
    completedDate: formatDate(a.completedAt) || '—',
    status: a.status.replace('_', ' ')
  }));

  const qualityChecks: ReportQualityCheck[] = qualityIssues.map(i => ({
    title: i.title,
    date: formatDate(i.createdAt),
    result: i.status === 'approved' ? 'Passed' : 'Failed',
    status: i.status,
    notes: i.description || '—'
  }));

  const followups: ReportFollowupActivity[] = followupRows.map(f => ({
    type: f.type,
    scheduledDate: formatDate(f.scheduledDate),
    status: f.status,
    notes: f.notes || '—'
  }));

  const managerNotes: ReportManagerNotes = {
    observations: selectedObservations,
    customNotes,
    isBulkSheet
  };

  return {
    memberId,
    memberInfo,
    metrics,
    workTasks,
    qualityChecks,
    followups,
    managerNotes
  };
}

export function buildTeamReportObject(params: {
  startDate: string;
  endDate: string;
  preparedBy: string;
  selectedTeam: string;
  stores: { dataStore: any; qualityCheckStore: any; followupStore: any };
}): TeamReportObject {
  const { startDate, endDate, preparedBy, selectedTeam, stores } = params;
  const { dataStore, qualityCheckStore, followupStore } = stores;

  const todayStr = new Date().toISOString().split('T')[0];
  const periodStr = `${formatDate(startDate)} — ${formatDate(endDate)}`;

  // Filter members
  let activeMembers = dataStore.members.filter((m: any) => isFollowupParticipant(m));
  if (selectedTeam) {
    activeMembers = activeMembers.filter((m: any) => getMemberPosition(m.id, dataStore) === selectedTeam);
  }

  // Calculate team aggregated metrics
  let totalTasksCompleted = 0;
  let totalTasksPending = 0;
  let totalTasksOverdue = 0;
  let totalQualityChecksApproved = 0;
  let totalFollowupsCompleted = 0;

  const memberBreakdown: TeamReportObject['memberBreakdown'] = [];
  const memberBooklets: MemberReportObject[] = [];

  activeMembers.forEach((m: any) => {
    const assignmentsForPeriod = getMemberAssignmentsForPeriod(m.id, startDate, endDate, dataStore);
    const grouped = getMemberAssignmentsGrouped(m.id, startDate, endDate, dataStore);
    const qualityIssues = getMemberQualityIssues(m.id, startDate, endDate, qualityCheckStore);
    const followupRows = getMemberFollowupRows(m.id, startDate, endDate, dataStore, followupStore);

    const completedTasksCount = grouped.completed.length;
    const pendingTasksCount = grouped.inProgress.length + grouped.postponed.length;
    const overdueTasksCount = grouped.overdue.length;
    const approvedQCsCount = qualityIssues.filter(i => i.status === 'approved').length;
    const completedFollowupsCount = followupRows.filter(s => s.status === 'done' || s.status === 'late').length;

    totalTasksCompleted += completedTasksCount;
    totalTasksPending += pendingTasksCount;
    totalTasksOverdue += overdueTasksCount;
    totalQualityChecksApproved += approvedQCsCount;
    totalFollowupsCompleted += completedFollowupsCount;

    // Breakdown row
    memberBreakdown.push({
      name: m.fullName || m.email,
      position: getMemberPosition(m.id, dataStore),
      completed: `${completedTasksCount}/${assignmentsForPeriod.length}`,
      inProgress: `${grouped.inProgress.length}/${assignmentsForPeriod.length}`,
      overdue: `${overdueTasksCount}/${assignmentsForPeriod.length}`,
      followups: `${completedFollowupsCount}/${followupRows.length}`
    });

    // Create Booklet for this member
    // Since it's printed as part of a bulk team report, custom notes will print empty evaluator lines
    memberBooklets.push(buildMemberReportObject({
      memberId: m.id,
      startDate,
      endDate,
      preparedBy,
      customNotes: '',
      selectedObservations: [],
      isBulkSheet: true,
      stores
    }));
  });

  const teamSummaryParagraph = `This report represents the aggregated operational records and work activities of the website team for the reporting period from ${formatDate(startDate)} to ${formatDate(endDate)}. It consolidates completed deliverables, active board tasks, quality checks, and follow-up updates across all team members to serve as a high-level record for executive management.`;

  return {
    reportingPeriod: periodStr,
    generatedDate: formatDate(todayStr),
    preparedBy,
    classification: 'Executive Management Review Only',
    activeMembersCount: activeMembers.length,
    totalTasksCompleted,
    totalTasksPending,
    totalTasksOverdue,
    totalQualityChecksApproved,
    totalFollowupsCompleted,
    teamSummaryParagraph,
    memberBreakdown,
    memberBooklets
  };
}

// ----------------------------------------------------
// ARCHITECTURE STEP 3: HTML Compiler & PDF Print Execution
// ----------------------------------------------------

// Render styles string
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Georgia&family=Inter:wght@400;500;700;800&display=swap');
  
  body, html {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111827;
    font-family: 'Georgia', Garamond, 'Times New Roman', serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Screen preview mode styles */
  .preview-wrapper {
    background: #f3f4f6;
    padding: 2rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    min-height: 100vh;
  }

  .pdf-page {
    width: 210mm;
    height: 297mm;
    box-sizing: border-box;
    background: #ffffff;
    padding: 20mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
    break-after: page;
    position: relative;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    border-radius: 4px;
  }

  .report-branding-text {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.15em;
    color: #6b7280;
    text-transform: uppercase;
  }

  .report-title-cover {
    font-family: 'Georgia', serif;
    font-size: 36px;
    font-weight: 700;
    color: #111827;
    line-height: 1.25;
  }

  .report-subtitle-cover {
    font-family: 'Georgia', serif;
    font-size: 16px;
    font-style: italic;
    color: #4b5563;
    margin-top: 10px;
  }

  .report-meta-box {
    border-top: 2px solid #111827;
    border-bottom: 2px solid #111827;
    padding: 16px 0;
    margin-top: 40px;
  }

  .report-meta-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
  }

  .report-meta-table td {
    padding: 6px 0;
    vertical-align: middle;
  }

  .report-meta-label {
    font-weight: 700;
    color: #4b5563;
    width: 35%;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.05em;
  }

  .report-meta-value {
    font-weight: 500;
    color: #111827;
    width: 65%;
  }

  .report-header {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 8px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .report-section-title {
    font-family: 'Georgia', serif;
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    border-bottom: 1.5px solid #111827;
    padding-bottom: 6px;
    margin-top: 10px;
    margin-bottom: 15px;
  }

  .report-paragraph {
    font-family: 'Georgia', serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1f2937;
    text-align: justify;
    margin-bottom: 16px;
  }

  .report-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
  }

  .report-table th {
    border-bottom: 2px solid #111827;
    border-top: 1px solid #e5e7eb;
    padding: 8px 6px;
    text-align: left;
    font-weight: 700;
    color: #111827;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.05em;
    background: transparent !important;
  }

  .report-table td {
    border-bottom: 1px solid #e5e7eb;
    padding: 8px 6px;
    vertical-align: top;
    color: #1f2937;
  }

  .report-table tbody tr:last-child td {
    border-bottom: 2px solid #111827;
  }

  .report-bullets {
    font-family: 'Georgia', serif;
    font-size: 12.5px;
    line-height: 1.6;
    color: #1f2937;
    padding-left: 20px;
    list-style-type: square;
  }

  .report-bullets li {
    margin-bottom: 8px;
  }

  .report-footer {
    display: flex;
    justify-content: space-between;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #9ca3af;
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
    margin-top: auto;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .report-notes-container {
    margin-top: 12px;
  }

  .report-notes-block {
    margin-bottom: 24px;
  }

  .report-notes-text {
    font-family: 'Georgia', serif;
    font-size: 12.5px;
    line-height: 1.6;
    color: #1f2937;
    font-style: italic;
  }

  .signature-line-box {
    margin-top: 20mm;
  }

  .signature-line {
    border-bottom: 1px solid #d1d5db;
    margin-bottom: 8mm;
    height: 1px;
  }

  /* Print Specific Rules */
  @media print {
    body, html {
      background: #ffffff !important;
    }
    .preview-wrapper {
      background: none !important;
      padding: 0 !important;
      gap: 0 !important;
    }
    .pdf-page {
      box-shadow: none !important;
      border-radius: 0 !important;
      width: 100% !important;
      height: 297mm !important;
      padding: 20mm !important;
      box-sizing: border-box !important;
      margin: 0 !important;
    }
    .pdf-page table th, 
    .pdf-page table td {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
      font-size: 8.5px !important;
      line-height: 1.35 !important;
    }
  }
`;

// Render HTML for a single Member Booklet (Pages 1 to 6)
export function renderMemberBookletHtml(booklet: MemberReportObject, bookletIndexLabel: string = ''): string {
  const mInfo = booklet.memberInfo;
  const metrics = booklet.metrics;
  const hasNotes = booklet.managerNotes.observations.length > 0 || booklet.managerNotes.customNotes;

  // Work tasks rows (up to 15)
  const taskRowsHtml = booklet.workTasks.slice(0, 15).map(task => `
    <tr>
      <td style="font-weight: bold;">${task.name}</td>
      <td>${task.description}</td>
      <td>${task.project}</td>
      <td style="text-align: center;">${task.assignedDate}</td>
      <td style="text-align: center;">${task.completedDate}</td>
      <td style="text-align: center; font-weight: bold;">${task.status}</td>
    </tr>
  `).join('');

  const emptyTasksRow = booklet.workTasks.length === 0 ? `
    <tr>
      <td colspan="6" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">No tasks recorded for this period.</td>
    </tr>
  ` : '';

  // Quality Checks rows (up to 15)
  const qcRowsHtml = booklet.qualityChecks.slice(0, 15).map(qc => `
    <tr>
      <td style="font-weight: bold;">${qc.title}</td>
      <td style="text-align: center;">${qc.date}</td>
      <td style="text-align: center; font-weight: bold; color: ${qc.result === 'Passed' ? '#10b981' : '#f59e0b'};">${qc.result}</td>
      <td style="text-align: center; font-weight: bold;">${qc.status}</td>
      <td>${qc.notes}</td>
    </tr>
  `).join('');

  const emptyQcRow = booklet.qualityChecks.length === 0 ? `
    <tr>
      <td colspan="5" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">No quality reviews recorded.</td>
    </tr>
  ` : '';

  // Followup rows (up to 15)
  const followupRowsHtml = booklet.followups.slice(0, 15).map(f => `
    <tr>
      <td style="font-weight: bold;">${f.type}</td>
      <td style="text-align: center;">${f.scheduledDate}</td>
      <td style="text-align: center; font-weight: bold;">${f.status}</td>
      <td>${f.notes}</td>
    </tr>
  `).join('');

  const emptyFollowupRow = booklet.followups.length === 0 ? `
    <tr>
      <td colspan="4" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">No follow-up activities recorded.</td>
    </tr>
  ` : '';

  // Observations & notes
  let observationsBlock = '';
  if (booklet.managerNotes.observations.length > 0) {
    observationsBlock = `
      <div class="report-notes-block">
        <h3 class="report-notes-block h3">Factual Observations</h3>
        <ul class="report-bullets">
          ${booklet.managerNotes.observations.map(obs => `<li>${obs}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  let customNotesBlock = '';
  if (booklet.managerNotes.customNotes) {
    customNotesBlock = `
      <div class="report-notes-block" style="margin-top: 24px;">
        <h3 class="report-notes-block h3">Additional Supervisor Remarks</h3>
        <p class="report-notes-text">${booklet.managerNotes.customNotes}</p>
      </div>
    `;
  }

  const notesContent = hasNotes && !booklet.managerNotes.isBulkSheet ? `
    ${observationsBlock}
    ${customNotesBlock}
  ` : `
    <h3 class="report-notes-block h3">Supervisor Notes & Evaluations</h3>
    <div class="signature-line-box">
      <div class="signature-line"></div>
      <div class="signature-line"></div>
      <div class="signature-line"></div>
      <div class="signature-line"></div>
      <div class="signature-line"></div>
    </div>
    <p class="report-branding-text" style="text-align: right; margin-top: 12mm; font-size: 9px; color: #4b5563;">Supervisor Signature: _______________________</p>
  `;

  return `
    <!-- Page 1: Cover Page -->
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; text-align: center; gap: 30px; margin-top: 40mm;">
        <span class="report-branding-text">KiuQ Website System</span>
        <div style="margin-top: 20px;">
          <h1 class="report-title-cover">${booklet.managerNotes.isBulkSheet ? 'Section III: Individual Report' : 'Executive Performance Report'}</h1>
          <p class="report-subtitle-cover">${mInfo.fullName}</p>
          <p class="report-branding-text" style="color: #6b7280; font-size: 10px; font-weight: 500; margin-top: 8px;">${mInfo.position} — ${mInfo.department}</p>
        </div>
        
        <div class="report-meta-box" style="width: 100%; max-width: 450px; text-align: left; margin-top: 30px;">
          <table class="report-meta-table">
            <tbody>
              <tr>
                <td class="report-meta-label">Reporting Period</td>
                <td class="report-meta-value">${mInfo.reportingPeriod}</td>
              </tr>
              <tr>
                <td class="report-meta-label">Generated Date</td>
                <td class="report-meta-value">${mInfo.generatedDate}</td>
              </tr>
              <tr>
                <td class="report-meta-label">Prepared By</td>
                <td class="report-meta-value">${mInfo.preparedBy}</td>
              </tr>
              <tr>
                <td class="report-meta-label">Classification</td>
                <td class="report-meta-value">${mInfo.classification}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="report-footer">
        <span>${booklet.managerNotes.isBulkSheet ? 'Section Divider' : 'Executive Accountability Registry'}</span>
        <span>Page 1 ${bookletIndexLabel ? `(${bookletIndexLabel})` : 'of 6'}</span>
      </div>
    </div>

    <!-- Page 2: Performance Summary -->
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Performance Summary</span>
          <span style="font-weight: bold;">${mInfo.fullName}</span>
        </div>
        <h2 class="report-section-title">1. Executive Performance Summary</h2>
        <p class="report-paragraph">${metrics.summaryParagraph}</p>
        
        <table class="report-table" style="margin-top: 20px;">
          <thead>
            <tr>
              <th style="width: 70%;">Operational Metric</th>
              <th style="width: 30%; text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Tasks Assigned in Period</td>
              <td style="text-align: right; font-weight: bold;">${metrics.tasksAssigned}</td>
            </tr>
            <tr>
              <td>Tasks Completed</td>
              <td style="text-align: right; font-weight: bold; color: #10b981;">${metrics.tasksCompleted}</td>
            </tr>
            <tr>
              <td>Tasks In Progress</td>
              <td style="text-align: right; font-weight: bold; color: #3b82f6;">${metrics.tasksInProgress}</td>
            </tr>
            <tr>
              <td>Tasks Overdue</td>
              <td style="text-align: right; font-weight: bold; color: #ef4444;">${metrics.tasksOverdue}</td>
            </tr>
            <tr>
              <td>Quality Checks Completed / Approved</td>
              <td style="text-align: right; font-weight: bold; color: #4f46e5;">${metrics.qualityChecksCompleted}</td>
            </tr>
            <tr>
              <td>Follow-Ups Completed</td>
              <td style="text-align: right; font-weight: bold; color: #4f46e5;">${metrics.followUpsCompleted}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="report-footer">
        <span>${booklet.managerNotes.isBulkSheet ? 'Performance Summary Booklet' : 'Executive Accountability Registry'}</span>
        <span>Page 2 ${bookletIndexLabel ? `(${bookletIndexLabel})` : 'of 6'}</span>
      </div>
    </div>

    <!-- Page 3: Work Board Activities -->
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Work Board Activities</span>
          <span style="font-weight: bold;">${mInfo.fullName}</span>
        </div>
        <h2 class="report-section-title">2. Work Board Activities</h2>
        <p class="report-paragraph" style="font-size: 11px; margin-bottom: 8px;">Detailed list of tasks worked on or completed during the reporting period.</p>
        
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 25%">Task Name</th>
              <th style="width: 30%">Description</th>
              <th style="width: 15%">Project</th>
              <th style="width: 10%; text-align: center;">Assigned</th>
              <th style="width: 10%; text-align: center;">Completed</th>
              <th style="width: 10%; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${taskRowsHtml}
            ${emptyTasksRow}
          </tbody>
        </table>
      </div>
      <div class="report-footer">
        <span>${booklet.managerNotes.isBulkSheet ? 'Performance Summary Booklet' : 'Executive Accountability Registry'}</span>
        <span>Page 3 ${bookletIndexLabel ? `(${bookletIndexLabel})` : 'of 6'}</span>
      </div>
    </div>

    <!-- Page 4: Quality Checks -->
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Quality Check Activities</span>
          <span style="font-weight: bold;">${mInfo.fullName}</span>
        </div>
        <h2 class="report-section-title">3. Quality Check Activities</h2>
        <p class="report-paragraph" style="font-size: 11px; margin-bottom: 8px;">Factual review results and status logs of link checks, spacing audits, and UI validations.</p>
        
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 35%">Quality Item</th>
              <th style="width: 15%; text-align: center;">Date</th>
              <th style="width: 15%; text-align: center;">Result</th>
              <th style="width: 15%; text-align: center;">Status</th>
              <th style="width: 20%">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${qcRowsHtml}
            ${emptyQcRow}
          </tbody>
        </table>
      </div>
      <div class="report-footer">
        <span>${booklet.managerNotes.isBulkSheet ? 'Performance Summary Booklet' : 'Executive Accountability Registry'}</span>
        <span>Page 4 ${bookletIndexLabel ? `(${bookletIndexLabel})` : 'of 6'}</span>
      </div>
    </div>

    <!-- Page 5: Follow-Up Activities -->
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Follow-Up Activities</span>
          <span style="font-weight: bold;">${mInfo.fullName}</span>
        </div>
        <h2 class="report-section-title">4. Follow-Up Activities</h2>
        <p class="report-paragraph" style="font-size: 11px; margin-bottom: 8px;">Operational records of completed and pending follow-ups (Blog audits, Speed optimization, eBay clicks, Plugin updates).</p>
        
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 30%">Activity Name</th>
              <th style="width: 20%; text-align: center;">Scheduled Date</th>
              <th style="width: 15%; text-align: center;">Status</th>
              <th style="width: 35%">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${followupRowsHtml}
            ${emptyFollowupRow}
          </tbody>
        </table>
      </div>
      <div class="report-footer">
        <span>${booklet.managerNotes.isBulkSheet ? 'Performance Summary Booklet' : 'Executive Accountability Registry'}</span>
        <span>Page 5 ${bookletIndexLabel ? `(${bookletIndexLabel})` : 'of 6'}</span>
      </div>
    </div>

    <!-- Page 6: Manager Notes -->
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Management Observations</span>
          <span style="font-weight: bold;">${mInfo.fullName}</span>
        </div>
        <h2 class="report-section-title">5. Manager Notes & Observations</h2>
        <div class="report-notes-container">
          ${notesContent}
        </div>
      </div>
      <div class="report-footer">
        <span>${booklet.managerNotes.isBulkSheet ? 'Performance Summary Booklet' : 'Executive Accountability Registry'}</span>
        <span>Page 6 ${bookletIndexLabel ? `(${bookletIndexLabel})` : 'of 6'}</span>
      </div>
    </div>
  `;
}

// Generate the full Standalone HTML containing print document pages
export function compileReportHtml(reportData: MemberReportObject | TeamReportObject, isTeamReport: boolean): string {
  let contentHtml = '';

  if (isTeamReport) {
    const teamReport = reportData as TeamReportObject;
    
    // Page 1: Team Cover Page
    contentHtml += `
      <div class="pdf-page">
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; text-align: center; gap: 30px; margin-top: 40mm;">
          <span class="report-branding-text">KiuQ Website System</span>
          <div style="margin-top: 20px;">
            <h1 class="report-title-cover">Team Operations Documentation</h1>
            <p class="report-subtitle-cover">Consolidated Performance & Operational Registry</p>
          </div>
          
          <div class="report-meta-box" style="width: 100%; max-width: 450px; text-align: left; margin-top: 30px;">
            <table class="report-meta-table">
              <tbody>
                <tr>
                  <td class="report-meta-label">Reporting Period</td>
                  <td class="report-meta-value">${teamReport.reportingPeriod}</td>
                </tr>
                <tr>
                  <td class="report-meta-label">Generated Date</td>
                  <td class="report-meta-value">${teamReport.generatedDate}</td>
                </tr>
                <tr>
                  <td class="report-meta-label">Active Staff</td>
                  <td class="report-meta-value">${teamReport.activeMembersCount} Members</td>
                </tr>
                <tr>
                  <td class="report-meta-label">Prepared By</td>
                  <td class="report-meta-value">${teamReport.preparedBy}</td>
                </tr>
                <tr>
                  <td class="report-meta-label">Classification</td>
                  <td class="report-meta-value">${teamReport.classification}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="report-footer">
          <span>Corporate Governance Record</span>
          <span>Cover Page</span>
        </div>
      </div>
    `;

    // Page 2: Team Summary Page
    contentHtml += `
      <div class="pdf-page">
        <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
          <div class="report-header">
            <span>Team Summary</span>
            <span>${teamReport.reportingPeriod}</span>
          </div>
          <h2 class="report-section-title">1. Executive Team Summary</h2>
          <p class="report-paragraph">${teamReport.teamSummaryParagraph}</p>
          
          <table class="report-table" style="margin-top: 20px;">
            <thead>
              <tr>
                <th style="width: 70%;">Operational Metric</th>
                <th style="width: 30%; text-align: right;">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Active Members</td>
                <td style="text-align: right; font-weight: bold;">${teamReport.activeMembersCount}</td>
              </tr>
              <tr>
                <td>Total Tasks Completed</td>
                <td style="text-align: right; font-weight: bold; color: #10b981;">${teamReport.totalTasksCompleted}</td>
              </tr>
              <tr>
                <td>Total Tasks Pending / In Progress</td>
                <td style="text-align: right; font-weight: bold; color: #3b82f6;">${teamReport.totalTasksPending}</td>
              </tr>
              <tr>
                <td>Total Tasks Overdue</td>
                <td style="text-align: right; font-weight: bold; color: #ef4444;">${teamReport.totalTasksOverdue}</td>
              </tr>
              <tr>
                <td>Total Quality Checks Approved</td>
                <td style="text-align: right; font-weight: bold; color: #4f46e5;">${teamReport.totalQualityChecksApproved}</td>
              </tr>
              <tr>
                <td>Total Follow-Ups Completed</td>
                <td style="text-align: right; font-weight: bold; color: #4f46e5;">${teamReport.totalFollowupsCompleted}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="report-footer">
          <span>Corporate Governance Record</span>
          <span>Page 2 of Team</span>
        </div>
      </div>
    `;

    // Page 3: Team Breakdown Page
    const breakdownRows = teamReport.memberBreakdown.map(row => `
      <tr>
        <td style="font-weight: bold;">${row.name}</td>
        <td>${row.position}</td>
        <td style="text-align: center; font-weight: bold; color: #10b981;">${row.completed}</td>
        <td style="text-align: center; font-weight: bold; color: #3b82f6;">${row.inProgress}</td>
        <td style="text-align: center; font-weight: bold; color: #ef4444;">${row.overdue}</td>
        <td style="text-align: center; font-weight: bold; color: #4f46e5;">${row.followups}</td>
      </tr>
    `).join('');

    contentHtml += `
      <div class="pdf-page">
        <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
          <div class="report-header">
            <span>Member Breakdown</span>
            <span>${teamReport.reportingPeriod}</span>
          </div>
          <h2 class="report-section-title">2. Team Member Breakdown</h2>
          <p class="report-paragraph" style="margin-bottom: 12px;">Comparative matrix of tasks and checklists completed by team members during the period.</p>
          
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 25%">Member Name</th>
                <th style="width: 25%">Position / Department</th>
                <th style="width: 12.5%; text-align: center;">Completed</th>
                <th style="width: 12.5%; text-align: center;">In Progress</th>
                <th style="width: 12.5%; text-align: center;">Overdue</th>
                <th style="width: 12.5%; text-align: center;">Follow-Ups</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRows}
              ${teamReport.memberBreakdown.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">No active members.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
        <div class="report-footer">
          <span>Corporate Governance Record</span>
          <span>Page 3 of Team</span>
        </div>
      </div>
    `;

    // Looping individual booklets (6 pages per member)
    teamReport.memberBooklets.forEach((booklet, idx) => {
      contentHtml += renderMemberBookletHtml(booklet, `Booklet ${idx + 1}`);
    });

  } else {
    // Individual Member booklet
    contentHtml += renderMemberBookletHtml(reportData as MemberReportObject);
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isTeamReport ? 'Team Operations Documentation' : 'Individual Performance Report'}</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <div class="preview-wrapper no-print">
        <div style="background: #ffffff; padding: 12px 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 210mm; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
          <span style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: bold; color: #374151;">PDF Report Print Template System</span>
          <button onclick="window.print()" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: bold; background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            🖨️ Print / Save PDF
          </button>
        </div>
        ${contentHtml}
      </div>
      
      <!-- Print layout container -->
      <div style="display: none;" class="print-only-layout-container">
        ${contentHtml}
      </div>
      
      <script>
        // Copy content for printing
        const style = document.createElement('style');
        style.textContent = '@media print { .preview-wrapper { display: none !important; } .print-only-layout-container { display: block !important; } }';
        document.head.appendChild(style);
        
        // Auto trigger print dialogue
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;
}

// Compile and open a new dedicated window containing ONLY the printable template document
export function printReportAsPdf(reportData: MemberReportObject | TeamReportObject, isTeamReport: boolean): boolean {
  const html = compileReportHtml(reportData, isTeamReport);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Failed to open PDF generation window. Please ensure popups are allowed for this site.');
    return false;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

// ====================================================
// TEAM DAILY ACTIVITY REPORT GENERATOR MODULE
// ====================================================

export interface DailyTeamReportObject {
  dateStr: string;
  formattedDate: string;
  generatedTime: string;
  preparedBy: string;
  classification: string;
  companyName: string;
  summary: {
    tasksCompleted: number;
    tasksInProgress: number;
    tasksPostponed: number;
    tasksOverdue: number;
    followupsCompleted: number;
    followupsMissed: number;
    summaryParagraph: string;
  };
  members: Array<{
    name: string;
    position: string;
    work: {
      inProgress: string[];
      completed: string[];
      postponed: string[];
      overdue: string[];
    };
    followups: {
      completed: Array<{ title: string; type: string }>;
      missed: Array<{ title: string; type: string }>;
      pending: Array<{ title: string; type: string }>;
    };
    qualityChecks: {
      passed: string[];
      failed: string[];
    };
  }>;
  taskDetails: Array<{
    title: string;
    member: string;
    status: string;
    type: 'Work' | 'Follow-Up' | 'QC';
    date: string;
  }>;
  managementView: {
    mostCompleted: Array<{ name: string; count: number }>;
    missedFollowups: Array<{ name: string; count: number }>;
    overdueTasks: Array<{ name: string; count: number }>;
    noActivity: string[];
  };
}

export function buildDailyTeamReportObject(params: {
  dateStr: string;
  preparedBy: string;
  stores: { dataStore: any; qualityCheckStore: any; followupStore: any };
}): DailyTeamReportObject {
  const { dateStr, preparedBy, stores } = params;
  const { dataStore, qualityCheckStore, followupStore } = stores;

  const formattedDate = formatDate(dateStr);
  const now = new Date();
  const generatedTime = now.toTimeString().split(' ')[0];

  const activeMembers = dataStore.members.filter((m: any) => isFollowupParticipant(m));
  const dailyFollowups = getCombinedFollowupRows(dateStr, dateStr, dataStore, followupStore);

  // Completed today
  const completedTasks = dataStore.assignments.filter((a: any) =>
    ['approved', 'completed', 'submitted'].includes(a.status) &&
    a.completedAt?.split('T')[0] === dateStr
  );

  // Currently active / in progress
  const inProgressTasks = dataStore.assignments.filter((a: any) =>
    a.status === 'in_progress'
  );

  // Postponed today
  const postponedTasks = dataStore.assignments.filter((a: any) =>
    a.status === 'postponed' &&
    a.updatedAt?.split('T')[0] === dateStr
  );

  // Overdue today
  const overdueTasks = dataStore.assignments.filter((a: any) =>
    !['approved', 'completed', 'submitted'].includes(a.status) &&
    a.dueDate && a.dueDate < dateStr
  );

  // Quality Checks today
  const dailyQCs = qualityCheckStore.issues.filter((i: any) =>
    i.createdAt?.split('T')[0] === dateStr
  );

  const completedFollowupsCount = dailyFollowups.filter(f => f.status === 'done' || f.status === 'late').length;
  const missedFollowupsCount = dailyFollowups.filter(f => f.status === 'missed').length;

  const memberReportDetails = activeMembers.map((m: any) => {
    const memberId = m.id;
    const memberWebsiteIds = new Set(
      dataStore.websites.filter((w: any) => w.createdBy === memberId).map((w: any) => w.id)
    );

    const mCompleted = completedTasks.filter((a: any) => a.assignedMemberId === memberId)
      .map((a: any) => getTaskTitle(a.promptId, dataStore));
    const mInProgress = inProgressTasks.filter((a: any) => a.assignedMemberId === memberId)
      .map((a: any) => getTaskTitle(a.promptId, dataStore));
    const mPostponed = postponedTasks.filter((a: any) => a.assignedMemberId === memberId)
      .map((a: any) => getTaskTitle(a.promptId, dataStore));
    const mOverdue = overdueTasks.filter((a: any) => a.assignedMemberId === memberId)
      .map((a: any) => getTaskTitle(a.promptId, dataStore));

    // Follow-ups
    const mFollowups = dailyFollowups.filter(f => f.assignedTo === memberId);
    
    const resolveType = (type: string) => {
      if (type.includes('Blog')) return 'Blog';
      if (type.includes('eBay')) return 'eBay';
      if (type.includes('Speed') || type.includes('Optimization')) return 'Website Optimization';
      if (type.includes('Plugin')) return 'Plugin';
      return 'Other';
    };

    const mFollowupsCompleted = mFollowups.filter(f => f.status === 'done' || f.status === 'late')
      .map(f => ({ title: f.notes || 'Routine Check', type: resolveType(f.type) }));
    const mFollowupsMissed = mFollowups.filter(f => f.status === 'missed')
      .map(f => ({ title: f.notes || 'Routine Check', type: resolveType(f.type) }));
    const mFollowupsPending = mFollowups.filter(f => f.status === 'pending' || f.status === 'in_progress')
      .map(f => ({ title: f.notes || 'Routine Check', type: resolveType(f.type) }));

    // Quality checks
    const mQCs = dailyQCs.filter((i: any) => i.assignedTo === memberId);
    const mQCsPassed = mQCs.filter((i: any) => i.status === 'approved').map((i: any) => i.title);
    const mQCsFailed = mQCs.filter((i: any) => i.status !== 'approved').map((i: any) => i.title);

    return {
      name: m.fullName || m.email,
      position: getMemberPosition(memberId, dataStore),
      work: {
        inProgress: mInProgress,
        completed: mCompleted,
        postponed: mPostponed,
        overdue: mOverdue
      },
      followups: {
        completed: mFollowupsCompleted,
        missed: mFollowupsMissed,
        pending: mFollowupsPending
      },
      qualityChecks: {
        passed: mQCsPassed,
        failed: mQCsFailed
      }
    };
  });

  // Task details table list
  const taskDetails: DailyTeamReportObject['taskDetails'] = [];

  completedTasks.forEach((a: any) => {
    taskDetails.push({
      title: getTaskTitle(a.promptId, dataStore),
      member: getMemberName(a.assignedMemberId, dataStore),
      status: 'Completed',
      type: 'Work',
      date: formatDate(a.completedAt || a.updatedAt)
    });
  });

  inProgressTasks.forEach((a: any) => {
    taskDetails.push({
      title: getTaskTitle(a.promptId, dataStore),
      member: getMemberName(a.assignedMemberId, dataStore),
      status: 'In Progress',
      type: 'Work',
      date: formatDate(a.assignedAt)
    });
  });

  dailyFollowups.forEach(f => {
    taskDetails.push({
      title: f.notes || 'Routine Follow-Up',
      member: getMemberName(f.assignedTo, dataStore),
      status: f.status.toUpperCase(),
      type: 'Follow-Up',
      date: formatDate(f.scheduledDate)
    });
  });

  dailyQCs.forEach((q: any) => {
    taskDetails.push({
      title: q.title,
      member: getMemberName(q.assignedTo, dataStore),
      status: q.status.toUpperCase(),
      type: 'QC',
      date: formatDate(q.createdAt)
    });
  });

  // Management View arrays
  const mostCompleted: DailyTeamReportObject['managementView']['mostCompleted'] = [];
  const missedFollowups: DailyTeamReportObject['managementView']['missedFollowups'] = [];
  const overdueTasksMV: DailyTeamReportObject['managementView']['overdueTasks'] = [];
  const noActivity: string[] = [];

  memberReportDetails.forEach((m: any) => {
    const completedCount = m.work.completed.length;
    const missedCount = m.followups.missed.length;
    const overdueCount = m.work.overdue.length;

    if (completedCount > 0) mostCompleted.push({ name: m.name, count: completedCount });
    if (missedCount > 0) missedFollowups.push({ name: m.name, count: missedCount });
    if (overdueCount > 0) overdueTasksMV.push({ name: m.name, count: overdueCount });

    const totalActivity = completedCount + m.work.inProgress.length + m.work.postponed.length +
      m.followups.completed.length + m.qualityChecks.passed.length + m.qualityChecks.failed.length;
    if (totalActivity === 0) noActivity.push(m.name);
  });

  mostCompleted.sort((a: any, b: any) => b.count - a.count);
  missedFollowups.sort((a: any, b: any) => b.count - a.count);
  overdueTasksMV.sort((a: any, b: any) => b.count - a.count);

  const summaryParagraph = `Today the team completed multiple assigned tasks across work board and follow-up operations. Specifically, ${completedTasks.length} tasks were completed, and ${completedFollowupsCount} follow-up checklists were executed. However, ${missedFollowupsCount} follow-up routines were missed, and ${overdueTasks.length} tasks remain overdue, requiring immediate supervisory check-in.`;

  return {
    dateStr,
    formattedDate,
    generatedTime,
    preparedBy,
    classification: 'Executive Management Review Only',
    companyName: 'KiuQ Website System',
    summary: {
      tasksCompleted: completedTasks.length,
      tasksInProgress: inProgressTasks.length,
      tasksPostponed: postponedTasks.length,
      tasksOverdue: overdueTasks.length,
      followupsCompleted: completedFollowupsCount,
      followupsMissed: missedFollowupsCount,
      summaryParagraph
    },
    members: memberReportDetails,
    taskDetails,
    managementView: {
      mostCompleted,
      missedFollowups,
      overdueTasks: overdueTasksMV,
      noActivity
    }
  };
}

export function compileDailyReportHtml(dailyReport: DailyTeamReportObject): string {
  let contentHtml = '';

  // Page 1: Daily Cover Page
  contentHtml += `
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; text-align: center; gap: 30px; margin-top: 40mm;">
        <span class="report-branding-text">${dailyReport.companyName}</span>
        <div style="margin-top: 20px;">
          <h1 class="report-title-cover" style="font-size: 32px;">Daily Team Activity Report</h1>
          <p class="report-subtitle-cover">Official Operational Record</p>
        </div>
        
        <div class="report-meta-box" style="width: 100%; max-width: 450px; text-align: left; margin-top: 40px;">
          <table class="report-meta-table">
            <tbody>
              <tr>
                <td class="report-meta-label">Report Date</td>
                <td class="report-meta-value">${dailyReport.formattedDate}</td>
              </tr>
              <tr>
                <td class="report-meta-label">Generated Time</td>
                <td class="report-meta-value">${dailyReport.generatedTime}</td>
              </tr>
              <tr>
                <td class="report-meta-label">Prepared By</td>
                <td class="report-meta-value">${dailyReport.preparedBy}</td>
              </tr>
              <tr>
                <td class="report-meta-label">Classification</td>
                <td class="report-meta-value">${dailyReport.classification}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="report-footer">
        <span>Daily Team Operations Registry</span>
        <span>Page 1 of 5</span>
      </div>
    </div>
  `;

  // Page 2: Team Summary
  contentHtml += `
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Daily Team Summary</span>
          <span>${dailyReport.formattedDate}</span>
        </div>
        <h2 class="report-section-title">1. Operational Summary</h2>
        <p class="report-paragraph" style="margin-bottom: 20px;">${dailyReport.summary.summaryParagraph}</p>
        
        <table class="report-table" style="margin-top: 20px;">
          <thead>
            <tr>
              <th style="width: 70%;">Operational Metric</th>
              <th style="width: 30%; text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Tasks Completed Today</td>
              <td style="text-align: right; font-weight: bold; color: #10b981;">${dailyReport.summary.tasksCompleted}</td>
            </tr>
            <tr>
              <td>Total Tasks Currently In Progress</td>
              <td style="text-align: right; font-weight: bold; color: #3b82f6;">${dailyReport.summary.tasksInProgress}</td>
            </tr>
            <tr>
              <td>Total Tasks Postponed Today</td>
              <td style="text-align: right; font-weight: bold; color: #f59e0b;">${dailyReport.summary.tasksPostponed}</td>
            </tr>
            <tr>
              <td>Total Tasks Overdue Today</td>
              <td style="text-align: right; font-weight: bold; color: #ef4444;">${dailyReport.summary.tasksOverdue}</td>
            </tr>
            <tr>
              <td>Total Follow-Ups Completed Today</td>
              <td style="text-align: right; font-weight: bold; color: #10b981;">${dailyReport.summary.followupsCompleted}</td>
            </tr>
            <tr>
              <td>Total Follow-Ups Missed Today</td>
              <td style="text-align: right; font-weight: bold; color: #ef4444;">${dailyReport.summary.followupsMissed}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="report-footer">
        <span>Daily Team Operations Registry</span>
        <span>Page 2 of 5</span>
      </div>
    </div>
  `;

  // Page 3: Member Breakdown
  const memberBreakdownsHtml = dailyReport.members.map(m => `
    <div style="page-break-inside: avoid; margin-bottom: 25px; border-bottom: 1px dashed #d1d5db; padding-bottom: 15px;">
      <h3 style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: bold; color: #111827; margin-bottom: 8px;">
        ${m.name} <span style="font-size: 10px; color: #6b7280; font-weight: 500; margin-left: 5px;">— ${m.position}</span>
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #4b5563; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px;">Work Board</h4>
          <ul class="report-bullets" style="font-size: 10.5px; padding-left: 15px; margin: 0;">
            ${m.work.completed.map(title => `<li><span style="color: #10b981; font-weight: bold;">[Completed]</span> ${title}</li>`).join('')}
            ${m.work.inProgress.map(title => `<li><span style="color: #3b82f6; font-weight: bold;">[Active]</span> ${title}</li>`).join('')}
            ${m.work.postponed.map(title => `<li><span style="color: #f59e0b; font-weight: bold;">[Postponed]</span> ${title}</li>`).join('')}
            ${m.work.overdue.map(title => `<li><span style="color: #ef4444; font-weight: bold;">[Overdue]</span> ${title}</li>`).join('')}
            ${(m.work.completed.length + m.work.inProgress.length + m.work.postponed.length + m.work.overdue.length === 0) ? '<li style="color: #9ca3af; font-style: italic;">No active work cards</li>' : ''}
          </ul>
        </div>
        <div>
          <h4 style="font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #4b5563; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px;">Follow-Ups & Quality</h4>
          <ul class="report-bullets" style="font-size: 10.5px; padding-left: 15px; margin: 0;">
            ${m.followups.completed.map(f => `<li><span style="color: #10b981; font-weight: bold;">[Follow-Up]</span> ${f.title} <span style="font-size: 9px; color: #6b7280;">(${f.type})</span></li>`).join('')}
            ${m.followups.missed.map(f => `<li><span style="color: #ef4444; font-weight: bold;">[Missed]</span> ${f.title} <span style="font-size: 9px; color: #6b7280;">(${f.type})</span></li>`).join('')}
            ${m.followups.pending.map(f => `<li><span style="color: #6b7280; font-weight: bold;">[Pending]</span> ${f.title} <span style="font-size: 9px; color: #6b7280;">(${f.type})</span></li>`).join('')}
            ${m.qualityChecks.passed.map(title => `<li><span style="color: #10b981; font-weight: bold;">[QC Pass]</span> ${title}</li>`).join('')}
            ${m.qualityChecks.failed.map(title => `<li><span style="color: #ef4444; font-weight: bold;">[QC Fail]</span> ${title}</li>`).join('')}
            ${(m.followups.completed.length + m.followups.missed.length + m.followups.pending.length + m.qualityChecks.passed.length + m.qualityChecks.failed.length === 0) ? '<li style="color: #9ca3af; font-style: italic;">No checklist activity today</li>' : ''}
          </ul>
        </div>
      </div>
    </div>
  `).join('');

  contentHtml += `
    <div class="pdf-page" style="height: auto; min-height: 297mm; page-break-after: always;">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Member Operations Breakdown</span>
          <span>${dailyReport.formattedDate}</span>
        </div>
        <h2 class="report-section-title">2. Team Member Activity</h2>
        <div style="margin-top: 10px;">
          ${memberBreakdownsHtml}
        </div>
      </div>
      <div class="report-footer" style="margin-top: 20px;">
        <span>Daily Team Operations Registry</span>
        <span>Page 3 of 5</span>
      </div>
    </div>
  `;

  // Page 4: Task Details
  const taskRows = dailyReport.taskDetails.slice(0, 30).map(t => `
    <tr>
      <td style="font-weight: bold;">${t.title}</td>
      <td>${t.member}</td>
      <td style="font-weight: bold;">${t.status}</td>
      <td style="text-align: center;">${t.type}</td>
      <td style="text-align: center;">${t.date}</td>
    </tr>
  `).join('');

  const emptyTaskRows = dailyReport.taskDetails.length === 0 ? `
    <tr>
      <td colspan="5" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">No operational logs recorded for this date.</td>
    </tr>
  ` : '';

  contentHtml += `
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Operational Details Log</span>
          <span>${dailyReport.formattedDate}</span>
        </div>
        <h2 class="report-section-title">3. Comprehensive Operations Log</h2>
        <p class="report-paragraph" style="font-size: 11px; margin-bottom: 8px;">Detailed chronological registry of tasks, checklists, and quality audits updated during the reporting day.</p>
        
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 35%">Task Title</th>
              <th style="width: 20%">Member</th>
              <th style="width: 15%">Status</th>
              <th style="width: 15%; text-align: center;">Type</th>
              <th style="width: 15%; text-align: center;">Activity Date</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
            ${emptyTaskRows}
          </tbody>
        </table>
      </div>
      <div class="report-footer">
        <span>Daily Team Operations Registry</span>
        <span>Page 4 of 5</span>
      </div>
    </div>
  `;

  // Page 5: Management View
  let mcHtml = dailyReport.managementView.mostCompleted.map(item => `<li><strong>${item.name}</strong> (${item.count} work tasks completed)</li>`).join('');
  if (!mcHtml) mcHtml = '<li style="color: #6b7280; font-style: italic;">No tasks completed today.</li>';

  let mfHtml = dailyReport.managementView.missedFollowups.map(item => `<li><strong>${item.name}</strong> (${item.count} follow-ups missed)</li>`).join('');
  if (!mfHtml) mfHtml = '<li style="color: #6b7280; font-style: italic;">All follow-ups completed on schedule.</li>';

  let otHtml = dailyReport.managementView.overdueTasks.map(item => `<li><strong>${item.name}</strong> (${item.count} tasks currently overdue)</li>`).join('');
  if (!otHtml) otHtml = '<li style="color: #6b7280; font-style: italic;">No overdue tasks reported for active members.</li>';

  let naHtml = dailyReport.managementView.noActivity.map(name => `<li><strong>${name}</strong></li>`).join('');
  if (!naHtml) naHtml = '<li style="color: #6b7280; font-style: italic;">All active members recorded operational entries.</li>';

  contentHtml += `
    <div class="pdf-page">
      <div style="display: flex; flex-direction: column; flex: 1; gap: 20px;">
        <div class="report-header">
          <span>Executive Management Audit</span>
          <span>${dailyReport.formattedDate}</span>
        </div>
        <h2 class="report-section-title">4. Operational Management Observations</h2>
        
        <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 10px;">
          <div>
            <h4 style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4b5563; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px;">High Task Completion Today</h4>
            <ul class="report-bullets" style="font-size: 12px; padding-left: 15px;">
              ${mcHtml}
            </ul>
          </div>
          
          <div>
            <h4 style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4b5563; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px;">Missed Follow-Ups (Requires Supervisor Action)</h4>
            <ul class="report-bullets" style="font-size: 12px; padding-left: 15px;">
              ${mfHtml}
            </ul>
          </div>
          
          <div>
            <h4 style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4b5563; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px;">Active Overdue Deadlines</h4>
            <ul class="report-bullets" style="font-size: 12px; padding-left: 15px;">
              ${otHtml}
            </ul>
          </div>
          
          <div>
            <h4 style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4b5563; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px;">No Activity Logged Today</h4>
            <ul class="report-bullets" style="font-size: 12px; padding-left: 15px;">
              ${naHtml}
            </ul>
          </div>
        </div>
      </div>
      <div class="report-footer">
        <span>Daily Team Operations Registry</span>
        <span>Page 5 of 5</span>
      </div>
    </div>
  `;

  // Global styles is already resolved from outer scope
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Team Activity Report — ${dailyReport.formattedDate}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Georgia&family=Inter:wght@400;500;700;800&display=swap');
        body, html {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #111827;
          font-family: 'Georgia', Garamond, 'Times New Roman', serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .preview-wrapper {
          background: #f3f4f6;
          padding: 2rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          min-height: 100vh;
        }
        .pdf-page {
          width: 210mm;
          box-sizing: border-box;
          background: #ffffff;
          padding: 20mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          border-radius: 4px;
        }
        .report-branding-text {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #6b7280;
          text-transform: uppercase;
        }
        .report-title-cover {
          font-family: 'Georgia', serif;
          font-size: 36px;
          font-weight: 700;
          color: #111827;
          line-height: 1.25;
        }
        .report-subtitle-cover {
          font-family: 'Georgia', serif;
          font-size: 16px;
          font-style: italic;
          color: #4b5563;
          margin-top: 10px;
        }
        .report-meta-box {
          border-top: 2px solid #111827;
          border-bottom: 2px solid #111827;
          padding: 16px 0;
          margin-top: 40px;
        }
        .report-meta-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
        }
        .report-meta-table td {
          padding: 6px 0;
          vertical-align: middle;
        }
        .report-meta-label {
          font-weight: 700;
          color: #4b5563;
          width: 35%;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
        }
        .report-meta-value {
          font-weight: 500;
          color: #111827;
          width: 65%;
        }
        .report-header {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          color: #6b7280;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .report-section-title {
          font-family: 'Georgia', serif;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          border-bottom: 1.5px solid #111827;
          padding-bottom: 6px;
          margin-top: 10px;
          margin-bottom: 15px;
        }
        .report-paragraph {
          font-family: 'Georgia', serif;
          font-size: 13px;
          line-height: 1.6;
          color: #1f2937;
          text-align: justify;
          margin-bottom: 16px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
        }
        .report-table th {
          border-bottom: 2px solid #111827;
          border-top: 1px solid #e5e7eb;
          padding: 8px 6px;
          text-align: left;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.05em;
          background: transparent !important;
        }
        .report-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 6px;
          vertical-align: top;
          color: #1f2937;
        }
        .report-table tbody tr:last-child td {
          border-bottom: 2px solid #111827;
        }
        .report-bullets {
          font-family: 'Georgia', serif;
          font-size: 12.5px;
          line-height: 1.6;
          color: #1f2937;
          padding-left: 20px;
          list-style-type: square;
        }
        .report-bullets li {
          margin-bottom: 8px;
        }
        .report-footer {
          display: flex;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
          font-size: 9px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 8px;
          margin-top: auto;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media print {
          body, html {
            background: #ffffff !important;
          }
          .preview-wrapper {
            display: none !important;
          }
          .print-only-layout-container {
            display: block !important;
          }
          .pdf-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
          }
          .pdf-page table th, 
          .pdf-page table td {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
            font-size: 8.5px !important;
            line-height: 1.35 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="preview-wrapper no-print">
        <div style="background: #ffffff; padding: 12px 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 210mm; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
          <span style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: bold; color: #374151;">Daily Team Activity Report Template</span>
          <button onclick="window.print()" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: bold; background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            🖨️ Print / Save PDF
          </button>
        </div>
        ${contentHtml}
      </div>
      
      <div style="display: none;" class="print-only-layout-container">
        ${contentHtml}
      </div>
      
      <script>
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;
}

export function printDailyReportAsPdf(dailyReport: DailyTeamReportObject): boolean {
  const html = compileDailyReportHtml(dailyReport);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Failed to open Daily PDF generation window. Please ensure popups are allowed for this site.');
    return false;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
