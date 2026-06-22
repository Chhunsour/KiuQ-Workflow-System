<template>
  <div>
    <PageHeader :title="$t('Dashboard')" subtitle="Admin overview of the workspace and review queue.">
      <template #actions>
        <RouterLink to="/websites/new" class="btn-secondary">{{ $t('New Website') }}</RouterLink>
        <RouterLink to="/library" class="btn-primary">{{ $t('New Prompt') }}</RouterLink>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard :label="$t('Total Members')" :value="data.totalMembers" :icon="icons.members" />
      <StatCard :label="$t('Total Projects')" :value="data.totalProjects" :icon="icons.projects" />
      <StatCard :label="$t('Total Websites')" :value="data.totalWebsites" :icon="icons.websites" />
      <StatCard :label="$t('Total Prompts')" :value="data.totalPrompts" :icon="icons.prompts" />
      <StatCard :label="$t('Pending Reviews')" :value="data.pendingReviews" :icon="icons.reviews" />
    </div>

    <!-- Followups — schedule-aware, range-filtered -->
    <div class="mt-5">
      <div class="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="section-title">{{ $t('Followups') }}</h3>
          <p class="mt-0.5 text-xs text-text-muted">
            {{ $t('Showing') }} <strong class="text-text-main">{{ currentRange.label }}</strong>
            · {{ currentRange.start === currentRange.end ? currentRange.start : `${currentRange.start} → ${currentRange.end}` }}
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-xs font-semibold text-text-muted" for="dash-range">{{ $t('Range:') }}</label>
          <select
            id="dash-range"
            v-model="timeRange"
            class="rounded-btn border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option v-for="opt in rangeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="fu in followupSummary"
          :key="fu.key"
          class="card card-hover flex items-center gap-3 px-4 py-3"
        >
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
            :class="fu.summary.pending > 0 ? 'bg-primary/10 text-primary' : 'bg-status-approved-bg text-status-approved-fg'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="fu.icon" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="ui-font text-sm font-semibold text-text-main">{{ fu.label }}</div>
            <div class="mt-0.5 text-xs text-text-muted">
              <span v-if="fu.summary.total === 0" class="font-bold text-text-muted">
                {{ $t('None due') }}
              </span>
              <template v-else>
                <strong class="ui-font text-text-main">{{ fu.summary.done }}/{{ fu.summary.total }}</strong>
                {{ $t('completed') }}
                <span v-if="fu.summary.pending > 0" class="ml-1 font-semibold text-status-needs-fix-fg">
                  · {{ fu.summary.pending }} pending
                </span>
              </template>
            </div>
          </div>
          <RouterLink :to="fu.to" class="btn-secondary h-8 flex-shrink-0 px-3 text-xs">{{ $t('Open') }}</RouterLink>
        </div>
      </div>
    </div>

    <!-- Team Member Details Section -->
    <div v-if="canViewTeamMemberDetails" class="card mt-5">
      <div class="border-b border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 bg-soft/10">
        <div>
          <h3 class="section-title">{{ $t('Team Member Details') }}</h3>
          <p class="mt-0.5 text-xs text-text-muted">{{ $t('Real-time range-based team activity and progress summary.') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search input -->
          <div class="relative min-w-[180px]">
            <input
              type="text"
              v-model="searchQuery"
              :placeholder="$t('Search member...')"
              class="rounded-btn border border-border bg-card pl-8 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
          </div>

          <!-- Role Filter Dropdown -->
          <select
            v-model="roleFilter"
            class="rounded-btn border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{{ $t('All Roles') }}</option>
            <option value="team_member">{{ $t('Team Member') }}</option>
            <option value="assistant_head">{{ $t('Assistant Head') }}</option>
            <option value="head">{{ $t('Head') }}</option>
          </select>
        </div>
      </div>

      <!-- Filters & Indicators -->
      <div class="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-soft/5">
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="f in quickFilters"
            :key="f.key"
            type="button"
            class="chip text-[11px]"
            :class="{ 'chip-active': activeQuickFilters[f.key] }"
            @click="toggleQuickFilter(f.key)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="text-[11px] text-text-muted flex items-center gap-3">
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-status-approved-fg"></span> {{ $t('Online') }}</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-amber-500"></span> {{ $t('Away') }}</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-text-soft"></span> {{ $t('Offline') }}</span>
        </div>
      </div>

      <div
        v-if="teamMemberSummaryWarning"
        class="mx-5 my-3 px-4 py-2.5 bg-status-needs-fix-bg/10 border border-status-needs-fix-bg/30 rounded-md text-xs font-medium text-status-needs-fix-fg flex items-center gap-2.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-status-needs-fix-fg">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>{{ teamMemberSummaryWarning }}</span>
      </div>

      <!-- Desktop Table Layout -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-border bg-soft/30">
              <th class="px-5 py-3 table-head">{{ $t('Member') }}</th>
              <th class="px-5 py-3 table-head">{{ $t('Status') }}</th>
              <th class="px-5 py-3 table-head">{{ $t('Followups Today/Period') }}</th>
              <th class="px-5 py-3 table-head">{{ $t('Tasks In-Progress') }}</th>
              <th class="px-5 py-3 table-head">{{ $t('Missed Followups') }}</th>
              <th class="px-5 py-3 table-head">{{ $t('Pending Reviews') }}</th>
              <th class="px-5 py-3 table-head text-right">{{ $t('Action') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <template v-if="data.loadingTeamSummary">
              <tr v-for="i in 5" :key="`team-summary-skeleton-${i}`">
                <td v-for="cell in 7" :key="cell" class="px-5 py-4">
                  <div class="h-3 w-full max-w-[120px] animate-pulse rounded-full bg-soft"></div>
                </td>
              </tr>
            </template>
            <template v-else>
            <tr v-for="member in paginatedMembers" :key="member.memberId" class="table-row">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <!-- Avatar/Initials -->
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase overflow-hidden">
                    <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="member.fullName" class="h-full w-full object-cover" />
                    <template v-else>
                      {{ getInitials(member.fullName) }}
                    </template>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-text-main">{{ member.fullName }}</div>
                    <span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-soft text-text-muted capitalize mt-0.5">
                      {{ member.role?.replace(/_/g, ' ') }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3">
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-1.5 text-xs text-text-main capitalize">
                    <span class="h-2 w-2 rounded-full shrink-0" :class="statusDotClass(member.currentStatus)"></span>
                    {{ member.currentStatus }}
                  </div>
                  <span class="text-[10px] text-text-muted font-light">
                    {{ member.lastActiveAt ? formatLastActive(member.lastActiveAt) : 'Never active' }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-3">
                <div class="flex flex-col gap-1 max-w-[120px]">
                  <div class="flex items-center justify-between text-xs text-text-main">
                    <span class="font-semibold">{{ member.followupsDone }}/{{ member.followupsTotal }}</span>
                    <span class="text-[10px] text-text-muted">{{ calculatePercent(member.followupsDone, member.followupsTotal) }}%</span>
                  </div>
                  <div class="h-1.5 w-full bg-soft rounded-full overflow-hidden">
                    <div class="h-full bg-primary rounded-full" :style="{ width: calculatePercent(member.followupsDone, member.followupsTotal) + '%' }"></div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 text-xs text-text-main">
                <div class="flex items-center gap-1">
                  <span class="font-semibold">{{ member.tasksInProgress }}</span>
                  <span class="text-[10px] text-text-muted">{{ $t('active') }}</span>
                </div>
              </td>
              <td class="px-5 py-3 text-xs">
                <span v-if="member.followupsMissed > 0" class="font-bold text-status-rejected-fg flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-status-rejected-fg shrink-0 animate-pulse"></span>
                  {{ member.followupsMissed }} missed
                </span>
                <span class="text-text-muted font-medium" v-else>{{ $t('0 missed') }}</span>
              </td>
              <td class="px-5 py-3 text-xs">
                <span v-if="member.tasksWaitingReview > 0" class="font-bold text-status-submitted-fg">
                  {{ member.tasksWaitingReview }} reviews
                </span>
                <span class="text-text-muted" v-else>{{ $t('0 reviews') }}</span>
              </td>
              <td class="px-5 py-3 text-right">
                <button
                  type="button"
                  class="btn-secondary py-1 px-3 text-xs h-7 hover:border-primary/40"
                  @click="openMemberDetails(member)"
                >
                  {{ $t('View Details') }}
                </button>
              </td>
            </tr>
            <tr v-if="showTeamMemberLoadError">
              <td colspan="7" class="px-5 py-10 text-center text-xs text-status-rejected-fg bg-soft/10">
                {{ $t('Could not load team member details.') }}
              </td>
            </tr>
            <tr v-else-if="filteredMembers.length === 0">
              <td colspan="7" class="px-5 py-10 text-center text-xs text-text-muted italic bg-soft/10">
                {{ teamMemberEmptyMessage }}
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards Layout -->
      <div class="md:hidden divide-y divide-border">
        <template v-if="data.loadingTeamSummary">
          <div v-for="i in 5" :key="`team-summary-mobile-skeleton-${i}`" class="p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="h-9 w-9 animate-pulse rounded-full bg-soft"></div>
                <div class="space-y-2">
                  <div class="h-3 w-28 animate-pulse rounded-full bg-soft"></div>
                  <div class="h-2.5 w-20 animate-pulse rounded-full bg-soft"></div>
                </div>
              </div>
              <div class="h-3 w-16 animate-pulse rounded-full bg-soft"></div>
            </div>
          </div>
        </template>
        <template v-else>
        <div v-for="member in paginatedMembers" :key="member.memberId" class="p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase overflow-hidden">
                <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="member.fullName" class="h-full w-full object-cover" />
                <template v-else>
                  {{ getInitials(member.fullName) }}
                </template>
              </div>
              <div>
                <div class="text-xs font-bold text-text-main">{{ member.fullName }}</div>
                <div class="text-[10px] text-text-muted capitalize mt-0.5">{{ member.role?.replace(/_/g, ' ') }}</div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-0.5">
              <div class="flex items-center gap-1.5 text-xs text-text-main capitalize">
                <span class="h-1.5 w-1.5 rounded-full shrink-0" :class="statusDotClass(member.currentStatus)"></span>
                {{ member.currentStatus }}
              </div>
              <span class="text-[9px] text-text-muted">
                {{ member.lastActiveAt ? formatLastActive(member.lastActiveAt) : 'Never' }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 bg-soft/30 p-2.5 rounded-btn text-[11px] text-text-main text-center">
            <div>
              <div class="text-text-muted text-[10px]">{{ $t('Followups') }}</div>
              <div class="font-bold mt-0.5 text-xs" :class="member.followupsTotal === 0 ? 'text-text-soft' : ''">
                {{ member.followupsDone }}/{{ member.followupsTotal }}
              </div>
            </div>
            <div>
              <div class="text-text-muted text-[10px]">{{ $t('Tasks (IP/Rev)') }}</div>
              <div class="font-bold mt-0.5 text-xs">
                {{ member.tasksInProgress }} / {{ member.tasksWaitingReview }}
              </div>
            </div>
            <div>
              <div class="text-text-muted text-[10px]">{{ $t('Missed') }}</div>
              <div class="font-bold mt-0.5 text-xs" :class="member.followupsMissed > 0 ? 'text-status-rejected-fg font-extrabold' : ''">
                {{ member.followupsMissed }}
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="btn-secondary w-full py-1 text-xs h-8"
              @click="openMemberDetails(member)"
            >
              {{ $t('View Details') }}
            </button>
          </div>
        </div>
        <div v-if="showTeamMemberLoadError" class="p-8 text-center text-xs text-status-rejected-fg">
          {{ $t('Could not load team member details.') }}
        </div>
        <div v-else-if="filteredMembers.length === 0" class="p-8 text-center text-xs text-text-muted italic">
          {{ teamMemberEmptyMessage }}
        </div>
        </template>
      </div>

      <!-- View All Button footer -->
      <div v-if="!data.loadingTeamSummary && filteredMembers.length > 5" class="border-t border-border px-5 py-3 flex items-center justify-between text-xs bg-soft/10">
        <span class="text-text-muted">
          Showing {{ Math.min(itemsShownCount, filteredMembers.length) }} of {{ filteredMembers.length }} members
        </span>
        <button
          type="button"
          class="btn-secondary px-3.5 py-1.5 h-7 text-xs flex items-center gap-1 hover:border-primary/30"
          @click="toggleShowAll"
        >
          <span>{{ showAllMembers ? 'Show Less' : 'View All' }}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            class="transition-transform"
            :class="{ 'rotate-180': showAllMembers }"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Detail Drawer / Modal -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-50 bg-black/60 transition-opacity backdrop-blur-sm"
      @click="closeDrawer"
    ></div>

    <div
      class="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-lg transition-transform duration-300 transform flex flex-col"
      :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Drawer Header -->
      <div class="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
        <div class="flex items-center gap-3">
          <!-- Avatar/Initials -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm uppercase overflow-hidden">
            <img v-if="selectedMember?.avatarUrl" :src="selectedMember.avatarUrl" :alt="selectedMember?.fullName" class="h-full w-full object-cover" />
            <template v-else>
              {{ getInitials(selectedMember?.fullName) }}
            </template>
          </div>
          <div>
            <h3 class="text-base font-bold text-text-main leading-tight">{{ selectedMember?.fullName }}</h3>
            <p class="text-xs text-text-muted mt-0.5 capitalize">{{ selectedMember?.role?.replace(/_/g, ' ') }}</p>
          </div>
        </div>
        <button class="text-text-muted hover:text-text-main p-1 focus:outline-none" @click="closeDrawer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Drawer Body (Scrollable) -->
      <div v-if="loadingDetails" class="flex-1 flex items-center justify-center p-6">
        <div class="flex flex-col items-center gap-2">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span class="text-xs text-text-muted">{{ $t('Loading member details...') }}</span>
        </div>
      </div>
      <div v-else-if="selectedMember" class="flex-1 overflow-y-auto p-5 space-y-6">
        <!-- 1. Basic Info -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('Basic Info') }}</h4>
          <div class="grid grid-cols-2 gap-3 bg-soft/50 rounded-btn p-3 text-xs">
            <div>
              <span class="text-text-muted">{{ $t('Status') }}</span>
              <div class="mt-1 flex items-center gap-1.5 font-semibold text-text-main">
                <span class="h-2 w-2 rounded-full shrink-0" :class="statusDotClass(selectedMember.currentStatus)"></span>
                <span class="capitalize">{{ selectedMember.currentStatus }}</span>
              </div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('Last Active') }}</span>
              <div class="mt-1 font-semibold text-text-main">
                {{ selectedMember.lastActiveAt ? formatLastActive(selectedMember.lastActiveAt) : 'Never' }}
              </div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('Joined Date') }}</span>
              <div class="mt-1 font-semibold text-text-main">
                {{ selectedMember.createdAt ? new Date(selectedMember.createdAt).toLocaleDateString() : 'N/A' }}
              </div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('Email') }}</span>
              <div class="mt-1 font-semibold text-text-main truncate" :title="selectedMember.email">
                {{ selectedMember.email || 'N/A' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Followup Summary -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('Followup Summary') }}</h4>
          <div class="bg-soft/50 rounded-btn p-3 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('Total Followups Due') }}</span>
              <span class="font-bold text-text-main">{{ selectedMember.followupsTotal }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('Completed') }}</span>
              <span class="font-bold text-status-approved-fg">{{ selectedMember.followupsDone }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('Pending') }}</span>
              <span class="font-bold" :class="selectedMember.followupsPending > 0 ? 'text-status-needs-fix-fg' : 'text-text-main'">
                {{ selectedMember.followupsPending }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('Missed') }}</span>
              <span class="font-bold" :class="selectedMember.followupsMissed > 0 ? 'text-status-rejected-fg' : 'text-text-main'">
                {{ selectedMember.followupsMissed }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('Not Required') }}</span>
              <span class="font-bold text-text-muted">{{ selectedMember.followupsNotRequired }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('Admin Auto Completed') }}</span>
              <span class="font-bold text-text-muted">{{ selectedMember.followupsAutoCompleted }}</span>
            </div>
          </div>
        </div>

        <!-- 3. Work Board Summary -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('Work Board Summary') }}</h4>
          <div class="grid grid-cols-2 gap-3 text-xs mb-3">
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('In Progress') }}</span>
              <span class="font-bold text-text-main">{{ selectedMember.tasksInProgress }}</span>
            </div>
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Waiting Review') }}</span>
              <span class="font-bold text-status-submitted-fg">{{ selectedMember.tasksWaitingReview }}</span>
            </div>
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Completed') }}</span>
              <span class="font-bold text-status-approved-fg">{{ selectedMember.tasksCompleted }}</span>
            </div>
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Overdue') }}</span>
              <span class="font-bold" :class="selectedMember.tasksOverdue > 0 ? 'text-status-rejected-fg font-extrabold' : 'text-text-main'">
                {{ selectedMember.tasksOverdue }}
              </span>
            </div>
          </div>

          <!-- Current Range Tasks List -->
          <div class="space-y-1.5">
            <div class="text-[11px] font-semibold text-text-muted">{{ $t('Tasks due in this range:') }}</div>
            <div v-if="detailedData.tasks.length > 0" class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              <div v-for="t in detailedData.tasks" :key="t.id" class="border border-border/60 rounded px-2.5 py-1.5 text-xs bg-card flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-text-main truncate">{{ getPromptTitle(t.promptId) }}</div>
                  <div class="text-[10px] text-text-muted mt-0.5">Due: {{ t.dueDate }}</div>
                </div>
                <StatusBadge :status="t.status === 'submitted' ? 'pending_review' : t.status" class="scale-90" />
              </div>
            </div>
            <div v-else class="text-xs text-text-muted italic bg-soft/30 rounded p-2 text-center">
              {{ $t('No tasks due for this range.') }}
            </div>
          </div>
        </div>

        <!-- 4. Quality Check Summary -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('Quality Check Summary') }}</h4>
          <div class="grid grid-cols-2 gap-3 text-xs mb-3">
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Assigned Issues') }}</span>
              <span class="font-bold text-text-main">{{ selectedMember.qiAssigned }}</span>
            </div>
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Fixed Issues') }}</span>
              <span class="font-bold text-status-submitted-fg">{{ selectedMember.qiFixed }}</span>
            </div>
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Waiting Review') }}</span>
              <span class="font-bold text-status-submitted-fg">{{ selectedMember.qiWaitingReview }}</span>
            </div>
            <div class="bg-soft/50 rounded-btn p-3 flex justify-between items-center">
              <span class="text-text-muted">{{ $t('Needs Fix') }}</span>
              <span class="font-bold text-status-needs-fix-fg">{{ selectedMember.qiNeedsFix }}</span>
            </div>
          </div>

          <!-- Quality Issues List -->
          <div class="space-y-1.5">
            <div class="text-[11px] font-semibold text-text-muted">{{ $t('Assigned Quality Issues:') }}</div>
            <div v-if="detailedData.qualityIssues.length > 0" class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              <div v-for="qi in detailedData.qualityIssues" :key="qi.id" class="border border-border/60 rounded px-2.5 py-1.5 text-xs bg-card flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-text-main truncate">{{ qi.title }}</div>
                  <div class="text-[10px] text-text-muted mt-0.5">{{ $t('Priority:') }} <span class="capitalize font-semibold text-text-main">{{ qi.priority }}</span></div>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0" :class="qiStatusClass(qi.status)">
                  {{ qi.status?.replace('_', ' ') }}
                </span>
              </div>
            </div>
            <div v-else class="text-xs text-text-muted italic bg-soft/30 rounded p-2 text-center">
              {{ $t('No quality issues assigned.') }}
            </div>
          </div>
        </div>

        <!-- 5. Recent Activity -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('Recent Activity') }}</h4>
            <RouterLink :to="`/activity?user=${selectedMember.memberId}`" class="text-[11px] text-primary hover:underline" @click="closeDrawer">
              {{ $t('View Full Activity') }}
            </RouterLink>
          </div>
          <div v-if="detailedData.activities.length > 0" class="divide-y divide-border/60 border border-border/60 rounded-btn bg-card overflow-hidden">
            <div v-for="act in detailedData.activities" :key="act.id" class="px-3 py-2 text-xs bg-card">
              <div class="text-text-main font-medium leading-normal">{{ act.message }}</div>
              <div class="text-[10px] text-text-soft mt-1">{{ formatActivityTime(act.createdAt) }}</div>
            </div>
          </div>
          <div v-else class="text-xs text-text-muted italic bg-soft/30 rounded p-2.5 text-center">
            {{ $t('No recent activity.') }}
          </div>
        </div>
      </div>

      <!-- Drawer Footer (Quick Actions) -->
      <div v-if="!loadingDetails && selectedMember" class="border-t border-border bg-soft/40 px-5 py-4 shrink-0 flex flex-col gap-2">
        <div class="text-[10px] font-bold uppercase tracking-wider text-text-soft mb-1">{{ $t('Quick Actions') }}</div>
        <div class="grid grid-cols-2 gap-2">
          <RouterLink :to="`/profiles/${selectedMember.memberId}`" class="btn-secondary py-2 text-xs flex justify-center items-center" @click="closeDrawer">
            {{ $t('Open Profile') }}
          </RouterLink>
          <RouterLink :to="`/work-board/members/${selectedMember.memberId}`" class="btn-secondary py-2 text-xs flex justify-center items-center" @click="closeDrawer">
            {{ $t('Open Work Board') }}
          </RouterLink>
          <RouterLink :to="`/reports`" class="btn-secondary py-2 text-xs flex justify-center items-center" @click="closeDrawer">
            {{ $t('Open Report') }}
          </RouterLink>
          <button class="btn-primary py-2 text-xs" @click="closeDrawer">
            {{ $t('Close Details') }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div class="card">
        <div class="border-b border-border px-5 py-3.5">
          <h3 class="section-title">{{ $t('Team Activity') }}</h3>
          <p class="mt-1 text-xs text-text-muted">{{ $t('Simple presence for workflow visibility.') }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 p-4">
          <div v-for="item in teamActivityStats" :key="item.label" class="rounded-btn bg-soft/50 px-3 py-2">
            <div class="text-xs text-text-muted">{{ item.label }}</div>
            <div class="mt-1 ui-font text-lg font-semibold text-text-main">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 class="section-title">{{ $t('Task Alerts Summary') }}</h3>
            <p class="mt-1 text-xs text-text-muted">{{ $t('Targeted notification delivery status.') }}</p>
          </div>
          <RouterLink to="/admin/notifications/task-alerts" class="text-xs text-primary hover:underline">
            {{ $t('Manage') }}
          </RouterLink>
        </div>
        <div class="p-4 flex flex-col gap-2">
          <RouterLink
            v-for="item in taskAlertMetricsList"
            :key="item.label"
            to="/admin/notifications/task-alerts"
            class="flex items-center justify-between rounded-btn bg-soft/40 hover:bg-primary/5 border border-border/40 hover:border-primary/20 px-3 py-1.5 transition-all group"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2 h-2 rounded-full shrink-0" :class="item.dotClass" />
              <span class="text-xs font-semibold text-text-muted group-hover:text-text-main transition-colors truncate">{{ item.label }}</span>
            </div>
            <strong class="ui-font text-xs font-bold text-text-main group-hover:text-primary transition-colors shrink-0">{{ item.value }}</strong>
          </RouterLink>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 class="section-title">{{ $t('Member activity') }}</h3>
          <RouterLink to="/activity" class="text-sm text-primary hover:underline">{{ $t('Open Activity') }}</RouterLink>
        </div>
        <div v-if="data.activityLogs.length > 0" class="divide-y divide-border">
          <div v-for="log in data.activityLogs.slice(0, 4)" :key="log.id" class="px-5 py-3.5">
            <div class="ui-font text-sm font-medium text-text-main">{{ log.message }}</div>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>{{ memberName(log.userId) }} · {{ new Date(log.createdAt).toLocaleString() }}</span>
              <RouterLink :to="`/profiles/${log.userId}`" class="text-primary hover:underline">
                {{ $t('View Full') }}
              </RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="px-6 py-8 text-center text-sm text-text-muted">{{ $t('No member activity yet.') }}</div>
      </div>
    </div>

    <div
      v-if="combinedError"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-4 py-3 text-sm text-status-needs-fix-fg"
    >
      <span>{{ combinedError }}</span>
      <button type="button" class="btn-secondary h-8 px-3 text-xs" @click="loadDashboardData">
        {{ $t('Retry') }}
      </button>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 class="section-title">{{ $t('Recently submitted work') }}</h3>
          <RouterLink to="/reviews" class="text-sm text-primary hover:underline">{{ $t('Open Reviews') }}</RouterLink>
        </div>
        <ul v-if="recentSubmissions.length > 0" class="divide-y divide-border">
          <li v-for="submission in recentSubmissions" :key="submission.id" class="px-5 py-3.5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="ui-font text-sm font-medium text-text-main">{{ promptTitle(submission.assignmentId) }}</div>
                <div class="mt-1 text-xs text-text-muted">
                  {{ memberName(submission.submittedBy) }} · {{ projectName(submission.assignmentId) }} · {{ submission.submittedAt }}
                </div>
              </div>
              <StatusBadge :status="submission.status === 'submitted' ? 'pending_review' : submission.status" />
            </div>
          </li>
        </ul>
        <div v-else class="px-6 py-10 text-center text-sm text-text-muted">
          {{ anyLoading ? 'Loading...' : 'No submissions yet.' }}
        </div>
      </div>

      <div class="card">
        <div class="border-b border-border px-5 py-3.5">
          <h3 class="section-title">{{ $t('Project progress overview') }}</h3>
        </div>
        <div class="space-y-3 p-4">
          <div v-for="item in projectProgress" :key="item.status" class="flex items-center justify-between rounded-btn bg-soft/50 px-3 py-2">
            <StatusBadge :status="item.status" />
            <span class="ui-font text-sm font-semibold text-text-main">{{ item.count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { RouterLink } from 'vue-router';
import { isToday, presenceStatusFor } from '@/lib/presence';
import { useDataStore, type ProjectStatus } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { useTaskAlertsStore, type TaskAlertMetrics } from '@/stores/taskAlerts';
import { isDashboardVisibleMember, isFollowupParticipant, normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';
import { usePageRealtime, debounceRealtime } from '@/services/realtimeService';

const data = useDataStore();
const followup = useFollowupStore();
const taskAlertStore = useTaskAlertsStore();
const authStore = useAuthStore();

const taskAlertMetrics = ref<TaskAlertMetrics>({
  activeAlerts: 0,
  pendingAcknowledgements: 0,
  overdueAcknowledgements: 0,
  qualityCheckAlerts: 0,
  followUpAlerts: 0,
});

const taskAlertMetricsList = computed(() => [
  { label: 'Active Alerts', value: taskAlertMetrics.value.activeAlerts, dotClass: 'bg-primary' },
  { label: 'Pending Acknowledge', value: taskAlertMetrics.value.pendingAcknowledgements, dotClass: 'bg-status-submitted-fg' },
  { label: 'Overdue (24h+)', value: taskAlertMetrics.value.overdueAcknowledgements, dotClass: 'bg-status-needs-fix-fg' },
  { label: 'Quality Check Alerts', value: taskAlertMetrics.value.qualityCheckAlerts, dotClass: 'bg-status-rejected-fg' },
  { label: 'Follow-Up Alerts', value: taskAlertMetrics.value.followUpAlerts, dotClass: 'bg-status-approved-fg' },
]);

const icons = {
  members: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  projects: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  websites: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>',
  prompts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
  reviews: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/></svg>'
};

const anyLoading = computed(() => Object.values(data.loading).some(Boolean));
const combinedError = computed(() => Object.values(data.errors).find(Boolean) ?? null);
const canViewTeamMemberDetails = computed(() => authStore.isAdmin);
const recentSubmissions = computed(() => data.submissions.slice(0, 6));
const isWorker = (m: any) => {
  const r = normalizeRole(m.role);
  return r !== 'viewer' && r !== 'tester' && r !== 'employee';
};
const onlineMembers = computed(() => data.members.filter((m) => isWorker(m) && presenceStatusFor(m) === 'online'));
const awayMembers = computed(() => data.members.filter((m) => isWorker(m) && presenceStatusFor(m) === 'away'));
const offlineMembers = computed(() => data.members.filter((m) => isWorker(m) && presenceStatusFor(m) === 'offline'));
const activeTodayMembers = computed(() =>
  data.members.filter((m) => isWorker(m) && (isToday(m.lastActiveAt) || m.todayActivityCount > 0))
);
const teamActivityStats = computed(() => [
  { label: 'Online', value: onlineMembers.value.length },
  { label: 'Away', value: awayMembers.value.length },
  { label: 'Offline', value: offlineMembers.value.length },
  { label: 'Active Today', value: activeTodayMembers.value.length },
  { label: 'No Activity Today', value: Math.max(data.members.filter(isWorker).length - activeTodayMembers.value.length, 0) }
]);

const assignmentById = (id: string) => data.assignments.find((a) => a.id === id);
const promptTitle = (assignmentId: string) =>
  data.promptById(assignmentById(assignmentId)?.promptId)?.title ?? 'Assigned prompt';
const projectName = (assignmentId: string) =>
  data.projectById(assignmentById(assignmentId)?.projectId)?.name ?? 'No project';
const memberName = (id: string | null) => (id ? data.memberById(id)?.fullName ?? 'Team member' : 'Team member');

// ── Time Range filter ─────────────────────────────────────────────────────────
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Range = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';
const timeRange = ref<Range>('today');
const rangeOptions: { value: Range; label: string }[] = [
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'last_week',  label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

const mondayOf = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
};

/** Returns the inclusive [startIso, endIso] for the selected range. */
const dateRangeFor = (range: Range): { start: string; end: string; label: string; mondays: string[] } => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (range === 'today') {
    const iso = localIso(today);
    return { start: iso, end: iso, label: 'today', mondays: [localIso(mondayOf(today))] };
  }
  if (range === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    const iso = localIso(y);
    return { start: iso, end: iso, label: 'yesterday', mondays: [localIso(mondayOf(y))] };
  }
  if (range === 'this_week') {
    const m = mondayOf(today); const s = new Date(m); const e = new Date(m); e.setDate(m.getDate() + 6);
    return { start: localIso(s), end: localIso(e), label: 'this week', mondays: [localIso(m)] };
  }
  if (range === 'last_week') {
    const m = mondayOf(today); m.setDate(m.getDate() - 7);
    const e = new Date(m); e.setDate(m.getDate() + 6);
    return { start: localIso(m), end: localIso(e), label: 'last week', mondays: [localIso(m)] };
  }
  if (range === 'this_month') {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: localIso(s), end: localIso(e), label: 'this month', mondays: mondaysBetween(s, e) };
  }
  // last_month
  const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const e = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: localIso(s), end: localIso(e), label: 'last month', mondays: mondaysBetween(s, e) };
};

const mondaysBetween = (start: Date, end: Date): string[] => {
  const out: string[] = [];
  const cur = mondayOf(start);
  while (cur <= end) { out.push(localIso(cur)); cur.setDate(cur.getDate() + 7); }
  return out;
};

const currentRange = computed(() => dateRangeFor(timeRange.value));

// ── Followup team summary — schedule-aware, range-filtered ────────────────────
const blogSummary   = computed(() => followup.blogRangeSummary(currentRange.value.start, currentRange.value.end));
const pluginSummary = computed(() => {
  // Plugin/Speed are weekly — sum each Monday in the range so a multi-month
  // range counts each due week once. Single-day ranges resolve to that week.
  const ms = currentRange.value.mondays;
  if (ms.length === 0) return { done: 0, total: 0, pending: 0 };
  if (ms.length === 1) return followup.pluginRangeSummary(ms[0], ms[0]);
  return followup.pluginRangeSummary(ms[0], ms[ms.length - 1]);
});
const speedSummary = computed(() => {
  const ms = currentRange.value.mondays;
  if (ms.length === 0) return { done: 0, total: 0, pending: 0 };
  if (ms.length === 1) return followup.speedRangeSummary(ms[0], ms[0]);
  return followup.speedRangeSummary(ms[0], ms[ms.length - 1]);
});

// eBay: Mon-Sat required days x active followup users, completed = done entries in range.
const ebaySummary = computed(() => {
  const { start, end } = currentRange.value;
  const startD = new Date(start); const endD = new Date(end);
  let workDays = 0;
  for (const cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
    if (cur.getDay() !== 0) workDays++; // exclude Sunday
  }
  const memberCount = data.members.filter(isFollowupParticipant).length;
  const total = workDays * memberCount;
  const done = followup.ebayEntries
    .filter((e) => e.status === 'done' && e.date >= start && e.date <= end)
    .length;
  return { done, total, pending: Math.max(0, total - done) };
});

const followupSummary = computed(() => [
  {
    key: 'blog',
    label: 'Blog Followup',
    summary: blogSummary.value,
    to: '/followup/blog',
    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  },
  {
    key: 'plugin',
    label: 'Plugin Update',
    summary: pluginSummary.value,
    to: '/followup/plugins',
    icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
  },
  {
    key: 'ebay',
    label: 'eBay Click Followup',
    summary: ebaySummary.value,
    to: '/followup/ebay-click',
    icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
  },
  {
    key: 'speed',
    label: 'Website Optimization',
    summary: speedSummary.value,
    to: '/followup/speed-optimization',
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  }
]);

const statusOrder: ProjectStatus[] = ['not_started', 'in_progress', 'review', 'approved', 'completed'];
const projectProgress = computed(() =>
  statusOrder.map((status) => ({
    status,
    count: data.projects.filter((p) => p.status === status).length
  }))
);

const loadDashboardData = async () => {
  await data.fetchDashboardSummary();
  // Also fetch activity logs for the sidebar
  await data.fetchActivityLogs();
  // Followup team summary — non-blocking, silent on error
  try {
    await Promise.all([
      followup.fetchBlogSlots(),
      followup.fetchPluginSlots(),
      followup.fetchEbayEntries(),
      followup.fetchSpeedSlots()
    ]);
  } catch {
    // dashboard should not block on followup errors
  }
  
  // Task Alerts metrics load
  try {
    taskAlertMetrics.value = await taskAlertStore.fetchDashboardMetrics();
  } catch (err) {
    console.error('[dashboard] taskAlerts metrics failed', err);
  }
};

// Search and filtering state
const searchQuery = ref('');
const roleFilter = ref<'all' | 'team_member' | 'assistant_head' | 'head'>('all');
const showAllMembers = ref(false);

const quickFilters = [
  { key: 'online', label: 'Online only' },
  { key: 'pending_followups', label: 'Pending followups' },
  { key: 'missed_followups', label: 'Missed followups' },
  { key: 'tasks_in_progress', label: 'Tasks in progress' },
  { key: 'pending_reviews', label: 'Pending reviews' }
];

const activeQuickFilters = ref<Record<string, boolean>>({
  online: false,
  pending_followups: false,
  missed_followups: false,
  tasks_in_progress: false,
  pending_reviews: false
});

const hasTeamMemberFilters = computed(() =>
  Boolean(searchQuery.value.trim())
  || roleFilter.value !== 'all'
  || Object.values(activeQuickFilters.value).some(Boolean)
);

const showTeamMemberLoadError = computed(() =>
  Boolean(data.teamMemberSummaryError)
  && data.teamMemberSummaries.length === 0
  && !data.loadingTeamSummary
);

const teamMemberSummaryWarning = computed(() =>
  data.teamMemberSummaryError
  && data.teamMemberSummaries.length > 0
  && !data.loadingTeamSummary
    ? 'Could not refresh summary counts. Showing available member rows with zero counts where needed.'
    : ''
);

const teamMemberEmptyMessage = computed(() =>
  hasTeamMemberFilters.value
    ? 'No team members found for this filter.'
    : 'No dashboard-visible members found.'
);

const toggleQuickFilter = (key: string) => {
  activeQuickFilters.value[key] = !activeQuickFilters.value[key];
};

// Compute filtered list
const filteredMembers = computed(() => {
  let list = data.teamMemberSummaries.filter(isDashboardVisibleMember);

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter((m) =>
      m.fullName.toLowerCase().includes(q)
      || (m.email ?? '').toLowerCase().includes(q)
    );
  }

  // Role filter
  if (roleFilter.value !== 'all') {
    list = list.filter((m) => {
      const normalized = m.role?.toLowerCase().replace(/[\s-]+/g, '_') || '';
      if (roleFilter.value === 'team_member') {
        return normalized === 'member' || normalized === 'team_member';
      }
      return normalized === roleFilter.value;
    });
  }

  // Quick filters
  if (activeQuickFilters.value.online) {
    list = list.filter((m) => m.currentStatus === 'online');
  }
  if (activeQuickFilters.value.pending_followups) {
    list = list.filter((m) => m.followupsPending > 0);
  }
  if (activeQuickFilters.value.missed_followups) {
    list = list.filter((m) => m.followupsMissed > 0);
  }
  if (activeQuickFilters.value.tasks_in_progress) {
    list = list.filter((m) => m.tasksInProgress > 0);
  }
  if (activeQuickFilters.value.pending_reviews) {
    list = list.filter((m) => m.tasksWaitingReview > 0);
  }

  return list;
});

const itemsShownCount = computed(() => {
  return showAllMembers.value ? filteredMembers.value.length : 5;
});

const paginatedMembers = computed(() => {
  return filteredMembers.value.slice(0, itemsShownCount.value);
});

const toggleShowAll = () => {
  showAllMembers.value = !showAllMembers.value;
};

// Helpers
const getInitials = (name?: string) => {
  if (!name) return 'TM';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const statusDotClass = (status?: string) => {
  if (status === 'online') return 'bg-status-approved-fg';
  if (status === 'away') return 'bg-amber-500';
  return 'bg-text-soft';
};

const calculatePercent = (done: number, total: number) => {
  if (!total) return 0;
  return Math.round((done / total) * 100);
};

const formatLastActive = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

// Drawer state & handlers
const drawerOpen = ref(false);
const loadingDetails = ref(false);
const selectedMember = ref<any>(null);
const detailedData = ref<{ activities: any[]; tasks: any[]; qualityIssues: any[] }>({
  activities: [],
  tasks: [],
  qualityIssues: []
});

const openMemberDetails = async (member: any) => {
  selectedMember.value = member;
  drawerOpen.value = true;
  loadingDetails.value = true;
  try {
    const res = await data.fetchMemberDetailedData(
      member.memberId,
      currentRange.value.start,
      currentRange.value.end
    );
    detailedData.value = res;
  } catch (err) {
    console.error('Failed loading member detailed drawer details:', err);
  } finally {
    loadingDetails.value = false;
  }
};

const closeDrawer = () => {
  drawerOpen.value = false;
  selectedMember.value = null;
  detailedData.value = { activities: [], tasks: [], qualityIssues: [] };
};

// Helper inside drawer to find prompt title
const getPromptTitle = (promptId: string) => {
  return data.prompts.find((p) => p.id === promptId)?.title ?? 'Assigned Prompt';
};

const qiStatusClass = (status: string) => {
  if (status === 'approved' || status === 'closed') return 'bg-status-approved-bg text-status-approved-fg';
  if (status === 'fixed' || status === 'needs_review') return 'bg-status-submitted-bg text-status-submitted-fg';
  if (status === 'needs_fix' || status === 'reopened') return 'bg-status-needs-fix-bg text-status-needs-fix-fg';
  return 'bg-soft text-text-muted';
};

const formatActivityTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

// Reactive watcher for dashboard range synchronization
watch(
  [() => canViewTeamMemberDetails.value, () => currentRange.value],
  async ([canView, range]) => {
    if (canView && range) {
      await data.fetchTeamMemberSummary(range.start, range.end);
    }
  },
  { immediate: true }
);

// Live updates: the team-member table and summary cards come from aggregation
// RPCs, so when an underlying table changes anywhere we debounce-refetch the
// summary instead of patching individual rows. Followup slots are also patched
// into the followup store (reactive summary cards) via the same subscription.
const summaryTables = new Set([
  'blog_upload_slots',
  'blog_followup_schedules',
  'plugin_update_slots',
  'speed_optimization_slots',
  'ebay_click_followup',
  'section_tasks',
  'prompt_assignments',
  'submissions',
  'quality_issues',
  'websites'
]);
const refetchDashboard = debounceRealtime(async () => {
  await loadDashboardData();
  if (canViewTeamMemberDetails.value && currentRange.value) {
    await data.fetchTeamMemberSummary(currentRange.value.start, currentRange.value.end);
  }
}, 800);
usePageRealtime(
  [
    'blog_upload_slots',
    'blog_followup_schedules',
    'plugin_update_slots',
    'speed_optimization_slots',
    'ebay_click_followup',
    'section_tasks',
    'prompt_assignments',
    'submissions',
    'quality_issues',
    'websites',
    'activity_logs',
    'profiles'
  ],
  (payload) => {
    if (summaryTables.has(payload.table)) refetchDashboard();
  }
);

onMounted(() => {
  void loadDashboardData();
});
</script>
