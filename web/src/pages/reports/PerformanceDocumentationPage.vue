<template>
  <div class="reports-documentation-dashboard flex flex-col gap-6 w-full">
    <!-- Tab Navigation (Hidden on print) -->
    <div class="no-print flex border-b border-border gap-4 mb-2">
      <button
        type="button"
        class="pb-3 text-sm font-bold border-b-2 px-2 transition-all"
        :class="activeReportTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'"
        @click="activeReportTab = 'performance'"
      >
        {{ $t('Performance Documentation') }}
      </button>
      <button
        type="button"
        class="pb-3 text-sm font-bold border-b-2 px-2 transition-all"
        :class="activeReportTab === 'daily-activity' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'"
        @click="activeReportTab = 'daily-activity'"
      >
        {{ $t('Team Daily Activity Report') }}
      </button>
    </div>

    <!-- Mode: PERFORMANCE DOCUMENTATION -->
    <template v-if="activeReportTab === 'performance'">
      <!-- Filters Panel (Hidden on print) -->
      <div class="no-print card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-5">
        <!-- Period Preset -->
        <div class="flex flex-col gap-1.5">
          <label class="label text-xs font-bold text-text-muted">{{ $t('Period Preset') }}</label>
          <div class="flex gap-2">
            <button
              v-for="preset in presets"
              :key="preset.value"
              type="button"
              class="chip text-xs"
              :class="{ 'chip-active': datePreset === preset.value }"
              @click="applyPreset(preset.value)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Custom dates picker -->
        <div class="flex gap-3" v-if="datePreset === 'custom'">
          <div class="flex flex-col gap-1.5">
            <label class="label text-xs font-bold text-text-muted">{{ $t('Start Date') }}</label>
            <input type="date" v-model="localFilters.startDate" class="input py-1.5 px-3 max-w-[150px] text-xs font-semibold" @change="() => fetchData()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="label text-xs font-bold text-text-muted">{{ $t('End Date') }}</label>
            <input type="date" v-model="localFilters.endDate" class="input py-1.5 px-3 max-w-[150px] text-xs font-semibold" @change="() => fetchData()" />
          </div>
        </div>

        <!-- Team Selector -->
        <div class="flex flex-col gap-1.5 min-w-[160px]">
          <label class="label text-xs font-bold text-text-muted">{{ $t('Team / Department') }}</label>
          <select v-model="selectedTeam" class="input py-1.5 px-3 text-xs font-semibold" @change="handleTeamChange">
            <option value="">{{ $t('All Teams') }}</option>
            <option v-for="team in uniqueTeams" :key="team" :value="team">{{ team }}</option>
          </select>
        </div>

        <!-- Member Selector -->
        <div class="flex flex-col gap-1.5 min-w-[220px]">
          <label class="label text-xs font-bold text-text-muted">{{ $t('Member Selector') }}</label>
          <select v-model="selectedMemberId" class="input py-1.5 px-3 text-xs font-semibold" @change="handleMemberChange">
            <option value="">{{ $t('All Members (Team Summary)') }}</option>
            <option v-for="m in filteredActiveMembers" :key="m.id" :value="m.id">{{ m.fullName || m.email }}</option>
          </select>
        </div>

        <!-- Actions -->
        <div class="ml-auto flex gap-3">
          <button type="button" class="btn-secondary flex items-center gap-1.5 text-xs" @click="fetchData(true)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            {{ $t('Refresh') }}
          </button>
          <button type="button" class="btn-primary flex items-center gap-2 font-bold text-xs" @click="exportToPdf">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            {{ $t('Export PDF') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading screen -->
    <div v-if="loading" class="flex flex-col gap-6 items-center justify-center py-20 bg-card border border-border rounded-card shadow-sm w-full">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm text-text-muted font-bold">{{ $t('Collecting documented work from active boards...') }}</p>
    </div>

    <!-- Screen Preview area (Hidden on print) -->
    <div v-else class="no-print flex flex-col gap-6 w-full">
      <!-- Mode 1: TEAM REPORT VIEW -->
      <div v-if="selectedMemberId === ''" class="flex flex-col gap-6 w-full animate-fade-in">
        <!-- Team Summary KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-7 gap-4">
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Total Members') }}</span>
            <span class="text-2xl font-black text-text-main mt-2">{{ filteredActiveMembers.length }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Plugin Updates') }}</span>
            <span class="text-2xl font-black text-emerald-500 mt-2">{{ teamSummaryStats.pluginsCompleted }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('eBay Clicks') }}</span>
            <span class="text-2xl font-black text-blue-500 mt-2">{{ teamSummaryStats.ebayCompleted }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Optimizations') }}</span>
            <span class="text-2xl font-black text-rose-500 mt-2">{{ teamSummaryStats.speedCompleted }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Blogs Posted') }}</span>
            <span class="text-2xl font-black text-amber-500 mt-2">{{ teamSummaryStats.blogCompleted }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Quality Checks') }}</span>
            <span class="text-2xl font-black text-indigo-500 mt-2">{{ teamSummaryStats.qualityIssuesLogged }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold text-primary">{{ $t('Total Follow-Ups') }}</span>
            <span class="text-2xl font-black text-primary mt-2">{{ teamSummaryStats.followupsCompleted }}</span>
          </div>
        </div>

        <!-- Member Breakdown Table -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main">{{ $t('Member Breakdown') }}</h3>
          <div class="overflow-x-auto border border-border rounded-btn">
            <table class="w-full text-left text-sm leading-normal border-collapse">
              <thead>
                <tr class="bg-soft text-text-muted font-bold border-b border-border text-xs uppercase">
                  <th class="py-3 px-4">{{ $t('Name') }}</th>
                  <th class="py-3 px-4">{{ $t('Position') }}</th>
                  <th class="py-3 px-4 text-center">{{ $t('Plugin Updates') }}</th>
                  <th class="py-3 px-4 text-center">{{ $t('eBay Clicks') }}</th>
                  <th class="py-3 px-4 text-center">{{ $t('Optimizations') }}</th>
                  <th class="py-3 px-4 text-center">{{ $t('Blogs Posted') }}</th>
                  <th class="py-3 px-4 text-center text-primary">{{ $t('Total Follow-Ups') }}</th>
                  <th class="py-3 px-4 text-center">{{ $t('Action') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredActiveMembers" :key="m.id" class="border-b border-border text-text-main font-semibold hover:bg-soft/40 transition">
                  <td class="py-3 px-4 font-bold text-text-main">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black overflow-hidden border border-border">
                        <img
                          v-if="m.avatarUrl"
                          :src="m.avatarUrl"
                          :alt="m.fullName"
                          class="h-full w-full object-cover"
                          @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                        />
                        <span v-else>{{ initials(m.fullName || m.email) }}</span>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-text-main">{{ m.fullName || m.email }}</span>
                        <span class="text-[10px] text-text-muted font-normal mt-0.5">{{ m.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-text-muted text-xs font-normal">{{ getMemberPosition(m.id) }}</td>
                  <td class="py-3.5 px-4 text-center text-emerald-500 font-bold font-mono">{{ getMemberTypeFraction(m.id, 'Plugin') }}</td>
                  <td class="py-3.5 px-4 text-center text-blue-500 font-bold font-mono">{{ getMemberTypeFraction(m.id, 'eBay') }}</td>
                  <td class="py-3.5 px-4 text-center text-rose-500 font-bold font-mono">{{ getMemberTypeFraction(m.id, 'Speed') }}</td>
                  <td class="py-3.5 px-4 text-center text-amber-500 font-bold font-mono">{{ getMemberTypeFraction(m.id, 'Blog') }}</td>
                  <td class="py-3.5 px-4 text-center text-primary font-bold font-mono">{{ getMemberFollowupFraction(m.id) }}</td>
                  <td class="py-3.5 px-4 text-center">
                    <button type="button" class="text-xs text-primary font-extrabold hover:underline" @click="selectedMemberId = m.id">
                      {{ $t('Expand & View Details') }}
                    </button>
                  </td>
                </tr>
                <tr v-if="filteredActiveMembers.length === 0">
                  <td colspan="7" class="py-8 text-center text-text-muted italic">{{ $t('No team members match the selected team filter.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Mode 2: MEMBER REPORT VIEW -->
      <div v-else class="flex flex-col gap-6 w-full animate-fade-in">
        <!-- Member Information Card -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-wrap items-center gap-6 justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-text-muted font-bold uppercase tracking-wider">{{ $t('Member Information') }}</span>
            <h2 class="text-xl font-black text-text-main mt-1">{{ getMemberName(selectedMemberId) }}</h2>
            <div class="flex gap-4 text-xs font-semibold text-text-muted mt-0.5">
              <span><strong>{{ $t('Position:') }}</strong> {{ getMemberPosition(selectedMemberId) }}</span>
              <span><strong>{{ $t('Department:') }}</strong> {{ getMemberDepartment(selectedMemberId) }}</span>
            </div>
          </div>
          <div class="text-right flex flex-col gap-1">
            <span class="text-xs text-text-muted font-bold uppercase tracking-wider">{{ $t('Reporting Period') }}</span>
            <span class="text-sm font-bold text-text-main mt-1">{{ formattedPeriod }}</span>
          </div>
        </div>



        <!-- Quality Check Section -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main border-b border-border pb-3">{{ $t('Quality Check Section') }}</h3>
          <div class="overflow-x-auto border border-border rounded-btn">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="bg-soft border-b border-border text-xs text-text-muted font-bold uppercase">
                  <th class="py-2.5 px-3">{{ $t('Quality Check Item') }}</th>
                  <th class="py-2.5 px-3">{{ $t('Assigned By') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Review Date') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Status') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Result') }}</th>
                  <th class="py-2.5 px-3">{{ $t('Notes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="issue in getMemberQualityIssues(selectedMemberId)"
                  :key="issue.id"
                  class="border-b border-border text-text-main hover:bg-soft/20 transition font-semibold"
                >
                  <td class="py-3 px-3 font-bold">
                    {{ issue.title }}
                    <div class="text-[10px] text-text-muted font-normal mt-0.5">Website: {{ getWebsiteName(issue.websiteId) }}</div>
                  </td>
                  <td class="py-3 px-3 text-text-muted text-xs">{{ getMemberName(issue.createdBy) }}</td>
                  <td class="py-3 px-3 text-center text-text-muted text-xs">{{ formatDate(issue.createdAt) }}</td>
                  <td class="py-3 px-3 text-center">
                    <span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold" :class="getQualityStatusClass(issue.status)">
                      {{ issue.status.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-center font-bold" :class="issue.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'">
                    {{ issue.status === 'approved' ? 'Passed' : 'Failed / Pending Fix' }}
                  </td>
                  <td class="py-3 px-3 text-text-muted text-xs max-w-[150px] truncate" :title="issue.description">
                    {{ issue.description || '—' }}
                  </td>
                </tr>
                <tr v-if="getMemberQualityIssues(selectedMemberId).length === 0">
                  <td colspan="6" class="py-8 text-center text-text-muted italic">{{ $t('No quality checks performed during this period.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Follow-Up Section -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main border-b border-border pb-3">{{ $t('Follow-Up Section') }}</h3>
          <div class="overflow-x-auto border border-border rounded-btn">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="bg-soft border-b border-border text-xs text-text-muted font-bold uppercase">
                  <th class="py-2.5 px-3">{{ $t('Activity Name') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Date') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Status') }}</th>
                  <th class="py-2.5 px-3">{{ $t('Notes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="slot in getMemberFollowupRows(selectedMemberId)"
                  :key="slot.id"
                  class="border-b border-border text-text-main hover:bg-soft/20 transition font-semibold"
                >
                  <td class="py-3 px-3 font-bold">
                    {{ slot.type }}
                    <div class="text-[10px] text-text-muted font-normal mt-0.5" v-if="slot.websiteId">Website: {{ getWebsiteName(slot.websiteId) }}</div>
                  </td>
                  <td class="py-3 px-3 text-center text-text-muted text-xs">{{ slot.scheduledDate }}</td>
                  <td class="py-3 px-3 text-center">
                    <span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold" :class="getFollowupStatusClass(slot.status)">
                      {{ slot.status }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-text-muted text-xs max-w-[200px] truncate" :title="slot.notes">
                    {{ slot.notes || '—' }}
                  </td>
                </tr>
                <tr v-if="getMemberFollowupRows(selectedMemberId).length === 0">
                  <td colspan="4" class="py-8 text-center text-text-muted italic">{{ $t('No follow-up check activities found.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Manager Observation Section -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main border-b border-border pb-3">{{ $t('Manager Observation Section') }}</h3>
          
          <!-- Checklist selector -->
          <div class="flex flex-col gap-2">
            <span class="text-xs text-text-muted font-bold uppercase tracking-wider">{{ $t('Factual Summary Templates (Select to append)') }}</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <label
                v-for="obs in standardObservations"
                :key="obs.id"
                class="flex items-start gap-2.5 p-2.5 rounded-btn border border-border bg-input hover:bg-soft cursor-pointer transition text-xs font-semibold"
                :class="{ 'border-primary bg-primary/5': selectedObservations.includes(obs.text) }"
              >
                <input
                  type="checkbox"
                  :value="obs.text"
                  v-model="selectedObservations"
                  class="rounded text-primary focus:ring-primary h-4 w-4 border-border mt-0.5"
                />
                <span>{{ obs.text }}</span>
              </label>
            </div>
          </div>

          <!-- Notes text area -->
          <div class="flex flex-col gap-1.5 mt-2">
            <label class="label">{{ $t('Custom Notes & Specific Remarks') }}</label>
            <textarea
              v-model="customNotes"
              class="input min-h-[90px] text-xs leading-relaxed"
              :placeholder="$t('Enter additional factual observations, coaching plans, or operational remarks...')"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Only Section (Hidden on screen) -->
    <!-- ============================================== -->
    <div class="print-only">
      <!-- Mode A: TEAM EXPORT SHEET SET -->
      <template v-if="selectedMemberId === ''">
        <!-- TEAM PAGE 1: COVER -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col justify-center items-center flex-1 text-center gap-12" style="margin-top: 40mm;">
            <div class="flex flex-col items-center gap-2">
              <span class="report-branding-text text-xs uppercase font-extrabold tracking-widest text-gray-500">{{ $t('KiuQ Website System') }}</span>
            </div>
            <div class="flex flex-col gap-2 mt-8">
              <h1 class="report-title-cover">{{ $t('Team Operations Documentation') }}</h1>
              <p class="report-subtitle-cover">{{ $t('Consolidated Performance & Operational Registry') }}</p>
            </div>
            <div class="report-meta-box w-full max-w-md mt-16 text-left">
              <table class="report-meta-table">
                <tbody>
                  <tr>
                    <td class="report-meta-label">{{ $t('Reporting Period') }}</td>
                    <td class="report-meta-value">{{ formattedPeriod }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Generated Date') }}</td>
                    <td class="report-meta-value">{{ formatDate(nowTimestamp.split('T')[0]) }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Active Staff') }}</td>
                    <td class="report-meta-value">{{ filteredActiveMembers.length }} Members</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Prepared By') }}</td>
                    <td class="report-meta-value">{{ generatorName }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Classification') }}</td>
                    <td class="report-meta-value">{{ $t('Executive Management Review Only') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="report-footer">
            <span>{{ $t('Corporate Governance Record') }}</span>
            <span>{{ $t('Cover Page') }}</span>
          </div>
        </div>

        <!-- TEAM PAGE 2: TEAM SUMMARY -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Team Summary') }}</span>
              <span class="text-xs font-bold">{{ formattedPeriod }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('1. Executive Team Summary') }}</h2>
            
            <div class="report-summary-paragraph mt-4">
              <p class="report-paragraph">
                {{ $t('This report represents the aggregated operational records and work activities of the website team for the reporting period from') }} <strong>{{ formatDate(localFilters.startDate) }}</strong> {{ $t('to') }} <strong>{{ formatDate(localFilters.endDate) }}</strong>{{ $t('. It consolidates completed deliverables, active board tasks, quality checks, and follow-up updates across all team members to serve as a high-level record for executive management.') }}
              </p>
            </div>

            <table class="report-table mt-6">
              <thead>
                <tr>
                  <th style="width: 70%">{{ $t('Operational Metric') }}</th>
                  <th style="width: 30%; text-align: right;">{{ $t('Value') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ $t('Total Active Members') }}</td>
                  <td style="text-align: right; font-weight: bold;">{{ filteredActiveMembers.length }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Total Plugin Updates Completed') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #10b981;">{{ teamSummaryStats.pluginsCompleted }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Total eBay Clicks Completed') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #3b82f6;">{{ teamSummaryStats.ebayCompleted }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Total Website Optimizations') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #ef4444;">{{ teamSummaryStats.speedCompleted }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Total Blogs Posted') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #f59e0b;">{{ teamSummaryStats.blogCompleted }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Total Quality Checks Passed') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #4f46e5;">{{ teamSummaryStats.qualityIssuesLogged }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Total Follow-Ups Completed') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #4f46e5;">{{ teamSummaryStats.followupsCompleted }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="report-footer">
            <span>{{ $t('Corporate Governance Record') }}</span>
            <span>{{ $t('Page 2 of Team') }}</span>
          </div>
        </div>

        <!-- TEAM PAGE 3: TEAM MEMBER BREAKDOWN TABLE -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Member Breakdown') }}</span>
              <span class="text-xs font-bold">{{ formattedPeriod }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('2. Team Member Breakdown') }}</h2>
            <p class="report-paragraph" style="margin-bottom: 12px;">{{ $t('Comparative matrix of tasks and checklists completed by team members during the period.') }}</p>
            
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 20%">{{ $t('Member Name') }}</th>
                  <th style="width: 20%">{{ $t('Position') }}</th>
                  <th style="width: 12%; text-align: center;">{{ $t('Plugins') }}</th>
                  <th style="width: 12%; text-align: center;">{{ $t('eBay Clicks') }}</th>
                  <th style="width: 12%; text-align: center;">{{ $t('Speed Opts') }}</th>
                  <th style="width: 12%; text-align: center;">{{ $t('Blogs') }}</th>
                  <th style="width: 12%; text-align: center;">{{ $t('Follow-Ups') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredActiveMembers" :key="m.id">
                  <td style="font-weight: bold;">{{ m.fullName || m.email }}</td>
                  <td>{{ getMemberPosition(m.id) }}</td>
                  <td style="text-align: center; font-weight: bold; color: #10b981;">{{ getMemberTypeFraction(m.id, 'Plugin') }}</td>
                  <td style="text-align: center; font-weight: bold; color: #3b82f6;">{{ getMemberTypeFraction(m.id, 'eBay') }}</td>
                  <td style="text-align: center; font-weight: bold; color: #ef4444;">{{ getMemberTypeFraction(m.id, 'Speed') }}</td>
                  <td style="text-align: center; font-weight: bold; color: #f59e0b;">{{ getMemberTypeFraction(m.id, 'Blog') }}</td>
                  <td style="text-align: center; font-weight: bold; color: #4f46e5;">{{ getMemberFollowupFraction(m.id) }}</td>
                </tr>
                <tr v-if="filteredActiveMembers.length === 0">
                  <td colspan="6" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">{{ $t('No members active during this period.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="report-footer">
            <span>{{ $t('Corporate Governance Record') }}</span>
            <span>{{ $t('Page 3 of Team') }}</span>
          </div>
        </div>

        <!-- LOOP FOR EACH MEMBER booklet in Team report -->
        <template v-for="m in filteredActiveMembers" :key="'print-booklet-' + m.id">
          <!-- Booklet Divider Cover Page -->
          <div class="pdf-page print-page flex flex-col justify-between">
            <div class="flex flex-col justify-center items-center flex-1 text-center gap-12" style="margin-top: 40mm;">
              <div class="flex flex-col items-center gap-2">
                <span class="report-branding-text text-xs uppercase font-extrabold tracking-widest text-gray-500">{{ $t('KiuQ Website System') }}</span>
              </div>
              <div class="flex flex-col gap-2 mt-8">
                <h1 class="report-title-cover" style="font-size: 26px;">{{ $t('Section III: Individual Report') }}</h1>
                <p class="report-subtitle-cover" style="font-size: 16px; font-weight: 800; color: #111827; margin-top: 10px;">{{ m.fullName || m.email }}</p>
                <p class="text-xs text-gray-500 mt-2">{{ getMemberPosition(m.id) }} — {{ getMemberDepartment(m.id) }}</p>
              </div>
              
              <div class="report-meta-box w-full max-w-sm mt-12 text-left">
                <table class="report-meta-table">
                  <tbody>
                    <tr>
                      <td class="report-meta-label">{{ $t('Reporting Period') }}</td>
                      <td class="report-meta-value">{{ formattedPeriod }}</td>
                    </tr>
                    <tr>
                      <td class="report-meta-label">{{ $t('Generated Date') }}</td>
                      <td class="report-meta-value">{{ formatDate(nowTimestamp.split('T')[0]) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="report-footer">
              <span>{{ $t('Section Divider') }}</span>
              <span>{{ m.fullName }}</span>
            </div>
          </div>

          <!-- Booklet Page 2: Summary -->
          <div class="pdf-page print-page flex flex-col justify-between">
            <div class="flex flex-col gap-6 flex-1">
              <div class="report-header flex justify-between items-center">
                <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Performance Summary') }}</span>
                <span class="text-xs font-bold">{{ m.fullName }}</span>
              </div>
              <h2 class="report-section-title">{{ $t('1. Performance Summary') }}</h2>
              
              <div class="report-summary-paragraph mt-4">
                <p class="report-paragraph">
                  {{ $t('This section outlines the personal metrics and work records of') }} <strong>{{ m.fullName }}</strong>{{ $t('. During this reporting window from') }} <strong>{{ formatDate(localFilters.startDate) }}</strong> {{ $t('to') }} <strong>{{ formatDate(localFilters.endDate) }}</strong>{{ $t(', a total of') }} <strong>{{ getMemberFollowupRows(m.id).filter(s => s.status === 'done' || s.status === 'late').length }}</strong> {{ $t('follow-up routines were completed, and') }} <strong>{{ getMemberQualityIssues(m.id).filter(i => i.status === 'approved').length }}</strong> {{ $t('quality checks passed compliance guidelines.') }}
                </p>
              </div>

              <table class="report-table mt-6">
                <thead>
                  <tr>
                    <th style="width: 70%">{{ $t('Operational Metric') }}</th>
                    <th style="width: 30%; text-align: right;">{{ $t('Value') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{{ $t('Plugin Updates Completed') }}</td>
                    <td style="text-align: right; font-weight: bold; color: #10b981;">{{ getMemberFollowupRows(m.id).filter(s => s.type === 'Plugin Update Follow-Up' && (s.status === 'done' || s.status === 'late')).length }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('eBay Clicks Completed') }}</td>
                    <td style="text-align: right; font-weight: bold; color: #3b82f6;">{{ getMemberFollowupRows(m.id).filter(s => s.type === 'eBay Follow-Up' && (s.status === 'done' || s.status === 'late')).length }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('Website Optimizations') }}</td>
                    <td style="text-align: right; font-weight: bold; color: #ef4444;">{{ getMemberFollowupRows(m.id).filter(s => s.type === 'Website Optimization Follow-Up' && (s.status === 'done' || s.status === 'late')).length }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('Blogs Posted') }}</td>
                    <td style="text-align: right; font-weight: bold; color: #f59e0b;">{{ getMemberFollowupRows(m.id).filter(s => s.type === 'Blog Follow-Up' && (s.status === 'done' || s.status === 'late')).length }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('Quality Checks Completed / Approved') }}</td>
                    <td style="text-align: right; font-weight: bold; color: #4f46e5;">{{ getMemberQualityIssues(m.id).filter(i => i.status === 'approved').length }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('Total Follow-Ups Completed') }}</td>
                    <td style="text-align: right; font-weight: bold; color: #4f46e5;">{{ getMemberFollowupRows(m.id).filter(s => s.status === 'done' || s.status === 'late').length }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="report-footer">
              <span>{{ $t('Performance Summary Booklet') }}</span>
              <span>{{ $t('Page 2 of Booklet') }}</span>
            </div>
          </div>



          <!-- Booklet Page 3: Quality Checks -->
          <div class="pdf-page print-page flex flex-col justify-between">
            <div class="flex flex-col gap-6 flex-1">
              <div class="report-header flex justify-between items-center">
                <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Quality Check Activities') }}</span>
                <span class="text-xs font-bold">{{ m.fullName }}</span>
              </div>
              <h2 class="report-section-title">{{ $t('2. Quality Check Activities') }}</h2>
              <p class="report-paragraph" style="margin-bottom: 12px;">{{ $t('Audited link results, spacing checks, and UI review status logs.') }}</p>
              <table class="report-table">
                <thead>
                  <tr>
                    <th style="width: 35%">{{ $t('Quality Item') }}</th>
                    <th style="width: 15%; text-align: center;">{{ $t('Date') }}</th>
                    <th style="width: 15%; text-align: center;">{{ $t('Result') }}</th>
                    <th style="width: 15%; text-align: center;">{{ $t('Status') }}</th>
                    <th style="width: 20%">{{ $t('Notes') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="issue in getMemberQualityIssues(m.id).slice(0, 15)" :key="issue.id">
                    <td style="font-weight: bold;">
                      {{ issue.title }}
                      <div style="font-size: 7.5px; font-weight: normal; color: #6b7280; margin-top: 2px;">Website: {{ getWebsiteName(issue.websiteId) }}</div>
                    </td>
                    <td style="text-align: center;">{{ formatDate(issue.createdAt) }}</td>
                    <td style="text-align: center; font-weight: bold;" :style="{ color: issue.status === 'approved' ? '#10b981' : '#f59e0b' }">
                      {{ issue.status === 'approved' ? 'Passed' : 'Failed' }}
                    </td>
                    <td style="text-align: center; font-weight: bold;">{{ issue.status }}</td>
                    <td>{{ issue.description || '—' }}</td>
                  </tr>
                  <tr v-if="getMemberQualityIssues(m.id).length === 0">
                    <td colspan="5" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">{{ $t('No quality reviews recorded.') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="report-footer">
              <span>{{ $t('Performance Summary Booklet') }}</span>
              <span>{{ $t('Page 3 of Booklet') }}</span>
            </div>
          </div>
          <!-- Booklet Page 4: Follow-Up Activities -->
          <div class="pdf-page print-page flex flex-col justify-between">
            <div class="flex flex-col gap-6 flex-1">
              <div class="report-header flex justify-between items-center">
                <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Follow-Up Activities') }}</span>
                <span class="text-xs font-bold">{{ m.fullName }}</span>
              </div>
              <h2 class="report-section-title">{{ $t('3. Follow-Up Activities') }}</h2>
              <p class="report-paragraph" style="margin-bottom: 12px;">{{ $t('Operational records of completed and pending follow-ups.') }}</p>
              <table class="report-table">
                <thead>
                  <tr>
                    <th style="width: 30%">{{ $t('Activity Name') }}</th>
                    <th style="width: 20%; text-align: center;">{{ $t('Scheduled Date') }}</th>
                    <th style="width: 15%; text-align: center;">{{ $t('Status') }}</th>
                    <th style="width: 35%">{{ $t('Notes') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="slot in getMemberFollowupRows(m.id).slice(0, 15)" :key="slot.id">
                    <td style="font-weight: bold;">
                      {{ slot.type }}
                      <div style="font-size: 7.5px; font-weight: normal; color: #6b7280; margin-top: 2px;" v-if="slot.websiteId">Website: {{ getWebsiteName(slot.websiteId) }}</div>
                    </td>
                    <td style="text-align: center;">{{ slot.scheduledDate }}</td>
                    <td style="text-align: center; font-weight: bold;">{{ slot.status }}</td>
                    <td>{{ slot.notes || '—' }}</td>
                  </tr>
                  <tr v-if="getMemberFollowupRows(m.id).length === 0">
                    <td colspan="4" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">{{ $t('No follow-up activities recorded.') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="report-footer">
              <span>{{ $t('Performance Summary Booklet') }}</span>
              <span>{{ $t('Page 4 of Booklet') }}</span>
            </div>
          </div>

          <!-- Booklet Page 5: Evaluator Notes -->
          <div class="pdf-page print-page flex flex-col justify-between">
            <div class="flex flex-col gap-6 flex-1">
              <div class="report-header flex justify-between items-center">
                <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Management Observations') }}</span>
                <span class="text-xs font-bold">{{ m.fullName }}</span>
              </div>
              <h2 class="report-section-title">{{ $t('5. Manager Notes & Observations') }}</h2>
              
              <div class="report-notes-container mt-6">
                <!-- If this is the currently selected member on screen, we can print observations -->
                <div v-if="m.id === selectedMemberId">
                  <div class="report-notes-block" v-if="selectedObservations.length > 0">
                    <h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="border-bottom: 1px dashed #d1d5db; padding-bottom: 4px;">{{ $t('Factual Observations') }}</h3>
                    <ul class="report-bullets">
                      <li v-for="obs in selectedObservations" :key="obs" style="margin-bottom: 8px; line-height: 1.4;">{{ obs }}</li>
                    </ul>
                  </div>
                  
                  <div class="report-notes-block mt-8" v-if="customNotes">
                    <h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="border-bottom: 1px dashed #d1d5db; padding-bottom: 4px;">{{ $t('Additional Supervisor Remarks') }}</h3>
                    <p class="report-notes-text whitespace-pre-wrap" style="line-height: 1.6; font-style: italic; color: #374151;">{{ customNotes }}</p>
                  </div>
                  
                  <div class="report-notes-block mt-8 text-gray-400 italic text-xs" v-if="selectedObservations.length === 0 && !customNotes">
                    {{ $t('No additional management observations or coaching remarks were recorded for this period.') }}
                  </div>
                </div>
                
                <!-- If this is printed as part of a bulk team report, print empty evaluator lines -->
                <div v-else>
                  <h3 class="text-xs font-bold uppercase tracking-wider mb-4" style="border-bottom: 1px dashed #d1d5db; padding-bottom: 4px;">{{ $t('Supervisor Notes & Evaluations') }}</h3>
                  <div style="margin-top: 15mm;">
                    <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 10mm; height: 1px;"></div>
                    <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 10mm; height: 1px;"></div>
                    <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 10mm; height: 1px;"></div>
                    <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 10mm; height: 1px;"></div>
                    <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 10mm; height: 1px;"></div>
                  </div>
                  <p class="text-[9px] text-gray-400 font-bold uppercase tracking-wider text-right" style="margin-top: 10mm;">{{ $t('Supervisor Signature: _______________________') }}</p>
                </div>
              </div>
            </div>
            <div class="report-footer">
              <span>{{ $t('Performance Summary Booklet') }}</span>
              <span>{{ $t('Page 6 of Booklet') }}</span>
            </div>
          </div>
        </template>
      </template>

      <!-- Mode B: MEMBER PRINT SHEET SET -->
      <template v-else>
        <!-- MEMBER PAGE 1: COVER -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col justify-center items-center flex-1 text-center gap-12" style="margin-top: 40mm;">
            <div class="flex flex-col items-center gap-2">
              <span class="report-branding-text text-xs uppercase font-extrabold tracking-widest text-gray-500">{{ $t('KiuQ Website System') }}</span>
            </div>
            <div class="flex flex-col gap-2 mt-8">
              <h1 class="report-title-cover">{{ $t('Executive Performance Report') }}</h1>
              <p class="report-subtitle-cover">{{ $t('Individual Performance & Operations Registry') }}</p>
            </div>
            <div class="report-meta-box w-full max-w-md mt-16 text-left">
              <table class="report-meta-table">
                <tbody>
                  <tr>
                    <td class="report-meta-label">{{ $t('Employee Name') }}</td>
                    <td class="report-meta-value">{{ getMemberName(selectedMemberId) }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Position / Title') }}</td>
                    <td class="report-meta-value">{{ getMemberPosition(selectedMemberId) }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Department') }}</td>
                    <td class="report-meta-value">{{ getMemberDepartment(selectedMemberId) }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Reporting Period') }}</td>
                    <td class="report-meta-value">{{ formattedPeriod }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Generated Date') }}</td>
                    <td class="report-meta-value">{{ formatDate(nowTimestamp.split('T')[0]) }}</td>
                  </tr>
                  <tr>
                    <td class="report-meta-label">{{ $t('Prepared By') }}</td>
                    <td class="report-meta-value">{{ generatorName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="report-footer">
            <span>{{ $t('Executive Accountability Registry') }}</span>
            <span>{{ $t('Cover Page') }}</span>
          </div>
        </div>

        <!-- MEMBER PAGE 2: PERFORMANCE SUMMARY -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Performance Summary') }}</span>
              <span class="text-xs font-bold">{{ getMemberName(selectedMemberId) }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('1. Executive Performance Summary') }}</h2>
            
            <div class="report-summary-paragraph mt-4">
              <p class="report-paragraph">
                {{ $t('This performance report documents the official operational activities and work records of') }} <strong>{{ getMemberName(selectedMemberId) }}</strong> {{ $t('during the reporting period from') }} <strong>{{ formatDate(localFilters.startDate) }}</strong> {{ $t('to') }} <strong>{{ formatDate(localFilters.endDate) }}</strong>{{ $t('. Out of a total of') }} <strong>{{ getMemberAssignmentsForPeriod(selectedMemberId).length }}</strong> {{ $t('assigned tasks,') }} <strong>{{ getMemberAssignmentsGrouped(selectedMemberId).completed.length }}</strong> {{ $t('were successfully completed, with') }} <strong>{{ getMemberAssignmentsGrouped(selectedMemberId).inProgress.length }}</strong> {{ $t('currently in progress and') }} <strong>{{ getMemberAssignmentsGrouped(selectedMemberId).overdue.length }}</strong> {{ $t('overdue. A total of') }} <strong>{{ getMemberQualityIssues(selectedMemberId).filter(i => i.status === 'approved').length }}</strong> {{ $t('quality audits passed verification, and') }} <strong>{{ getMemberFollowupRows(selectedMemberId).filter(s => s.status === 'done' || s.status === 'late').length }}</strong> {{ $t('follow-up checks were performed. This record serves as the official accountability registry for executive management review.') }}
              </p>
            </div>

            <table class="report-table mt-6">
              <thead>
                <tr>
                  <th style="width: 70%">{{ $t('Operational Metric') }}</th>
                  <th style="width: 30%; text-align: right;">{{ $t('Value') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ $t('Total Tasks Assigned in Period') }}</td>
                  <td style="text-align: right; font-weight: bold;">{{ getMemberAssignmentsForPeriod(selectedMemberId).length }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Tasks Completed') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #10b981;">{{ getMemberAssignmentsGrouped(selectedMemberId).completed.length }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Tasks In Progress') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #3b82f6;">{{ getMemberAssignmentsGrouped(selectedMemberId).inProgress.length }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Tasks Overdue') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #ef4444;">{{ getMemberAssignmentsGrouped(selectedMemberId).overdue.length }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Quality Checks Completed / Approved') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #4f46e5;">{{ getMemberQualityIssues(selectedMemberId).filter(i => i.status === 'approved').length }}</td>
                </tr>
                <tr>
                  <td>{{ $t('Follow-Ups Completed') }}</td>
                  <td style="text-align: right; font-weight: bold; color: #4f46e5;">{{ getMemberFollowupRows(selectedMemberId).filter(s => s.status === 'done' || s.status === 'late').length }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="report-footer">
            <span>{{ $t('Executive Accountability Registry') }}</span>
            <span>{{ $t('Page 2 of 6') }}</span>
          </div>
        </div>

        <!-- MEMBER PAGE 3: WORK BOARD ACTIVITIES -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Work Board Activities') }}</span>
              <span class="text-xs font-bold">{{ getMemberName(selectedMemberId) }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('2. Work Board Activities') }}</h2>
            <p class="report-paragraph" style="margin-bottom: 12px;">{{ $t('Detailed list of tasks worked on or completed during the reporting period.') }}</p>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 25%">{{ $t('Task Name') }}</th>
                  <th style="width: 30%">{{ $t('Description') }}</th>
                  <th style="width: 15%">{{ $t('Project') }}</th>
                  <th style="width: 10%; text-align: center;">{{ $t('Assigned') }}</th>
                  <th style="width: 10%; text-align: center;">{{ $t('Completed') }}</th>
                  <th style="width: 10%; text-align: center;">{{ $t('Status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in getMemberAssignmentsForPeriod(selectedMemberId).slice(0, 15)" :key="task.id">
                  <td style="font-weight: bold;">{{ getTaskTitle(task.promptId) }}</td>
                  <td>{{ getTaskDescription(task.promptId) || 'No description' }}</td>
                  <td>{{ getProjectName(task.projectId) }}</td>
                  <td style="text-align: center;">{{ formatDate(task.assignedAt) }}</td>
                  <td style="text-align: center;">{{ formatDate(task.completedAt) || '—' }}</td>
                  <td style="text-align: center; font-weight: bold;">{{ task.status.replace('_', ' ') }}</td>
                </tr>
                <tr v-if="getMemberAssignmentsForPeriod(selectedMemberId).length === 0">
                  <td colspan="6" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">{{ $t('No tasks recorded for this period.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="report-footer">
            <span>{{ $t('Executive Accountability Registry') }}</span>
            <span>{{ $t('Page 3 of 6') }}</span>
          </div>
        </div>

        <!-- MEMBER PAGE 4: QUALITY CHECK ACTIVITIES -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Quality Check Activities') }}</span>
              <span class="text-xs font-bold">{{ getMemberName(selectedMemberId) }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('3. Quality Check Activities') }}</h2>
            <p class="report-paragraph" style="margin-bottom: 12px;">{{ $t('Factual review results and status logs of link checks, spacing audits, and UI validations.') }}</p>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 35%">{{ $t('Quality Item') }}</th>
                  <th style="width: 15%; text-align: center;">{{ $t('Date') }}</th>
                  <th style="width: 15%; text-align: center;">{{ $t('Result') }}</th>
                  <th style="width: 15%; text-align: center;">{{ $t('Status') }}</th>
                  <th style="width: 20%">{{ $t('Notes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="issue in getMemberQualityIssues(selectedMemberId).slice(0, 15)" :key="issue.id">
                  <td style="font-weight: bold;">
                    {{ issue.title }}
                    <div style="font-size: 7.5px; font-weight: normal; color: #6b7280; margin-top: 2px;">Website: {{ getWebsiteName(issue.websiteId) }}</div>
                  </td>
                  <td style="text-align: center;">{{ formatDate(issue.createdAt) }}</td>
                  <td style="text-align: center; font-weight: bold;" :style="{ color: issue.status === 'approved' ? '#10b981' : '#f59e0b' }">
                    {{ issue.status === 'approved' ? 'Passed' : 'Failed / Pending Fix' }}
                  </td>
                  <td style="text-align: center; font-weight: bold;">{{ issue.status }}</td>
                  <td>{{ issue.description || '—' }}</td>
                </tr>
                <tr v-if="getMemberQualityIssues(selectedMemberId).length === 0">
                  <td colspan="5" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">{{ $t('No quality reviews recorded.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="report-footer">
            <span>{{ $t('Executive Accountability Registry') }}</span>
            <span>{{ $t('Page 4 of 6') }}</span>
          </div>
        </div>

        <!-- MEMBER PAGE 5: FOLLOW-UP ACTIVITIES -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Follow-Up Activities') }}</span>
              <span class="text-xs font-bold">{{ getMemberName(selectedMemberId) }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('4. Follow-Up Activities') }}</h2>
            <p class="report-paragraph" style="margin-bottom: 12px;">{{ $t('Operational records of completed and pending follow-ups (Blog audits, Speed optimization, eBay clicks, Plugin updates).') }}</p>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 30%">{{ $t('Activity Name') }}</th>
                  <th style="width: 20%; text-align: center;">{{ $t('Scheduled Date') }}</th>
                  <th style="width: 15%; text-align: center;">{{ $t('Status') }}</th>
                  <th style="width: 35%">{{ $t('Notes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="slot in getMemberFollowupRows(selectedMemberId).slice(0, 15)" :key="slot.id">
                  <td style="font-weight: bold;">{{ slot.type }}</td>
                  <td style="text-align: center;">{{ slot.scheduledDate }}</td>
                  <td style="text-align: center; font-weight: bold;">{{ slot.status }}</td>
                  <td>{{ slot.notes || '—' }}</td>
                </tr>
                <tr v-if="getMemberFollowupRows(selectedMemberId).length === 0">
                  <td colspan="4" style="text-align: center; padding: 24px; color: #9ca3af; font-style: italic;">{{ $t('No follow-up activities recorded.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="report-footer">
            <span>{{ $t('Executive Accountability Registry') }}</span>
            <span>{{ $t('Page 5 of 6') }}</span>
          </div>
        </div>

        <!-- MEMBER PAGE 6: MANAGER NOTES -->
        <div class="pdf-page print-page flex flex-col justify-between">
          <div class="flex flex-col gap-6 flex-1">
            <div class="report-header flex justify-between items-center">
              <span class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{{ $t('Management Observations') }}</span>
              <span class="text-xs font-bold">{{ getMemberName(selectedMemberId) }}</span>
            </div>
            <h2 class="report-section-title">{{ $t('5. Manager Notes & Observations') }}</h2>
            
            <div class="report-notes-container mt-6">
              <div class="report-notes-block" v-if="selectedObservations.length > 0">
                <h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="border-bottom: 1px dashed #d1d5db; padding-bottom: 4px;">{{ $t('Factual Observations') }}</h3>
                <ul class="report-bullets">
                  <li v-for="obs in selectedObservations" :key="obs" style="margin-bottom: 8px; line-height: 1.4;">{{ obs }}</li>
                </ul>
              </div>
              
              <div class="report-notes-block mt-8" v-if="customNotes">
                <h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="border-bottom: 1px dashed #d1d5db; padding-bottom: 4px;">{{ $t('Additional Supervisor Remarks') }}</h3>
                <p class="report-notes-text whitespace-pre-wrap" style="line-height: 1.6; font-style: italic; color: #374151;">{{ customNotes }}</p>
              </div>
              
              <div class="report-notes-block mt-8 text-gray-400 italic text-xs" v-if="selectedObservations.length === 0 && !customNotes">
                {{ $t('No additional management observations or coaching remarks were recorded for this period.') }}
              </div>
            </div>
          </div>
          <div class="report-footer">
            <span>{{ $t('Executive Accountability Registry') }}</span>
            <span>{{ $t('Page 6 of 6') }}</span>
          </div>
        </div>
      </template>
    </div>
  </template>

    <!-- Mode: TEAM DAILY ACTIVITY REPORT -->
    <template v-else>
      <!-- Controls Panel (Hidden on print) -->
      <div class="no-print card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
        <div class="flex flex-wrap items-end gap-5">
          <!-- Date Select presets -->
          <div class="flex flex-col gap-1.5">
            <label class="label text-xs font-bold text-text-muted">{{ $t('Report Date Selector') }}</label>
            <div class="flex gap-2">
              <button
                type="button"
                class="chip text-xs"
                :class="{ 'chip-active': dailyDatePreset === 'today' }"
                @click="setDailyDatePreset('today')"
              >
                {{ $t('Today\'s Report') }}
              </button>
              <button
                type="button"
                class="chip text-xs"
                :class="{ 'chip-active': dailyDatePreset === 'yesterday' }"
                @click="setDailyDatePreset('yesterday')"
              >
                {{ $t('Yesterday\'s Report') }}
              </button>
              <button
                type="button"
                class="chip text-xs"
                :class="{ 'chip-active': dailyDatePreset === 'custom' }"
                @click="setDailyDatePreset('custom')"
              >
                {{ $t('Custom Date') }}
              </button>
            </div>
          </div>

          <!-- Custom Date Input -->
          <div class="flex flex-col gap-1.5" v-if="dailyDatePreset === 'custom'">
            <label class="label text-xs font-bold text-text-muted">{{ $t('Select Custom Date') }}</label>
            <input
              type="date"
              v-model="dailyReportDate"
              class="input py-1.5 px-3 max-w-[150px] text-xs font-semibold"
            />
          </div>

          <!-- Actions -->
          <div class="ml-auto flex gap-3">
            <button
              type="button"
              class="btn-primary flex items-center gap-2 font-bold text-xs"
              @click="exportDailyReportToPdf"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              {{ $t('Generate Daily PDF') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Report Screen Preview -->
      <div class="flex flex-col gap-6 w-full animate-fade-in">
        <!-- Date Header Banner -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-text-muted font-bold uppercase tracking-wider">{{ $t('Daily Team Operations Report') }}</span>
            <h2 class="text-xl font-black text-text-main mt-1">
              Report Date: {{ formatDate(dailyReportDate) }}
            </h2>
            <p class="text-xs text-text-muted font-semibold mt-0.5">
              Generated Time: {{ dailyReportObject.generatedTime }} | Preparation: {{ dailyReportObject.preparedBy }}
            </p>
          </div>
          <div class="text-right">
            <span class="text-xs text-text-muted font-bold uppercase tracking-wider">{{ $t('Classification') }}</span>
            <div class="text-xs font-bold text-rose-500 mt-1 uppercase tracking-widest">
              {{ dailyReportObject.classification }}
            </div>
          </div>
        </div>

        <!-- Summary Statistics KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Tasks Completed') }}</span>
            <span class="text-2xl font-black text-emerald-500 mt-2">{{ dailyReportObject.summary.tasksCompleted }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Active In Progress') }}</span>
            <span class="text-2xl font-black text-blue-500 mt-2">{{ dailyReportObject.summary.tasksInProgress }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Tasks Postponed') }}</span>
            <span class="text-2xl font-black text-amber-500 mt-2">{{ dailyReportObject.summary.tasksPostponed }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Tasks Overdue') }}</span>
            <span class="text-2xl font-black text-rose-500 mt-2">{{ dailyReportObject.summary.tasksOverdue }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Follow-Ups Completed') }}</span>
            <span class="text-2xl font-black text-emerald-500 mt-2">{{ dailyReportObject.summary.followupsCompleted }}</span>
          </div>
          <div class="card card-pad bg-card border border-border flex flex-col justify-between hover:scale-[1.02] transition shadow-sm">
            <span class="text-xs text-text-muted font-semibold">{{ $t('Follow-Ups Missed') }}</span>
            <span class="text-2xl font-black text-rose-500 mt-2">{{ dailyReportObject.summary.followupsMissed }}</span>
          </div>
        </div>

        <!-- Factual Summary Box -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-2">
          <h3 class="text-xs text-text-muted font-bold uppercase tracking-wider">{{ $t('Executive Neutral Summary') }}</h3>
          <p class="text-sm font-semibold text-text-main mt-1 italic leading-relaxed border-l-4 border-primary pl-4 py-1">
            "{{ dailyReportObject.summary.summaryParagraph }}"
          </p>
        </div>

        <!-- Member Activity Breakdown Matrix -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main border-b border-border pb-3">{{ $t('Team Member Activity Matrix') }}</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="m in dailyReportObject.members"
              :key="m.name"
              class="border border-border p-4 rounded-btn flex flex-col gap-3 bg-soft/20"
            >
              <div class="flex items-center justify-between border-b border-border pb-2">
                <span class="text-sm font-bold text-text-main">{{ m.name }}</span>
                <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider bg-soft px-2 py-0.5 rounded">{{ m.position }}</span>
              </div>
              
              <div class="grid grid-cols-2 gap-4 text-xs">
                <!-- Work Board -->
                <div>
                  <h4 class="font-extrabold text-[10px] text-text-muted uppercase tracking-wider mb-1.5 border-b border-border/60 pb-1">{{ $t('Work Board') }}</h4>
                  <ul class="list-disc pl-4 flex flex-col gap-1 font-semibold text-text-main">
                    <li v-for="title in m.work.completed" :key="title" class="text-emerald-500">
                      <span class="text-text-main font-semibold">[Completed] {{ title }}</span>
                    </li>
                    <li v-for="title in m.work.inProgress" :key="title" class="text-blue-500">
                      <span class="text-text-main font-semibold">[Active] {{ title }}</span>
                    </li>
                    <li v-for="title in m.work.postponed" :key="title" class="text-amber-500">
                      <span class="text-text-main font-semibold">[Postponed] {{ title }}</span>
                    </li>
                    <li v-for="title in m.work.overdue" :key="title" class="text-rose-500">
                      <span class="text-text-main font-semibold">[Overdue] {{ title }}</span>
                    </li>
                    <li v-if="m.work.completed.length + m.work.inProgress.length + m.work.postponed.length + m.work.overdue.length === 0" class="list-none pl-0 text-text-muted italic text-[11px] font-normal">
                      {{ $t('No board activity') }}
                    </li>
                  </ul>
                </div>

                <!-- Follow-Ups & Quality -->
                <div>
                  <h4 class="font-extrabold text-[10px] text-text-muted uppercase tracking-wider mb-1.5 border-b border-border/60 pb-1">{{ $t('Follow-Ups & QC') }}</h4>
                  <ul class="list-disc pl-4 flex flex-col gap-1 font-semibold text-text-main">
                    <li v-for="f in m.followups.completed" :key="f.title" class="text-emerald-500">
                      <span class="text-text-main font-semibold">[Done] {{ f.title }} ({{ f.type }})</span>
                    </li>
                    <li v-for="f in m.followups.missed" :key="f.title" class="text-rose-500">
                      <span class="text-text-main font-semibold">[Missed] {{ f.title }} ({{ f.type }})</span>
                    </li>
                    <li v-for="f in m.followups.pending" :key="f.title" class="text-blue-500">
                      <span class="text-text-main font-semibold">[Pending] {{ f.title }} ({{ f.type }})</span>
                    </li>
                    <li v-for="title in m.qualityChecks.passed" :key="title" class="text-emerald-500">
                      <span class="text-text-main font-semibold">[QC Pass] {{ title }}</span>
                    </li>
                    <li v-for="title in m.qualityChecks.failed" :key="title" class="text-rose-500">
                      <span class="text-text-main font-semibold">[QC Fail] {{ title }}</span>
                    </li>
                    <li v-if="m.followups.completed.length + m.followups.missed.length + m.followups.pending.length + m.qualityChecks.passed.length + m.qualityChecks.failed.length === 0" class="list-none pl-0 text-text-muted italic text-[11px] font-normal">
                      {{ $t('No checklist entries') }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Operations Log (Details Table) -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main">{{ $t('Comprehensive Operations Log') }}</h3>
          <div class="overflow-x-auto border border-border rounded-btn">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="bg-soft border-b border-border text-xs text-text-muted font-bold uppercase">
                  <th class="py-2.5 px-3">{{ $t('Title') }}</th>
                  <th class="py-2.5 px-3">{{ $t('Member') }}</th>
                  <th class="py-2.5 px-3">{{ $t('Status') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Type') }}</th>
                  <th class="py-2.5 px-3 text-center">{{ $t('Date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in dailyReportObject.taskDetails"
                  :key="t.title + '-' + t.member + '-' + t.type"
                  class="border-b border-border text-text-main hover:bg-soft/20 transition font-semibold"
                >
                  <td class="py-3 px-3 font-bold">{{ t.title }}</td>
                  <td class="py-3 px-3 text-text-muted text-xs font-normal">{{ t.member }}</td>
                  <td class="py-3 px-3">
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                      :class="t.type === 'Work' ? getTaskStatusClass(t.status.toLowerCase().replace(' ', '_')) : (t.type === 'Follow-Up' ? getFollowupStatusClass(t.status.toLowerCase()) : getQualityStatusClass(t.status.toLowerCase()))"
                    >
                      {{ t.status }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-center text-text-muted text-xs font-bold">{{ t.type }}</td>
                  <td class="py-3 px-3 text-center text-text-muted text-xs font-normal">{{ t.date }}</td>
                </tr>
                <tr v-if="dailyReportObject.taskDetails.length === 0">
                  <td colspan="5" class="py-8 text-center text-text-muted italic">{{ $t('No tasks or checklist activities found for this date.') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Management View observations -->
        <div class="card bg-card border border-border p-5 rounded-card shadow-sm flex flex-col gap-4">
          <h3 class="text-base font-bold text-text-main border-b border-border pb-3">{{ $t('Operational Management Observations') }}</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <h4 class="font-extrabold text-[11px] text-text-muted uppercase tracking-wider mb-2 border-b border-border pb-1">{{ $t('High Task Completion Today') }}</h4>
              <ul class="list-disc pl-4 flex flex-col gap-1 font-semibold text-text-main">
                <li v-for="item in dailyReportObject.managementView.mostCompleted" :key="item.name">
                  {{ item.name }} ({{ item.count }} completed)
                </li>
                <li v-if="dailyReportObject.managementView.mostCompleted.length === 0" class="list-none pl-0 text-text-muted italic font-normal">
                  {{ $t('No completions logged') }}
                </li>
              </ul>
            </div>
            
            <div>
              <h4 class="font-extrabold text-[11px] text-text-muted uppercase tracking-wider mb-2 border-b border-border pb-1">{{ $t('Missed Follow-Ups') }}</h4>
              <ul class="list-disc pl-4 flex flex-col gap-1 font-semibold text-text-main text-rose-500">
                <li v-for="item in dailyReportObject.managementView.missedFollowups" :key="item.name" class="text-rose-500">
                  <span class="text-text-main font-semibold">{{ item.name }} ({{ item.count }} missed)</span>
                </li>
                <li v-if="dailyReportObject.managementView.missedFollowups.length === 0" class="list-none pl-0 text-text-muted italic font-normal">
                  {{ $t('No missed follow-ups') }}
                </li>
              </ul>
            </div>
            
            <div>
              <h4 class="font-extrabold text-[11px] text-text-muted uppercase tracking-wider mb-2 border-b border-border pb-1">{{ $t('Active Overdue Deadlines') }}</h4>
              <ul class="list-disc pl-4 flex flex-col gap-1 font-semibold text-text-main text-rose-500">
                <li v-for="item in dailyReportObject.managementView.overdueTasks" :key="item.name" class="text-rose-500">
                  <span class="text-text-main font-semibold">{{ item.name }} ({{ item.count }} overdue)</span>
                </li>
                <li v-if="dailyReportObject.managementView.overdueTasks.length === 0" class="list-none pl-0 text-text-muted italic font-normal">
                  {{ $t('No overdue deadlines') }}
                </li>
              </ul>
            </div>
            
            <div>
              <h4 class="font-extrabold text-[11px] text-text-muted uppercase tracking-wider mb-2 border-b border-border pb-1">{{ $t('No Activity Logged Today') }}</h4>
              <ul class="list-disc pl-4 flex flex-col gap-1 font-semibold text-text-muted">
                <li v-for="name in dailyReportObject.managementView.noActivity" :key="name">
                  {{ name }}
                </li>
                <li v-if="dailyReportObject.managementView.noActivity.length === 0" class="list-none pl-0 text-text-muted italic font-normal">
                  {{ $t('All active members recorded entries') }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useReportsStore, type MemberAccountabilitySummary } from '@/stores/reports';
import { useQualityCheckStore } from '@/stores/qualityCheck';
import { useFollowupStore } from '@/stores/followup';
import { isFollowupParticipant, roleLabel } from '@/lib/roles';
import {
  buildMemberReportObject,
  buildTeamReportObject,
  printReportAsPdf,
  buildDailyTeamReportObject,
  printDailyReportAsPdf
} from '@/lib/reportGenerator';

// Stores
const auth = useAuthStore();
const dataStore = useDataStore();
const reportsStore = useReportsStore();
const qualityCheckStore = useQualityCheckStore();
const followupStore = useFollowupStore();

// Filters & Local State
const loading = ref(true);
const selectedMemberId = ref('');
const selectedTeam = ref('');
const datePreset = ref<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
const localFilters = reactive({
  startDate: '',
  endDate: ''
});
const activeWorkTab = ref<'completed' | 'inProgress' | 'postponed' | 'overdue'>('completed');
const workTabKeys = ['completed', 'inProgress', 'postponed', 'overdue'] as const;
const customNotes = ref('');
const selectedObservations = ref<string[]>([]);
const nowTimestamp = ref(new Date().toISOString());

// Daily Activity Report specific state
const activeReportTab = ref<'performance' | 'daily-activity'>('performance');
const dailyDatePreset = ref<'today' | 'yesterday' | 'custom'>('today');
const dailyReportDate = ref(new Date().toISOString().split('T')[0]);

const setDailyDatePreset = (preset: 'today' | 'yesterday' | 'custom') => {
  dailyDatePreset.value = preset;
  if (preset === 'today') {
    dailyReportDate.value = getTodayDateStr();
  } else if (preset === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    dailyReportDate.value = d.toISOString().split('T')[0];
  }
};

const dailyReportObject = computed(() => {
  return buildDailyTeamReportObject({
    dateStr: dailyReportDate.value,
    preparedBy: generatorName.value,
    stores: {
      dataStore,
      qualityCheckStore,
      followupStore
    }
  });
});

const exportDailyReportToPdf = () => {
  printDailyReportAsPdf(dailyReportObject.value);
};

const presets = [
  { label: 'Daily', value: 'daily' as const },
  { label: 'Weekly', value: 'weekly' as const },
  { label: 'Monthly', value: 'monthly' as const },
  { label: 'Custom', value: 'custom' as const }
];

const standardObservations = [
  { id: 'obs-success', text: 'Completed assigned tasks successfully.' },
  { id: 'obs-progress', text: 'Several tasks remain in progress.' },
  { id: 'obs-corrections', text: 'Quality corrections required.' },
  { id: 'obs-followups', text: 'Follow-up activities completed as scheduled.' }
];

// Time Helpers
const getTodayDateStr = () => new Date().toISOString().split('T')[0];

const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const getMonthEnd = () => {
  const d = new Date();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

const getWeekStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
};

const getWeekEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString().split('T')[0];
};

// Date Presets Handler
const applyPreset = (preset: 'daily' | 'weekly' | 'monthly' | 'custom') => {
  datePreset.value = preset;
  if (preset === 'daily') {
    localFilters.startDate = getTodayDateStr();
    localFilters.endDate = getTodayDateStr();
  } else if (preset === 'weekly') {
    localFilters.startDate = getWeekStart();
    localFilters.endDate = getWeekEnd();
  } else if (preset === 'monthly') {
    localFilters.startDate = getMonthStart();
    localFilters.endDate = getMonthEnd();
  }
  fetchData();
};

// Selection options
const activeMembers = computed(() => {
  return dataStore.members.filter(isFollowupParticipant);
});

const uniqueTeams = computed(() => {
  const depts = new Set<string>();
  activeMembers.value.forEach(m => {
    if (m.position) depts.add(m.position);
  });
  return Array.from(depts).sort();
});

const filteredActiveMembers = computed(() => {
  let list = activeMembers.value;
  if (selectedTeam.value) {
    list = list.filter(m => getMemberPosition(m.id) === selectedTeam.value);
  }
  return list;
});

// Event handlers
const handleTeamChange = () => {
  selectedMemberId.value = ''; // Reset to All Members on team change
  fetchData();
};

const handleMemberChange = () => {
  selectedObservations.value = [];
  customNotes.value = '';
};

// Data aggregations
const allSummariesList = ref<MemberAccountabilitySummary[]>([]);

const fetchData = async (force = false) => {
  loading.value = true;
  nowTimestamp.value = new Date().toISOString();
  try {
    const res = await reportsStore.getAggregatedMetrics({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate
    });
    allSummariesList.value = res.summaries;
    await qualityCheckStore.fetchIssues();
  } catch (err) {
    console.error('[ReportsDashboard] Error fetching performance data:', err);
  } finally {
    loading.value = false;
  }
};

const generatorName = computed(() => {
  return auth.profile?.fullName || auth.user?.email || 'Report Manager';
});

const formattedPeriod = computed(() => {
  return `${formatDate(localFilters.startDate)} — ${formatDate(localFilters.endDate)}`;
});

// Computed Aggregations Scoped to filters
const filteredSummaries = computed(() => {
  const memberIds = filteredActiveMembers.value.map(m => m.id);
  return allSummariesList.value.filter(s => memberIds.includes(s.id));
});

const teamSummaryStats = computed(() => {
  let qualityIssuesLogged = 0;
  filteredActiveMembers.value.forEach(m => {
    qualityIssuesLogged += getMemberQualityIssues(m.id).length;
  });

  let followupsCompleted = 0;
  let pluginsCompleted = 0;
  let ebayCompleted = 0;
  let speedCompleted = 0;
  let blogCompleted = 0;

  filteredActiveMembers.value.forEach(m => {
    const rows = getMemberFollowupRows(m.id);
    followupsCompleted += rows.filter(s => s.status === 'done' || s.status === 'late').length;
    pluginsCompleted += rows.filter(s => s.type === 'Plugin Update Follow-Up' && (s.status === 'done' || s.status === 'late')).length;
    ebayCompleted += rows.filter(s => s.type === 'eBay Follow-Up' && (s.status === 'done' || s.status === 'late')).length;
    speedCompleted += rows.filter(s => s.type === 'Website Optimization Follow-Up' && (s.status === 'done' || s.status === 'late')).length;
    blogCompleted += rows.filter(s => s.type === 'Blog Follow-Up' && (s.status === 'done' || s.status === 'late')).length;
  });

  return {
    qualityIssuesLogged,
    followupsCompleted,
    pluginsCompleted,
    ebayCompleted,
    speedCompleted,
    blogCompleted
  };
});

const getMemberTypeFraction = (memberId: string, typeKey: 'Blog' | 'Plugin' | 'Speed' | 'eBay') => {
  const rows = getMemberFollowupRows(memberId).filter(s => {
    if (typeKey === 'Blog') return s.type === 'Blog Follow-Up';
    if (typeKey === 'Plugin') return s.type === 'Plugin Update Follow-Up';
    if (typeKey === 'Speed') return s.type === 'Website Optimization Follow-Up';
    if (typeKey === 'eBay') return s.type === 'eBay Follow-Up';
    return false;
  });
  const completed = rows.filter(s => s.status === 'done' || s.status === 'late').length;
  return `${completed}/${rows.length}`;
};

// Member details resolvers
const getMemberCompletedAssignments = (memberId: string) => {
  return dataStore.assignments.filter(a =>
    a.assignedMemberId === memberId &&
    ['approved', 'completed', 'submitted'].includes(a.status) &&
    (a.completedAt || a.updatedAt || a.assignedAt).split('T')[0] >= localFilters.startDate &&
    (a.completedAt || a.updatedAt || a.assignedAt).split('T')[0] <= localFilters.endDate
  );
};

const getMemberAssignmentsForPeriod = (memberId: string) => {
  const start = localFilters.startDate;
  const end = localFilters.endDate;

  return dataStore.assignments.filter(a => {
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
};

const getMemberAssignmentsGrouped = (memberId: string) => {
  const list = getMemberAssignmentsForPeriod(memberId);
  const todayStr = new Date().toISOString().split('T')[0];

  const completed = list.filter(a => ['approved', 'completed', 'submitted'].includes(a.status));
  const overdue = list.filter(a =>
    !['approved', 'completed', 'submitted'].includes(a.status) &&
    a.dueDate && a.dueDate < todayStr
  );
  const postponed = list.filter(a =>
    a.status === 'postponed' &&
    !(a.dueDate && a.dueDate < todayStr)
  );
  const inProgress = list.filter(a =>
    !['approved', 'completed', 'submitted'].includes(a.status) &&
    a.status !== 'postponed' &&
    !(a.dueDate && a.dueDate < todayStr)
  );

  return { completed, inProgress, postponed, overdue };
};

const getMemberQualityIssues = (memberId: string) => {
  return qualityCheckStore.issues.filter(i =>
    i.assignedTo === memberId &&
    i.createdAt.split('T')[0] >= localFilters.startDate &&
    i.createdAt.split('T')[0] <= localFilters.endDate
  );
};

const getMemberFollowupRows = (memberId: string) => {
  return combinedFollowupRows.value.filter(s => s.assignedTo === memberId);
};

const getMemberTaskFraction = (memberId: string, type: 'completed' | 'inProgress' | 'overdue') => {
  const total = getMemberAssignmentsForPeriod(memberId).length;
  const grouped = getMemberAssignmentsGrouped(memberId);
  return `${grouped[type].length}/${total}`;
};

const getMemberFollowupFraction = (memberId: string) => {
  const rows = getMemberFollowupRows(memberId);
  const completed = rows.filter(s => s.status === 'done' || s.status === 'late').length;
  return `${completed}/${rows.length}`;
};

const ebayCompletionLabel = (entry: any) => {
  if (entry?.completionSource === 'admin_auto_fill' || entry?.completion_source === 'admin_auto_fill') return 'Admin Auto Completed';
  if (entry?.completionSource === 'not_required_today' || entry?.completion_source === 'not_required_today') return 'Not Required Today';
  if (entry?.completionSource === 'admin_manual' || entry?.completion_source === 'admin_manual') return 'Admin Completed';
  return 'Completed by Member';
};

const combinedFollowupRows = computed(() => {
  const rows: any[] = [];
  const start = localFilters.startDate;
  const end = localFilters.endDate;

  filteredActiveMembers.value.forEach(member => {
    const memberId = member.id;
    const memberWebsiteIds = new Set(
      dataStore.websites.filter(w => w.createdBy === memberId).map(w => w.id)
    );

    // Blog
    followupStore.blogSlots.forEach(s => {
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
    followupStore.speedSlots.forEach(s => {
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
    followupStore.pluginSlots.forEach(s => {
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
    followupStore.ebayEntries.forEach(s => {
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
});

// UI Helpers
const getMemberName = (id: string | null) => {
  if (!id) return 'Unassigned';
  const m = dataStore.members.find(x => x.id === id);
  return m ? m.fullName : id;
};

const getWebsiteName = (id: string | null) => {
  if (!id) return 'General/None';
  const w = dataStore.websites.find(x => x.id === id);
  return w ? w.name : id;
};

const getProjectName = (id: string | null) => {
  if (!id) return 'General/None';
  const p = dataStore.projects.find(x => x.id === id);
  return p ? p.name : id;
};

const getTaskTitle = (promptId: string) => {
  const p = dataStore.prompts.find(x => x.id === promptId);
  return p ? p.title : 'Assigned task';
};

const getTaskDescription = (promptId: string) => {
  const p = dataStore.prompts.find(x => x.id === promptId);
  return p ? p.shortDescription : '';
};

const getTaskNotes = (promptId: string) => {
  const p = dataStore.prompts.find(x => x.id === promptId);
  return p ? p.notes : '';
};

const getMemberPosition = (id: string | null) => {
  if (!id) return 'Team Member';
  const m = dataStore.members.find(x => x.id === id);
  return m?.position || 'Team Member';
};

const getMemberDepartment = (id: string | null) => {
  const position = getMemberPosition(id).toLowerCase();
  if (position.includes('seo') || position.includes('optimizer')) return 'Search Engine Optimization';
  if (position.includes('writer') || position.includes('content') || position.includes('copy')) return 'Content Management';
  if (position.includes('dev') || position.includes('engineer') || position.includes('code') || position.includes('programmer')) return 'Web Development & Engineering';
  if (position.includes('design') || position.includes('artist') || position.includes('creative')) return 'Creative Design';
  if (position.includes('admin') || position.includes('owner') || position.includes('super') || position.includes('lead') || position.includes('head') || position.includes('manager')) return 'Operations Management';
  if (position.includes('quality') || position.includes('reviewer') || position.includes('checker') || position.includes('audit')) return 'Quality Assurance';
  return 'Operations & Support';
};

// Status classes helpers
const getTaskStatusClass = (status: string) => {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'in_progress') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'postponed') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'needs_fix' || status === 'rejected') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-gray-50 text-gray-700 border border-gray-200';
};

const getQualityStatusClass = (status: string) => {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'fixed' || status === 'needs_review') return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
  if (status === 'in_progress') return 'bg-blue-50 text-blue-700 border border-blue-200';
  return 'bg-rose-50 text-rose-700 border border-rose-200';
};

const getFollowupStatusClass = (status: string) => {
  if (status === 'done' || status === 'late') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'missed') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-blue-50 text-blue-700 border border-blue-200';
};

// Date formators
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-');
  if (parts.length !== 3) return clean;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';

// Print trigger
const exportToPdf = () => {
  const isTeamReport = selectedMemberId.value === '';
  const stores = { dataStore, qualityCheckStore, followupStore };

  if (isTeamReport) {
    const reportObj = buildTeamReportObject({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
      preparedBy: generatorName.value,
      selectedTeam: selectedTeam.value,
      stores
    });
    printReportAsPdf(reportObj, true);
  } else {
    const reportObj = buildMemberReportObject({
      memberId: selectedMemberId.value,
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
      preparedBy: generatorName.value,
      customNotes: customNotes.value,
      selectedObservations: selectedObservations.value,
      isBulkSheet: false,
      stores
    });
    printReportAsPdf(reportObj, false);
  }
};

onMounted(async () => {
  localFilters.startDate = getMonthStart();
  localFilters.endDate = getMonthEnd();
  await Promise.allSettled([
    dataStore.fetchMembers(),
    dataStore.fetchProjects(),
    dataStore.fetchWebsites(),
    dataStore.fetchPrompts(),
    dataStore.fetchAssignments()
  ]);
  await fetchData();
});
</script>

<style scoped>
.reports-documentation-dashboard {
  width: 100%;
}

.pdf-page {
  width: 210mm;
  height: 297mm;
  box-sizing: border-box;
  background: #fbfbfb;
  color: #111827;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

@media (min-width: 1025px) {
  .preview-stage {
    zoom: 0.95;
    margin-bottom: 2rem;
  }
}

/* Report Template Styles */
.report-branding-text {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #6b7280;
  text-transform: uppercase;
}

.report-title-cover {
  font-family: Georgia, Garamond, "Times New Roman", serif;
  font-size: 36px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.report-subtitle-cover {
  font-family: Georgia, Garamond, "Times New Roman", serif;
  font-size: 16px;
  font-style: italic;
  color: #4b5563;
  margin-top: 8px;
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
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 10px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
  color: #6b7280;
}

.report-section-title {
  font-family: Georgia, Garamond, "Times New Roman", serif;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  border-bottom: 1.5px solid #111827;
  padding-bottom: 6px;
  margin-top: 8px;
  margin-bottom: 12px;
}

.report-paragraph {
  font-family: Georgia, Garamond, "Times New Roman", serif;
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
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  font-family: Georgia, Garamond, "Times New Roman", serif;
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
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  font-family: Georgia, Garamond, "Times New Roman", serif;
  font-size: 12.5px;
  line-height: 1.6;
  color: #1f2937;
  font-style: italic;
}

/* Print Specific Rules */
.print-only {
  display: none !important;
}

@media print {
  .no-print,
  aside,
  header,
  nav,
  .topbar,
  .app-sidebar,
  .app-sidebar-backdrop,
  .app-topbar,
  .push-setup-banner,
  .push-toast-wrap,
  .realtime-toasts,
  .command-palette,
  .executive-floating-quick-capture,
  .admin-floating-assign-task,
  button,
  .reports-tabs,
  .reports-layout-page > header,
  .reports-layout-page > div.card {
    display: none !important;
  }

  .print-only {
    display: block !important;
    width: 100% !important;
  }

  .app-content-shell,
  .app-content-shell--collapsed {
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }

  .app-main {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }

  body, html, #app, .min-h-screen, .bg-bg {
    background: #fbfbfb !important;
    color: #111827 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: auto !important;
    min-height: auto !important;
  }

  .reports-documentation-dashboard {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
  }

  .pdf-page {
    width: 100% !important;
    height: 297mm !important;
    page-break-after: always !important;
    break-after: page !important;
    border: none !important;
    box-shadow: none !important;
    padding: 20mm !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    background: #fbfbfb !important;
    color: #111827 !important;
  }

  .pdf-page table th, 
  .pdf-page table td {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
    font-size: 8.5px !important;
    line-height: 1.35 !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>
