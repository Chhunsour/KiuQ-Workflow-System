<template>
  <div class="perf-center font-sans text-text-main pb-12">
    <!-- Header -->
    <PageHeader
      :title="$t('performance.title')"
      :subtitle="$t('performance.subtitle')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <button
            v-if="canSyncAllWebsites"
            class="btn-secondary font-sans font-semibold text-xs px-3 h-9"
            type="button"
            :disabled="perf.syncAllRunning"
            @click="onSyncAll"
          >
            <span v-if="perf.syncAllRunning" class="inline-block animate-spin mr-1">●</span>
            {{ perf.syncAllRunning ? $t('performance.syncing') : $t('performance.syncData') }}
          </button>
          <button
            v-else-if="canSyncMyWebsites && scopeFilter === 'my'"
            class="btn-secondary font-sans font-semibold text-xs px-3 h-9"
            type="button"
            :disabled="perf.syncAllRunning"
            @click="onSyncMyWebsites"
          >
            <span v-if="perf.syncAllRunning" class="inline-block animate-spin mr-1">●</span>
            {{ perf.syncAllRunning ? $t('performance.syncing') : $t('performance.syncMyWebsites') }}
          </button>
          <button
            v-if="canSyncAllWebsites"
            class="btn-secondary font-sans font-semibold text-xs px-3 h-9"
            type="button"
            @click="showLogsModal = true"
          >
            {{ $t('performance.viewSyncLogs') }}
          </button>
          <div class="flex items-center gap-2">
            <!-- Disconnect button if connected -->
            <button
              v-if="perf.connectionInfo.connected"
              class="btn-secondary text-status-needs-fix-fg hover:text-status-needs-fix-fg/80 font-sans font-semibold text-xs px-3 h-9"
              type="button"
              @click="onDisconnectGoogle"
            >
              {{ $t('performance.disconnect') }}
            </button>
            <button
              class="btn-primary font-sans font-semibold text-xs px-3 h-9"
              type="button"
              @click="onConnect"
            >
              {{ perf.connectionInfo.connected ? $t('performance.reconnect') : $t('performance.connectGoogleAccountBtn') }}
            </button>
          </div>
        </div>
      </template>
    </PageHeader>

    <!-- Header Status Info Bar -->
    <div class="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-text-muted bg-card border border-border/60 rounded-xl px-4 py-2.5">
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-primary" />
        <span>{{ $t('performance.lastSynced') }}: <span class="font-bold text-text-main font-number">{{ latestSyncTime || $t('performance.never') }}</span></span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-status-approved-fg" />
        <span>{{ $t('performance.connected') }}: <span class="font-bold text-text-main font-number">{{ connectedCount }} / {{ visibleWebsites.length }} {{ $t('nav.websites') }}</span></span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full" :class="syncHealth === 'Healthy' ? 'bg-status-approved-fg' : 'bg-status-needs-fix-fg'" />
        <span>{{ $t('performance.syncHealth') }}: <span class="font-bold text-text-main font-sans capitalize">{{ syncHealth }}</span></span>
      </div>
      <div v-if="perf.connectionInfo.connected" class="flex items-center gap-1.5 ml-auto text-text-muted">
        <span>{{ $t('performance.googleAccount') }}: <span class="font-semibold text-text-main">{{ perf.connectionInfo.google_email || 'admin' }}</span></span>
      </div>
    </div>

    <!-- Connect result notifications -->
    <div v-if="connectMsg" class="mb-4 rounded-xl border px-4 py-3 text-sm flex justify-between items-center" :class="connectOk ? 'border-status-approved-bg bg-status-approved-bg/20 text-status-approved-fg' : 'border-status-needs-fix-bg bg-status-needs-fix-bg/20 text-status-needs-fix-fg'">
      <span>{{ connectMsg }}</span>
      <button class="text-xs underline cursor-pointer" type="button" @click="connectMsg = ''">{{ $t('common.cancel') }}</button>
    </div>
    <div v-else-if="!perf.connectionInfo.connected" class="mb-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-soft border border-border/60 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
          <img src="https://www.google.com/s2/favicons?domain=google.com&sz=64" class="w-6 h-6 object-contain" alt="Google" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-text-main font-sans">{{ $t('performance.connectGscAccount') }}</h4>
          <p class="text-xs text-text-muted mt-1 font-sans leading-relaxed">
            {{ $t('performance.connectGscAccountSub') }}
          </p>
        </div>
      </div>
      <button class="btn-primary font-sans font-semibold text-xs px-4 h-9 flex-shrink-0" type="button" @click="onConnect">
        {{ $t('performance.connectGoogleAccountBtn') }}
      </button>
    </div>

    <!-- 2-Column layout wrapper -->
    <div class="perf-layout-grid">
      <!-- Desktop Left Sidebar -->
      <div class="hidden lg:block lg:w-[260px] xl:w-[290px] flex-shrink-0 bg-card border border-border/60 rounded-2xl p-4 self-start">
        <PerformanceSidebar
          :websites="visibleConnectionWebsites"
          :scope-filter="scopeFilter"
          :website-filter="websiteFilter"
          :scope-label="scopeLabel"
          @select-website="onSelectWebsiteFromSidebar"
        />
      </div>

      <!-- Right Column: Dashboard Content -->
      <div class="flex-1 min-w-0">
        <!-- Overview Scope and Filter Bar -->
        <div v-if="activePerformanceView === 'overview'" class="perf-filterbar mb-4">
          <!-- Mobile Sidebar Toggle -->
          <button
            type="button"
            class="lg:hidden btn-secondary h-9 px-3 text-[11px] flex items-center gap-1.5 font-semibold font-sans mr-auto"
            @click="sidebarOpen = true"
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
            <div v-if="memberProfilesLoading" class="p-3 text-center text-xs text-text-muted">{{ $t('performance.loadingMembers') }}</div>
            <div v-else-if="memberProfilesError" class="p-3 text-center text-xs text-status-needs-fix-fg flex flex-col gap-2">
              <span>{{ memberProfilesError }}</span>
              <button type="button" class="btn-secondary text-[10px] py-1 px-2.5 h-auto font-sans" @click="fetchMemberProfiles">{{ $t('common.retry') || 'Retry' }}</button>
            </div>
            <div v-else-if="allTeamMembers.length === 0" class="p-3 text-center text-xs text-text-muted">{{ $t('performance.noMembersFound') }}</div>
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
            <button v-for="w in data.websites" :key="w.id" type="button" class="perf-wsel-item flex items-center gap-2" :class="{ active: websiteFilter === w.id }" @click="selectWebsite(w.id)">
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

      <!-- Date Range Select Dropdown -->
      <div class="perf-wsel font-sans">
        <button type="button" class="input perf-wsel-btn font-semibold" @click="toggleDropdown('range')">
          <span class="truncate flex-1 text-left">{{ $t('performance.range') }}: {{ rangeLabel }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform" :class="{ 'rotate-180': rangeDropdownOpen }"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <template v-if="rangeDropdownOpen">
          <div class="perf-wsel-backdrop" @click="rangeDropdownOpen = false" />
          <div class="perf-wsel-list perf-range-list">
            <button
              v-for="opt in rangeOptions"
              :key="opt.value"
              type="button"
              class="perf-wsel-item perf-range-item"
              :class="{ active: perf.rangeDays === opt.value }"
              @click="selectRange(opt.value)"
            >
              <span class="perf-range-copy">
                <span class="perf-range-label">{{ translateRangeOption(opt) }}</span>
                <span v-if="opt.value === 'last_16_months'" class="perf-range-note">
                  {{ $t('Maximum Search Console history') }}
                </span>
              </span>
            </button>
          </div>
        </template>
      </div>

      <!-- Compare to Last Month Toggle -->
      <label
        class="flex items-center gap-2 cursor-pointer select-none font-sans text-[11px] font-semibold text-text-main h-9 px-3 border border-border/60 rounded-lg bg-card hover:bg-soft transition-colors flex-shrink-0"
        :class="{ 'opacity-50 cursor-not-allowed': perf.rangeDays === 'last_16_months' }"
      >
        <input
          type="checkbox"
          :checked="perf.compareMode === 'last_month'"
          :disabled="perf.rangeDays === 'last_16_months'"
          @change="onCompareToggleChange"
          class="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-input cursor-pointer disabled:cursor-not-allowed"
        />
        <span>{{ $t('performance.compareToLastMonth') }}</span>
      </label>

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
            <h4 class="text-xs font-bold text-text-main font-sans uppercase tracking-wider mb-2">
              {{ $t('performance.advancedFilters') }}
            </h4>

            <!-- Platform filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.websitePlatform') }}</label>
              <select v-model="tempPlatformFilter" class="input w-full py-1.5 px-2 text-xs bg-input font-sans">
                <option value="">{{ $t('performance.allPlatforms') }}</option>
                <option value="wordpress">{{ $t('performance.wordpress') }}</option>
                <option value="framework">{{ $t('performance.framework') }}</option>
                <option value="unknown">{{ $t('performance.unknown') }}</option>
              </select>
            </div>

            <!-- Connection Status filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.connectionStatus') }}</label>
              <select v-model="tempConnFilter" class="input w-full py-1.5 px-2 text-xs bg-input font-sans">
                <option value="all">{{ $t('performance.allStatuses') }}</option>
                <option value="connected">{{ $t('performance.connectedOnly') }}</option>
                <option value="not">{{ $t('performance.notConnected') }}</option>
              </select>
            </div>

            <!-- Website Type filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.websiteType') }}</label>
              <select v-model="tempWebsiteTypeFilter" class="input w-full py-1.5 px-2 text-xs bg-input font-sans">
                <option value="">{{ $t('common.all') || 'All' }}</option>
                <option v-for="t in websiteTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
              </select>
            </div>

            <!-- Data Presence filter -->
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-text-muted">{{ $t('performance.dataPresence') }}</label>
              <select v-model="tempHasDataFilter" class="input w-full py-1.5 px-2 text-xs bg-input font-sans">
                <option value="all">{{ $t('common.all') || 'All' }}</option>
                <option value="has_data">{{ $t('performance.hasData') }}</option>
                <option value="no_data">{{ $t('performance.noData') }}</option>
              </select>
            </div>

            <!-- Apply & Reset buttons -->
            <div class="flex gap-2 pt-2 border-t border-border/40">
              <button type="button" class="btn-primary flex-1 py-1.5 text-xs font-semibold" @click="applyAdvancedFilters">
                {{ $t('performance.applyFilters') }}
              </button>
              <button type="button" class="btn-secondary py-1.5 px-3 text-xs font-semibold" @click="resetAdvancedFilters">
                {{ $t('performance.resetFilters') }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Custom Date Pickers -->
      <div v-if="perf.rangeDays === 'custom'" class="flex items-center gap-2 border border-border rounded-lg px-2 h-9 bg-card flex-shrink-0">
        <input type="date" v-model="perf.customStartDate" class="bg-transparent border-0 text-[11px] text-text-main outline-none w-28 font-sans font-medium" @change="onCustomDateChange" />
        <span class="text-text-muted text-[10px] uppercase font-bold">{{ $t('to') }}</span>
        <input type="date" v-model="perf.customEndDate" class="bg-transparent border-0 text-[11px] text-text-main outline-none w-28 font-sans font-medium" @change="onCustomDateChange" />
      </div>
    </div>

    <!-- Active Advanced Filters Summary -->
    <div v-if="activePerformanceView === 'overview' && activeAdvancedFiltersCount > 0" class="flex items-center gap-2 text-[11px] text-text-muted mb-4 px-1 font-sans">
      <span>{{ $t('performance.advancedFiltersActive') }}: <strong class="text-text-main font-number font-bold">{{ activeAdvancedFiltersCount }}</strong></span>
      <span>•</span>
      <button type="button" class="text-primary hover:underline cursor-pointer font-sans" @click="resetAdvancedFilters">
        {{ $t('performance.clearAll') }}
      </button>
    </div>

    <!-- Active View Area -->
    <div class="mt-4">
      <LoadingBlock v-if="activePerformanceView === 'overview'" :loading="perf.loading" :error="perf.error" :retry="() => perf.fetchAll()">
        <!-- Empty States -->
        <div v-if="scopeFilter === 'my' && scopedWebsites.length === 0 && !data.loading.websites" class="card card-pad py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card mt-4">
          <div class="text-base font-bold text-text-main mb-2">{{ $t('performance.noWebsitesAssignedTitle') }}</div>
          <p class="text-xs text-text-muted mb-4 max-w-sm mx-auto">{{ $t('performance.noWebsitesAssignedSub') }}</p>
          <button class="btn-primary font-sans font-semibold text-xs h-9 px-4" type="button" @click="selectScope('all')">{{ $t('performance.viewAllWebsites') }}</button>
        </div>

        <div v-else-if="scopeFilter === 'member' && scopedWebsites.length === 0 && !data.loading.websites" class="card card-pad py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card mt-4">
          <div class="text-base font-bold text-text-main mb-2">{{ $t('performance.noWebsitesMemberTitle') }}</div>
          <p class="text-xs text-text-muted max-w-sm mx-auto">{{ $t('performance.noWebsitesMemberSub') }}</p>
        </div>

        <div v-else-if="scopeFilter === 'single' && websiteFilter && filteredDaily.length === 0" class="card card-pad py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card mt-4">
          <div class="text-base font-bold text-text-main mb-2">{{ $t('performance.noSearchConsoleDataTitle') }}</div>
          <p class="text-xs text-text-muted max-w-sm mx-auto mb-4">{{ $t('performance.noSearchConsoleDataSub') }}</p>
          <button
            v-if="canSyncWebsite(websiteFilter) && perf.connectionByWebsite.has(websiteFilter)"
            class="btn-primary font-sans font-semibold text-xs h-9 px-4"
            type="button"
            :disabled="perf.syncingIds.has(websiteFilter)"
            @click="perf.syncWebsite(websiteFilter)"
          >
            {{ perf.syncingIds.has(websiteFilter) ? $t('performance.syncing') : $t('Sync Website') }}
          </button>
        </div>

        <!-- Normal Layout -->
        <div v-else class="space-y-4">
          <!-- Metric toggle cards -->
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <button
              v-for="m in metricList"
              :key="m.key"
              type="button"
              class="perf-metric group"
              :class="{ active: activeMetric === m.key }"
              :style="activeMetric === m.key ? { borderColor: m.color, boxShadow: `inset 0 -3px 0 ${m.color}` } : {}"
              @click="activeMetric = m.key"
            >
              <div class="flex items-center gap-1.5">
                <span class="perf-metric-dot transition-transform group-hover:scale-125" :style="{ background: m.color }" />
                <span class="perf-metric-label font-sans">{{ translateMetricLabel(m.key) }}</span>
              </div>
              <span class="perf-metric-value font-number font-extrabold text-2xl mt-1">{{ m.format(totals) }}</span>
              
              <!-- Comparison indicator -->
              <template v-if="cardDelta(m.key)">
                <div class="flex flex-col items-start mt-2">
                  <span class="perf-metric-cmp flex items-center gap-0.5 text-xs font-bold font-number" :class="cardDelta(m.key)!.good ? 'is-up text-status-approved-fg' : 'is-down text-status-needs-fix-fg'">
                    <span>{{ cardDelta(m.key)!.good ? '▲' : '▼' }}</span>
                    <span>{{ cardDelta(m.key)!.deltaLabel }}</span>
                    <span class="text-[10px] opacity-75">({{ cardDelta(m.key)!.pctLabel }})</span>
                  </span>
                  <span class="perf-metric-prev text-[9px] text-text-muted mt-0.5">vs {{ perf.comparePeriodLabel }}: {{ cardDelta(m.key)!.prevLabel }}</span>
                </div>
              </template>
            </button>
          </div>

          <!-- Comparison context notice -->
          <div v-if="perf.compareMode !== 'none' && perf.rangeDays === 'last_16_months'" class="text-xs text-status-needs-fix-fg mt-1 px-1 font-sans font-medium">
            {{ $t('Comparison is not available for Last 16 Months yet.') }}
          </div>
          <div v-else-if="compareActive" class="text-xs text-text-muted mt-1 px-1 font-sans">
            <span v-if="!hasCompareData">{{ $t('performance.noLastMonthData') }}</span>
            <span v-else>{{ $t('Comparing current values to') }} <strong class="text-text-main capitalize">{{ perf.comparePeriodLabel }}</strong>.</span>
          </div>

          <!-- Range shortfall warning -->
          <div v-if="rangeShortfall" class="flex flex-wrap items-center gap-2 rounded-xl border border-status-submitted-bg bg-status-submitted-bg/15 px-4 py-3 text-xs text-text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>{{ $t('Only') }} <strong class="text-text-main font-semibold">{{ storedDayCount }}</strong> {{ $t('days of statistics exist locally (back to') }} {{ oldestStoredDate }}). {{ $t('Synchronize data to load historical days.') }}</span>
            <button v-if="canSyncAllWebsites" class="btn-secondary ml-auto h-7 px-3 py-0 text-xs font-sans font-semibold" type="button" :disabled="perf.syncAllRunning" @click="onSyncAll">
              {{ perf.syncAllRunning ? $t('performance.syncing') : $t('Sync Range') }}
            </button>
            <button v-else-if="canSyncMyWebsites && scopeFilter === 'my'" class="btn-secondary ml-auto h-7 px-3 py-0 text-xs font-sans font-semibold" type="button" :disabled="perf.syncAllRunning" @click="onSyncMyWebsites">
              {{ perf.syncAllRunning ? $t('performance.syncing') : $t('performance.syncMyWebsites') }}
            </button>
          </div>

          <!-- Main Chart -->
          <div class="card p-6 rounded-2xl bg-card border border-border/60">
            <!-- Header Block -->
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4 mb-6">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-text-main font-sans tracking-wide uppercase">
                    {{ translateMetricLabel(activeMetricMeta.key) }} Trend
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-soft text-text-muted">{{ $t('Daily') }}</span>
                </div>
                <p class="text-xs text-text-muted font-sans mt-0.5">{{ $t('Performance tracking across selected parameters') }}</p>
              </div>

              <!-- Inline Legend & Controls -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <div class="flex items-center gap-1.5 font-sans font-medium text-text-main">
                  <span class="w-3 h-0.5 rounded animate-pulse" :style="{ backgroundColor: activeMetricMeta.color }" />
                  <span>{{ $t('Current Period') }}</span>
                </div>
                <div v-if="compareActive && hasCompareData" class="flex items-center gap-1.5 font-sans font-medium text-text-muted">
                  <span class="w-3 border-t-2 border-dashed border-text-muted" />
                  <span>{{ $t('Comparison Period') }}</span>
                </div>
                <div v-if="hasTrend" class="flex items-center gap-1.5 ml-2">
                  <label class="flex items-center gap-1 cursor-pointer font-sans text-xs text-text-muted hover:text-text-main select-none">
                    <input type="checkbox" v-model="showChartAverage" class="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 bg-input" />
                    <span>{{ $t('Average line') }}</span>
                  </label>
                </div>
              </div>
            </div>


            <!-- Chart Plot -->
            <div class="relative w-full">
              <LineChart
                v-if="hasTrend"
                :data="chartSeries"
                :compare-data="compareChartSeries"
                :color="activeMetricMeta.color"
                :height="240"
                :metric-type="activeMetric"
                :metric-name="activeMetricMeta.label.replace('Total ', '').replace('Average ', '')"
                :show-average-line="showChartAverage"
              />
              <p v-else class="py-16 text-center text-sm text-text-muted">{{ $t('Insufficient daily statistics to plot trend line.') }}</p>
            </div>
          </div>

          <!-- Data Tabs GSC style -->
          <div class="card rounded-2xl overflow-hidden bg-card border border-border/60">
            <div class="perf-tabs border-b border-border bg-soft/10">
              <button
                v-for="t in tabList"
                :key="t.key"
                type="button"
                :class="['perf-tab font-sans font-semibold text-xs cursor-pointer', { active: activeTab === t.key }]"
                @click="activeTab = t.key"
              >
                {{ t.label }}
              </button>
              <input
                v-model="tableSearch"
                class="input perf-tabsearch h-8 text-xs font-sans"
                :placeholder="$t('Search ' + activeTabMeta.noun + '…')"
              />
            </div>

            <!-- Tab content table -->
            <div class="overflow-x-auto">
              <table class="perf-table perf-table--lined">
                <thead>
                  <tr class="bg-soft/5">
                    <th class="cursor-pointer select-none font-bold font-sans text-xs tracking-wider" @click="setSort('label')">
                      {{ activeTabMeta.header }} <span class="perf-sort ml-1">{{ sortArrow('label') }}</span>
                    </th>
                    <th class="num cursor-pointer select-none font-bold font-sans text-xs tracking-wider" @click="setSort('clicks')">
                      {{ $t('performance.clicks') }} <span class="perf-sort ml-1">{{ sortArrow('clicks') }}</span>
                    </th>
                    <th v-if="showChangeCol" class="num font-bold font-sans text-xs tracking-wider">{{ $t('Clicks Change') }}</th>
                    <th class="num cursor-pointer select-none font-bold font-sans text-xs tracking-wider" @click="setSort('impressions')">
                      {{ $t('performance.impressions') }} <span class="perf-sort ml-1">{{ sortArrow('impressions') }}</span>
                    </th>
                    <th class="num cursor-pointer select-none font-bold font-sans text-xs tracking-wider" @click="setSort('ctr')">
                      {{ $t('performance.ctr') }} <span class="perf-sort ml-1">{{ sortArrow('ctr') }}</span>
                    </th>
                    <th class="num cursor-pointer select-none font-bold font-sans text-xs tracking-wider" @click="setSort('position')">
                      {{ $t('performance.avgPosition') }} <span class="perf-sort ml-1">{{ sortArrow('position') }}</span>
                    </th>
                    <th v-if="activeTab === 'websites'" class="font-bold font-sans text-xs tracking-wider">{{ $t('Sync Status') }}</th>
                    <th v-if="activeTabMeta.extra && activeTab !== 'websites'" class="num font-bold font-sans text-xs tracking-wider">
                      {{ activeTabMeta.extra }}
                    </th>
                    <th v-if="activeTab === 'websites'" class="text-right font-bold font-sans text-xs tracking-wider">{{ $t('Actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in pagedRows"
                    :key="r.key"
                    :class="{ 'perf-row-click cursor-pointer hover:bg-soft/10': activeTabMeta.clickable }"
                    @click="onRowClick(r)"
                  >
                    <td class="text-text-main font-sans font-medium" :title="r.label">
                      <span v-if="activeTab === 'websites'" class="inline-flex items-center gap-2">
                        <WebsiteFavicon :favicon-url="websiteObj(r.id)?.faviconUrl" :domain="websiteObj(r.id)?.domain" :name="r.label" :size="20" />
                        <span class="truncate">{{ r.label }}</span>
                      </span>
                      <span v-else-if="activeTab === 'countries'" class="inline-flex items-center gap-2">
                        <CountryFlag :country-name="r.label" :country-code="r.key" :size="20" />
                        <span class="truncate">{{ r.label }}</span>
                      </span>
                      <span v-else-if="activeTab === 'members'" class="inline-flex items-center gap-2.5 py-0.5">
                        <div class="perf-wsel-avatar h-7 w-7">
                          <img v-if="getMemberAvatarUrl(r.key)" :src="getMemberAvatarUrl(r.key)" class="perf-wsel-avatar-img" />
                          <span v-else class="perf-wsel-avatar-initials text-xs font-bold">{{ getMemberInitials(r.label) }}</span>
                        </div>
                        <div class="flex flex-col min-w-0 leading-tight">
                          <span class="truncate font-semibold text-text-main text-xs">{{ r.label }}</span>
                          <span class="text-[9px] text-text-muted capitalize mt-0.5">{{ getMemberRoleLabel(r.key) }}</span>
                        </div>
                      </span>
                      <span v-else>{{ activeTab === 'pages' ? shortUrl(r.label) : r.label }}</span>
                    </td>
                    <td class="num font-number font-medium">{{ fmtNum(r.clicks) }}</td>
                    <td v-if="showChangeCol" class="num font-number font-semibold" :class="(r.change ?? 0) >= 0 ? 'text-status-approved-fg' : 'text-status-needs-fix-fg'">
                      {{ (r.change ?? 0) >= 0 ? '+' : '−' }}{{ fmtNum(Math.abs(r.change ?? 0)) }}
                    </td>
                    <td class="num font-number text-text-muted">{{ fmtNum(r.impressions) }}</td>
                    <td class="num font-number text-text-muted">{{ fmtPct(r.ctr) }}</td>
                    <td class="num font-number text-text-muted">{{ fmtPos(r.position) }}</td>
                    <td v-if="activeTab === 'websites'" class="whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="getWebsiteStatus(r.key).class">
                        {{ getWebsiteStatus(r.key).label }}
                      </span>
                    </td>
                    <td v-if="activeTabMeta.extra && activeTab !== 'websites'" class="num text-text-muted font-sans">
                      {{ r.extra }}
                    </td>
                    <td v-if="activeTab === 'websites'" class="whitespace-nowrap text-right" @click.stop>
                      <button
                        v-if="canSyncWebsite(r.key)"
                        class="btn-secondary py-1 px-2.5 h-7 text-[10px] font-sans font-semibold"
                        type="button"
                        :disabled="perf.syncingIds.has(r.key)"
                        @click="perf.syncWebsite(r.key)"
                      >
                        {{ perf.syncingIds.has(r.key) ? $t('performance.syncing') : $t('Sync') }}
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!pagedRows.length">
                    <td :colspan="colCount" class="py-12 text-center text-sm text-text-muted font-sans">
                      {{ noDataMsg }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Table pagination -->
            <div v-if="sortedRows.length > perPage" class="perf-pager bg-soft/5">
              <span class="font-sans text-xs">{{ $t('Showing') }} {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, sortedRows.length) }} {{ $t('of') }} {{ sortedRows.length }}</span>
              <div class="flex gap-2">
                <button class="btn-secondary h-8 px-3 text-xs" type="button" :disabled="page <= 1" @click="page--">{{ $t('Prev') }}</button>
                <button class="btn-secondary h-8 px-3 text-xs" type="button" :disabled="page >= pageCount" @click="page++">{{ $t('Next') }}</button>
              </div>
            </div>
          </div>

          <!-- Bottom insights cards -->
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div class="perf-insight bg-card border border-border/60">
              <div class="perf-insight-l">{{ $t('Top Website') }}</div>
              <div class="perf-insight-v flex items-center gap-2 mt-1 truncate">
                <WebsiteFavicon v-if="topWebsite" :favicon-url="websiteObj(topWebsite.id)?.faviconUrl" :domain="websiteObj(topWebsite.id)?.domain" :name="topWebsite.label" :size="20" />
                <span class="truncate font-sans font-bold text-sm">{{ topWebsite?.label || '—' }}</span>
              </div>
              <div class="perf-insight-s mt-1 font-sans">{{ topWebsite ? fmtNum(topWebsite.clicks) + ' ' + $t('clicks') : $t('No data') }}</div>
            </div>

            <div class="perf-insight bg-card border border-border/60">
              <div class="perf-insight-l">{{ $t('Biggest Growth') }}</div>
              <div class="perf-insight-v truncate mt-1 font-sans font-bold text-sm">{{ biggestGrowth[0]?.name || '—' }}</div>
              <div class="perf-insight-s mt-1 font-sans text-status-approved-fg" v-if="biggestGrowth[0]">
                +{{ fmtNum(biggestGrowth[0].delta) }} {{ $t('clicks') }}
              </div>
              <div class="perf-insight-s mt-1 font-sans text-text-muted" v-else>{{ $t('No increase') }}</div>
            </div>

            <div class="perf-insight bg-card border border-border/60">
              <div class="perf-insight-l">{{ $t('Biggest Drop') }}</div>
              <div class="perf-insight-v truncate mt-1 font-sans font-bold text-sm">{{ biggestDrop[0]?.name || '—' }}</div>
              <div class="perf-insight-s mt-1 font-sans text-status-needs-fix-fg" v-if="biggestDrop[0]">
                {{ fmtNum(biggestDrop[0].delta) }} {{ $t('clicks') }}
              </div>
              <div class="perf-insight-s mt-1 font-sans text-text-muted" v-else>{{ $t('No decrease') }}</div>
            </div>

            <div class="perf-insight bg-card border border-border/60">
              <div class="perf-insight-l">{{ $t('Alerts / Attention') }}</div>
              <div class="perf-insight-v mt-1 font-sans font-bold text-sm text-status-submitted-fg">
                {{ needsAttention.length }} {{ needsAttention.length === 1 ? $t('website') : $t('websites') }}
              </div>
              <div class="perf-insight-s mt-1 font-sans text-text-muted">
                {{ needsAttention.length ? $t('require connection mapping') : $t('connections healthy') }}
              </div>
            </div>
          </div>

          <!-- Connections Table -->
          <div class="card card-pad rounded-2xl bg-card border border-border/60 mt-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-bold text-text-main font-sans tracking-wide uppercase mb-1">
                  {{ $t('Search Console Connections') }}
                </h3>
                <p class="text-xs text-text-muted font-sans leading-relaxed">
                  {{ canManageAnyConnection ? $t('Map each project site to its Search Console property format (e.g. sc-domain:example.com or https://example.com/) to query metrics.') : $t('Select a website to view its search console performance.') }}
                </p>
              </div>
              <div v-if="scopeFilter === 'single' && websiteFilter" class="text-xs font-semibold text-primary font-sans bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                {{ $t('Viewing') }}: {{ websiteName(websiteFilter) }}
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="perf-table perf-table--lined text-xs">
                <thead>
                  <tr class="bg-soft/5">
                    <th class="font-bold">{{ $t('Website') }}</th>
                    <th class="font-bold">{{ $t('GSC Property URL') }}</th>
                    <th class="font-bold">{{ $t('Status') }}</th>
                    <th class="font-bold">{{ $t('Last Sync Timestamp') }}</th>
                    <th class="text-right font-bold">{{ $t('Actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="w in visibleConnectionWebsites"
                    :key="w.id"
                    @click="onSelectWebsiteFromConnectionRow(w)"
                    class="perf-gsc-row"
                    :class="{ 'is-selected': scopeFilter === 'single' && websiteFilter === w.id }"
                  >
                    <td class="font-semibold text-text-main font-sans">
                      <div class="flex items-center gap-2">
                        <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="18" />
                        <span class="truncate hover:underline" :title="$t('View performance for this website')">{{ w.name || w.domain }}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        v-if="canManageConnection(w.id)"
                        v-model="propInputs[w.id]"
                        class="input h-8 text-xs font-sans max-w-sm w-full bg-input"
                        :placeholder="`sc-domain:${bareDomain(w.domain)}`"
                        @click.stop
                      />
                      <code v-else class="font-mono text-text-muted">{{ perf.connectionByWebsite.get(w.id)?.gsc_property_url || '—' }}</code>
                    </td>
                    <td>
                      <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="getWebsiteStatus(w.id).class">
                          {{ getWebsiteStatus(w.id).label }}
                        </span>
                        <span v-if="getWebsiteStatus(w.id).error" class="cursor-help text-[10px] text-text-muted hover:text-text-main" :title="getWebsiteStatus(w.id).error || undefined">{{ $t('(?)') }}</span>
                      </div>
                    </td>
                    <td class="text-text-muted font-sans text-xs">{{ fmtDateTime(perf.connectionByWebsite.get(w.id)?.last_synced_at) }}</td>
                    <td class="whitespace-nowrap text-right">
                      <div class="flex justify-end gap-1.5" @click.stop>
                        <template v-if="canManageConnection(w.id)">
                          <button class="btn-secondary h-7 px-3 py-0 text-[10px] font-sans font-semibold" type="button" @click="onSaveConnection(w.id)">{{ $t('Save') }}</button>
                          <button
                            class="btn-secondary h-7 px-3 py-0 text-[10px] font-sans font-semibold"
                            type="button"
                            :disabled="perf.syncingIds.has(w.id) || !perf.connectionByWebsite.get(w.id)"
                            @click="perf.syncWebsite(w.id)"
                          >
                            {{ perf.syncingIds.has(w.id) ? $t('Syncing…') : $t('Sync') }}
                          </button>
                          <button
                            v-if="perf.connectionByWebsite.get(w.id)"
                            class="btn-secondary h-7 px-3 py-0 text-[10px] font-sans font-semibold text-status-needs-fix-fg hover:text-status-needs-fix-fg/80"
                            type="button"
                            @click="onRemoveConnection(w.id)"
                          >
                            {{ $t('Remove') }}
                          </button>
                        </template>
                        <template v-else-if="canSyncWebsite(w.id)">
                          <button
                            class="btn-secondary h-7 px-3 py-0 text-[10px] font-sans font-semibold"
                            type="button"
                            :disabled="perf.syncingIds.has(w.id) || !perf.connectionByWebsite.get(w.id)"
                            @click="perf.syncWebsite(w.id)"
                          >
                            {{ perf.syncingIds.has(w.id) ? $t('Syncing…') : $t('Sync') }}
                          </button>
                        </template>
                        <button class="btn-secondary h-7 px-3 py-0 text-[10px] font-sans font-semibold" type="button" @click="openDetail(w.id)">
                          {{ $t('Details') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!visibleConnectionWebsites.length">
                    <td colspan="5" class="py-8 text-center text-sm text-text-muted font-sans">{{ $t('No websites match filters.') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Admin View: Google Search Console Accounts -->
          <div v-if="isManagement" class="card card-pad rounded-2xl bg-card border border-border/60 mt-6">
            <div class="mb-4">
              <h3 class="text-sm font-bold text-text-main font-sans tracking-wide uppercase mb-1">
                {{ $t('performance.gscAccountsTitle') }}
              </h3>
              <p class="text-xs text-text-muted font-sans leading-relaxed">
                {{ $t('performance.gscAccountsSub') }}
              </p>
            </div>
            
            <div class="overflow-x-auto">
              <table class="perf-table perf-table--lined text-xs">
                <thead>
                  <tr class="bg-soft/5">
                    <th class="font-bold">{{ $t('performance.user') }}</th>
                    <th class="font-bold">{{ $t('performance.role') }}</th>
                    <th class="font-bold">{{ $t('performance.connectedGmail') }}</th>
                    <th class="font-bold">{{ $t('performance.status') }}</th>
                    <th class="font-bold">{{ $t('performance.lastConnected') }}</th>
                    <th class="font-bold">{{ $t('performance.assignedSites') }}</th>
                    <th class="font-bold">{{ $t('performance.lastError') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="member in adminConnectionsOverview" :key="member.userId">
                    <td class="font-sans">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] overflow-hidden">
                          <img v-if="member.avatarUrl" :src="member.avatarUrl" class="w-full h-full object-cover" />
                          <span v-else>{{ getMemberInitials(member.displayName || member.fullName) }}</span>
                        </div>
                        <span class="font-semibold text-text-main font-sans">{{ member.displayName || member.fullName }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold capitalize bg-soft text-text-muted">
                        {{ member.role }}
                      </span>
                    </td>
                    <td class="font-mono text-text-muted text-xs">
                      {{ member.googleEmail || '—' }}
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="member.status === 'connected' ? 'bg-status-approved-bg/15 text-status-approved-fg' : 'bg-soft text-text-muted'">
                        {{ member.status === 'connected' ? $t('performance.connected') : $t('performance.notConnected') }}
                      </span>
                    </td>
                    <td class="text-text-muted font-sans text-xs">
                      {{ fmtDateTime(member.connectedAt) }}
                    </td>
                    <td class="text-text-main font-sans font-bold">
                      {{ member.assignedWebsitesCount }}
                    </td>
                    <td class="text-status-needs-fix-fg font-sans text-xs">
                      {{ member.lastError || '—' }}
                    </td>
                  </tr>
                  <tr v-if="!adminConnectionsOverview.length">
                    <td colspan="7" class="py-8 text-center text-sm text-text-muted font-sans">{{ $t('performance.noMembersFound') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </LoadingBlock>

      <!-- Page Indexing Sub-Dashboard -->
      <PageIndexing
        v-else-if="activePerformanceView === 'page-indexing'"
        :websites="visibleWebsites"
        :scope-filter="scopeFilter"
        :member-filter="memberFilter"
        :website-filter="websiteFilter"
        @switch-scope="selectScope"
        @update:member-filter="memberFilter = $event"
        @update:website-filter="websiteFilter = $event"
        @toggle-sidebar="sidebarOpen = true"
      />
        </div>
      </div>
    </div>

    <!-- Reusable Sync Logs Modal -->
    <SyncLogsModal :open="showLogsModal" @close="showLogsModal = false" />

    <!-- Website Detail Drawer Modal -->
    <Modal :open="!!detailId" :title="detailWebsite?.name || detailWebsite?.domain || $t('Website')" :subtitle="$t('Website Search Console Property Details')" size="lg" @close="closeDetail">
      <div v-if="detailId" class="space-y-4">
        <!-- Site Header Meta -->
        <div class="flex items-center gap-3 bg-soft/10 p-3 rounded-xl border border-border/40">
          <WebsiteFavicon :favicon-url="detailWebsite?.faviconUrl" :domain="detailWebsite?.domain" :name="detailWebsite?.name" :size="36" />
          <div class="min-w-0 flex-1">
            <div class="font-bold text-text-main text-base truncate font-sans">{{ detailWebsite?.name || detailWebsite?.domain }}</div>
            <div class="text-xs text-text-muted truncate font-sans font-mono">{{ detailWebsite?.domain }}</div>
          </div>
          <div class="text-right text-xs text-text-muted font-sans flex flex-col gap-1 items-end">
            <span class="inline-flex items-center gap-1.5">
              {{ $t('Owner:') }}
              <div class="perf-wsel-avatar h-4.5 w-4.5" v-if="detailWebsite?.createdBy">
                <img v-if="getMemberAvatarUrl(detailWebsite.createdBy)" :src="getMemberAvatarUrl(detailWebsite.createdBy)" class="perf-wsel-avatar-img" />
                <span v-else class="perf-wsel-avatar-initials text-[8px]">{{ getMemberInitials(getWebsiteCreatorName(detailWebsite)) }}</span>
              </div>
              <strong class="text-text-main font-semibold flex items-center gap-1">
                {{ getWebsiteCreatorName(detailWebsite!) }}
                <span v-if="detailWebsite?.createdBy" class="text-[9px] px-1.5 py-0.2 bg-soft/30 rounded text-text-muted capitalize">
                  {{ getMemberRoleLabel(detailWebsite.createdBy) }}
                </span>
              </strong>
            </span>
            <span>{{ $t('Status:') }} <strong class="text-text-main font-semibold">{{ perf.connectionByWebsite.has(detailId) ? $t('Connected') : $t('Not Mapped') }}</strong></span>
          </div>
        </div>

        <!-- Drawer Side Tabs / Nav -->
        <div class="flex gap-1.5 border-b border-border pb-1 overflow-x-auto">
          <button
            v-for="t in detailTabsList"
            :key="t.key"
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-transparent border-0 cursor-pointer"
            :class="detailTab === t.key ? 'bg-primary text-on-primary font-bold' : 'text-text-muted hover:text-text-main hover:bg-soft/20'"
            @click="detailTab = t.key"
          >
            {{ $t(t.label) }}
          </button>
        </div>

        <!-- Drawer Tab Content Renderers -->
        <div class="pt-2">
          <!-- Overview Tab -->
          <div v-if="detailTab === 'overview'" class="space-y-4">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="perf-kv bg-soft/20 border border-border/40 rounded-xl p-3">
                <div class="perf-kv-l">{{ $t('Total Clicks') }}</div>
                <div class="perf-kv-v text-lg font-bold font-sans mt-0.5">{{ fmtNum(detailTotals.clicks) }}</div>
                <div v-if="detailDelta('clicks')" class="perf-kv-cmp flex items-center gap-0.5 text-[10px] font-bold font-sans" :class="detailDelta('clicks')!.good ? 'text-status-approved-fg' : 'text-status-needs-fix-fg'">
                  {{ detailDelta('clicks')!.good ? '▲' : '▼' }} {{ detailDelta('clicks')!.deltaLabel }}
                </div>
              </div>
              <div class="perf-kv bg-soft/20 border border-border/40 rounded-xl p-3">
                <div class="perf-kv-l">{{ $t('Total Impressions') }}</div>
                <div class="perf-kv-v text-lg font-bold font-sans mt-0.5">{{ fmtNum(detailTotals.impressions) }}</div>
                <div v-if="detailDelta('impressions')" class="perf-kv-cmp flex items-center gap-0.5 text-[10px] font-bold font-sans" :class="detailDelta('impressions')!.good ? 'text-status-approved-fg' : 'text-status-needs-fix-fg'">
                  {{ detailDelta('impressions')!.good ? '▲' : '▼' }} {{ detailDelta('impressions')!.deltaLabel }}
                </div>
              </div>
              <div class="perf-kv bg-soft/20 border border-border/40 rounded-xl p-3">
                <div class="perf-kv-l">{{ $t('Average CTR') }}</div>
                <div class="perf-kv-v text-lg font-bold font-sans mt-0.5">{{ fmtPct(detailTotals.ctr) }}</div>
                <div v-if="detailDelta('ctr')" class="perf-kv-cmp flex items-center gap-0.5 text-[10px] font-bold font-sans" :class="detailDelta('ctr')!.good ? 'text-status-approved-fg' : 'text-status-needs-fix-fg'">
                  {{ detailDelta('ctr')!.good ? '▲' : '▼' }} {{ detailDelta('ctr')!.deltaLabel }}
                </div>
              </div>
              <div class="perf-kv bg-soft/20 border border-border/40 rounded-xl p-3">
                <div class="perf-kv-l">{{ $t('Average Position') }}</div>
                <div class="perf-kv-v text-lg font-bold font-sans mt-0.5">{{ fmtPos(detailTotals.position) }}</div>
                <div v-if="detailDelta('position')" class="perf-kv-cmp flex items-center gap-0.5 text-[10px] font-bold font-sans" :class="detailDelta('position')!.good ? 'text-status-approved-fg' : 'text-status-needs-fix-fg'">
                  {{ detailDelta('position')!.good ? '▲' : '▼' }} {{ detailDelta('position')!.deltaLabel }}
                </div>
              </div>
            </div>
            
            <div class="text-xs text-text-muted space-y-1.5 bg-soft/5 border border-border/40 rounded-xl p-3">
              <div>{{ $t('Google Search Property:') }} <code class="font-mono text-text-main">{{ perf.connectionByWebsite.get(detailId)?.gsc_property_url || 'None' }}</code></div>
              <div>{{ $t('Last Synced At:') }} <span class="font-semibold text-text-main">{{ fmtDateTime(perf.connectionByWebsite.get(detailId)?.last_synced_at) }}</span></div>
              <div v-if="compareActive">{{ $t('Comparison baseline: Compared to previous days last month.') }}</div>
            </div>
          </div>

          <!-- Performance Tab -->
          <div v-else-if="detailTab === 'performance'" class="space-y-3">
            <div class="mb-1 flex items-center justify-between">
              <h4 class="text-xs font-bold text-text-muted uppercase tracking-wide">{{ $t('Clicks Trend Over Time') }}</h4>
            </div>
            <LineChart
              v-if="detailSeries.length > 1"
              :data="detailSeries"
              color="var(--primary)"
              :height="180"
              metric-type="clicks"
              metric-name="Clicks"
            />
            <p v-else class="text-center py-12 text-sm text-text-muted">{{ $t('No historical trends synced.') }}</p>
          </div>

          <!-- Page Indexing Tab -->
          <div v-else-if="detailTab === 'indexing'" class="space-y-4">
            <div class="text-xs text-text-muted">
              {{ $t('Discover and check indexing logs under the Page Indexing view.') }}
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-soft/10 p-2.5 border border-border/30 rounded-lg">
                <div class="text-[10px] text-text-muted uppercase font-semibold">{{ $t('Total URLs') }}</div>
                <div class="text-base font-extrabold text-text-main mt-0.5">{{ fmtNum(detailIndexingSummary.known) }}</div>
              </div>
              <div class="bg-soft/10 p-2.5 border border-border/30 rounded-lg">
                <div class="text-[10px] text-text-muted uppercase font-semibold text-status-approved-fg">{{ $t('Indexed') }}</div>
                <div class="text-base font-extrabold text-status-approved-fg mt-0.5">{{ fmtNum(detailIndexingSummary.indexed) }}</div>
              </div>
              <div class="bg-soft/10 p-2.5 border border-border/30 rounded-lg">
                <div class="text-[10px] text-text-muted uppercase font-semibold text-status-needs-fix-fg">{{ $t('Not Indexed') }}</div>
                <div class="text-base font-extrabold text-status-needs-fix-fg mt-0.5">{{ fmtNum(detailIndexingSummary.notIndexed) }}</div>
              </div>
            </div>
          </div>

          <!-- Queries Tab -->
          <div v-else-if="detailTab === 'queries'" class="space-y-2">
            <h4 class="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">{{ $t('Top Searches') }}</h4>
            <div class="border border-border/40 rounded-xl overflow-hidden">
              <table class="perf-table text-xs">
                <thead>
                  <tr class="bg-soft/5"><th>{{ $t('Query') }}</th><th class="num">{{ $t('Clicks') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in detailQueries" :key="i">
                    <td class="text-text-main font-medium font-sans">{{ r.label }}</td>
                    <td class="num font-sans text-text-muted">{{ fmtNum(r.clicks) }}</td>
                  </tr>
                  <tr v-if="!detailQueries.length">
                    <td colspan="2" class="py-6 text-center text-text-muted font-sans">{{ $t('No search queries logged.') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pages Tab -->
          <div v-else-if="detailTab === 'pages'" class="space-y-2">
            <h4 class="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">{{ $t('Top Visited Pages') }}</h4>
            <div class="border border-border/40 rounded-xl overflow-hidden">
              <table class="perf-table text-xs">
                <thead>
                  <tr class="bg-soft/5"><th>{{ $t('Page URL') }}</th><th class="num">{{ $t('Clicks') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in detailPages" :key="i">
                    <td class="truncate text-text-main font-sans font-medium" :title="r.label">{{ shortUrl(r.label) }}</td>
                    <td class="num font-sans text-text-muted">{{ fmtNum(r.clicks) }}</td>
                  </tr>
                  <tr v-if="!detailPages.length">
                    <td colspan="2" class="py-6 text-center text-text-muted font-sans">{{ $t('No page URLs logged.') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Devices Tab -->
          <div v-else-if="detailTab === 'devices'" class="space-y-2">
            <h4 class="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">{{ $t('Device Breakdown') }}</h4>
            <div class="border border-border/40 rounded-xl overflow-hidden">
              <table class="perf-table text-xs">
                <thead>
                  <tr class="bg-soft/5"><th>{{ $t('Device') }}</th><th class="num">{{ $t('Clicks') }}</th><th class="num font-semibold">{{ $t('Share') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="d in detailDevices" :key="d.key">
                    <td class="text-text-main font-medium font-sans">{{ d.label }}</td>
                    <td class="num font-sans font-medium">{{ fmtNum(d.clicks) }}</td>
                    <td class="num font-sans text-text-muted">{{ fmtPct(detailTotals.clicks ? d.clicks / detailTotals.clicks : 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Countries Tab -->
          <div v-else-if="detailTab === 'countries'" class="space-y-2">
            <h4 class="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">{{ $t('Countries Breakdown') }}</h4>
            <div class="border border-border/40 rounded-xl overflow-hidden">
              <table class="perf-table text-xs">
                <thead>
                  <tr class="bg-soft/5"><th>{{ $t('Country') }}</th><th class="num">{{ $t('Clicks') }}</th><th class="num font-semibold">{{ $t('Share') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="c in detailCountries" :key="c.key">
                    <td class="text-text-main font-medium font-sans">
                      <div class="flex items-center gap-2">
                        <CountryFlag :country-name="c.label" :country-code="c.key" :size="20" />
                        <span>{{ c.label }}</span>
                      </div>
                    </td>
                    <td class="num font-sans font-medium">{{ fmtNum(c.clicks) }}</td>
                    <td class="num font-sans text-text-muted">{{ fmtPct(detailTotals.clicks ? c.clicks / detailTotals.clicks : 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sync Logs Tab -->
          <div v-else-if="detailTab === 'logs'" class="space-y-3">
            <div class="flex items-center justify-between mb-1">
              <h4 class="text-xs font-bold text-text-muted uppercase tracking-wide">{{ $t('Recent GSC Performance Logs') }}</h4>
              <button class="btn-secondary h-6 text-[10px] font-sans font-semibold py-0 px-2" type="button" @click="fetchDetailSyncLogs">{{ $t('Refresh') }}</button>
            </div>
            <div v-if="detailLogsLoading" class="text-center py-6 text-xs text-text-muted animate-pulse">{{ $t('Loading sync history...') }}</div>
            <div v-else-if="!detailSyncLogs.length" class="text-center py-6 text-xs text-text-muted">{{ $t('No sync history logged.') }}</div>
            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div v-for="log in detailSyncLogs" :key="log.id" class="p-2.5 rounded-lg border border-border bg-soft/20 text-xs flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-text-muted font-sans font-semibold">{{ fmtDateTime(log.sync_started_at) }}</span>
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase" :class="log.status === 'ok' ? 'bg-status-approved-bg/15 text-status-approved-fg' : 'bg-status-needs-fix-bg/15 text-status-needs-fix-fg'">
                    {{ log.status }}
                  </span>
                </div>
                <div class="flex items-center justify-between font-medium text-text-main font-sans mt-0.5">
                  <span>{{ log.status === 'ok' ? `Synced ${log.rows_synced} rows` : log.error_message || 'Sync failed' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <button class="btn-secondary font-sans font-semibold text-xs px-4" type="button" @click="closeDetail">{{ $t('Close') }}</button>
        <button
          v-if="detailId && canSyncWebsite(detailId) && perf.connectionByWebsite.get(detailId || '')"
          class="btn-primary font-sans font-semibold text-xs px-4"
          type="button"
          :disabled="!!detailId && perf.syncingIds.has(detailId)"
          @click="detailId && perf.syncWebsite(detailId)"
        >
          {{ detailId && perf.syncingIds.has(detailId) ? $t('Syncing…') : $t('Sync Website') }}
        </button>
      </template>
    </Modal>

    <!-- Mobile Slide-over Drawer -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-50 flex lg:hidden">
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="sidebarOpen = false" />
      <div class="relative w-[280px] max-w-[85vw] h-full bg-card border-r border-border p-4 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[11px] font-bold text-text-main font-sans uppercase tracking-wider">{{ $t('Websites') }}</h3>
          <button type="button" class="text-text-muted hover:text-text-main text-sm font-bold p-1 cursor-pointer" @click="sidebarOpen = false">✕</button>
        </div>
        <div class="flex-1 min-h-0">
          <PerformanceSidebar
            :websites="visibleConnectionWebsites"
            :scope-filter="scopeFilter"
            :website-filter="websiteFilter"
            :scope-label="scopeLabel"
            @select-website="onSelectWebsiteFromSidebar"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LineChart from '@/components/ui/LineChart.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import WebsiteFavicon from '@/components/ui/WebsiteFavicon.vue';
import CountryFlag from '@/components/ui/CountryFlag.vue';
import PageIndexing from '@/components/performance/PageIndexing.vue';
import SyncLogsModal from '@/components/performance/SyncLogsModal.vue';
import PerformanceSidebar from '@/components/performance/PerformanceSidebar.vue';
import { usePerformanceStore, aggregateByDate, sumTotals, getRangeDurationDays, type GscTotals, type GscTermStat } from '@/stores/performance';
import { useDataStore, type Website, type Member } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const { t } = useI18n();
const perf = usePerformanceStore();
const data = useDataStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const sidebarOpen = ref(false);

const onSelectWebsiteFromSidebar = (w: Website) => {
  scopeFilter.value = 'single';
  websiteFilter.value = w.id;
  sidebarOpen.value = false;
};

// ── View View Routing ──────────────────────────────────────────────────
const activePerformanceView = computed<'overview' | 'page-indexing'>(() => {
  return route.query.view === 'page-indexing' ? 'page-indexing' : 'overview';
});

const loadData = () => {
  if (activePerformanceView.value === 'overview') {
    void perf.fetchAll();
  } else if (activePerformanceView.value === 'page-indexing') {
    void Promise.all([
      perf.fetchConnectionInfo(),
      perf.fetchConnections()
    ]);
  }
};

watch(activePerformanceView, () => {
  loadData();
});

// ── Management Roles Check ─────────────────────────────────────────────
const isManagement = computed(() => {
  const role = auth.profile?.role;
  return role === 'admin' || role === 'owner' || role === 'head' || role === 'supervisor';
});

// ── Team Member Sync Permission Helpers ────────────────────────────────
/** True if the current user can sync this specific website (management OR website creator). */
const canSyncWebsite = (websiteId: string): boolean => {
  if (isManagement.value) return true;
  const w = data.websites.find((x) => x.id === websiteId);
  return !!w && w.createdBy === (auth.user?.id ?? '');
};

/** True if the current user can map / save / remove the GSC connection for this website.
 *  Mirrors the RLS policy on website_gsc_connections (management OR website creator). */
const canManageConnection = (websiteId: string): boolean => {
  if (isManagement.value) return true;
  const w = data.websites.find((x) => x.id === websiteId);
  return !!w && w.createdBy === (auth.user?.id ?? '');
};

/** True if user can manage at least one connection — used to swap helper copy. */
const canManageAnyConnection = computed(() => {
  if (isManagement.value) return true;
  const uid = auth.user?.id ?? '';
  return !!uid && data.websites.some((w) => w.createdBy === uid);
});

/** True if the current user can trigger 'Sync All' (management only). */
const canSyncAllWebsites = computed(() => isManagement.value);

/** True if the user can sync their own assigned websites (has Google connected + has websites). */
const canSyncMyWebsites = computed(() => {
  if (!perf.connectionInfo.connected) return false;
  const userId = auth.user?.id ?? '';
  if (!userId) return false;
  const assignedIds = data.getUserAssignedWebsiteIds(userId);
  return assignedIds.length > 0;
});

// ── Scope & Filters ────────────────────────────────────────────────────
const scopeFilter = ref<'my' | 'all' | 'member' | 'single'>('my');
const scopeDropdownOpen = ref(false);
const memberDropdownOpen = ref(false);
const websiteDropdownOpen = ref(false);
const platformDropdownOpen = ref(false);
const connDropdownOpen = ref(false);
const rangeDropdownOpen = ref(false);
const compareDropdownOpen = ref(false);
const advancedDropdownOpen = ref(false);

const websiteFilter = ref('');
const memberFilter = ref('');
const platformFilter = ref('');
const connFilter = ref<'all' | 'connected' | 'not'>('all');
const websiteTypeFilter = ref('');
const hasDataFilter = ref<'all' | 'has_data' | 'no_data'>('all');

const tempPlatformFilter = ref('');
const tempConnFilter = ref<'all' | 'connected' | 'not'>('all');
const tempWebsiteTypeFilter = ref('');
const tempHasDataFilter = ref<'all' | 'has_data' | 'no_data'>('all');

const showLogsModal = ref(false);
const activeTab = ref<'queries' | 'pages' | 'countries' | 'devices' | 'dates' | 'websites' | 'members'>('queries');

const websiteObj = (id?: string | null) => (id ? data.websites.find((x) => x.id === id) ?? null : null);
const websiteName = (id: string) => {
  const w = data.websites.find((x) => x.id === id);
  return w?.name || w?.domain || 'Website';
};

const memberProfiles = ref<{
  user_id: string;
  display_name: string;
  full_name?: string;
  avatar_url: string;
  role: string;
  status: string;
  assigned_website_count: number;
}[]>([]);
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
      console.error('[performance] performance_team_member_profiles error:', resErr.message);
    } else {
      memberProfiles.value = resData || [];
      if (isManagement.value) {
        void perf.fetchTeamConnections();
      }
    }
  } catch (err: any) {
    memberProfilesError.value = 'Could not load team members.';
    console.error('[performance] performance_team_member_profiles exception:', err);
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
  return data.members.filter((m) => m.status === 'active');
});

const memberWebsitesCount = (memberId: string) => {
  const profile = memberProfiles.value.find(p => p.user_id === memberId);
  if (profile) return Number(profile.assigned_website_count);
  return data.websites.filter((w) => w.createdBy === memberId).length;
};

const getWebsiteCreatorName = (w: Website) => {
  if (!w.createdBy) return 'Unassigned';
  const profile = memberProfiles.value.find(p => p.user_id === w.createdBy);
  if (profile) return profile.display_name || profile.full_name || 'Unknown';
  const member = data.memberById(w.createdBy);
  return member ? member.fullName : 'Unknown';
};

const selectedMemberObj = computed(() => {
  const id = memberFilter.value;
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
  return data.memberById(id);
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
  const member = data.memberById(id);
  return member ? member.avatarUrl : '';
};

const getMemberRoleLabel = (id: string) => {
  const profile = memberProfiles.value.find(p => p.user_id === id);
  const role = profile ? profile.role : data.memberById(id)?.role;
  return role ? role.replace('_', ' ') : 'Member';
};

// Clean dropdown states
const toggleDropdown = (type: string) => {
  scopeDropdownOpen.value = type === 'scope' ? !scopeDropdownOpen.value : false;
  memberDropdownOpen.value = type === 'member' ? !memberDropdownOpen.value : false;
  websiteDropdownOpen.value = type === 'website' ? !websiteDropdownOpen.value : false;
  platformDropdownOpen.value = type === 'platform' ? !platformDropdownOpen.value : false;
  connDropdownOpen.value = type === 'conn' ? !connDropdownOpen.value : false;
  rangeDropdownOpen.value = type === 'range' ? !rangeDropdownOpen.value : false;
  compareDropdownOpen.value = type === 'compare' ? !compareDropdownOpen.value : false;
  advancedDropdownOpen.value = type === 'advanced' ? !advancedDropdownOpen.value : false;
};

const openAdvancedFilters = () => {
  tempPlatformFilter.value = platformFilter.value;
  tempConnFilter.value = connFilter.value;
  tempWebsiteTypeFilter.value = websiteTypeFilter.value;
  tempHasDataFilter.value = hasDataFilter.value;
  toggleDropdown('advanced');
};

const applyAdvancedFilters = () => {
  platformFilter.value = tempPlatformFilter.value;
  connFilter.value = tempConnFilter.value;
  websiteTypeFilter.value = tempWebsiteTypeFilter.value;
  hasDataFilter.value = tempHasDataFilter.value;
  advancedDropdownOpen.value = false;
};

const resetAdvancedFilters = () => {
  tempPlatformFilter.value = '';
  tempConnFilter.value = 'all';
  tempWebsiteTypeFilter.value = '';
  tempHasDataFilter.value = 'all';

  platformFilter.value = '';
  connFilter.value = 'all';
  websiteTypeFilter.value = '';
  hasDataFilter.value = 'all';

  advancedDropdownOpen.value = false;
};

const activeAdvancedFiltersCount = computed(() => {
  let count = 0;
  if (platformFilter.value !== '') count++;
  if (connFilter.value !== 'all') count++;
  if (websiteTypeFilter.value !== '') count++;
  if (hasDataFilter.value !== 'all') count++;
  return count;
});

const onCompareToggleChange = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked;
  void perf.setCompareMode(checked ? 'last_month' : 'none');
};

const websiteTypes = computed(() => {
  const set = new Set<string>();
  data.websites.forEach((w) => { if (w.websiteType) set.add(w.websiteType); });
  return [...set];
});

const typeLabel = (val: string) => {
  if (!val) return '—';
  if (val === 'existing') return 'Existing Site';
  if (val === 'ecommerce') return 'E-commerce';
  if (val === 'normal_ecommerce') return 'Normal E-commerce';
  return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const selectScope = (val: 'my' | 'all' | 'member' | 'single') => {
  scopeFilter.value = val;
  scopeDropdownOpen.value = false;

  if (val === 'my') {
    memberFilter.value = '';
    websiteFilter.value = '';
  } else if (val === 'all') {
    memberFilter.value = '';
    websiteFilter.value = '';
  } else if (val === 'member') {
    websiteFilter.value = '';
    if (!memberFilter.value && allTeamMembers.value.length > 0) {
      memberFilter.value = allTeamMembers.value[0].id;
    }
  } else if (val === 'single') {
    memberFilter.value = '';
    if (!websiteFilter.value && data.websites.length > 0) {
      const assignedIds = data.getUserAssignedWebsiteIds(auth.user?.id ?? '');
      if (assignedIds.length > 0) {
        websiteFilter.value = assignedIds[0];
      } else {
        websiteFilter.value = data.websites[0].id;
      }
    }
  }
};

const scopeLabel = computed(() => {
  if (scopeFilter.value === 'my') {
    const name = auth.profile?.fullName || auth.profile?.email?.split('@')[0] || '';
    return name ? `${t('performance.myWebsites')} · ${name}` : t('performance.myWebsites');
  }
  if (scopeFilter.value === 'all') return t('performance.allWebsites');
  if (scopeFilter.value === 'member') {
    const member = selectedMemberObj.value;
    return member ? `${t('performance.teamMember')}: ${member.fullName}` : t('performance.teamMember');
  }
  if (scopeFilter.value === 'single') {
    const w = websiteObj(websiteFilter.value);
    return w ? w.name || w.domain : t('performance.singleWebsite');
  }
  return '';
});

const selectWebsite = (id: string) => { websiteFilter.value = id; websiteDropdownOpen.value = false; };
const selectMember = (id: string) => { memberFilter.value = id; memberDropdownOpen.value = false; };
const selectPlatform = (val: string) => { platformFilter.value = val; platformDropdownOpen.value = false; };
const selectConn = (val: 'all' | 'connected' | 'not') => { connFilter.value = val; connDropdownOpen.value = false; };

const platformLabel = computed(() => {
  if (platformFilter.value === 'wordpress') return t('performance.wordpress');
  if (platformFilter.value === 'framework') return t('performance.framework');
  if (platformFilter.value === 'unknown') return t('performance.unknown');
  return t('common.all');
});

const connLabel = computed(() => {
  if (connFilter.value === 'connected') return t('performance.connectedOnly');
  if (connFilter.value === 'not') return t('performance.notConnected');
  return t('common.all');
});

// Date ranges setup
const rangeOptions = [
  { value: 7, label: 'Last 7 Days' },
  { value: 28, label: 'Last 28 Days' },
  { value: 90, label: 'Last 90 Days' },
  { value: 'last_16_months', label: 'Last 16 Months' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' }
];

const translateRangeOption = (opt: { value: any, label: string }) => {
  if (opt.value === 'today') return t('performance.today');
  if (opt.value === 'yesterday') return t('performance.yesterday');
  if (opt.value === 7) return t('performance.last7Days');
  if (opt.value === 28) return t('performance.last28Days');
  if (opt.value === 90) return t('performance.last90Days');
  if (opt.value === 'last_16_months') return t('performance.last16Months');
  if (opt.value === 'this_month') return t('performance.thisMonth');
  if (opt.value === 'last_month') return t('performance.lastMonth');
  if (opt.value === 'custom') return t('performance.customRange');
  return opt.label;
};

const rangeLabel = computed(() => {
  if (perf.rangeDays === 'today') return t('performance.today');
  if (perf.rangeDays === 'yesterday') return t('performance.yesterday');
  if (perf.rangeDays === 7) return t('performance.last7Days');
  if (perf.rangeDays === 28) return t('performance.last28Days');
  if (perf.rangeDays === 90) return t('performance.last90Days');
  if (perf.rangeDays === 'last_16_months') return t('performance.last16Months');
  if (perf.rangeDays === 'this_month') return t('performance.thisMonth');
  if (perf.rangeDays === 'last_month') return t('performance.lastMonth');
  if (perf.rangeDays === 'custom') return t('performance.customRange');
  return t('performance.last28Days');
});

const selectRange = (val: any) => {
  rangeDropdownOpen.value = false;
  void perf.setRange(val);
};

const onCustomDateChange = () => {
  if (perf.customStartDate && perf.customEndDate) {
    void perf.setRange('custom');
  }
};

const compareLabel = computed(() => {
  if (perf.compareMode === 'previous') return t('common.previous');
  if (perf.compareMode === 'last_month') return t('performance.lastMonth');
  return t('common.all');
});

const translateMetricLabel = (key: string) => {
  if (key === 'clicks') return 'Total ' + t('performance.clicks');
  if (key === 'impressions') return 'Total ' + t('performance.impressions');
  if (key === 'ctr') return 'Average ' + t('performance.ctr');
  if (key === 'position') return 'Average ' + t('performance.avgPosition');
  return '';
};

const selectCompare = (val: 'none' | 'previous' | 'last_month') => {
  void perf.setCompareMode(val);
  compareDropdownOpen.value = false;
};

// Website Scopes filtering
const scopedWebsites = computed(() => {
  const currentUserId = auth.user?.id ?? '';
  if (scopeFilter.value === 'my') {
    const assignedIds = new Set(data.getUserAssignedWebsiteIds(currentUserId));
    return data.websites.filter((w) => assignedIds.has(w.id));
  }
  if (scopeFilter.value === 'member') {
    const assignedIds = new Set(data.getUserAssignedWebsiteIds(memberFilter.value));
    return data.websites.filter((w) => assignedIds.has(w.id));
  }
  if (scopeFilter.value === 'single') {
    return data.websites.filter((w) => w.id === websiteFilter.value);
  }
  return data.websites;
});

const websiteHasData = (websiteId: string) => {
  return perf.daily.some(r => r.website_id === websiteId);
};

const visibleWebsites = computed(() =>
  scopedWebsites.value.filter((w) => {
    if (platformFilter.value && w.platformType !== platformFilter.value) return false;
    const connected = perf.connectionByWebsite.has(w.id);
    if (connFilter.value === 'connected' && !connected) return false;
    if (connFilter.value === 'not' && connected) return false;
    if (websiteTypeFilter.value && w.websiteType !== websiteTypeFilter.value) return false;
    if (hasDataFilter.value === 'has_data' && !websiteHasData(w.id)) return false;
    if (hasDataFilter.value === 'no_data' && websiteHasData(w.id)) return false;
    return true;
  })
);

const lastNonSingleScope = ref<'my' | 'all' | 'member'>('my');

watch(scopeFilter, (val) => {
  if (val !== 'single') {
    lastNonSingleScope.value = val;
  }
});

const connectionsWebsites = computed(() => {
  const currentUserId = auth.user?.id ?? '';
  let scope = scopeFilter.value;
  if (scope === 'single') {
    if (memberFilter.value) {
      scope = 'member';
    } else {
      scope = lastNonSingleScope.value;
    }
  }

  if (scope === 'my') {
    const assignedIds = new Set(data.getUserAssignedWebsiteIds(currentUserId));
    return data.websites.filter((w) => assignedIds.has(w.id));
  }
  if (scope === 'member') {
    const assignedIds = new Set(data.getUserAssignedWebsiteIds(memberFilter.value));
    return data.websites.filter((w) => assignedIds.has(w.id));
  }
  return data.websites;
});

const visibleConnectionWebsites = computed(() =>
  connectionsWebsites.value.filter((w) => {
    if (platformFilter.value && w.platformType !== platformFilter.value) return false;
    const connected = perf.connectionByWebsite.has(w.id);
    if (connFilter.value === 'connected' && !connected) return false;
    if (connFilter.value === 'not' && connected) return false;
    if (websiteTypeFilter.value && w.websiteType !== websiteTypeFilter.value) return false;
    if (hasDataFilter.value === 'has_data' && !websiteHasData(w.id)) return false;
    if (hasDataFilter.value === 'no_data' && websiteHasData(w.id)) return false;
    return true;
  })
);

const onSelectWebsiteFromConnectionRow = (w: Website) => {
  scopeFilter.value = 'single';
  websiteFilter.value = w.id;
};

const activeWebsiteIds = computed(() => {
  const ids = new Set(visibleWebsites.value.map((w) => w.id));
  if (websiteFilter.value) return new Set([websiteFilter.value].filter((id) => ids.has(id)));
  return ids;
});

watch(visibleWebsites, (list) => {
  if (websiteFilter.value && !list.some((w) => w.id === websiteFilter.value)) websiteFilter.value = '';
});

const filteredDaily = computed(() => perf.daily.filter((r) => activeWebsiteIds.value.has(r.website_id)));

// Totals computations
const totals = computed(() => sumTotals(filteredDaily.value));
const connectedCount = computed(() => visibleWebsites.value.filter((w) => perf.connectionByWebsite.has(w.id)).length);

// Sync health calculation
const syncHealth = computed(() => {
  if (visibleWebsites.value.length === 0) return 'No Websites';
  const errorSites = needsAttention.value.filter(n => n.reason === 'Sync failed');
  if (errorSites.length > 0) return 'Warning';
  const connected = visibleWebsites.value.filter(w => perf.connectionByWebsite.has(w.id)).length;
  if (connected === 0) return 'Not Connected';
  return 'Healthy';
});

// Historical dates coverage check
const storedDates = computed(() => new Set(filteredDaily.value.map((r) => r.date)));
const storedDayCount = computed(() => storedDates.value.size);
const oldestStoredDate = computed(() => {
  let m = '';
  for (const d of storedDates.value) if (!m || d < m) m = d;
  return m;
});
const rangeShortfall = computed(() => {
  if (typeof perf.rangeDays === 'number' && storedDayCount.value > 0) {
    return storedDayCount.value < (perf.rangeDays - 5);
  }
  return false;
});

type Metric = 'clicks' | 'impressions' | 'ctr' | 'position';
const metricList: { key: Metric; label: string; color: string; format: (t: GscTotals) => string }[] = [
  { key: 'clicks', label: 'Total Clicks', color: 'var(--primary)', format: (t) => fmtNum(t.clicks) },
  { key: 'impressions', label: 'Total Impressions', color: '#8b5cf6', format: (t) => fmtNum(t.impressions) },
  { key: 'ctr', label: 'Average CTR', color: '#22c55e', format: (t) => fmtPct(t.ctr) },
  { key: 'position', label: 'Average Position', color: '#f59e0b', format: (t) => fmtPos(t.position) }
];
const activeMetric = ref<Metric>('clicks');
const activeMetricMeta = computed(() => metricList.find((m) => m.key === activeMetric.value)!);
const showChartAverage = ref(true);

// Comparison calculation
const compareActive = computed(() => perf.compareMode !== 'none' && perf.rangeDays !== 'last_16_months');
const compareDailyFiltered = computed(() => perf.compareDaily.filter((r) => activeWebsiteIds.value.has(r.website_id)));
const compareTotals = computed(() => sumTotals(compareDailyFiltered.value));
const hasCompareData = computed(() => compareDailyFiltered.value.length > 0);
const compareClicksByWebsite = computed(() => {
  const m = new Map<string, number>();
  for (const r of perf.compareDaily) m.set(r.website_id, (m.get(r.website_id) ?? 0) + r.clicks);
  return m;
});

interface Delta { prevLabel: string; deltaLabel: string; pctLabel: string; good: boolean }
const makeDelta = (cur: number, prev: number, metric: Metric): Delta => {
  if (metric === 'position') {
    const improved = cur < prev;
    const diff = Math.abs(prev - cur);
    return {
      prevLabel: fmtPos(prev),
      deltaLabel: `${diff.toFixed(1)} pos`,
      pctLabel: improved ? 'improved' : 'worse',
      good: improved
    };
  }
  const diff = cur - prev;
  const pct = prev ? (diff / prev) * 100 : 0;
  const deltaLabel = metric === 'ctr'
    ? `${Math.abs(diff * 100).toFixed(1)}%`
    : `${fmtNum(Math.abs(diff))}`;
  const pctLabel = prev ? `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%` : (cur > 0 ? 'new' : '0%');
  return {
    prevLabel: metric === 'ctr' ? fmtPct(prev) : fmtNum(prev),
    deltaLabel,
    pctLabel,
    good: diff >= 0
  };
};

const cardDelta = (metric: Metric): Delta | null => {
  if (!compareActive.value || !hasCompareData.value) return null;
  const prev = compareTotals.value[metric];
  if (metric === 'position' && !prev) return null;
  return makeDelta(totals.value[metric], prev, metric);
};

const showChangeCol = computed(() => compareActive.value && activeTab.value === 'websites');
const colCount = computed(() => 6 + (showChangeCol.value ? 1 : 0));

// ── Chart Trend Calculation ───────────────────────────────────────────
const trend = computed(() => aggregateByDate(filteredDaily.value));
const hasTrend = computed(() => trend.value.length > 1);
const shortDate = (d: string) => {
  if (perf.rangeDays === 'last_16_months' || (perf.rangeDays === 'custom' && getRangeDurationDays(perf.startDateStr, perf.endDateStr) > 300)) {
    return d.slice(2);
  }
  return d.slice(5);
};

const metricValue = (p: { clicks: number; impressions: number; ctr: number; position: number }): number => {
  if (activeMetric.value === 'ctr') return Math.round(p.ctr * 1000) / 10;
  if (activeMetric.value === 'position') return Math.round(p.position * 10) / 10;
  return p[activeMetric.value];
};

const chartSeries = computed(() => {
  return trend.value.map((p) => ({
    label: shortDate(p.date),
    value: metricValue(p),
    rawDate: p.date
  }));
});

const compareChartSeries = computed(() => {
  if (!compareActive.value || !hasCompareData.value) return [];
  const compAgg = aggregateByDate(compareDailyFiltered.value);
  return compAgg.map((p, idx) => {
    const primaryPt = trend.value[idx];
    const label = primaryPt ? shortDate(primaryPt.date) : shortDate(p.date);
    return {
      label,
      value: metricValue(p),
      rawDate: p.date
    };
  });
});


const latestSyncTime = computed(() => {
  const ids = activeWebsiteIds.value;
  let maxTime = 0;
  let maxStr = '';
  for (const c of perf.connections) {
    if (ids.has(c.website_id) && c.last_synced_at) {
      const t = new Date(c.last_synced_at).getTime();
      if (t > maxTime) { maxTime = t; maxStr = c.last_synced_at; }
    }
  }
  return maxStr ? fmtDateTime(maxStr) : null;
});

// ── Tabbed Tables (Lazy Loaded) ────────────────────────────────────────
interface Row { key: string; label: string; clicks: number; impressions: number; ctr: number; position: number; id?: string; extra?: string; change?: number }

const latestTerms = (rows: GscTermStat[]): GscTermStat[] => {
  const latestPerSite = new Map<string, string>();
  for (const r of rows) {
    if (!r.website_id || !activeWebsiteIds.value.has(r.website_id)) continue;
    const cur = latestPerSite.get(r.website_id);
    if (!cur || r.date > cur) latestPerSite.set(r.website_id, r.date);
  }
  return rows.filter((r) => !!r.website_id && latestPerSite.get(r.website_id) === r.date);
};

const aggTerms = (rows: GscTermStat[], key: 'query' | 'page_url'): Row[] => {
  const m = new Map<string, { clicks: number; impr: number; wpos: number }>();
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    const c = m.get(k) ?? { clicks: 0, impr: 0, wpos: 0 };
    c.clicks += r.clicks; c.impr += r.impressions; c.wpos += r.position * r.impressions;
    m.set(k, c);
  }
  return [...m.entries()].map(([label, v]) => ({ key: label, label, clicks: v.clicks, impressions: v.impr, ctr: v.impr ? v.clicks / v.impr : 0, position: v.impr ? v.wpos / v.impr : 0 }));
};

const queriesRows = computed(() => {
  if (activeTab.value !== 'queries') return [];
  return aggTerms(latestTerms(perf.queries), 'query');
});

const pagesRows = computed(() => {
  if (activeTab.value !== 'pages') return [];
  return aggTerms(latestTerms(perf.pages), 'page_url');
});

const datesRows = computed<Row[]>(() => {
  if (activeTab.value !== 'dates') return [];
  return aggregateByDate(filteredDaily.value).map((p) => ({ key: p.date, label: p.date, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position }));
});

const aggByWebsite = (rows: { website_id: string; clicks: number; impressions: number; position: number }[]) => {
  const m = new Map<string, { clicks: number; impr: number; wpos: number }>();
  for (const r of rows) {
    const c = m.get(r.website_id) ?? { clicks: 0, impr: 0, wpos: 0 };
    c.clicks += r.clicks; c.impr += r.impressions; c.wpos += r.position * r.impressions;
    m.set(r.website_id, c);
  }
  return m;
};

const websitesRows = computed<Row[]>(() => {
  if (activeTab.value !== 'websites') return [];
  const m = aggByWebsite(filteredDaily.value);
  return [...m.entries()].map(([id, v]) => ({
    key: id, id, label: websiteName(id), clicks: v.clicks, impressions: v.impr,
    ctr: v.impr ? v.clicks / v.impr : 0, position: v.impr ? v.wpos / v.impr : 0,
    extra: fmtDateTime(perf.connectionByWebsite.get(id)?.last_synced_at),
    change: compareActive.value ? v.clicks - (compareClicksByWebsite.value.get(id) ?? 0) : undefined
  }));
});

const membersRows = computed<Row[]>(() => {
  if (activeTab.value !== 'members') return [];
  const rows = filteredDaily.value;
  const memberOf = (wid: string) => data.websites.find((w) => w.id === wid)?.createdBy ?? null;
  const m = new Map<string, { clicks: number; impr: number; wpos: number; sites: Set<string> }>();
  for (const r of rows) {
    const mid = memberOf(r.website_id);
    if (!mid) continue;
    const c = m.get(mid) ?? { clicks: 0, impr: 0, wpos: 0, sites: new Set<string>() };
    c.clicks += r.clicks; c.impr += r.impressions; c.wpos += r.position * r.impressions; c.sites.add(r.website_id);
    m.set(mid, c);
  }
  return [...m.entries()].map(([mid, v]) => {
    const profile = memberProfiles.value.find(p => p.user_id === mid);
    const label = profile?.display_name || profile?.full_name || data.memberById(mid)?.fullName || data.memberById(mid)?.email || 'Unknown User';
    return {
      key: mid, id: mid, label,
      clicks: v.clicks, impressions: v.impr, ctr: v.impr ? v.clicks / v.impr : 0, position: v.impr ? v.wpos / v.impr : 0,
      extra: String(v.sites.size)
    };
  });
});

// Lazy loaded Country and Device simulated breakdowns
const countriesRows = computed<Row[]>(() => {
  if (activeTab.value !== 'countries') return [];
  const countriesList = [
    { key: 'US', label: 'United States', clickPct: 0.45, imprPct: 0.48, posOffset: 0 },
    { key: 'KH', label: 'Cambodia', clickPct: 0.25, imprPct: 0.22, posOffset: 2.5 },
    { key: 'TH', label: 'Thailand', clickPct: 0.15, imprPct: 0.16, posOffset: 4.1 },
    { key: 'VN', label: 'Vietnam', clickPct: 0.10, imprPct: 0.09, posOffset: 6.2 },
    { key: 'OTH', label: 'Other Countries', clickPct: 0.05, imprPct: 0.05, posOffset: 8.5 }
  ];
  const curTotals = totals.value;
  return countriesList.map(c => {
    const clicks = Math.round(curTotals.clicks * c.clickPct);
    const impressions = Math.round(curTotals.impressions * c.imprPct);
    return {
      key: c.key,
      label: c.label,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: curTotals.position ? Math.max(1.0, Math.round((curTotals.position + c.posOffset) * 10) / 10) : 0
    };
  });
});

const devicesRows = computed<Row[]>(() => {
  if (activeTab.value !== 'devices') return [];
  const devicesList = [
    { key: 'desktop', label: 'Desktop', clickPct: 0.55, imprPct: 0.52, posOffset: -1.2 },
    { key: 'mobile', label: 'Mobile', clickPct: 0.40, imprPct: 0.43, posOffset: 1.5 },
    { key: 'tablet', label: 'Tablet', clickPct: 0.05, imprPct: 0.05, posOffset: 5.8 }
  ];
  const curTotals = totals.value;
  return devicesList.map(d => {
    const clicks = Math.round(curTotals.clicks * d.clickPct);
    const impressions = Math.round(curTotals.impressions * d.imprPct);
    return {
      key: d.key,
      label: d.label,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: curTotals.position ? Math.max(1.0, Math.round((curTotals.position + d.posOffset) * 10) / 10) : 0
    };
  });
});

type Tab = 'queries' | 'pages' | 'countries' | 'devices' | 'dates' | 'websites' | 'members';
const tabList: { key: Tab; label: string }[] = [
  { key: 'queries', label: 'Queries' },
  { key: 'pages', label: 'Pages' },
  { key: 'countries', label: 'Countries' },
  { key: 'devices', label: 'Devices' },
  { key: 'dates', label: 'Dates' },
  { key: 'websites', label: 'Websites' },
  { key: 'members', label: 'Members' }
];

const tabMeta: Record<Tab, { header: string; noun: string; extra?: string; clickable?: boolean }> = {
  queries: { header: 'Query', noun: 'queries' },
  pages: { header: 'Page URL', noun: 'pages' },
  countries: { header: 'Country', noun: 'countries' },
  devices: { header: 'Device', noun: 'devices' },
  dates: { header: 'Date', noun: 'dates' },
  websites: { header: 'Website', noun: 'websites', extra: 'Last sync', clickable: true },
  members: { header: 'Member', noun: 'members', extra: 'Websites', clickable: true }
};

const activeTabMeta = computed(() => tabMeta[activeTab.value]);
const tabRows = computed<Row[]>(() => {
  switch (activeTab.value) {
    case 'queries': return queriesRows.value;
    case 'pages': return pagesRows.value;
    case 'countries': return countriesRows.value;
    case 'devices': return devicesRows.value;
    case 'dates': return datesRows.value;
    case 'websites': return websitesRows.value;
    case 'members': return membersRows.value;
    default: return [];
  }
});

// Sorting and paging
type SortKey = 'label' | 'clicks' | 'impressions' | 'ctr' | 'position';
const sortKey = ref<SortKey>('clicks');
const sortDir = ref<'asc' | 'desc'>('desc');
const tableSearch = ref('');
const page = ref(1);
const perPage = 10;

const setSort = (k: SortKey) => {
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortKey.value = k; sortDir.value = k === 'position' || k === 'label' ? 'asc' : 'desc'; }
  page.value = 1;
};
const sortArrow = (k: SortKey) => (sortKey.value === k ? (sortDir.value === 'asc' ? '▲' : '▼') : '');

const sortedRows = computed<Row[]>(() => {
  const q = tableSearch.value.trim().toLowerCase();
  let rows = q ? tabRows.value.filter((r) => r.label.toLowerCase().includes(q)) : tabRows.value;
  const k = sortKey.value;
  rows = [...rows].sort((a, b) => {
    const cmp = k === 'label' ? a.label.localeCompare(b.label) : (a[k] as number) - (b[k] as number);
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
  return rows;
});
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / perPage)));
const pagedRows = computed(() => sortedRows.value.slice((page.value - 1) * perPage, page.value * perPage));
watch([activeTab, tableSearch, activeWebsiteIds], () => { page.value = 1; });

const onRowClick = (r: Row) => {
  if (activeTab.value === 'websites' && r.id) openDetail(r.id);
  else if (activeTab.value === 'members' && r.id) { memberFilter.value = r.id; activeTab.value = 'websites'; }
};

// ── Insights Math ──────────────────────────────────────────────────────
const topWebsite = computed(() => [...websitesRows.value].sort((a, b) => b.clicks - a.clicks)[0] ?? null);
const halfSplit = (vals: { sortKey: string; clicks: number }[]) => {
  const keys = [...new Set(vals.map((v) => v.sortKey))].sort();
  if (keys.length < 2) return null;
  const mid = keys[Math.floor(keys.length / 2)];
  let first = 0, second = 0;
  for (const v of vals) { if (v.sortKey < mid) first += v.clicks; else second += v.clicks; }
  return second - first;
};
const websiteDeltas = computed(() => {
  const byWebsite = new Map<string, { sortKey: string; clicks: number }[]>();
  for (const r of filteredDaily.value) {
    const a = byWebsite.get(r.website_id) ?? [];
    a.push({ sortKey: r.date, clicks: r.clicks });
    byWebsite.set(r.website_id, a);
  }
  const out: { id: string; name: string; delta: number }[] = [];
  for (const [id, rows] of byWebsite) {
    const delta = halfSplit(rows);
    if (delta !== null && delta !== 0) out.push({ id, name: websiteName(id), delta });
  }
  return out;
});
const biggestGrowth = computed(() => websiteDeltas.value.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5));
const biggestDrop = computed(() => websiteDeltas.value.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5));
const needsAttention = computed(() => {
  const out: { id: string; name: string; reason: string }[] = [];
  for (const w of visibleWebsites.value) {
    const c = perf.connectionByWebsite.get(w.id);
    if (!c) out.push({ id: w.id, name: w.name || w.domain, reason: 'Not connected' });
    else if (c.sync_status === 'error') out.push({ id: w.id, name: w.name || w.domain, reason: 'Sync failed' });
  }
  return out;
});

// ── Detail Drawer Modal ────────────────────────────────────────────────
const detailId = ref<string | null>(null);
const detailTab = ref<'overview' | 'performance' | 'indexing' | 'queries' | 'pages' | 'devices' | 'countries' | 'logs'>('overview');
const detailLogsLoading = ref(false);
const detailSyncLogs = ref<any[]>([]);

const detailTabsList = [
  { key: 'overview', label: 'Overview' },
  { key: 'performance', label: 'Performance' },
  { key: 'indexing', label: 'Page Indexing' },
  { key: 'queries', label: 'Queries' },
  { key: 'pages', label: 'Pages' },
  { key: 'devices', label: 'Devices' },
  { key: 'countries', label: 'Countries' },
  { key: 'logs', label: 'Sync Logs' }
] as const;

const detailWebsite = computed(() => (detailId.value ? data.websites.find((w) => w.id === detailId.value) : null));
const detailDaily = computed(() => perf.daily.filter((r) => r.website_id === detailId.value));
const detailTotals = computed(() => sumTotals(detailDaily.value));
const detailCompareTotals = computed(() => sumTotals(perf.compareDaily.filter((r) => r.website_id === detailId.value)));
const detailDelta = (metric: Metric): Delta | null => {
  if (!compareActive.value) return null;
  const prev = detailCompareTotals.value[metric];
  if (!prev) return null;
  return makeDelta(detailTotals.value[metric], prev, metric);
};
const detailSeries = computed(() => {
  return aggregateByDate(detailDaily.value).map((p) => ({
    label: shortDate(p.date),
    value: p.clicks,
    rawDate: p.date
  }));
});

const groupClicks = (rows: GscTermStat[], key: 'query' | 'page_url') =>
  aggTerms(rows, key).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
const detailQueries = computed(() => groupClicks(latestTerms(perf.queries).filter((r) => r.website_id === detailId.value), 'query'));
const detailPages = computed(() => groupClicks(latestTerms(perf.pages).filter((r) => r.website_id === detailId.value), 'page_url'));

const detailDevices = computed(() => {
  const mockDevs = [
    { key: 'desktop', label: 'Desktop', clickPct: 0.58 },
    { key: 'mobile', label: 'Mobile', clickPct: 0.38 },
    { key: 'tablet', label: 'Tablet', clickPct: 0.04 }
  ];
  return mockDevs.map(d => ({
    key: d.key,
    label: d.label,
    clicks: Math.round(detailTotals.value.clicks * d.clickPct)
  }));
});

const detailCountries = computed(() => {
  const mockCtrs = [
    { key: 'US', label: 'United States', clickPct: 0.50 },
    { key: 'KH', label: 'Cambodia', clickPct: 0.22 },
    { key: 'TH', label: 'Thailand', clickPct: 0.18 },
    { key: 'VN', label: 'Vietnam', clickPct: 0.10 }
  ];
  return mockCtrs.map(c => ({
    key: c.key,
    label: c.label,
    clicks: Math.round(detailTotals.value.clicks * c.clickPct)
  }));
});

const detailIndexingSummary = ref({ known: 0, indexed: 0, notIndexed: 0 });
const fetchDetailIndexingSummary = async (websiteId: string) => {
  if (!supabaseConfigured) return;
  try {
    const { data: res } = await supabase.rpc('get_page_indexing_summary');
    const row = res?.find((r: any) => r.website_id === websiteId);
    if (row) {
      detailIndexingSummary.value = {
        known: Number(row.known_pages || 0),
        indexed: Number(row.indexed_pages || 0),
        notIndexed: Number(row.not_indexed_pages || 0)
      };
    }
  } catch (e) {
    console.error(e);
  }
};

const fetchDetailSyncLogs = async () => {
  if (!detailId.value || !supabaseConfigured) return;
  detailLogsLoading.value = true;
  try {
    const { data: logs } = await supabase
      .from('website_gsc_sync_logs')
      .select('*')
      .eq('website_id', detailId.value)
      .order('sync_started_at', { ascending: false })
      .limit(10);
    detailSyncLogs.value = logs || [];
  } catch (e) {
    console.error(e);
  } finally {
    detailLogsLoading.value = false;
  }
};

const openDetail = (id: string) => {
  detailId.value = id;
  detailTab.value = 'overview';
  void fetchDetailIndexingSummary(id);
  void fetchDetailSyncLogs();
};

const closeDetail = () => {
  detailId.value = null;
  detailSyncLogs.value = [];
};

watch(detailId, (id) => {
  if (id) {
    void fetchDetailIndexingSummary(id);
    void fetchDetailSyncLogs();
  }
});

// ── Connections Management ─────────────────────────────────────────────
const propInputs = reactive<Record<string, string>>({});
const bareDomain = (d: string) => (d || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
const cleanProperty = (raw: string): string => {
  const v = (raw || '').trim();
  if (/^sc-domain:/i.test(v)) return `sc-domain:${bareDomain(v.replace(/^sc-domain:/i, ''))}`;
  return v;
};
const suggestProperty = (domain: string): string => {
  const d = (domain || '').trim();
  if (/^https?:\/\//i.test(d)) {
    const protocol = d.toLowerCase().startsWith('http://') ? 'http://' : 'https://';
    return `${protocol}${bareDomain(d)}/`;
  }
  return `sc-domain:${bareDomain(d)}`;
};

watch(
  [() => perf.connections, () => data.websites],
  () => {
    for (const w of data.websites) {
      const conn = perf.connectionByWebsite.get(w.id);
      if (conn) propInputs[w.id] = conn.gsc_property_url;
      else if (!propInputs[w.id]) propInputs[w.id] = suggestProperty(w.domain);
    }
  },
  { deep: true, immediate: true }
);

const getWebsiteStatus = (websiteId: string) => {
  const conn = perf.connectionByWebsite.get(websiteId);
  if (!conn || !conn.gsc_property_url) return { label: 'Not Mapped', class: 'bg-soft text-text-muted', error: null as string | null };
  if (conn.sync_status === 'syncing') return { label: 'Syncing…', class: 'bg-status-submitted-bg/15 text-status-submitted-fg', error: null };
  if (conn.sync_status === 'error') {
    return { label: 'Error', class: 'bg-status-needs-fix-bg/15 text-status-needs-fix-fg', error: conn.sync_error };
  }
  if (conn.sync_status === 'ok') return { label: 'Synced', class: 'bg-status-approved-bg/15 text-status-approved-fg', error: null };
  return { label: 'Idle', class: 'bg-soft text-text-muted', error: null };
};

const onSaveConnection = async (websiteId: string) => {
  const cleaned = cleanProperty(propInputs[websiteId] ?? '');
  propInputs[websiteId] = cleaned;
  if (!cleaned.startsWith('sc-domain:') && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    connectMsg.value = 'Invalid Search Console property format.';
    connectOk.value = false;
    return;
  }
  const ok = await perf.saveConnection(websiteId, cleaned);
  if (!ok) {
    connectMsg.value = perf.error || 'Failed to save connection.';
    connectOk.value = false;
    return;
  }
  connectMsg.value = 'Connection saved. Syncing data…';
  connectOk.value = true;
  const syncOk = await perf.syncWebsite(websiteId);
  if (syncOk) {
    connectMsg.value = 'Connection saved and data synced.';
    connectOk.value = true;
  } else {
    connectMsg.value = `Connection saved, but sync failed: ${perf.error || 'unknown error'}`;
    connectOk.value = false;
  }
};

const onRemoveConnection = async (websiteId: string) => {
  if (!confirm('Remove this Search Console connection? Stored statistics are retained.')) return;
  await perf.removeConnection(websiteId);
};

// ── Connect / Sync ─────────────────────────────────────────────────────
const connectMsg = ref('');
const connectOk = ref(false);

const onConnect = async () => {
  const url = await perf.connectGoogle();
  if (url) window.location.href = url;
  else {
    connectMsg.value = perf.error || 'Could not start Google auth connection.';
    connectOk.value = false;
  }
};

const onDisconnectGoogle = async () => {
  if (!confirm('Are you sure you want to disconnect your Google account from KiuQ?')) return;
  const ok = await perf.disconnectGoogle();
  if (ok) {
    connectMsg.value = 'Google account disconnected successfully.';
    connectOk.value = true;
  } else {
    connectMsg.value = perf.error || 'Failed to disconnect Google account.';
    connectOk.value = false;
  }
};

const adminConnectionsOverview = computed(() => {
  return memberProfiles.value.map(profile => {
    const conn = perf.teamConnections.find(c => c.user_id === profile.user_id);
    return {
      userId: profile.user_id,
      displayName: profile.display_name,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      googleEmail: conn?.google_email || null,
      status: conn ? conn.status : 'not_connected',
      connectedAt: conn?.connected_at || null,
      lastError: conn?.last_error || null,
      assignedWebsitesCount: profile.assigned_website_count || 0
    };
  });
});

const onSyncAll = async () => {
  const ok = await perf.syncAll();
  connectMsg.value = perf.lastSyncMessage || (ok ? 'Sync completed.' : 'Sync failed.');
  connectOk.value = ok;
};

const onSyncMyWebsites = async () => {
  const userId = auth.user?.id ?? '';
  if (!userId) return;
  const assignedIds = data.getUserAssignedWebsiteIds(userId);
  const connectedIds = assignedIds.filter((id) => perf.connectionByWebsite.has(id));
  if (connectedIds.length === 0) {
    connectMsg.value = 'No mapped Search Console connections found for your websites.';
    connectOk.value = false;
    return;
  }
  perf.syncAllRunning = true;
  let okCount = 0;
  let errCount = 0;
  try {
    for (const wid of connectedIds) {
      const ok = await perf.syncWebsite(wid);
      if (ok) okCount++;
      else errCount++;
    }
  } finally {
    perf.syncAllRunning = false;
  }
  if (errCount === 0) {
    connectMsg.value = `Sync complete for ${okCount} website(s).`;
    connectOk.value = true;
  } else {
    connectMsg.value = `Synced ${okCount} website(s); ${errCount} had errors.`;
    connectOk.value = okCount > 0;
  }
};

// ── Formatters ─────────────────────────────────────────────────────────
const fmtNum = (n: number) => (n >= 1000 ? n.toLocaleString() : String(Math.round(n)));
const fmtPct = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
const fmtPos = (p: number) => (p ? p.toFixed(1) : '—');
const fmtDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : 'Never');
const shortUrl = (u: string) => { try { const url = new URL(u); return url.pathname === '/' ? url.hostname : url.pathname; } catch { return u; } };
const noDataMsg = 'No Google Search Console statistics found for this filter/range.';

onMounted(() => {
  void data.fetchWebsites();
  void data.fetchMembers();
  void fetchMemberProfiles();
  if (isManagement.value) {
    void perf.fetchTeamConnections();
  }
  loadData();

  const gsc = route.query.gsc;
  if (gsc === 'connected') { connectMsg.value = 'Google Search Console connected successfully.'; connectOk.value = true; }
  else if (gsc === 'error_norefresh') { connectMsg.value = 'Reconnection failed: check Google account KiuQ permissions.'; connectOk.value = false; }
  else if (gsc === 'not_configured') { connectMsg.value = 'Google API client credentials missing.'; connectOk.value = false; }
});
</script>

<style scoped>
.perf-center {
  font-family: 'Raleway', sans-serif;
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

.perf-range-list {
  width: 15.5rem;
  max-height: none;
  padding: 0.35rem;
}

.perf-range-item {
  align-items: center;
  justify-content: flex-start;
  gap: 0.65rem;
  min-height: 2.1rem;
  padding: 0.45rem 0.55rem;
  line-height: 1.15;
}

.perf-range-item > svg,
.perf-range-item .perf-range-check {
  display: none !important;
}

.perf-range-item:hover {
  background: color-mix(in srgb, var(--soft-bg) 82%, var(--card-bg));
}

.perf-range-item.active {
  background: color-mix(in srgb, var(--primary) 11%, var(--card-bg)) !important;
}

.perf-range-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
}

.perf-range-label {
  font-size: 0.72rem;
  font-weight: 650;
  color: inherit;
}

.perf-range-note {
  color: var(--text-muted);
  font-size: 0.6rem;
  font-weight: 500;
  line-height: 1.15;
}

.perf-range-item.active .perf-range-note {
  color: color-mix(in srgb, var(--primary) 66%, var(--text-muted));
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
  font-size: 0.5rem;
  font-weight: 700;
  color: var(--text-muted);
}

/* Metric Cards */
.perf-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 0.8rem 1rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Raleway', sans-serif;
}

.perf-metric:hover {
  border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
  transform: translateY(-1px);
}

.perf-metric.active {
  background: color-mix(in srgb, var(--primary) 7%, var(--card-bg));
}

.perf-metric-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  display: inline-block;
}

.perf-metric-label {
  font-size: 0.62rem;
  color: var(--text-muted);
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Tabs */
.perf-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
}

.perf-tab {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 120ms ease;
  font-family: 'Raleway', sans-serif;
}

.perf-tab:hover {
  color: var(--text-main);
  background: var(--soft-bg);
}

.perf-tab.active {
  background: var(--primary, #15D6C2);
  color: var(--on-primary) !important;
  font-weight: 750;
}

.perf-tabsearch {
  height: 2rem;
  font-size: 0.68rem;
  max-width: 14rem;
  margin-left: auto;
  border-radius: 0.4rem;
}

/* Tables */
.perf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}

.perf-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.perf-table th {
  text-align: left;
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.perf-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.perf-row-click:hover td {
  background: color-mix(in srgb, var(--soft-bg) 78%, var(--card-bg));
}

.perf-sort {
  color: var(--primary, #15D6C2);
  font-size: 0.55rem;
}

.perf-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Insights */
.perf-insight {
  border: 1px solid var(--border);
  border-radius: 0.8rem;
  padding: 0.75rem 0.9rem;
  background: var(--card-bg);
}

.perf-insight-l {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  font-weight: 600;
}

.perf-insight-v {
  margin-top: 0.2rem;
}

.perf-insight-s {
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* KV block */
.perf-kv-l {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  font-weight: 600;
}

.perf-kv-v {
  margin-top: 0.1rem;
}

@media (max-width: 640px) {
  .perf-tabsearch {
    margin-left: 0;
    max-width: none;
    flex: 1 1 100%;
    margin-top: 0.4rem;
  }
  .perf-wsel-btn {
    max-width: none;
    width: 100%;
  }
  .perf-range-list {
    width: min(100%, 15.5rem);
  }
}

/* GSC Connection Table Row Select Styling */
.perf-gsc-row {
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 120ms ease;
}
.perf-gsc-row:hover {
  background-color: var(--soft-bg);
}
.perf-gsc-row.is-selected {
  border-left-color: var(--primary);
  background-color: rgba(21, 214, 194, 0.05); /* KiuQ primary-soft background */
}
.perf-gsc-row.is-selected:hover {
  background-color: rgba(21, 214, 194, 0.08);
}

.perf-layout-grid {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

:deep(.axis-text) {
  font-size: 0.6rem !important;
}
</style>
