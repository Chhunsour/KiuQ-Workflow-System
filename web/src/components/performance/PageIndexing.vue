<template>
  <div class="page-indexing font-sans text-text-main">
    <!-- Top control bar -->
    <div class="perf-filterbar mb-4">
      <!-- Mobile Sidebar Toggle -->
      <button
        type="button"
        class="lg:hidden btn-secondary h-9 px-3 text-[11px] flex items-center gap-1.5 font-semibold font-sans mr-auto"
        @click="emit('toggle-sidebar')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <span>{{ $t('nav.websites') || 'Websites' }}</span>
      </button>

      <!-- Scope Selection -->
      <div class="perf-wsel font-sans">
        <button type="button" class="input perf-wsel-btn font-semibold flex items-center gap-1.5" @click="toggleDropdown('scope')">
          <div v-if="scopeFilter === 'my' && auth.profile" class="perf-wsel-avatar">
            <img v-if="auth.profile.avatarUrl" :src="auth.profile.avatarUrl" class="perf-wsel-avatar-img" />
            <span v-else class="perf-wsel-avatar-initials">{{ getMemberInitials(auth.profile.fullName) }}</span>
          </div>
          <div v-else-if="scopeFilter === 'member' && selectedMemberObj" class="perf-wsel-avatar">
            <img v-if="selectedMemberObj.avatarUrl" :src="selectedMemberObj.avatarUrl" class="perf-wsel-avatar-img" />
            <span v-else class="perf-wsel-avatar-initials">{{ getMemberInitials(selectedMemberObj.fullName) }}</span>
          </div>
          <div v-else-if="scopeFilter === 'all' || scopeFilter === 'member'" class="perf-wsel-avatar">
            <img src="/favicon.png" class="perf-wsel-avatar-img" />
          </div>
          <span class="truncate flex-1 text-left">{{ $t('performance.viewingScope') }}: {{ scopeLabel }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform" :class="{ 'rotate-180': scopeDropdownOpen }"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <template v-if="scopeDropdownOpen">
          <div class="perf-wsel-backdrop" @click="scopeDropdownOpen = false" />
          <div class="perf-wsel-list">
            <button type="button" class="perf-wsel-item flex items-center gap-2" :class="{ active: scopeFilter === 'my' }" @click="selectScope('my')">
              <div v-if="auth.profile" class="perf-wsel-avatar h-4.5 w-4.5">
                <img v-if="auth.profile.avatarUrl" :src="auth.profile.avatarUrl" class="perf-wsel-avatar-img" />
                <span v-else class="perf-wsel-avatar-initials text-[7px]">{{ getMemberInitials(auth.profile.fullName) }}</span>
              </div>
              <div class="flex-1 text-left">
                <div class="font-semibold">{{ $t('performance.myWebsites') }}</div>
                <div class="text-[9px] text-text-muted" v-if="auth.profile">{{ auth.profile.fullName }} · {{ getMemberRoleLabel(auth.profile.id) }}</div>
              </div>
            </button>
            <button type="button" class="perf-wsel-item flex items-center gap-2" :class="{ active: scopeFilter === 'all' }" @click="selectScope('all')">
              <div class="perf-wsel-avatar h-4.5 w-4.5">
                <img src="/favicon.png" class="perf-wsel-avatar-img" />
              </div>
              <span>{{ $t('performance.allWebsites') }}</span>
            </button>
            <button type="button" class="perf-wsel-item flex items-center gap-2" :class="{ active: scopeFilter === 'member' }" @click="selectScope('member')">
              <div class="perf-wsel-avatar h-4.5 w-4.5">
                <img src="/favicon.png" class="perf-wsel-avatar-img" />
              </div>
              <span>{{ $t('performance.teamMember') }}</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Team Member Select -->
      <div v-if="scopeFilter === 'member'" class="perf-wsel font-sans">
        <button type="button" class="input perf-wsel-btn font-semibold" @click="toggleDropdown('member')">
          <div v-if="memberFilter" class="perf-wsel-avatar">
            <img v-if="selectedMemberObj?.avatarUrl" :src="selectedMemberObj?.avatarUrl" class="perf-wsel-avatar-img" />
            <span v-else class="perf-wsel-avatar-initials">{{ getMemberInitials(selectedMemberObj?.fullName) }}</span>
          </div>
          <span class="truncate flex-1 text-left">{{ memberFilter ? selectedMemberObj?.fullName : $t('performance.selectMember') }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform" :class="{ 'rotate-180': memberDropdownOpen }"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <template v-if="memberDropdownOpen">
          <div class="perf-wsel-backdrop" @click="memberDropdownOpen = false" />
          <div class="perf-wsel-list">
            <div v-if="memberProfilesLoading" class="p-3 text-center text-[11px] text-text-muted">{{ $t('performance.loadingMembers') }}</div>
            <div v-else-if="memberProfilesError" class="p-3 text-center text-[11px] text-status-needs-fix-fg flex flex-col gap-2">
              <span>{{ memberProfilesError }}</span>
              <button type="button" class="btn-secondary text-[10px] py-1 px-2.5 h-auto font-sans" @click="fetchMemberProfiles">{{ $t('common.retry') || 'Retry' }}</button>
            </div>
            <div v-else-if="allTeamMembers.length === 0" class="p-3 text-center text-[11px] text-text-muted">{{ $t('performance.noMembersFound') }}</div>
            <template v-else>
              <button v-for="m in allTeamMembers" :key="m.id" type="button" class="perf-wsel-item flex items-center gap-2" :class="{ active: memberFilter === m.id }" @click="selectMember(m.id)">
                <div class="perf-wsel-avatar">
                  <img v-if="m.avatarUrl" :src="m.avatarUrl" class="perf-wsel-avatar-img" />
                  <span v-else class="perf-wsel-avatar-initials">{{ getMemberInitials(m.fullName) }}</span>
                </div>
                <div class="flex-1 text-left min-w-0">
                  <div class="text-text-main font-semibold truncate">{{ m.fullName }}</div>
                  <div class="text-[10px] text-text-muted truncate capitalize">
                    {{ m.role.replace('_', ' ') }} · {{ memberWebsitesCount(m.id) }} website(s)
                  </div>
                </div>
              </button>
            </template>
          </div>
        </template>
      </div>

      <!-- Single Website Select -->
      <div v-if="scopeFilter === 'single'" class="perf-wsel font-sans">
        <button type="button" class="input perf-wsel-btn font-semibold" @click="toggleDropdown('website')">
          <WebsiteFavicon v-if="websiteFilter" :favicon-url="websiteObj(websiteFilter)?.faviconUrl" :domain="websiteObj(websiteFilter)?.domain" :name="websiteObj(websiteFilter)?.name" :size="18" />
          <span class="truncate flex-1 text-left ml-1">{{ websiteFilter ? (websiteObj(websiteFilter)?.name || websiteObj(websiteFilter)?.domain) : $t('performance.selectWebsite') }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform" :class="{ 'rotate-180': websiteDropdownOpen }"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <template v-if="websiteDropdownOpen">
          <div class="perf-wsel-backdrop" @click="websiteDropdownOpen = false" />
          <div class="perf-wsel-list">
            <button v-for="w in dataStore.websites" :key="w.id" type="button" class="perf-wsel-item flex items-center gap-2" :class="{ active: websiteFilter === w.id }" @click="selectWebsite(w.id)">
              <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="18" />
              <div class="flex-1 text-left min-w-0">
                <div class="text-text-main font-semibold truncate">{{ w.name || w.domain }}</div>
                <div class="text-[10px] text-text-muted flex items-center gap-1.5 truncate">
                  <span>{{ w.domain }}</span>
                  <span>·</span>
                  <span class="inline-flex items-center gap-1">
                    <div class="perf-wsel-avatar h-3.5 w-3.5 mr-0.5 inline-flex" v-if="w.createdBy">
                      <img v-if="getMemberAvatarUrl(w.createdBy)" :src="getMemberAvatarUrl(w.createdBy)" class="perf-wsel-avatar-img" />
                      <span v-else class="perf-wsel-avatar-initials text-[6px]">{{ getMemberInitials(getWebsiteCreatorName(w)) }}</span>
                    </div>
                    <span>Owner: {{ getWebsiteCreatorName(w) }}</span>
                  </span>
                </div>
              </div>
              <span v-if="perf.connectionByWebsite.has(w.id)" class="text-status-approved-fg text-[9px] flex-shrink-0">● {{ $t('Connected') }}</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Status Filter -->
      <div class="perf-wsel font-sans">
        <button type="button" class="input perf-wsel-btn" @click="toggleDropdown('status')">
          <span class="truncate flex-1 text-left">{{ $t('common.status') }}: {{ selectedStatusLabel }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform" :class="{ 'rotate-180': statusDropdownOpen }"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <template v-if="statusDropdownOpen">
          <div class="perf-wsel-backdrop" @click="statusDropdownOpen = false" />
          <div class="perf-wsel-list">
            <button type="button" class="perf-wsel-item" :class="{ active: statusFilter === 'all' }" @click="selectStatus('all')">{{ $t('pageIndexing.allStatuses') }}</button>
            <button type="button" class="perf-wsel-item" :class="{ active: statusFilter === 'healthy' }" @click="selectStatus('healthy')">{{ $t('pageIndexing.healthy') }}</button>
            <button type="button" class="perf-wsel-item" :class="{ active: statusFilter === 'issues' }" @click="selectStatus('issues')">{{ $t('pageIndexing.hasIssues') }}</button>
            <button type="button" class="perf-wsel-item" :class="{ active: statusFilter === 'unchecked' }" @click="selectStatus('unchecked')">{{ $t('pageIndexing.notChecked') }}</button>
            <button type="button" class="perf-wsel-item" :class="{ active: statusFilter === 'unconnected' }" @click="selectStatus('unconnected')">{{ $t('pageIndexing.notConnected') }}</button>
          </div>
        </template>
      </div>

      <!-- Search Website input -->
      <div class="flex items-center border border-border/60 rounded-lg px-2 h-9 bg-card flex-shrink-0 min-w-[12rem] max-w-[14rem]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted mr-1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          v-model="tableSearch"
          class="bg-transparent border-0 text-[11px] text-text-main outline-none w-full font-sans font-medium"
          :placeholder="$t('pageIndexing.searchWebsites')"
        />
      </div>

      <!-- Advanced Filters -->
      <div class="perf-wsel font-sans">
        <button
          type="button"
          class="btn-secondary h-9 px-3 text-[11px] flex items-center gap-1.5 font-semibold"
          @click="openAdvancedFilters"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>{{ $t('performance.advancedFilters') }}</span>
          <span v-if="activeAdvancedFiltersCount > 0" class="bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-full font-number font-bold ml-1">
            {{ activeAdvancedFiltersCount }}
          </span>
        </button>
        <template v-if="advancedDropdownOpen">
          <div class="perf-wsel-backdrop" @click="advancedDropdownOpen = false" />
          <div class="perf-wsel-list w-80 p-4 space-y-4 right-0 left-auto" style="right: 0; left: auto;">
            <h4 class="text-[11px] font-bold text-text-main font-sans uppercase tracking-wider mb-2">
              {{ $t('performance.advancedFilters') }}
            </h4>
            
            <!-- Platform filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.websitePlatform') }}</label>
              <select v-model="tempPlatformFilter" class="input w-full py-1.5 px-2 text-[11px] bg-input font-sans">
                <option value="">{{ $t('performance.allPlatforms') }}</option>
                <option value="wordpress">{{ $t('performance.wordpress') }}</option>
                <option value="framework">{{ $t('performance.framework') }}</option>
                <option value="unknown">{{ $t('performance.unknown') }}</option>
              </select>
            </div>

            <!-- Connection Status filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.connectionStatus') }}</label>
              <select v-model="tempConnFilter" class="input w-full py-1.5 px-2 text-[11px] bg-input font-sans">
                <option value="all">{{ $t('performance.allStatuses') }}</option>
                <option value="connected">{{ $t('performance.connectedOnly') }}</option>
                <option value="not">{{ $t('performance.notConnected') }}</option>
              </select>
            </div>

            <!-- Website Type filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.websiteType') }}</label>
              <select v-model="tempWebsiteTypeFilter" class="input w-full py-1.5 px-2 text-[11px] bg-input font-sans">
                <option value="">{{ $t('common.all') || 'All' }}</option>
                <option v-for="t in websiteTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
              </select>
            </div>

            <!-- Sort Dropdown -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('Sort By') }}</label>
              <select v-model="sortBy" class="input w-full py-1.5 px-2 text-[11px] bg-input font-sans">
                <option value="issues_desc">{{ $t('pageIndexing.highestIssues') }}</option>
                <option value="health_asc">{{ $t('pageIndexing.lowestHealth') }}</option>
                <option value="pages_desc">{{ $t('pageIndexing.mostKnownPages') }}</option>
                <option value="checked_desc">{{ $t('pageIndexing.recentlyChecked') }}</option>
                <option value="name_asc">{{ $t('pageIndexing.websiteNameAZ') }}</option>
              </select>
            </div>

            <!-- Rows Per Page -->
            <div v-if="viewMode === 'table' || viewMode === 'compact-row'" class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('Rows Per Page') }}</label>
              <select v-model="rowsPerPage" class="input w-full py-1.5 px-2 text-[11px] bg-input font-sans">
                <option :value="10">{{ $t('pageIndexing.perPage', { num: 10 }) }}</option>
                <option :value="25">{{ $t('pageIndexing.perPage', { num: 25 }) }}</option>
                <option :value="50">{{ $t('pageIndexing.perPage', { num: 50 }) }}</option>
                <option :value="100">{{ $t('pageIndexing.perPage', { num: 100 }) }}</option>
              </select>
            </div>

            <!-- Apply & Reset buttons -->
            <div class="flex gap-2 pt-2 border-t border-border/40">
              <button type="button" class="btn-primary flex-1 py-1.5 text-[11px] font-semibold" @click="applyAdvancedFilters">
                {{ $t('performance.applyFilters') }}
              </button>
              <button type="button" class="btn-secondary py-1.5 px-3 text-[11px] font-semibold" @click="resetAdvancedFilters">
                {{ $t('performance.resetFilters') }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- View Switcher -->
      <div class="flex border border-border rounded-lg overflow-hidden p-0.5 bg-soft/30 flex-shrink-0 font-sans ml-auto">
        <button
          v-for="mode in ['compact-row', 'table', 'card', 'column'] as const"
          :key="mode"
          type="button"
          class="px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-120 border-0 cursor-pointer"
          :class="viewMode === mode ? 'bg-primary text-on-primary font-bold' : 'bg-transparent text-text-muted hover:text-text-main'"
          @click="setViewMode(mode)"
        >
          <span class="capitalize">{{ translateViewMode(mode) }}</span>
        </button>
      </div>
    </div>

    <!-- Active Advanced Filters Summary -->
    <div v-if="activeAdvancedFiltersCount > 0" class="flex items-center gap-2 text-[11px] text-text-muted mb-4 px-1 font-sans">
      <span>{{ $t('performance.advancedFiltersActive') }}: <strong class="text-text-main font-number font-bold">{{ activeAdvancedFiltersCount }}</strong></span>
      <span>•</span>
      <button type="button" class="text-primary hover:underline cursor-pointer font-sans" @click="resetAdvancedFilters">
        {{ $t('performance.clearAll') }}
      </button>
    </div>

    <div v-if="websites.length > 0">
      <!-- Summary metrics cards -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 mb-4">
        <div class="pi-card py-2 px-3.5 bg-card border border-border/60">
          <div class="pi-card-top font-sans"><span class="pi-dot" style="background:var(--accent-cyan)" />{{ $t('pageIndexing.knownPages') }}</div>
          <div class="pi-card-v font-number font-extrabold text-2xl mt-1">{{ fmtNum(activeSummary.known) }}</div>
        </div>
        <div class="pi-card py-2 px-3.5 bg-card border border-border/60">
          <div class="pi-card-top font-sans"><span class="pi-dot" style="background:#22c55e" />{{ $t('pageIndexing.indexed') }}</div>
          <div class="pi-card-v text-status-approved-fg font-number font-extrabold text-2xl mt-1">{{ fmtNum(activeSummary.indexed) }}</div>
        </div>
        <div class="pi-card py-2 px-3.5 bg-card border border-border/60">
          <div class="pi-card-top font-sans"><span class="pi-dot" style="background:#ef4444" />{{ $t('pageIndexing.notIndexed') }}</div>
          <div class="pi-card-v text-status-needs-fix-fg font-number font-extrabold text-2xl mt-1">{{ fmtNum(activeSummary.notIndexed) }}</div>
        </div>
        <div class="pi-card py-2 px-3.5 bg-card border border-border/60">
          <div class="pi-card-top font-sans"><span class="pi-dot" style="background:var(--primary)" />{{ $t('pageIndexing.indexingHealth') }}</div>
          <div class="pi-card-v font-number font-extrabold text-2xl mt-1">{{ totalHealth }}%</div>
          <div class="pi-bar mt-1.5"><span class="pi-bar-fill" :class="healthBarClass(totalHealth)" :style="{ width: Math.min(totalHealth, 100) + '%' }" /></div>
        </div>
        <div class="pi-card py-2 px-3.5 col-span-2 md:col-span-1 bg-card border border-border/60">
          <div class="pi-card-top font-sans"><span class="pi-dot" style="background:#f59e0b" />{{ $t('pageIndexing.sitesWithIssues') }}</div>
          <div class="pi-card-v text-status-submitted-fg font-number font-extrabold text-2xl mt-1">
            {{ websitesWithIssues }}
          </div>
        </div>
      </div>

      <!-- No Indexing Data Banner -->
      <div v-if="activeSummary.known === 0" class="mb-4 card card-pad py-12 text-center border border-dashed border-border bg-soft/10">
        <div class="text-sm font-bold text-text-main mb-2">{{ $t('pageIndexing.noDataTitle') }}</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto mb-4 font-sans">{{ $t('pageIndexing.noDataSub') }}</p>
        <button v-if="isAdmin" class="btn-primary font-sans font-semibold text-xs h-9 px-4" type="button" :disabled="bulkBusy" @click="runBulkDiscover">
          {{ $t('pageIndexing.discoverUrls') }}
        </button>
      </div>

      <!-- System message banner -->
      <p v-if="store.message" class="mb-4 rounded-xl border border-border bg-soft/40 px-3 py-2.5 text-xs text-text-muted flex items-center justify-between font-sans">
        <span>{{ store.message }}</span>
        <button class="ml-2 underline hover:text-text-main cursor-pointer" type="button" @click="store.message = null">{{ $t('pageIndexing.dismiss') }}</button>
      </p>
      <!-- Bulk Actions bar -->
      <div v-if="selectedSiteIds.size > 0" class="card px-4 py-2.5 mb-4 flex flex-wrap items-center justify-between gap-3 bg-primary/10 border border-primary/20">
        <div class="text-xs font-semibold text-text-main font-sans">
          <span>{{ $t('pageIndexing.websitesSelected', { count: selectedSiteIds.size }) }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-if="isAdmin" class="pi-btn text-xs py-1 px-3" type="button" :disabled="bulkBusy" @click="runBulkDiscover">
            {{ $t('pageIndexing.discoverUrls') }}
          </button>
          <button v-if="isAdmin" class="pi-btn pi-btn--primary text-xs py-1 px-3" type="button" :disabled="bulkBusy" @click="runBulkCheck">
            {{ $t('pageIndexing.checkIndexing') }}
          </button>
          <button v-if="isAdmin" class="pi-btn text-xs py-1 px-3" type="button" :disabled="bulkBusy" @click="runBulkRetry">
            {{ $t('pageIndexing.retryFailed') }}
          </button>
          <button class="pi-btn text-xs bg-card border-border hover:border-text-muted py-1 px-3" type="button" @click="exportSelected">
            {{ $t('pageIndexing.exportCsv') }}
          </button>
          <button class="pi-btn text-xs bg-transparent border-transparent text-status-needs-fix-fg underline px-1.5 cursor-pointer" type="button" @click="selectedSiteIds.clear()">
            {{ $t('pageIndexing.deselectAll') }}
          </button>
        </div>
      </div>

      <!-- 1. COMPACT ROW VIEW -->
      <div v-if="viewMode === 'compact-row'" class="card border border-border/60 rounded-2xl overflow-hidden bg-card">
        <div class="overflow-x-auto">
          <table class="pi-table pi-table--compact">
            <thead>
              <tr class="bg-soft/5">
                <th class="w-10 text-center">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th>{{ $t('pageIndexing.website') }}</th>
                <th class="num">{{ $t('pageIndexing.known') }}</th>
                <th class="num">{{ $t('pageIndexing.indexed') }}</th>
                <th class="num">{{ $t('pageIndexing.notIndexed') }}</th>
                <th class="num">{{ $t('pageIndexing.health') }}</th>
                <th class="num">{{ $t('pageIndexing.issues') }}</th>
                <th>{{ $t('pageIndexing.lastChecked') }}</th>
                <th class="pi-act-col text-right">{{ $t('pageIndexing.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in pagedWebsites" :key="w.id" class="pi-trow hover:bg-soft/10" :class="{ 'bg-primary/5': selectedSiteIds.has(w.id) }" @click="openWebsite(w)">
                <td class="text-center" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedSiteIds.has(w.id)"
                    @change="toggleSelect(w.id)"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="20" />
                    <span class="font-semibold text-text-main truncate text-xs font-sans">{{ w.name || w.domain }}</span>
                    <span class="text-[10px] text-text-muted font-sans font-mono truncate max-w-[8rem] hidden sm:inline">{{ cleanDomain(w.domain) }}</span>
                  </div>
                </td>
                <td class="num font-bold text-xs font-number">{{ fmtNum(sumOf(w).known) }}</td>
                <td class="num text-xs font-number"><span :class="sumOf(w).indexed ? 'text-status-approved-fg font-semibold' : 'text-text-muted/40'">{{ fmtNum(sumOf(w).indexed) }}</span></td>
                <td class="num text-xs font-number"><span :class="sumOf(w).notIndexed ? 'text-status-needs-fix-fg font-semibold' : 'text-text-muted/40'">{{ fmtNum(sumOf(w).notIndexed) }}</span></td>
                <td class="num font-bold text-xs font-number" :class="healthClass(store.health(sumOf(w)))">{{ store.health(sumOf(w)) }}%</td>
                <td class="num text-xs font-number">
                  <span v-if="sumOf(w).notIndexed + sumOf(w).warning > 0" class="text-status-needs-fix-fg font-bold">
                    {{ sumOf(w).notIndexed + sumOf(w).warning }}
                  </span>
                  <span v-else class="text-text-muted/40">—</span>
                </td>
                <td class="text-xs text-text-muted whitespace-nowrap font-sans">{{ sumOf(w).lastChecked ? fmtDate(sumOf(w).lastChecked) : $t('pageIndexing.never') }}</td>
                <td @click.stop class="py-1">
                  <div class="flex justify-end gap-1.5">
                    <button v-if="isAdmin" class="pi-btn py-0.5 px-2 text-[10px]" type="button" :disabled="store.busyIds.has(w.id)" @click="store.discoverUrls(w.id)">{{ $t('pageIndexing.discover') }}</button>
                    <button v-if="isAdmin" class="pi-btn pi-btn--primary py-0.5 px-2 text-[10px]" type="button" :disabled="store.busyIds.has(w.id) || !sumOf(w).known" @click="store.checkIndexing(w.id, 'new', undefined, 25)">{{ $t('pageIndexing.check') }}</button>
                    <button class="pi-btn py-0.5 px-2 text-[10px]" type="button" @click="openWebsite(w)">{{ $t('pageIndexing.view') }}</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredWebsites.length">
                <td colspan="9" class="py-12 text-center text-sm text-text-muted font-sans">{{ websites.length ? $t('pageIndexing.noWebsitesFilter') : $t('pageIndexing.noConnectedWebsites') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. TABLE VIEW -->
      <div v-else-if="viewMode === 'table'" class="card border border-border/60 rounded-2xl overflow-hidden bg-card">
        <div class="overflow-x-auto">
          <table class="pi-table">
            <thead>
              <tr class="bg-soft/5">
                <th class="w-10 text-center">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th>{{ $t('pageIndexing.website') }}</th>
                <th>{{ $t('pageIndexing.domain') }}</th>
                <th class="num">{{ $t('pageIndexing.known') }}</th>
                <th class="num">{{ $t('pageIndexing.indexed') }}</th>
                <th class="num">{{ $t('pageIndexing.notIndexed') }}</th>
                <th>{{ $t('pageIndexing.health') }}</th>
                <th>{{ $t('pageIndexing.lastChecked') }}</th>
                <th>{{ $t('pageIndexing.status') }}</th>
                <th class="pi-act-col text-right">{{ $t('pageIndexing.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in pagedWebsites" :key="w.id" class="pi-trow hover:bg-soft/10" :class="{ 'bg-primary/5': selectedSiteIds.has(w.id) }" @click="openWebsite(w)">
                <td class="text-center" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedSiteIds.has(w.id)"
                    @change="toggleSelect(w.id)"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </td>
                <td>
                  <div class="pi-site">
                    <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="24" />
                    <div class="min-w-0 ml-1">
                      <div class="pi-site-name truncate text-xs font-sans">{{ w.name || w.domain }}</div>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-xs text-text-muted">{{ cleanDomain(w.domain) }}</td>
                <td class="num font-bold text-xs font-number">{{ fmtNum(sumOf(w).known) }}</td>
                <td class="num font-number"><span :class="sumOf(w).indexed ? 'pi-pill pi-pill--ok' : 'pi-muted'">{{ fmtNum(sumOf(w).indexed) }}</span></td>
                <td class="num font-number"><span :class="sumOf(w).notIndexed ? 'pi-pill pi-pill--bad' : 'pi-muted'">{{ fmtNum(sumOf(w).notIndexed) }}</span></td>
                <td>
                  <div v-if="sumOf(w).checked" class="pi-health font-sans">
                    <div class="pi-bar"><span class="pi-bar-fill" :class="healthBarClass(store.health(sumOf(w)))" :style="{ width: Math.min(store.health(sumOf(w)), 100) + '%' }" /></div>
                    <span class="pi-health-pct font-number" :class="healthClass(store.health(sumOf(w)))">{{ store.health(sumOf(w)) }}%</span>
                  </div>
                  <span v-else class="pi-muted font-sans">—</span>
                </td>
                <td class="whitespace-nowrap text-xs text-text-muted font-sans">{{ fmtDateTime(sumOf(w).lastChecked) }}</td>
                <td>
                  <span v-if="!perf.connectionByWebsite.has(w.id)" class="pi-badge bg-soft text-text-muted font-sans">{{ $t('pageIndexing.notConnected') }}</span>
                  <span v-else-if="!sumOf(w).checked" class="pi-badge bg-soft text-text-muted font-sans">{{ $t('pageIndexing.notChecked') }}</span>
                  <span v-else-if="sumOf(w).notIndexed + sumOf(w).warning > 0" class="pi-badge bg-status-needs-fix-bg/15 text-status-needs-fix-fg font-sans">{{ $t('pageIndexing.issues') }}</span>
                  <span v-else class="pi-badge bg-status-approved-bg/15 text-status-approved-fg font-sans">{{ $t('pageIndexing.healthy') }}</span>
                </td>
                <td @click.stop>
                  <div class="pi-actions">
                    <button v-if="isAdmin" class="pi-btn py-1 px-2 text-[10px]" type="button" :disabled="store.busyIds.has(w.id)" @click="store.discoverUrls(w.id)">{{ $t('pageIndexing.discover') }}</button>
                    <button v-if="isAdmin" class="pi-btn pi-btn--primary py-1 px-2 text-[10px]" type="button" :disabled="store.busyIds.has(w.id) || !sumOf(w).known" @click="store.checkIndexing(w.id, 'new', undefined, 25)">{{ $t('pageIndexing.check') }}</button>
                    <button class="pi-btn py-1 px-2 text-[10px]" type="button" @click="openWebsite(w)">{{ $t('pageIndexing.view') }}</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredWebsites.length">
                <td colspan="10" class="py-12 text-center text-sm text-text-muted font-sans">{{ websites.length ? $t('pageIndexing.noWebsitesFilter') : $t('pageIndexing.noConnectedWebsites') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3. CARD VIEW -->
      <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="w in pagedWebsites" :key="w.id" class="card card-pad relative flex flex-col justify-between hover:border-text-muted transition-all duration-120 bg-card border border-border/60">
          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="flex items-center gap-2 min-w-0">
                <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="22" />
                <div class="min-w-0 ml-0.5">
                  <div class="text-xs font-bold text-text-main truncate font-sans" :title="w.name || w.domain">{{ w.name || w.domain }}</div>
                  <div class="text-[10px] text-text-muted truncate font-mono">{{ cleanDomain(w.domain) }}</div>
                </div>
              </div>
              <input
                type="checkbox"
                :checked="selectedSiteIds.has(w.id)"
                @change="toggleSelect(w.id)"
                class="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
              />
            </div>

            <div class="space-y-2 mt-4 text-xs font-sans">
              <div class="flex justify-between">
                <span class="text-text-muted">{{ $t('pageIndexing.knownPages') }}</span>
                <span class="font-bold text-text-main font-number">{{ fmtNum(sumOf(w).known) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-muted">{{ $t('pageIndexing.indexed') }}</span>
                <span class="font-bold text-status-approved-fg font-number">{{ fmtNum(sumOf(w).indexed) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-muted">{{ $t('pageIndexing.notIndexed') }}</span>
                <span class="font-bold text-status-needs-fix-fg font-number">{{ fmtNum(sumOf(w).notIndexed) }}</span>
              </div>
              
              <div class="pt-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-text-muted text-[10px] uppercase font-bold">{{ $t('pageIndexing.indexingHealth') }}</span>
                  <span class="font-bold text-text-main font-number" :class="healthClass(store.health(sumOf(w)))">{{ store.health(sumOf(w)) }}%</span>
                </div>
                <div class="pi-bar"><span class="pi-bar-fill" :class="healthBarClass(store.health(sumOf(w)))" :style="{ width: Math.min(store.health(sumOf(w)), 100) + '%' }" /></div>
              </div>
            </div>
          </div>

          <div class="border-t border-border/80 pt-3 mt-4 flex items-center justify-between gap-2">
            <span class="text-[10px] text-text-muted truncate font-sans" :title="fmtDateTime(sumOf(w).lastChecked)">
              {{ $t('pageIndexing.lastChecked') }}: {{ sumOf(w).lastChecked ? fmtDate(sumOf(w).lastChecked) : $t('pageIndexing.never') }}
            </span>
            <div class="flex gap-1.5">
              <button class="pi-btn py-1 px-2.5 text-xs font-sans" type="button" @click="openWebsite(w)">{{ $t('pageIndexing.viewDetails') }}</button>
            </div>
          </div>
        </div>
        <div v-if="!filteredWebsites.length" class="col-span-full card py-16 text-center text-sm text-text-muted bg-card border border-border/60">
          {{ websites.length ? $t('pageIndexing.noWebsitesFilter') : $t('pageIndexing.noConnectedWebsites') }}
        </div>
      </div>

      <!-- 4. COLUMN VIEW (KANBAN) -->
      <div v-else-if="viewMode === 'column'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="col in columnsList" :key="col.key" class="card flex flex-col min-h-[28rem] bg-card/20 border border-border/60">
          <div class="px-3 py-2.5 border-b border-border flex items-center justify-between bg-soft/10 rounded-t-xl flex-shrink-0">
            <span class="text-xs font-bold text-text-main capitalize font-sans">{{ col.label }}</span>
            <span class="text-[10px] bg-soft px-1.5 py-0.5 rounded font-mono text-text-muted">
              {{ col.items.length }}
            </span>
          </div>
          
          <div class="p-2 space-y-2 flex-1 overflow-y-auto max-h-[36rem]">
            <div
              v-for="w in col.items"
              :key="w.id"
              class="p-2.5 rounded-lg border border-border bg-card flex flex-col justify-between hover:border-text-muted cursor-pointer transition-all duration-120"
              @click="openWebsite(w)"
            >
              <div class="flex items-start justify-between gap-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="16" />
                  <div class="min-w-0 ml-0.5">
                    <div class="text-xs font-bold text-text-main truncate font-sans" :title="w.name || w.domain">{{ w.name || w.domain }}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  :checked="selectedSiteIds.has(w.id)"
                  @change.stop="toggleSelect(w.id)"
                  class="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                />
              </div>
              
              <div class="mt-2.5 flex justify-between text-[10px] text-text-muted font-sans">
                <span>{{ $t('pageIndexing.health') }}: <strong class="text-text-main font-bold">{{ store.health(sumOf(w)) }}%</strong></span>
                <span v-if="sumOf(w).notIndexed + sumOf(w).warning > 0">{{ $t('pageIndexing.issues') }}: <strong class="text-status-needs-fix-fg font-bold">{{ sumOf(w).notIndexed + sumOf(w).warning }}</strong></span>
                <span v-else>{{ $t('pageIndexing.knownPages') }}: <strong class="text-text-main font-bold">{{ sumOf(w).known }}</strong></span>
              </div>
            </div>
            <div v-if="!col.items.length" class="text-center py-16 text-xs text-text-muted font-sans">
              {{ $t('pageIndexing.noWebsitesFound') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination footer -->
      <div v-if="(viewMode === 'table' || viewMode === 'compact-row' || viewMode === 'card') && filteredWebsites.length > rowsPerPage" class="flex items-center justify-between text-xs text-text-muted mt-4 font-sans">
        <span>{{ $t('pageIndexing.showing', { start: (currentPage - 1) * rowsPerPage + 1, end: Math.min(currentPage * rowsPerPage, filteredWebsites.length), total: filteredWebsites.length }) }}</span>
        <div class="flex gap-2">
          <button class="btn-secondary h-8 px-3 text-xs" type="button" :disabled="currentPage <= 1" @click="currentPage--">{{ $t('pageIndexing.prev') }}</button>
          <button class="btn-secondary h-8 px-3 text-xs" type="button" :disabled="currentPage >= totalPages" @click="currentPage++">{{ $t('pageIndexing.next') }}</button>
        </div>
      </div>
    </div>

    <!-- Empty States if no websites synced -->
    <div v-else class="py-16 text-center card bg-card border border-border/60 rounded-2xl">
      <div v-if="scopeFilter === 'my'" class="space-y-3 font-sans">
        <div class="text-base font-bold text-text-main">{{ $t('pageIndexing.noWebsitesAssigned') }}</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto">{{ $t('pageIndexing.noWebsitesAssignedSub') }}</p>
        <button class="btn-primary font-sans font-semibold text-xs h-9 px-4" type="button" @click="emit('switch-scope', 'all')">{{ $t('pageIndexing.switchToAll') }}</button>
      </div>
      <div v-else-if="scopeFilter === 'member'" class="space-y-1 font-sans">
        <div class="text-base font-bold text-text-main">{{ $t('pageIndexing.noWebsitesMember') }}</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto">{{ $t('pageIndexing.noWebsitesMemberSub') }}</p>
      </div>
      <div v-else-if="scopeFilter === 'single'" class="space-y-1 font-sans">
        <div class="text-base font-bold text-text-main">{{ $t('pageIndexing.noIndexingDataYet') }}</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto">{{ $t('pageIndexing.noIndexingDataYetSub') }}</p>
      </div>
      <div v-else class="space-y-1 font-sans">
        <div class="text-base font-bold text-text-main">{{ $t('pageIndexing.noWebsitesFound') }}</div>
      </div>
    </div>

    <!-- Right Drawer side panel -->
    <Transition name="drawer">
      <div v-if="openSite" class="pi-drawer-backdrop" @click="closeWebsite">
        <div class="pi-drawer-content bg-card border-l border-border" @click.stop>
          <!-- Drawer Header -->
          <div class="p-4 border-b border-border flex items-center justify-between gap-4 flex-shrink-0 bg-soft/10">
            <div class="flex items-center gap-3 min-w-0">
              <WebsiteFavicon :favicon-url="openSite.faviconUrl" :domain="openSite.domain" :name="openSite.name" :size="28" />
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-text-main truncate font-sans" :title="openSite.name || openSite.domain">{{ openSite.name || openSite.domain }}</h3>
                <p class="text-xs text-text-muted truncate font-mono">{{ openSite.domain }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3 font-sans">
              <span class="text-[11px] text-text-muted font-mono hidden sm:inline bg-soft/20 px-2 py-0.5 rounded">
                {{ $t('pageIndexing.property') }}: <code>{{ perf.connectionByWebsite.get(openSite.id)?.gsc_property_url || $t('pageIndexing.notMapped') }}</code>
              </span>
              <button @click="closeWebsite" type="button" class="btn-ghost p-1 rounded hover:bg-soft text-text-muted hover:text-text-main border-0 cursor-pointer" :aria-label="$t('pageIndexing.closeDetails')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          
          <!-- Scrollable content -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Stats overview grid -->
            <div class="grid grid-cols-2 gap-2 md:grid-cols-4 font-sans">
              <div class="pi-card py-2 px-3 bg-card border border-border/40">
                <div class="pi-card-top text-[10px]"><span class="pi-dot" style="background:var(--accent-cyan)" />{{ $t('pageIndexing.knownPages') }}</div>
                <div class="text-base font-extrabold text-text-main mt-0.5 font-number">{{ fmtNum(activeSummary.known) }}</div>
              </div>
              <div class="pi-card py-2 px-3 bg-card border border-border/40">
                <div class="pi-card-top text-[10px]"><span class="pi-dot" style="background:#22c55e" />{{ $t('pageIndexing.indexed') }}</div>
                <div class="text-base font-extrabold text-status-approved-fg mt-0.5 font-number">{{ fmtNum(activeSummary.indexed) }}</div>
              </div>
              <div class="pi-card py-2 px-3 bg-card border border-border/40">
                <div class="pi-card-top text-[10px]"><span class="pi-dot" style="background:#ef4444" />{{ $t('pageIndexing.notIndexed') }}</div>
                <div class="text-base font-extrabold text-status-needs-fix-fg mt-0.5 font-number">{{ fmtNum(activeSummary.notIndexed) }}</div>
              </div>
              <div class="pi-card py-2 px-3 bg-card border border-border/40">
                <div class="pi-card-top text-[10px]"><span class="pi-dot" style="background:var(--primary)" />{{ $t('pageIndexing.health') }}</div>
                <div class="text-base font-extrabold text-text-main mt-0.5 font-number">{{ totalHealth }}%</div>
              </div>
            </div>

            <!-- Site Actions Gated -->
            <div v-if="isAdmin" class="flex flex-wrap gap-2 pt-1 border-b border-border/60 pb-3 font-sans">
              <button class="pi-btn text-xs py-1 px-3" type="button" :disabled="store.busyIds.has(openSite.id)" @click="store.discoverUrls(openSite.id)">
                {{ store.busyIds.has(openSite.id) ? $t('pageIndexing.working') : $t('pageIndexing.discoverUrls') }}
              </button>
              <button class="pi-btn pi-btn--primary text-xs py-1 px-3" type="button" :disabled="store.busyIds.has(openSite.id) || !store.urls.length" @click="store.checkIndexing(openSite.id, 'new', undefined, 25)">
                {{ store.busyIds.has(openSite.id) ? $t('pageIndexing.working') : $t('pageIndexing.checkIndexing') }}
              </button>
              <button v-if="someNotIndexed" class="pi-btn text-xs py-1 px-3" type="button" :disabled="store.busyIds.has(openSite.id)" @click="store.checkIndexing(openSite.id, 'not_indexed', undefined, 25)">
                {{ $t('pageIndexing.reCheckNotIndexed') }}
              </button>
              <button class="pi-btn text-xs py-1 px-3 bg-soft/20 border-border" type="button" @click="showManualUrlModal = true">
                {{ $t('pageIndexing.addManualUrls') }}
              </button>
            </div>

            <!-- Drawer Tabs -->
            <div class="border-b border-border flex gap-1 overflow-x-auto font-sans">
              <button
                v-for="t in detailTabsList"
                :key="t.key"
                type="button"
                :class="['mb-[-1px] pb-2 pt-1 border-b-2 px-3 font-semibold text-xs cursor-pointer transition-all duration-120 bg-transparent', detailTab === t.key ? 'border-primary text-text-main font-bold' : 'border-transparent text-text-muted hover:text-text-main']"
                @click="setDetailTab(t.key)"
              >
                {{ t.label }}
              </button>
            </div>

            <!-- Tab content -->
            <div v-if="store.detailLoading" class="py-16 text-center text-xs text-text-muted font-sans">
              {{ $t('common.loading') }}
            </div>
            
            <div v-else-if="!isConnected" class="py-12 text-center border border-dashed border-border rounded-xl bg-soft/10 font-sans">
              <div class="text-xs font-bold text-text-main mb-1">{{ $t('pageIndexing.gscNotConnected') }}</div>
              <p class="text-[11px] text-text-muted max-w-xs mx-auto">{{ $t('pageIndexing.gscNotConnectedSub') }}</p>
            </div>
            
            <div v-else-if="!store.urls.length" class="py-12 text-center border border-dashed border-border rounded-xl bg-soft/10 font-sans">
              <div class="text-xs font-bold text-text-main mb-2">{{ $t('pageIndexing.noUrlsFound') }}</div>
              <button v-if="isAdmin" class="pi-btn pi-btn--primary text-xs mx-auto" type="button" :disabled="store.busyIds.has(openSite.id)" @click="store.discoverUrls(openSite.id)">
                {{ $t('pageIndexing.noUrlsFoundSub') }}
              </button>
            </div>

            <template v-else-if="detailTab !== 'logs'">
              <!-- Detail filters -->
              <div class="flex flex-wrap items-center gap-2 bg-soft/10 p-2.5 rounded-xl border border-border/40 font-sans">
                <select v-model="typeFilter" class="input py-1 px-2 text-xs max-w-[8rem] h-8 bg-input">
                  <option value="">{{ $t('pageIndexing.allTypes') }}</option>
                  <option value="page">{{ $t('Pages') }}</option>
                  <option value="blog">{{ $t('Blog') }}</option>
                  <option value="product">{{ $t('Products') }}</option>
                  <option value="category">{{ $t('Categories') }}</option>
                  <option value="other">{{ $t('Other') }}</option>
                </select>
                <select v-model="sourceFilter" class="input py-1 px-2 text-xs max-w-[8rem] h-8 bg-input">
                  <option value="">{{ $t('pageIndexing.allSources') }}</option>
                  <option value="sitemap">{{ $t('Sitemap') }}</option>
                  <option value="manual">{{ $t('Manual') }}</option>
                  <option value="cms">{{ $t('CMS') }}</option>
                </select>
                <input v-model="search" class="input py-1 px-2 text-xs flex-1 h-8 bg-input" :placeholder="$t('pageIndexing.searchUrl')" />
                <span class="text-[10px] text-text-muted font-mono whitespace-nowrap">{{ filtered.length }} url(s)</span>
              </div>

              <!-- Detailed URLs Table -->
              <div class="overflow-x-auto border border-border/40 rounded-xl bg-card">
                <table class="pi-table text-xs">
                  <thead>
                    <tr class="bg-soft/5">
                      <th>{{ $t('pageIndexing.url') }}</th>
                      <th>{{ $t('pageIndexing.type') }}</th>
                      <th>{{ $t('pageIndexing.status') }}</th>
                      <th>{{ $t('pageIndexing.coverageReason') }}</th>
                      <th>{{ $t('pageIndexing.lastCrawl') }}</th>
                      <th>{{ $t('pageIndexing.lastInspected') }}</th>
                      <th class="text-right">{{ $t('pageIndexing.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in paged" :key="r.id">
                      <td class="max-w-[12rem] truncate font-mono text-[11px] text-text-main" :title="r.url">{{ shortUrl(r.url) }}</td>
                      <td class="capitalize text-[10px] text-text-muted font-sans">{{ r.page_type }}</td>
                      <td>
                        <span class="pi-badge text-[9px] py-0.5 px-1.5 font-bold font-sans uppercase" :class="`pi-badge--${r.status?.inspection_status ?? 'none'}`">
                          {{ statusLabel(r.status?.inspection_status) }}
                        </span>
                      </td>
                      <td class="text-[10px] text-text-muted max-w-[8rem] truncate font-sans" :title="r.status?.coverage_state || '—'">
                        {{ r.status?.coverage_state || '—' }}
                      </td>
                      <td class="whitespace-nowrap text-[10px] text-text-muted font-sans">{{ fmtDate(r.status?.last_crawl_time) }}</td>
                      <td class="whitespace-nowrap text-[10px] text-text-muted font-sans">{{ fmtDateTime(r.status?.inspected_at) }}</td>
                      <td class="whitespace-nowrap text-right" @click.stop>
                        <div class="flex gap-1 justify-end font-sans">
                          <button class="pi-btn py-0.5 px-1.5 text-[9px]" type="button" @click="viewing = r">{{ $t('pageIndexing.details') }}</button>
                          <button v-if="isAdmin" class="pi-btn py-0.5 px-1.5 text-[9px]" type="button" :disabled="store.busyIds.has(openSite!.id)" @click="store.inspectOne(openSite!.id, r.id)">{{ $t('pageIndexing.inspect') }}</button>
                          <button class="pi-btn py-0.5 px-1.5 text-[9px]" type="button" @click="copy(r.url)">{{ $t('pageIndexing.copy') }}</button>
                          <a class="pi-btn py-0.5 px-1.5 text-[9px] inline-block" :href="r.url" target="_blank" rel="noopener">{{ $t('pageIndexing.open') }}</a>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!filtered.length"><td colspan="7" class="py-12 text-center text-xs text-text-muted font-sans">{{ $t('No URLs match filters.') }}</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- Drawer pagination -->
              <div v-if="filtered.length > perPage" class="flex items-center justify-between text-xs text-text-muted pt-2 font-sans">
                <span>{{ $t('pageIndexing.showing', { start: (page - 1) * perPage + 1, end: Math.min(page * perPage, filtered.length), total: filtered.length }) }}</span>
                <div class="flex gap-1.5">
                  <button class="pi-btn py-0.5 px-2" type="button" :disabled="page <= 1" @click="page--">{{ $t('pageIndexing.prev') }}</button>
                  <button class="pi-btn py-0.5 px-2" type="button" :disabled="page >= pageCount" @click="page++">{{ $t('pageIndexing.next') }}</button>
                </div>
              </div>
            </template>

            <!-- Logs view inside drawer -->
            <template v-else>
              <div v-if="logsLoading" class="text-center py-8 text-xs text-text-muted animate-pulse font-sans">{{ $t('pageIndexing.loadingLogs') }}</div>
              <div v-else-if="!syncLogs.length" class="text-center py-8 text-xs text-text-muted font-sans">{{ $t('pageIndexing.noLogsFound') }}</div>
              <div v-else class="space-y-2 font-sans">
                <div v-for="log in syncLogs" :key="log.id" class="p-2.5 rounded-lg border border-border bg-soft/10 text-[11px] flex flex-col gap-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-text-main capitalize">
                      {{ log.sync_type === 'discover_urls' ? $t('pageIndexing.urlDiscovery') : $t('pageIndexing.indexingInspection') }}
                    </span>
                    <span class="perf-status font-bold px-1.5 py-0.5 rounded text-[9px] uppercase" :class="log.status === 'success' ? 'is-good' : log.status === 'running' ? 'is-warn' : 'is-bad'">
                      {{ log.status }}
                    </span>
                  </div>
                  <div class="text-text-muted flex justify-between">
                    <span>{{ $t('pageIndexing.started') }}: {{ fmtDateTime(log.started_at) }}</span>
                    <span v-if="log.finished_at">{{ $t('pageIndexing.duration') }}: {{ getDuration(log.started_at, log.finished_at) }}</span>
                  </div>
                  <div class="font-semibold text-text-main mt-1">
                    <span v-if="log.sync_type === 'discover_urls'">
                      {{ log.status === 'success' ? `Discovered ${log.total_urls} URL(s) sitemap` : log.error_message || 'Discovery run failed' }}
                    </span>
                    <span v-else>
                      {{ log.status === 'success' || log.status === 'partial' ? `Inspected ${log.inspected_urls} URLs (${log.indexed_count} indexed)` : log.error_message || 'Inspection failed' }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>


    <!-- Inspection outcome modal -->
    <Modal :open="!!viewing" :title="$t('pageIndexing.detailsVerdictTitle')" size="lg" @close="viewing = null">
      <div v-if="viewing" class="space-y-3 font-sans">
        <a :href="viewing.url" target="_blank" rel="noopener" class="block break-all text-xs text-primary underline font-mono">{{ viewing.url }}</a>
        <span class="pi-badge text-[9px] py-0.5 px-1.5 font-bold uppercase" :class="`pi-badge--${viewing.status?.inspection_status ?? 'none'}`">{{ statusLabel(viewing.status?.inspection_status) }}</span>
        <p class="rounded-xl border border-border bg-soft/20 px-3 py-2 text-xs text-text-main leading-relaxed font-sans">{{ advice(viewing.status) }}</p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div class="pi-kv bg-soft/10 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('pageIndexing.verdict') }}</div><div class="pi-kv-v text-xs mt-0.5">{{ viewing.status?.verdict || '—' }}</div></div>
          <div class="pi-kv bg-soft/10 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('pageIndexing.coverage') }}</div><div class="pi-kv-v text-xs mt-0.5">{{ viewing.status?.coverage_state || '—' }}</div></div>
          <div class="pi-kv bg-soft/10 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('pageIndexing.indexed') }}</div><div class="pi-kv-v text-xs mt-0.5">{{ viewing.status?.indexing_state || '—' }}</div></div>
          <div class="pi-kv bg-soft/10 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('pageIndexing.robotsTxt') }}</div><div class="pi-kv-v text-xs mt-0.5">{{ viewing.status?.robots_txt_state || '—' }}</div></div>
          <div class="pi-kv bg-soft/10 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('pageIndexing.pageFetch') }}</div><div class="pi-kv-v text-xs mt-0.5">{{ viewing.status?.page_fetch_state || '—' }}</div></div>
          <div class="pi-kv bg-soft/10 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('pageIndexing.lastCrawl') }}</div><div class="pi-kv-v text-xs mt-0.5">{{ fmtDate(viewing.status?.last_crawl_time) }}</div></div>
        </div>
        <div class="pi-kv bg-soft/5 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('Google canonical') }}</div><div class="pi-kv-v break-all font-mono text-[10px] mt-0.5">{{ viewing.status?.google_canonical || '—' }}</div></div>
        <div class="pi-kv bg-soft/5 border border-border/30 rounded-lg p-2.5"><div class="pi-kv-l">{{ $t('User canonical') }}</div><div class="pi-kv-v break-all font-mono text-[10px] mt-0.5">{{ viewing.status?.user_canonical || '—' }}</div></div>
        <details v-if="isAdmin && viewing.status?.raw_response" class="pt-1">
          <summary class="cursor-pointer text-[10px] text-text-muted hover:text-text-main font-semibold">{{ $t('Raw GSC response payload (admin)') }}</summary>
          <pre class="mt-1 max-h-48 overflow-auto rounded-lg border border-border/40 bg-soft/40 p-2 text-[10px] text-text-muted font-mono">{{ JSON.stringify(viewing.status.raw_response, null, 2) }}</pre>
        </details>
      </div>
      <template #footer>
        <button class="btn-secondary font-sans font-semibold text-xs px-4" type="button" @click="viewing = null">{{ $t('pageIndexing.cancel') }}</button>
        <button v-if="isAdmin && viewing && openSite" class="btn-primary font-sans font-semibold text-xs px-4" type="button" :disabled="store.busyIds.has(openSite.id)" @click="openSite && viewing && store.inspectOne(openSite.id, viewing.id)">{{ $t('Inspect again') }}</button>
      </template>
    </Modal>

    <!-- Manual URLs Modal -->
    <Modal :open="showManualUrlModal" :title="$t('pageIndexing.addManualUrls')" size="lg" @close="showManualUrlModal = false">
      <div v-if="openSite" class="space-y-3 font-sans">
        <p class="helper font-sans leading-relaxed">{{ $t('pageIndexing.enterManualUrls') }}</p>
        <textarea
          v-model="manualUrlsInput"
          class="input w-full h-40 font-mono text-xs p-3 leading-relaxed bg-input"
          :placeholder="$t('pageIndexing.manualUrlsInputPlaceholder')"
        />
        <p v-if="manualUrlsError" class="text-xs text-status-needs-fix-fg">{{ manualUrlsError }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary font-sans font-semibold text-xs px-4" type="button" @click="showManualUrlModal = false">{{ $t('pageIndexing.cancel') }}</button>
        <button class="btn-primary font-sans font-semibold text-xs px-4" type="button" :disabled="store.detailLoading || !manualUrlsInput.trim()" @click="submitManualUrls">
          {{ store.detailLoading ? 'Adding...' : $t('pageIndexing.addUrls') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/ui/Modal.vue';
import WebsiteFavicon from '@/components/ui/WebsiteFavicon.vue';
import { useIndexingStore, type IndexingStatus } from '@/stores/indexing';
import { useAuthStore } from '@/stores/auth';
import { usePerformanceStore } from '@/stores/performance';
import { useDataStore, type Website, type Member } from '@/stores/data';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const props = defineProps<{
  websites: Website[];
  scopeFilter: 'my' | 'all' | 'member' | 'single';
  memberFilter: string;
  websiteFilter: string;
}>();

const emit = defineEmits<{
  (e: 'switch-scope', val: 'my' | 'all' | 'member' | 'single'): void;
  (e: 'update:member-filter', val: string): void;
  (e: 'update:website-filter', val: string): void;
  (e: 'toggle-sidebar'): void;
}>();

const store = useIndexingStore();
const auth = useAuthStore();
const perf = usePerformanceStore();
const dataStore = useDataStore();
const { t } = useI18n();

const isAdmin = computed(() => auth.isAdmin);

interface UrlRow { id: string; url: string; page_type: string; source: string; status: IndexingStatus | null }

const openSite = ref<Website | null>(null);
const viewing = ref<UrlRow | null>(null);
const typeFilter = ref('');
const sourceFilter = ref('');
const search = ref('');
const page = ref(1);
const perPage = 15;

const tableSearch = ref('');
const statusFilter = ref<'all' | 'healthy' | 'issues' | 'unchecked' | 'unconnected'>('all');
const sortBy = ref<'issues_desc' | 'health_asc' | 'pages_desc' | 'checked_desc' | 'name_asc'>('issues_desc');

const currentPage = ref(1);
const rowsPerPage = ref<number>(25);

const viewMode = ref<'compact-row' | 'table' | 'card' | 'column'>('compact-row');

// Advanced Filters local state
const platformFilter = ref('');
const connFilter = ref<'all' | 'connected' | 'not'>('all');
const websiteTypeFilter = ref('');

const tempPlatformFilter = ref('');
const tempConnFilter = ref<'all' | 'connected' | 'not'>('all');
const tempWebsiteTypeFilter = ref('');
const advancedDropdownOpen = ref(false);

const setViewMode = (mode: typeof viewMode.value) => {
  viewMode.value = mode;
  localStorage.setItem('pageIndexingViewMode', mode);
  currentPage.value = 1;
};

const translateViewMode = (mode: string) => {
  if (mode === 'compact-row') return t('pageIndexing.viewModes.compactRow');
  if (mode === 'table') return t('pageIndexing.viewModes.table');
  if (mode === 'card') return t('pageIndexing.viewModes.card');
  if (mode === 'column') return t('pageIndexing.viewModes.column');
  return mode;
};

const selectedSiteIds = ref<Set<string>>(new Set());
const toggleSelect = (id: string) => {
  const next = new Set(selectedSiteIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  selectedSiteIds.value = next;
};
const isAllSelected = computed(() => {
  const list = pagedWebsites.value;
  if (!list.length) return false;
  return list.every(w => selectedSiteIds.value.has(w.id));
});
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    pagedWebsites.value.forEach(w => selectedSiteIds.value.delete(w.id));
  } else {
    pagedWebsites.value.forEach(w => selectedSiteIds.value.add(w.id));
  }
};

const bulkBusy = computed(() => {
  return [...selectedSiteIds.value].some(id => store.busyIds.has(id));
});

const runBulkDiscover = async () => {
  const ids = [...selectedSiteIds.value];
  store.message = `Starting discovery for ${ids.length} website(s)...`;
  await Promise.all(ids.map(id => store.discoverUrls(id)));
  selectedSiteIds.value.clear();
};
const runBulkCheck = async () => {
  const ids = [...selectedSiteIds.value];
  store.message = `Starting index check for ${ids.length} website(s)...`;
  await Promise.all(ids.map(id => store.checkIndexing(id, 'new', undefined, 25)));
  selectedSiteIds.value.clear();
};
const runBulkRetry = async () => {
  const ids = [...selectedSiteIds.value];
  store.message = `Retrying failed URLs for ${ids.length} website(s)...`;
  await Promise.all(ids.map(id => store.checkIndexing(id, 'not_indexed', undefined, 25)));
  selectedSiteIds.value.clear();
};

const exportSelected = () => {
  const dataList = [...selectedSiteIds.value].map(id => {
    const w = props.websites.find(x => x.id === id);
    if (!w) return null;
    const s = store.summaryFor(w.id);
    return {
      Name: w.name || w.domain,
      Domain: w.domain,
      Known: s.known,
      Indexed: s.indexed,
      'Not Indexed': s.notIndexed,
      Health: s.known ? Math.round((s.indexed / s.known) * 100) : 0,
      'Last Checked': s.lastChecked ? new Date(s.lastChecked).toLocaleString() : 'Never'
    };
  }).filter(Boolean);
  
  if (!dataList.length) return;
  const headers = Object.keys(dataList[0]!);
  const rows = dataList.map(row => headers.map(h => JSON.stringify((row as any)[h])).join(','));
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `indexing_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const memberObjects = computed(() => {
  const ids = new Set(props.websites.map((w) => w.createdBy).filter(Boolean) as string[]);
  return [...ids].map((id) => dataStore.memberById(id)).filter((m): m is Member => !!m);
});

const filteredWebsites = computed(() => {
  let list = props.websites;
  
  if (platformFilter.value) {
    list = list.filter(w => w.platformType === platformFilter.value);
  }
  if (connFilter.value !== 'all') {
    list = list.filter(w => {
      const connected = perf.connectionByWebsite.has(w.id);
      return connFilter.value === 'connected' ? connected : !connected;
    });
  }
  if (websiteTypeFilter.value) {
    list = list.filter(w => w.websiteType === websiteTypeFilter.value);
  }
  
  if (statusFilter.value !== 'all') {
    list = list.filter(w => {
      const s = store.summaryFor(w.id);
      const connected = perf.connectionByWebsite.has(w.id);
      if (statusFilter.value === 'healthy') {
        return connected && s.known > 0 && s.indexed === s.known && s.notIndexed === 0 && s.warning === 0;
      }
      if (statusFilter.value === 'issues') {
        return connected && (s.notIndexed > 0 || s.warning > 0);
      }
      if (statusFilter.value === 'unchecked') {
        return connected && (s.known === 0 || !s.checked);
      }
      if (statusFilter.value === 'unconnected') {
        return !connected;
      }
      return true;
    });
  }
  
  const q = tableSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter(w => `${w.name ?? ''} ${w.domain ?? ''}`.toLowerCase().includes(q));
  }
  
  list = [...list].sort((a, b) => {
    const sa = store.summaryFor(a.id);
    const sb = store.summaryFor(b.id);
    const healthA = sa.known ? (sa.indexed / sa.known) : 0;
    const healthB = sb.known ? (sb.indexed / sb.known) : 0;
    const issuesA = sa.notIndexed + sa.warning;
    const issuesB = sb.notIndexed + sb.warning;
    
    if (sortBy.value === 'issues_desc') return issuesB - issuesA || sa.known - sb.known;
    if (sortBy.value === 'health_asc') return healthA - healthB;
    if (sortBy.value === 'pages_desc') return sb.known - sa.known;
    if (sortBy.value === 'checked_desc') {
      const da = sa.lastChecked ? new Date(sa.lastChecked).getTime() : 0;
      const db = sb.lastChecked ? new Date(sb.lastChecked).getTime() : 0;
      return db - da;
    }
    if (sortBy.value === 'name_asc') {
      const na = (a.name || a.domain).toLowerCase();
      const nb = (b.name || b.domain).toLowerCase();
      return na.localeCompare(nb);
    }
    return 0;
  });
  
  return list;
});

const columnsList = computed(() => {
  const healthy: Website[] = [];
  const issues: Website[] = [];
  const unchecked: Website[] = [];
  const unconnected: Website[] = [];
  
  for (const w of filteredWebsites.value) {
    const s = store.summaryFor(w.id);
    const connected = perf.connectionByWebsite.has(w.id);
    if (!connected) unconnected.push(w);
    else if (s.known === 0 || !s.checked) unchecked.push(w);
    else if (s.notIndexed > 0 || s.warning > 0) issues.push(w);
    else healthy.push(w);
  }
  
  return [
    { key: 'healthy', label: t('pageIndexing.healthy'), items: healthy },
    { key: 'issues', label: t('pageIndexing.hasIssues'), items: issues },
    { key: 'unchecked', label: t('pageIndexing.notChecked'), items: unchecked },
    { key: 'unconnected', label: t('pageIndexing.notConnected'), items: unconnected }
  ] as const;
});

const pagedWebsites = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage.value;
  const end = start + rowsPerPage.value;
  return filteredWebsites.value.slice(start, end);
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWebsites.value.length / rowsPerPage.value)));

watch([filteredWebsites, rowsPerPage], () => {
  currentPage.value = 1;
});

const detailTabsList = computed(() => [
  { key: 'all', label: t('common.all') + ' URLs' },
  { key: 'indexed', label: t('pageIndexing.indexed') },
  { key: 'not_indexed', label: t('pageIndexing.notIndexed') },
  { key: 'warnings', label: t('pageIndexing.warnings') },
  { key: 'not_checked', label: t('pageIndexing.notChecked') },
  { key: 'logs', label: t('pageIndexing.indexingLogs') }
] as const);

const detailTab = ref<'all' | 'indexed' | 'not_indexed' | 'warnings' | 'not_checked' | 'logs'>('all');
const setDetailTab = (tab: typeof detailTab.value) => {
  detailTab.value = tab;
  page.value = 1;
};

const syncLogs = ref<any[]>([]);
const logsLoading = ref(false);

const showManualUrlModal = ref(false);
const manualUrlsInput = ref('');
const manualUrlsError = ref('');

const isConnected = computed(() => openSite.value ? perf.connectionByWebsite.has(openSite.value.id) : false);

const activeSummary = computed(() => {
  if (openSite.value) {
    const s = store.summaryFor(openSite.value.id);
    return {
      known: s.known,
      indexed: s.indexed,
      notIndexed: s.notIndexed,
      warning: s.warning,
      lastChecked: s.lastChecked
    };
  }
  let known = 0, indexed = 0, notIndexed = 0, warning = 0;
  let lastChecked: string | null = null;
  for (const w of props.websites) {
    const s = store.summaryFor(w.id);
    known += s.known;
    indexed += s.indexed;
    notIndexed += s.notIndexed;
    warning += s.warning;
    if (s.lastChecked && (!lastChecked || s.lastChecked > lastChecked)) {
      lastChecked = s.lastChecked;
    }
  }
  return { known, indexed, notIndexed, warning, lastChecked };
});

const totalHealth = computed(() => (activeSummary.value.known ? Math.round((activeSummary.value.indexed / activeSummary.value.known) * 1000) / 10 : 0));
const websitesWithIssues = computed(() => props.websites.filter((w) => { const s = store.summaryFor(w.id); return s.notIndexed > 0 || s.warning > 0; }).length);

const statusByUrlId = computed(() => {
  const m = new Map<string, IndexingStatus>();
  for (const s of store.statuses) if (s.url_id) m.set(s.url_id, s);
  return m;
});
const mergedRows = computed<UrlRow[]>(() =>
  store.urls.map((u) => ({ id: u.id, url: u.url, page_type: u.page_type, source: u.source, status: statusByUrlId.value.get(u.id) ?? null }))
);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return mergedRows.value.filter((r) => {
    const st = r.status?.inspection_status ?? 'not_checked';
    
    if (detailTab.value === 'indexed' && st !== 'indexed') return false;
    if (detailTab.value === 'not_indexed' && st !== 'not_indexed') return false;
    if (detailTab.value === 'warnings' && st !== 'warning') return false;
    if (detailTab.value === 'not_checked' && st !== 'not_checked') return false;

    if (typeFilter.value && r.page_type !== typeFilter.value) return false;
    if (sourceFilter.value && r.source !== sourceFilter.value) return false;
    if (q && !r.url.toLowerCase().includes(q)) return false;
    return true;
  });
});
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)));
const paged = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage));
const someNotIndexed = computed(() => store.statuses.some((s) => s.inspection_status !== 'indexed'));

watch([typeFilter, sourceFilter, search, openSite, detailTab], () => { page.value = 1; });

const fetchLogs = async (websiteId: string) => {
  if (!supabaseConfigured) return;
  logsLoading.value = true;
  try {
    const { data: logs, error: err } = await supabase
      .from('website_indexing_sync_logs')
      .select('*')
      .eq('website_id', websiteId)
      .order('started_at', { ascending: false })
      .limit(5);
    if (!err && logs) {
      syncLogs.value = logs;
    }
  } catch (e) {
    console.error(e);
  } finally {
    logsLoading.value = false;
  }
};

const getDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 1000) return `${diff}ms`;
  const secs = Math.round(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
};

const loadWebsiteDetails = async (websiteId: string) => {
  await Promise.all([
    store.fetchWebsiteUrls(websiteId),
    fetchLogs(websiteId)
  ]);
};

const openWebsite = (w: Website) => {
  openSite.value = w;
  void loadWebsiteDetails(w.id);
};

const closeWebsite = () => {
  openSite.value = null;
  syncLogs.value = [];
};

watch(() => props.websites, (newWebsites) => {
  if (newWebsites.length === 1) {
    openSite.value = newWebsites[0];
    void loadWebsiteDetails(newWebsites[0].id);
  } else {
    if (openSite.value && !newWebsites.some(w => w.id === openSite.value?.id)) {
      openSite.value = null;
    }
  }
}, { immediate: true });

const statusLabel = (s?: string) =>
  s === 'indexed' ? 'Indexed' : s === 'not_indexed' ? 'Not indexed' : s === 'warning' ? 'Warning' : 'Not checked';
const healthClass = (h: number) => (h >= 80 ? 'text-status-approved-fg' : h >= 50 ? 'text-text-main' : 'text-status-needs-fix-fg');
const advice = (s: IndexingStatus | null | undefined): string => {
  if (!s) return 'This page has not been checked yet. Click Inspect to check it.';
  if (s.inspection_status === 'indexed') return 'This page is indexed.';
  const cov = (s.coverage_state || '').toLowerCase();
  if (cov.includes('robots')) return 'This page is blocked by robots.txt. Check robots.txt if it should be indexed.';
  if (cov.includes('noindex')) return 'This page has a noindex tag. Remove noindex if this page should be indexed.';
  if (cov.includes('duplicate') || cov.includes('canonical') || cov.includes('alternate')) return 'Google selected another canonical page for this URL.';
  if (cov.includes('not found') || cov.includes('404')) return 'This page returns 404 (not found).';
  if (cov.includes('redirect')) return 'This page redirects elsewhere.';
  if (cov.includes('server') || cov.includes('5')) return 'Check the page/server error.';
  if (s.inspection_status === 'warning') return 'Could not inspect this page. Try again later.';
  return 'This page is not indexed. Check the reason above.';
};
const copy = (text: string) => { void navigator.clipboard?.writeText(text); store.message = 'URL copied.'; };

const submitManualUrls = async () => {
  if (!openSite.value) return;
  manualUrlsError.value = '';
  const list = manualUrlsInput.value
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0);

  if (list.length === 0) {
    manualUrlsError.value = 'Please enter at least one URL.';
    return;
  }

  const invalid = list.filter(u => {
    try { new URL(u); return false; } catch { return true; }
  });
  if (invalid.length > 0) {
    manualUrlsError.value = `Invalid URL format: ${invalid[0].slice(0, 40)}`;
    return;
  }

  const ok = await store.addManualUrls(openSite.value.id, list);
  if (ok) {
    manualUrlsInput.value = '';
    showManualUrlModal.value = false;
  } else {
    manualUrlsError.value = store.error || 'Failed to add manual URLs.';
  }
};

const fmtNum = (n: number) => (n >= 1000 ? n.toLocaleString() : String(n));
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : 'Never');
const shortUrl = (u: string) => { try { const url = new URL(u); return url.pathname === '/' ? url.hostname : url.pathname; } catch { return u; } };

const cleanDomain = (d: string) => (d || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
const sumOf = (w: Website) => store.summaryFor(w.id);
const healthBarClass = (h: number) => (h >= 80 ? 'pi-bar-fill--ok' : h >= 50 ? 'pi-bar-fill--warn' : 'pi-bar-fill--bad');

const memberProfiles = ref<any[]>([]);
const memberProfilesLoading = ref(false);
const memberProfilesError = ref('');

const fetchMemberProfiles = async () => {
  if (!supabaseConfigured) return;
  memberProfilesLoading.value = true;
  memberProfilesError.value = '';
  try {
    const { data: resData, error: resErr } = await supabase.rpc('performance_team_member_profiles');
    if (resErr) {
      memberProfilesError.value = 'Could not load team members.';
    } else {
      memberProfiles.value = resData || [];
    }
  } catch (err: any) {
    memberProfilesError.value = 'Could not load team members.';
  } finally {
    memberProfilesLoading.value = false;
  }
};

const allTeamMembers = computed(() => {
  if (memberProfiles.value.length > 0) {
    return memberProfiles.value.map(p => ({
      id: p.user_id,
      fullName: p.display_name || p.full_name || 'Unknown User',
      avatarUrl: p.avatar_url,
      role: p.role,
      status: p.status,
      email: ''
    }));
  }
  return dataStore.members.filter((m) => m.status === 'active');
});

const memberWebsitesCount = (memberId: string) => {
  const profile = memberProfiles.value.find(p => p.user_id === memberId);
  if (profile) return Number(profile.assigned_website_count);
  return dataStore.websites.filter((w) => w.createdBy === memberId).length;
};

const selectedMemberObj = computed(() => {
  const id = props.memberFilter;
  if (!id) return null;
  const profile = memberProfiles.value.find(p => p.user_id === id);
  if (profile) {
    return {
      id: profile.user_id,
      fullName: profile.display_name || profile.full_name || 'Unknown User',
      avatarUrl: profile.avatar_url,
      role: profile.role,
      status: profile.status,
      email: ''
    };
  }
  return dataStore.memberById(id);
});

const getMemberInitials = (name?: string | null) => {
  if (!name || name === 'Member' || name === 'Unknown User' || name === 'Unknown') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getMemberAvatarUrl = (id: string) => {
  const profile = memberProfiles.value.find(p => p.user_id === id);
  if (profile) return profile.avatar_url;
  const member = dataStore.memberById(id);
  return member ? member.avatarUrl : '';
};

const getMemberRoleLabel = (id: string) => {
  const profile = memberProfiles.value.find(p => p.user_id === id);
  const role = profile ? profile.role : dataStore.memberById(id)?.role;
  return role ? role.replace('_', ' ') : 'Member';
};

const websiteObj = (id?: string | null) => (id ? dataStore.websites.find((x) => x.id === id) ?? null : null);

const scopeDropdownOpen = ref(false);
const memberDropdownOpen = ref(false);
const websiteDropdownOpen = ref(false);
const statusDropdownOpen = ref(false);

const toggleDropdown = (type: string) => {
  scopeDropdownOpen.value = type === 'scope' ? !scopeDropdownOpen.value : false;
  memberDropdownOpen.value = type === 'member' ? !memberDropdownOpen.value : false;
  websiteDropdownOpen.value = type === 'website' ? !websiteDropdownOpen.value : false;
  statusDropdownOpen.value = type === 'status' ? !statusDropdownOpen.value : false;
  advancedDropdownOpen.value = type === 'advanced' ? !advancedDropdownOpen.value : false;
};

const selectScope = (val: 'my' | 'all' | 'member' | 'single') => {
  emit('switch-scope', val);
  scopeDropdownOpen.value = false;
  if (val === 'my' || val === 'all') {
    emit('update:member-filter', '');
    emit('update:website-filter', '');
  } else if (val === 'member') {
    emit('update:website-filter', '');
    if (!props.memberFilter && allTeamMembers.value.length > 0) {
      emit('update:member-filter', allTeamMembers.value[0].id);
    }
  } else if (val === 'single') {
    emit('update:member-filter', '');
    if (!props.websiteFilter && dataStore.websites.length > 0) {
      const assignedIds = dataStore.getUserAssignedWebsiteIds(auth.user?.id ?? '');
      if (assignedIds.length > 0) {
        emit('update:website-filter', assignedIds[0]);
      } else {
        emit('update:website-filter', dataStore.websites[0].id);
      }
    }
  }
};

const selectWebsite = (id: string) => {
  emit('update:website-filter', id);
  websiteDropdownOpen.value = false;
};

const selectMember = (id: string) => {
  emit('update:member-filter', id);
  memberDropdownOpen.value = false;
};

const scopeLabel = computed(() => {
  if (props.scopeFilter === 'my') {
    const name = auth.profile?.fullName || auth.profile?.email?.split('@')[0] || '';
    return name ? `${t('performance.myWebsites')} · ${name}` : t('performance.myWebsites');
  }
  if (props.scopeFilter === 'all') return t('performance.allWebsites');
  if (props.scopeFilter === 'member') {
    const member = selectedMemberObj.value;
    return member ? `${t('performance.teamMember')}: ${member.fullName}` : t('performance.teamMember');
  }
  if (props.scopeFilter === 'single') {
    const w = dataStore.websites.find(x => x.id === props.websiteFilter);
    return w ? w.name || w.domain : t('performance.singleWebsite');
  }
  return '';
});

const getWebsiteCreatorName = (w: Website) => {
  if (!w.createdBy) return 'Unassigned';
  const profile = memberProfiles.value.find(p => p.user_id === w.createdBy);
  if (profile) return profile.display_name || profile.full_name || 'Unknown';
  const member = dataStore.memberById(w.createdBy);
  return member ? member.fullName : 'Unknown';
};

const selectStatus = (val: typeof statusFilter.value) => {
  statusFilter.value = val;
  statusDropdownOpen.value = false;
};

const selectedStatusLabel = computed(() => {
  if (statusFilter.value === 'healthy') return t('pageIndexing.healthy');
  if (statusFilter.value === 'issues') return t('pageIndexing.hasIssues');
  if (statusFilter.value === 'unchecked') return t('pageIndexing.notChecked');
  if (statusFilter.value === 'unconnected') return t('pageIndexing.notConnected');
  return t('pageIndexing.allStatuses');
});

const openAdvancedFilters = () => {
  tempPlatformFilter.value = platformFilter.value;
  tempConnFilter.value = connFilter.value;
  tempWebsiteTypeFilter.value = websiteTypeFilter.value;
  toggleDropdown('advanced');
};

const applyAdvancedFilters = () => {
  platformFilter.value = tempPlatformFilter.value;
  connFilter.value = tempConnFilter.value;
  websiteTypeFilter.value = tempWebsiteTypeFilter.value;
  advancedDropdownOpen.value = false;
};

const resetAdvancedFilters = () => {
  tempPlatformFilter.value = '';
  tempConnFilter.value = 'all';
  tempWebsiteTypeFilter.value = '';
  
  platformFilter.value = '';
  connFilter.value = 'all';
  websiteTypeFilter.value = '';
  
  advancedDropdownOpen.value = false;
};

const activeAdvancedFiltersCount = computed(() => {
  let count = 0;
  if (platformFilter.value !== '') count++;
  if (connFilter.value !== 'all') count++;
  if (websiteTypeFilter.value !== '') count++;
  return count;
});

const websiteTypes = computed(() => {
  const set = new Set<string>();
  dataStore.websites.forEach((w) => { if (w.websiteType) set.add(w.websiteType); });
  return [...set];
});

const typeLabel = (val: string) => {
  if (!val) return '—';
  if (val === 'existing') return 'Existing Site';
  if (val === 'ecommerce') return 'E-commerce';
  if (val === 'normal_ecommerce') return 'Normal E-commerce';
  return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

onMounted(() => {
  void store.fetchSummaries();
  void fetchMemberProfiles();
  const savedMode = localStorage.getItem('pageIndexingViewMode');
  if (savedMode && ['card', 'compact-row', 'table', 'column'].includes(savedMode)) {
    viewMode.value = savedMode as any;
  }
});
</script>

<style scoped>
.page-indexing {
  font-family: 'Raleway', sans-serif;
}

.pi-card {
  border: 1px solid var(--border);
  border-radius: 0.8rem;
  padding: 0.8rem 0.9rem;
  background: var(--card-bg);
}

.pi-card-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.62rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.pi-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  display: inline-block;
  flex-shrink: 0;
}

.pi-card-v {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
  margin-top: 0.25rem;
}

.pi-bar {
  height: 0.4rem;
  width: 100%;
  border-radius: 9999px;
  background: var(--soft-bg, rgba(120,120,120,0.18));
  overflow: hidden;
}

.pi-bar-fill {
  display: block;
  height: 100%;
  border-radius: 9999px;
}

.pi-bar-fill--ok { background: #22c55e; }
.pi-bar-fill--warn { background: #f59e0b; }
.pi-bar-fill--bad { background: #ef4444; }

.pi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}

.pi-table th {
  text-align: left;
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.pi-table td {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.pi-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pi-trow {
  cursor: pointer;
  transition: background 120ms ease;
}

.pi-trow:hover td {
  background: var(--soft-bg);
}

.pi-table--compact th {
  padding: 0.45rem 0.6rem;
  font-size: 0.55rem;
}

.pi-table--compact td {
  padding: 0.4rem 0.6rem;
  font-size: 0.68rem;
}

.pi-site {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.pi-site-name {
  font-weight: 600;
  color: var(--text-main);
}

.pi-muted {
  color: var(--text-muted);
  opacity: 0.5;
}

.pi-pill {
  display: inline-block;
  min-width: 1.8rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.66rem;
  padding: 0.05rem 0.45rem;
  border-radius: 0.4rem;
}

.pi-pill--ok { background: rgba(34,197,94,0.12); color: #22c55e; }
.pi-pill--bad { background: rgba(239,68,68,0.12); color: #ef4444; }

.pi-health {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pi-health-pct {
  font-size: 0.64rem;
  font-weight: 700;
  min-width: 2.5rem;
  text-align: right;
}

.pi-actions {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.pi-btn {
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.66rem;
  font-weight: 600;
  padding: 0.25rem 0.55rem;
  border-radius: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 120ms ease;
  font-family: 'Google Sans', 'Raleway', sans-serif;
}

.pi-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
}

.pi-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pi-btn--primary {
  background: var(--primary, #15D6C2);
  border-color: var(--primary, #15D6C2);
  color: var(--on-primary);
}

.pi-badge {
  display: inline-block;
  font-size: 0.58rem;
  font-weight: 700;
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
  background: var(--soft-bg);
  color: var(--text-muted);
}

.pi-badge--indexed { background: rgba(34,197,94,0.12); color: #22c55e; }
.pi-badge--not_indexed { background: rgba(239,68,68,0.12); color: #ef4444; }
.pi-badge--warning { background: rgba(245,158,11,0.14); color: #f59e0b; }

.pi-kv {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.45rem 0.55rem;
}

.pi-kv-l {
  font-size: 0.54rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  font-weight: 600;
}

.pi-kv-v {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-main);
  margin-top: 0.1rem;
}

.perf-status {
  display: inline-block;
  font-size: 0.58rem;
  font-weight: 700;
  padding: 0.05rem 0.4rem;
  border-radius: 0.35rem;
}

.perf-status.is-good { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
.perf-status.is-warn { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.perf-status.is-bad { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.pi-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
}

.pi-drawer-content {
  width: 100%;
  max-width: 48rem;
  height: 100%;
  background: var(--card-bg);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

@media (max-width: 640px) {
  .pi-drawer-content {
    max-width: 100%;
  }
}

.drawer-enter-active, .drawer-leave-active {
  transition: opacity 200ms ease;
}

.drawer-enter-active .pi-drawer-content, .drawer-leave-active .pi-drawer-content {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .pi-drawer-content {
  transform: translateX(100%);
}

.drawer-leave-to .pi-drawer-content {
  transform: translateX(100%);
}

.helper {
  font-size: 0.62rem;
  color: var(--text-muted);
}

.perf-filterbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.8rem;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--bg-page));
}

.perf-wsel {
  position: relative;
}

.perf-wsel-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  min-width: 11rem;
  max-width: 14rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 120ms ease;
  background: var(--input-bg);
  font-family: 'Raleway', sans-serif;
}

.perf-wsel-btn:focus {
  border-color: var(--primary) !important;
}

.perf-wsel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.perf-wsel-list {
  position: absolute;
  z-index: 31;
  top: calc(100% + 4px);
  left: 0;
  width: 16rem;
  max-height: 18rem;
  overflow-y: auto;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 0.3rem;
}

.perf-wsel-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 0;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.68rem;
  color: var(--text-main);
  text-align: left;
  transition: background 100ms ease;
  font-family: 'Raleway', sans-serif;
}

.perf-wsel-item:hover {
  background: var(--soft-bg);
}

.perf-wsel-item.active {
  background: var(--primary-soft) !important;
  color: var(--primary) !important;
  font-weight: 600;
}

.perf-wsel-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--border);
  flex-shrink: 0;
}

.perf-wsel-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.perf-wsel-avatar-initials {
  font-size: 8px;
  font-weight: bold;
  color: var(--text-main);
}
</style>
