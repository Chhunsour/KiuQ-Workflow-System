<template>
  <div>
    <PageHeader
      title="Performance"
      subtitle="Track website clicks, impressions, CTR, and search position from Google Search Console."
    >
      <template #actions>
        <button v-if="auth.isAdmin" class="btn-secondary" type="button" :disabled="perf.syncAllRunning" @click="onSyncAll">
          {{ perf.syncAllRunning ? 'Syncing…' : (is24hMode ? 'Sync 24h' : 'Sync data') }}
        </button>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="onConnect">
          {{ perf.connectionInfo.connected ? 'Reconnect' : 'Connect Search Console' }}
        </button>
      </template>
    </PageHeader>

    <!-- Status line -->
    <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
      <span>Last synced: <span class="font-medium text-text-main">{{ latestSyncTime || 'Never' }}</span></span>
      <span>Connected websites: <span class="font-medium text-text-main">{{ connectedCount }}/{{ visibleWebsites.length }}</span></span>
      <span v-if="perf.connectionInfo.connected" class="hidden sm:inline">Google: <span class="font-medium text-text-main">{{ perf.connectionInfo.google_email || 'admin' }}</span></span>
    </div>

    <!-- Connect result -->
    <div v-if="connectMsg" class="mb-4 rounded-card border px-4 py-3 text-sm" :class="connectOk ? 'border-status-approved-bg bg-status-approved-bg/30 text-status-approved-fg' : 'border-status-needs-fix-bg bg-status-needs-fix-bg/30 text-status-needs-fix-fg'">
      {{ connectMsg }}
      <button class="ml-2 underline" type="button" @click="connectMsg = ''">Dismiss</button>
    </div>
    <div v-else-if="auth.isAdmin && !perf.connectionInfo.connected" class="mb-4 rounded-card border border-border bg-soft/40 px-4 py-3 text-sm text-text-muted">
      Search Console is not connected yet. Click <strong class="text-text-main">Connect Search Console</strong> to start pulling real data.
    </div>

    <div class="mt-4">
        <!-- Filter bar -->
        <div class="perf-filterbar mb-4">
          <!-- Range segment for overview -->
          <div v-if="activePerformanceView === 'overview'" class="seg">
            <button v-for="d in [7, 28, 90]" :key="d" type="button" :class="{ active: perf.rangeDays === d }" @click="changeRange(d as 7 | 28 | 90)">{{ d }}d</button>
          </div>

          <!-- Main View Scope Dropdown -->
          <div class="perf-wsel">
            <button type="button" class="input perf-wsel-btn font-semibold" @click="scopeDropdownOpen = !scopeDropdownOpen">
              <span class="truncate flex-1 text-left">Viewing: {{ scopeLabel }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <template v-if="scopeDropdownOpen">
              <div class="perf-wsel-backdrop" @click="scopeDropdownOpen = false" />
              <div class="perf-wsel-list">
                <button type="button" class="perf-wsel-item" :class="{ active: scopeFilter === 'my' }" @click="selectScope('my')">
                  <span class="flex-1 text-left text-text-main font-semibold">My Websites</span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: scopeFilter === 'all' }" @click="selectScope('all')">
                  <span class="flex-1 text-left text-text-main font-semibold">All Websites</span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: scopeFilter === 'member' }" @click="selectScope('member')">
                  <span class="flex-1 text-left text-text-main font-semibold">Team Member</span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: scopeFilter === 'single' }" @click="selectScope('single')">
                  <span class="flex-1 text-left text-text-main font-semibold">Single Website</span>
                </button>
              </div>
            </template>
          </div>

          <!-- Team Member Dropdown (visible when scopeFilter is 'member') -->
          <div v-if="scopeFilter === 'member'" class="perf-wsel">
            <button type="button" class="input perf-wsel-btn" @click="memberDropdownOpen = !memberDropdownOpen">
              <div v-if="memberFilter" class="perf-wsel-avatar">
                <img v-if="selectedMemberObj?.avatarUrl" :src="selectedMemberObj?.avatarUrl" class="perf-wsel-avatar-img" />
                <span v-else class="perf-wsel-avatar-initials">{{ (selectedMemberObj?.fullName || 'M').slice(0, 2).toUpperCase() }}</span>
              </div>
              <span v-else class="perf-wsel-all">★</span>
              <span class="truncate flex-1 text-left">{{ memberFilter ? selectedMemberObj?.fullName : 'Select member...' }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <template v-if="memberDropdownOpen">
              <div class="perf-wsel-backdrop" @click="memberDropdownOpen = false" />
              <div class="perf-wsel-list">
                <!-- Loading state -->
                <div v-if="memberProfilesLoading" class="p-4 text-center text-xs text-text-muted">
                  Loading team members...
                </div>
                <!-- Error state with retry button -->
                <div v-else-if="memberProfilesError" class="p-4 text-center text-xs text-status-needs-fix-fg flex flex-col items-center gap-2">
                  <span>{{ memberProfilesError }}</span>
                  <button type="button" class="btn-secondary text-[10px] py-1 px-2.5 h-auto font-sans" @click="fetchMemberProfiles">Retry</button>
                </div>
                <!-- Empty state -->
                <div v-else-if="allTeamMembers.length === 0" class="p-4 text-center text-xs text-text-muted">
                  No team members found.
                </div>
                <!-- Dropdown items -->
                <template v-else>
                  <button v-for="m in allTeamMembers" :key="m.id" type="button" class="perf-wsel-item" :class="{ active: memberFilter === m.id }" @click="selectMember(m.id)">
                    <div class="perf-wsel-avatar">
                      <img v-if="m.avatarUrl" :src="m.avatarUrl" class="perf-wsel-avatar-img" />
                      <span v-else class="perf-wsel-avatar-initials">{{ (m.fullName || 'M').slice(0, 2).toUpperCase() }}</span>
                    </div>
                    <span class="flex-1 text-left min-w-0">
                      <span class="block truncate text-text-main font-semibold">{{ m.fullName }}</span>
                      <span class="block truncate text-[10px] text-text-muted">
                        {{ m.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }} · {{ memberWebsitesCount(m.id) }} website(s)
                      </span>
                    </span>
                  </button>
                </template>
              </div>
            </template>
          </div>

          <!-- Single Website Dropdown (visible when scopeFilter is 'single') -->
          <div v-if="scopeFilter === 'single'" class="perf-wsel">
            <button type="button" class="input perf-wsel-btn" @click="websiteDropdownOpen = !websiteDropdownOpen">
              <WebsiteFavicon v-if="websiteFilter" :favicon-url="websiteObj(websiteFilter)?.faviconUrl" :domain="websiteObj(websiteFilter)?.domain" :name="websiteObj(websiteFilter)?.name" :size="20" />
              <span v-else class="perf-wsel-all">★</span>
              <span class="truncate flex-1 text-left">{{ websiteFilter ? (websiteObj(websiteFilter)?.name || websiteObj(websiteFilter)?.domain) : 'Select website...' }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <template v-if="websiteDropdownOpen">
              <div class="perf-wsel-backdrop" @click="websiteDropdownOpen = false" />
              <div class="perf-wsel-list">
                <button v-for="w in data.websites" :key="w.id" type="button" class="perf-wsel-item" :class="{ active: websiteFilter === w.id }" @click="selectWebsite(w.id)">
                  <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="20" />
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main font-semibold">{{ w.name || w.domain }}</span>
                    <span class="block truncate text-[10px] text-text-muted">{{ w.domain }} · Assigned: {{ getWebsiteCreatorName(w) }}</span>
                  </span>
                  <span v-if="perf.connectionByWebsite.has(w.id)" class="perf-wsel-conn" title="Connected">●</span>
                </button>
              </div>
            </template>
          </div>

          <!-- Platform Filter -->
          <div class="perf-wsel">
            <button type="button" class="input perf-wsel-btn" @click="platformDropdownOpen = !platformDropdownOpen">
              <span class="truncate flex-1 text-left">
                {{ platformFilter === 'wordpress' ? 'WordPress' : platformFilter === 'framework' ? 'Framework' : platformFilter === 'unknown' ? 'Unknown' : 'All platforms' }}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <template v-if="platformDropdownOpen">
              <div class="perf-wsel-backdrop" @click="platformDropdownOpen = false" />
              <div class="perf-wsel-list">
                <button type="button" class="perf-wsel-item" :class="{ active: !platformFilter }" @click="selectPlatform('')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">All platforms</span>
                    <span class="block truncate text-[10px] text-text-muted">Show all platforms</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: platformFilter === 'wordpress' }" @click="selectPlatform('wordpress')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">WordPress</span>
                    <span class="block truncate text-[10px] text-text-muted">WordPress websites</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: platformFilter === 'framework' }" @click="selectPlatform('framework')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Framework</span>
                    <span class="block truncate text-[10px] text-text-muted">Framework websites</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: platformFilter === 'unknown' }" @click="selectPlatform('unknown')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Unknown</span>
                    <span class="block truncate text-[10px] text-text-muted">Unknown platform type</span>
                  </span>
                </button>
              </div>
            </template>
          </div>

          <!-- Connection Status Filter -->
          <div class="perf-wsel">
            <button type="button" class="input perf-wsel-btn" @click="connDropdownOpen = !connDropdownOpen">
              <span class="truncate flex-1 text-left">
                {{ connFilter === 'connected' ? 'Connected only' : connFilter === 'not' ? 'Not connected' : 'Connected & not' }}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <template v-if="connDropdownOpen">
              <div class="perf-wsel-backdrop" @click="connDropdownOpen = false" />
              <div class="perf-wsel-list">
                <button type="button" class="perf-wsel-item" :class="{ active: connFilter === 'all' || !connFilter }" @click="selectConn('all')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Connected &amp; not</span>
                    <span class="block truncate text-[10px] text-text-muted">Show all connection statuses</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: connFilter === 'connected' }" @click="selectConn('connected')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Connected only</span>
                    <span class="block truncate text-[10px] text-text-muted">Only websites connected to GSC</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: connFilter === 'not' }" @click="selectConn('not')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Not connected</span>
                    <span class="block truncate text-[10px] text-text-muted">Only websites not connected to GSC</span>
                  </span>
                </button>
              </div>
            </template>
          </div>

          <!-- Comparison Mode Filter -->
          <div v-if="activePerformanceView === 'overview' && !is24hMode" class="perf-wsel">
            <button type="button" class="input perf-wsel-btn" @click="compareDropdownOpen = !compareDropdownOpen">
              <span class="truncate flex-1 text-left">
                {{ perf.compareMode === 'previous' ? 'Previous period' : perf.compareMode === 'last_month' ? 'Last month' : 'No comparison' }}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <template v-if="compareDropdownOpen">
              <div class="perf-wsel-backdrop" @click="compareDropdownOpen = false" />
              <div class="perf-wsel-list">
                <button type="button" class="perf-wsel-item" :class="{ active: perf.compareMode === 'none' }" @click="selectCompare('none')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">No comparison</span>
                    <span class="block truncate text-[10px] text-text-muted">Show absolute values only</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: perf.compareMode === 'previous' }" @click="selectCompare('previous')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Previous period</span>
                    <span class="block truncate text-[10px] text-text-muted">Compare to previous date range</span>
                  </span>
                </button>
                <button type="button" class="perf-wsel-item" :class="{ active: perf.compareMode === 'last_month' }" @click="selectCompare('last_month')">
                  <span class="flex-1 text-left min-w-0">
                    <span class="block truncate text-text-main">Last month</span>
                    <span class="block truncate text-[10px] text-text-muted">Compare to same days last month</span>
                  </span>
                </button>
              </div>
            </template>
          </div>
        </div>

    <LoadingBlock v-if="activePerformanceView === 'overview'" :loading="perf.loading" :error="perf.error" :retry="() => perf.fetchAll()">
      <!-- Empty States -->
      <!-- Case 1: My Websites has no websites -->
      <div v-if="scopeFilter === 'my' && scopedWebsites.length === 0 && !data.loading.websites" class="card card-pad py-16 text-center mt-4">
        <div class="text-base font-bold text-text-main mb-2">No websites assigned to you yet.</div>
        <p class="text-xs text-text-muted mb-4 max-w-sm mx-auto">You don't have any websites assigned to your account. Switch to viewing all websites to see other team properties.</p>
        <button class="btn-primary font-sans" type="button" @click="selectScope('all')">View All Websites</button>
      </div>

      <!-- Case 2: Selected member has no websites -->
      <div v-else-if="scopeFilter === 'member' && scopedWebsites.length === 0 && !data.loading.websites" class="card card-pad py-16 text-center mt-4">
        <div class="text-base font-bold text-text-main mb-2">No websites found for this team member.</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto">This team member does not have any websites assigned to them.</p>
      </div>

      <!-- Case 3: Selected website has no performance data -->
      <div v-else-if="scopeFilter === 'single' && websiteFilter && filteredDaily.length === 0 && !is24hMode" class="card card-pad py-16 text-center mt-4">
        <div class="text-base font-bold text-text-main mb-2">No Search Console data found for this website.</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto">This website has no Search Console data stored for the selected date range. Try syncing the data manually.</p>
      </div>
      <div v-else-if="scopeFilter === 'single' && websiteFilter && filteredHourly.length === 0 && is24hMode" class="card card-pad py-16 text-center mt-4">
        <div class="text-base font-bold text-text-main mb-2">No Search Console data found for this website.</div>
        <p class="text-xs text-text-muted max-w-sm mx-auto">This website has no hourly Search Console data stored. Try syncing the data manually.</p>
      </div>

      <!-- Normal dashboard layout -->
      <div v-else class="space-y-4">
        <!-- Metric cards (toggle the chart line) -->
        <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          v-for="m in metricList"
          :key="m.key"
          type="button"
          class="perf-metric"
          :class="{ active: activeMetric === m.key }"
          :style="activeMetric === m.key ? { borderColor: m.color, boxShadow: `inset 0 -3px 0 ${m.color}` } : {}"
          @click="activeMetric = m.key"
        >
          <span class="perf-metric-dot" :style="{ background: m.color }" />
          <span class="perf-metric-label">{{ m.label }}</span>
          <span class="perf-metric-value">{{ m.format(totals) }}</span>
          <template v-if="cardDelta(m.key)">
            <span class="perf-metric-cmp" :class="cardDelta(m.key)!.good ? 'is-up' : 'is-down'">
              {{ cardDelta(m.key)!.good ? '▲' : '▼' }} {{ cardDelta(m.key)!.deltaLabel }} · {{ cardDelta(m.key)!.pctLabel }}
            </span>
            <span class="perf-metric-prev">vs {{ perf.comparePeriodLabel }}: {{ cardDelta(m.key)!.prevLabel }}</span>
          </template>
        </button>
      </div>
      <p v-if="compareActive && !hasCompareData" class="mt-2 text-xs text-text-muted">No {{ perf.comparePeriodLabel }} data available for comparison.</p>
      <p v-else-if="compareActive" class="mt-2 text-xs text-text-muted">Compared to <strong class="text-text-main">{{ perf.comparePeriodLabel }}</strong> — real stored data; recent days may still be processing.</p>

      <!-- Range coverage prompt: stored data shorter than the selected range -->
      <div v-if="rangeShortfall" class="mt-3 flex flex-wrap items-center gap-2 rounded-card border border-status-submitted-bg bg-status-submitted-bg/20 px-4 py-2.5 text-xs text-text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-status-submitted-fg"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Only <strong class="text-text-main">{{ storedDayCount }}</strong> days are stored (since {{ oldestStoredDate }}). Click <strong class="text-text-main">Sync data</strong> to load the full {{ perf.rangeDays }} days — Google only returns data as far back as each property has existed.</span>
        <button v-if="auth.isAdmin" class="btn-secondary ml-auto px-2 py-1 text-xs" type="button" :disabled="perf.syncAllRunning" @click="onSyncAll">{{ perf.syncAllRunning ? 'Syncing…' : 'Sync now' }}</button>
      </div>

      <!-- Freshness warning (24h) -->
      <div v-if="is24hMode" class="mt-3 rounded-card border border-border/80 bg-soft/10 px-4 py-2 text-xs text-text-muted flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-primary"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Recent Search Console data may still be updating — the latest hours can lag.
      </div>

      <!-- Main chart -->
      <div class="card card-pad mt-3">
        <div class="mb-1 flex items-center justify-between">
          <h3 class="section-title">{{ activeMetricMeta.label }} {{ is24hMode ? 'by hour' : 'over time' }}</h3>
        </div>
        <LineChart v-if="hasTrend" :data="chartSeries" :color="activeMetricMeta.color" :height="240" />
        <p v-else class="py-12 text-center text-sm text-text-muted">{{ noDataMsg }}</p>
      </div>

      <!-- Data tabs -->
      <div class="card mt-3">
        <div class="perf-tabs">
          <button v-for="t in tabList" :key="t.key" type="button" :class="['perf-tab', { active: activeTab === t.key }]" @click="activeTab = t.key">{{ t.label }}</button>
          <input v-model="tableSearch" class="input perf-tabsearch" :placeholder="`Search ${activeTabMeta.noun}…`" />
        </div>

        <div class="overflow-x-auto">
          <table class="perf-table perf-table--lined">
            <thead>
              <tr>
                <th class="cursor-pointer select-none" @click="setSort('label')">{{ activeTabMeta.header }} <span class="perf-sort">{{ sortArrow('label') }}</span></th>
                <th class="num cursor-pointer select-none" @click="setSort('clicks')">Clicks <span class="perf-sort">{{ sortArrow('clicks') }}</span></th>
                <th v-if="showChangeCol" class="num">Clicks Δ</th>
                <th class="num cursor-pointer select-none" @click="setSort('impressions')">Impressions <span class="perf-sort">{{ sortArrow('impressions') }}</span></th>
                <th class="num cursor-pointer select-none" @click="setSort('ctr')">CTR <span class="perf-sort">{{ sortArrow('ctr') }}</span></th>
                <th class="num cursor-pointer select-none" @click="setSort('position')">Position <span class="perf-sort">{{ sortArrow('position') }}</span></th>
                <th v-if="activeTabMeta.extra" class="num">{{ activeTabMeta.extra }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in pagedRows" :key="r.key" :class="{ 'perf-row-click': activeTabMeta.clickable }" @click="onRowClick(r)">
                <td class="text-text-main" :title="r.label">
                  <span v-if="activeTab === 'websites'" class="inline-flex items-center gap-2">
                    <WebsiteFavicon :favicon-url="websiteObj(r.id)?.faviconUrl" :domain="websiteObj(r.id)?.domain" :name="r.label" :size="22" />
                    <span class="truncate">{{ r.label }}</span>
                  </span>
                  <span v-else>{{ activeTab === 'pages' ? shortUrl(r.label) : r.label }}</span>
                </td>
                <td class="num">{{ fmtNum(r.clicks) }}</td>
                <td v-if="showChangeCol" class="num" :class="(r.change ?? 0) >= 0 ? 'perf-up' : 'perf-down'">{{ (r.change ?? 0) >= 0 ? '+' : '−' }}{{ fmtNum(Math.abs(r.change ?? 0)) }}</td>
                <td class="num">{{ fmtNum(r.impressions) }}</td>
                <td class="num">{{ fmtPct(r.ctr) }}</td>
                <td class="num">{{ fmtPos(r.position) }}</td>
                <td v-if="activeTabMeta.extra" class="num text-text-muted">{{ r.extra }}</td>
              </tr>
              <tr v-if="!pagedRows.length"><td :colspan="colCount" class="py-8 text-center text-sm text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody>
          </table>
        </div>

        <div v-if="sortedRows.length > perPage" class="perf-pager">
          <span>{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, sortedRows.length) }} of {{ sortedRows.length }}</span>
          <div class="flex gap-1">
            <button class="btn-ghost px-2 py-1 text-xs" type="button" :disabled="page <= 1" @click="page--">Prev</button>
            <button class="btn-ghost px-2 py-1 text-xs" type="button" :disabled="page >= pageCount" @click="page++">Next</button>
          </div>
        </div>
      </div>

      <!-- Insights -->
      <div class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="perf-insight">
          <div class="perf-insight-l">Top website</div>
          <div class="perf-insight-v flex items-center gap-2">
            <WebsiteFavicon v-if="topWebsite" :favicon-url="websiteObj(topWebsite.id)?.faviconUrl" :domain="websiteObj(topWebsite.id)?.domain" :name="topWebsite.label" :size="22" />
            <span class="truncate">{{ topWebsite?.label || '—' }}</span>
          </div>
          <div class="perf-insight-s">{{ topWebsite ? fmtNum(topWebsite.clicks) + ' clicks' : 'No data' }}</div>
        </div>
        <div class="perf-insight">
          <div class="perf-insight-l">Biggest growth</div>
          <div class="perf-insight-v truncate">{{ biggestGrowth[0]?.name || '—' }}</div>
          <div class="perf-insight-s text-status-approved-fg">{{ biggestGrowth[0] ? '+' + fmtNum(biggestGrowth[0].delta) + ' clicks' : 'No change' }}</div>
        </div>
        <div class="perf-insight">
          <div class="perf-insight-l">Biggest drop</div>
          <div class="perf-insight-v truncate">{{ biggestDrop[0]?.name || '—' }}</div>
          <div class="perf-insight-s text-status-needs-fix-fg">{{ biggestDrop[0] ? fmtNum(biggestDrop[0].delta) + ' clicks' : 'No change' }}</div>
        </div>
        <div class="perf-insight">
          <div class="perf-insight-l">Needs attention</div>
          <div class="perf-insight-v">{{ needsAttention.length }}</div>
          <div class="perf-insight-s">{{ needsAttention.length ? 'sites not connected / failing' : 'all good 🎉' }}</div>
        </div>
      </div>

      <!-- Connections management (admin) -->
      <div v-if="auth.isAdmin" class="card card-pad mt-3">
        <h3 class="section-title mb-1">Search Console connections</h3>
        <p class="helper mb-3">Map each website to its Search Console property (e.g. <code>sc-domain:example.com</code> or <code>https://example.com/</code>), then sync.</p>
        <div class="overflow-x-auto">
          <table class="perf-table perf-table--lined">
            <thead>
              <tr><th>Website</th><th>GSC property</th><th>Status</th><th>Last sync</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="w in visibleWebsites" :key="w.id">
                <td class="font-medium text-text-main">
                  <span class="inline-flex items-center gap-2">
                    <WebsiteFavicon :favicon-url="w.faviconUrl" :domain="w.domain" :name="w.name" :size="22" />
                    <span class="truncate">{{ w.name || w.domain }}</span>
                  </span>
                </td>
                <td><input v-model="propInputs[w.id]" class="input h-8 text-xs" :placeholder="`sc-domain:${bareDomain(w.domain)}`" /></td>
                <td>
                  <div class="flex items-center gap-1">
                    <span class="perf-status" :class="getWebsiteStatus(w.id).class">{{ getWebsiteStatus(w.id).label }}</span>
                    <span v-if="getWebsiteStatus(w.id).error" class="cursor-help text-[10px] text-text-muted hover:text-text-main" :title="getWebsiteStatus(w.id).error || undefined">(details)</span>
                  </div>
                </td>
                <td class="whitespace-nowrap text-xs text-text-muted">{{ fmtDateTime(perf.connectionByWebsite.get(w.id)?.last_synced_at) }}</td>
                <td class="whitespace-nowrap text-right">
                  <button class="btn-ghost px-2 py-1 text-xs" type="button" @click="onSaveConnection(w.id)">Save</button>
                  <button class="btn-ghost px-2 py-1 text-xs" type="button" :disabled="perf.syncingIds.has(w.id) || !perf.connectionByWebsite.get(w.id)" @click="perf.syncWebsite(w.id)">
                    {{ perf.syncingIds.has(w.id) ? 'Syncing…' : (is24hMode ? 'Sync 24h' : 'Sync') }}
                  </button>
                  <button v-if="perf.connectionByWebsite.get(w.id)" class="btn-ghost px-2 py-1 text-xs text-status-needs-fix-fg" type="button" @click="onRemoveConnection(w.id)">Remove</button>
                </td>
              </tr>
              <tr v-if="!visibleWebsites.length"><td colspan="5" class="py-6 text-center text-sm text-text-muted">No websites.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </LoadingBlock>

    <!-- Page Indexing view -->
    <PageIndexing
      v-else-if="activePerformanceView === 'page-indexing'"
      :websites="visibleWebsites"
      :scope-filter="scopeFilter"
      @switch-scope="selectScope"
    />
    </div>

    <!-- Website detail drawer -->
    <Modal :open="!!detailId" :title="detailWebsite?.name || detailWebsite?.domain || 'Website'" subtitle="Search Console performance" size="lg" @close="detailId = null">
      <div v-if="detailId" class="space-y-4">
        <div class="flex items-center gap-3">
          <WebsiteFavicon :favicon-url="detailWebsite?.faviconUrl" :domain="detailWebsite?.domain" :name="detailWebsite?.name" :size="40" />
          <div class="min-w-0">
            <div class="ui-font font-bold text-text-main truncate">{{ detailWebsite?.name || detailWebsite?.domain }}</div>
            <div class="text-xs text-text-muted truncate">{{ detailWebsite?.domain }}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="perf-kv">
            <div class="perf-kv-l">Clicks</div><div class="perf-kv-v">{{ fmtNum(detailTotals.clicks) }}</div>
            <div v-if="detailDelta('clicks')" class="perf-kv-cmp" :class="detailDelta('clicks')!.good ? 'perf-up' : 'perf-down'">{{ detailDelta('clicks')!.good ? '▲' : '▼' }} {{ detailDelta('clicks')!.deltaLabel }}</div>
          </div>
          <div class="perf-kv">
            <div class="perf-kv-l">Impressions</div><div class="perf-kv-v">{{ fmtNum(detailTotals.impressions) }}</div>
            <div v-if="detailDelta('impressions')" class="perf-kv-cmp" :class="detailDelta('impressions')!.good ? 'perf-up' : 'perf-down'">{{ detailDelta('impressions')!.good ? '▲' : '▼' }} {{ detailDelta('impressions')!.deltaLabel }}</div>
          </div>
          <div class="perf-kv">
            <div class="perf-kv-l">CTR</div><div class="perf-kv-v">{{ fmtPct(detailTotals.ctr) }}</div>
            <div v-if="detailDelta('ctr')" class="perf-kv-cmp" :class="detailDelta('ctr')!.good ? 'perf-up' : 'perf-down'">{{ detailDelta('ctr')!.good ? '▲' : '▼' }} {{ detailDelta('ctr')!.deltaLabel }}</div>
          </div>
          <div class="perf-kv">
            <div class="perf-kv-l">Position</div><div class="perf-kv-v">{{ fmtPos(detailTotals.position) }}</div>
            <div v-if="detailDelta('position')" class="perf-kv-cmp" :class="detailDelta('position')!.good ? 'perf-up' : 'perf-down'">{{ detailDelta('position')!.good ? '▲' : '▼' }} {{ detailDelta('position')!.deltaLabel }}</div>
          </div>
        </div>
        <p v-if="compareActive" class="text-xs text-text-muted">Compared to {{ perf.comparePeriodLabel }}.</p>
        <div class="text-xs text-text-muted">
          Property: <code>{{ perf.connectionByWebsite.get(detailId)?.gsc_property_url || 'not mapped' }}</code> · Last sync: {{ fmtDateTime(perf.connectionByWebsite.get(detailId)?.last_synced_at) }}
        </div>
        <LineChart v-if="detailSeries.length > 1" :data="detailSeries" color="#15D6C2" :height="180" />
        <p v-else class="text-center text-sm text-text-muted">{{ noDataMsg }}</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 class="perf-kv-l mb-1">Top searches</h4>
            <table class="perf-table"><tbody>
              <tr v-for="(r, i) in detailQueries" :key="i"><td class="text-text-main">{{ r.label }}</td><td class="text-right">{{ fmtNum(r.clicks) }}</td></tr>
              <tr v-if="!detailQueries.length"><td class="py-4 text-center text-xs text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody></table>
          </div>
          <div>
            <h4 class="perf-kv-l mb-1">Top pages</h4>
            <table class="perf-table"><tbody>
              <tr v-for="(r, i) in detailPages" :key="i"><td class="truncate text-text-main" :title="r.label">{{ shortUrl(r.label) }}</td><td class="text-right">{{ fmtNum(r.clicks) }}</td></tr>
              <tr v-if="!detailPages.length"><td class="py-4 text-center text-xs text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" type="button" @click="detailId = null">Close</button>
        <button v-if="auth.isAdmin && perf.connectionByWebsite.get(detailId || '')" class="btn-primary" type="button" :disabled="!!detailId && perf.syncingIds.has(detailId)" @click="detailId && perf.syncWebsite(detailId)">
          {{ detailId && perf.syncingIds.has(detailId) ? 'Syncing…' : (is24hMode ? 'Sync 24h' : 'Sync this website') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LineChart from '@/components/ui/LineChart.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import WebsiteFavicon from '@/components/ui/WebsiteFavicon.vue';
import PageIndexing from '@/components/performance/PageIndexing.vue';
import { usePerformanceStore, aggregateByDate, aggregateByHour, sumTotals, type GscTotals, type GscTermStat } from '@/stores/performance';
import { useDataStore, type Member, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const perf = usePerformanceStore();
const data = useDataStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// ── View ───────────────────────────────────────────────────────────
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

// ── Scope & Filters ────────────────────────────────────────────────────────
const scopeFilter = ref<'my' | 'all' | 'member' | 'single'>('my');
const scopeDropdownOpen = ref(false);

const websiteFilter = ref('');
const memberFilter = ref('');
const platformFilter = ref('');
const connFilter = ref<'all' | 'connected' | 'not'>('all');

const websiteObj = (id?: string | null) => (id ? data.websites.find((x) => x.id === id) ?? null : null);
const websiteName = (id: string) => {
  const w = data.websites.find((x) => x.id === id);
  return w?.name || w?.domain || 'Website';
};

const memberProfiles = ref<{
  user_id: string;
  full_name: string;
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
    const { data: resData, error: resErr } = await supabase.rpc('get_team_member_filter_profiles');
    if (resErr) {
      memberProfilesError.value = 'Could not load team members.';
      console.error('[performance] get_team_member_filter_profiles error:', resErr.message);
    } else {
      memberProfiles.value = resData || [];
    }
  } catch (err: any) {
    memberProfilesError.value = 'Could not load team members.';
    console.error('[performance] get_team_member_filter_profiles exception:', err);
  } finally {
    memberProfilesLoading.value = false;
  }
};

const allTeamMembers = computed(() => {
  if (memberProfiles.value.length > 0) {
    return memberProfiles.value.map(p => ({
      id: p.user_id,
      fullName: p.full_name,
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
  if (profile) return profile.full_name;
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
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      status: profile.status,
      email: ''
    };
  }
  return data.memberById(id);
});

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
    return 'My Websites';
  }
  if (scopeFilter.value === 'all') {
    return 'All team websites';
  }
  if (scopeFilter.value === 'member') {
    const member = selectedMemberObj.value;
    return member ? `Websites assigned to ${member.fullName}` : 'Team Member';
  }
  if (scopeFilter.value === 'single') {
    const w = websiteObj(websiteFilter.value);
    return w ? w.name || w.domain : 'Single Website';
  }
  return '';
});

// ── Custom Dropdowns ────────────────────────────────────────────────────────
const websiteDropdownOpen = ref(false);
const selectWebsite = (id: string) => { websiteFilter.value = id; websiteDropdownOpen.value = false; };

const memberDropdownOpen = ref(false);
const selectMember = (id: string) => { memberFilter.value = id; memberDropdownOpen.value = false; };

const platformDropdownOpen = ref(false);
const selectPlatform = (val: string) => { platformFilter.value = val; platformDropdownOpen.value = false; };

const connDropdownOpen = ref(false);
const selectConn = (val: 'all' | 'connected' | 'not') => { connFilter.value = val; connDropdownOpen.value = false; };

const compareDropdownOpen = ref(false);
const selectCompare = (val: 'none' | 'previous' | 'last_month') => { void perf.setCompareMode(val); compareDropdownOpen.value = false; };

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
  return data.websites; // 'all'
});

const visibleWebsites = computed(() =>
  scopedWebsites.value.filter((w) => {
    if (platformFilter.value && w.platformType !== platformFilter.value) return false;
    const connected = perf.connectionByWebsite.has(w.id);
    if (connFilter.value === 'connected' && !connected) return false;
    if (connFilter.value === 'not' && connected) return false;
    return true;
  })
);

const activeWebsiteIds = computed(() => {
  const ids = new Set(visibleWebsites.value.map((w) => w.id));
  if (websiteFilter.value) return new Set([websiteFilter.value].filter((id) => ids.has(id)));
  return ids;
});

// If the selected website is filtered out by member/platform/connection, clear it
// (so the dropdown label and the data stay consistent — no stale single-site view).
watch(visibleWebsites, (list) => {
  if (websiteFilter.value && !list.some((w) => w.id === websiteFilter.value)) websiteFilter.value = '';
});

const is24hMode = computed(() => perf.rangeDays === '24h');
const filteredDaily = computed(() => perf.daily.filter((r) => activeWebsiteIds.value.has(r.website_id)));
const filteredHourly = computed(() => perf.latest24hHourly.filter((r) => activeWebsiteIds.value.has(r.website_id)));

// ── Totals + metric cards ─────────────────────────────────────────────────
const totals = computed(() => is24hMode.value ? sumTotals(filteredHourly.value) : sumTotals(filteredDaily.value));
const connectedCount = computed(() => visibleWebsites.value.filter((w) => perf.connectionByWebsite.has(w.id)).length);

// Detect when the stored data covers fewer days than the selected range (e.g. 90d
// selected but only 28d ever synced) so we can prompt a sync instead of looking broken.
const storedDates = computed(() => new Set(filteredDaily.value.map((r) => r.date)));
const storedDayCount = computed(() => storedDates.value.size);
const oldestStoredDate = computed(() => { let m = ''; for (const d of storedDates.value) if (!m || d < m) m = d; return m; });
const rangeShortfall = computed(() =>
  !is24hMode.value && typeof perf.rangeDays === 'number' && storedDayCount.value > 0 && storedDayCount.value < (perf.rangeDays as number) - 5
);

type Metric = 'clicks' | 'impressions' | 'ctr' | 'position';
const metricList: { key: Metric; label: string; color: string; format: (t: GscTotals) => string }[] = [
  { key: 'clicks', label: 'Total Clicks', color: '#15D6C2', format: (t) => fmtNum(t.clicks) },
  { key: 'impressions', label: 'Total Impressions', color: '#8b5cf6', format: (t) => fmtNum(t.impressions) },
  { key: 'ctr', label: 'Average CTR', color: '#22c55e', format: (t) => fmtPct(t.ctr) },
  { key: 'position', label: 'Average Position', color: '#f59e0b', format: (t) => fmtPos(t.position) }
];
const activeMetric = ref<Metric>('clicks');
const activeMetricMeta = computed(() => metricList.find((m) => m.key === activeMetric.value)!);

// ── Comparison (last month / previous period) ──────────────────────────────
const compareActive = computed(() => perf.compareMode !== 'none' && !is24hMode.value);
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
    const improved = cur < prev;            // lower position is better
    const diff = prev - cur;                // positive = improvement
    return { prevLabel: fmtPos(prev), deltaLabel: `${improved ? '−' : '+'}${Math.abs(diff).toFixed(1)}`, pctLabel: improved ? 'improved' : 'worse', good: improved };
  }
  const diff = cur - prev;
  const pct = prev ? (diff / prev) * 100 : 0;
  const deltaLabel = metric === 'ctr'
    ? `${diff >= 0 ? '+' : '−'}${Math.abs(diff * 100).toFixed(1)} pp`
    : `${diff >= 0 ? '+' : '−'}${fmtNum(Math.abs(diff))}`;
  const pctLabel = prev ? `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%` : (cur > 0 ? 'new' : '0%');
  return { prevLabel: metric === 'ctr' ? fmtPct(prev) : fmtNum(prev), deltaLabel, pctLabel, good: diff >= 0 };
};
const cardDelta = (metric: Metric): Delta | null => {
  if (!compareActive.value || !hasCompareData.value) return null;
  const prev = compareTotals.value[metric];
  if (metric === 'position' && !prev) return null; // no baseline position → don't show a misleading delta
  return makeDelta(totals.value[metric], prev, metric);
};

const onCompareChange = (e: Event) => { void perf.setCompareMode((e.target as HTMLSelectElement).value as 'none' | 'previous' | 'last_month'); };
const showChangeCol = computed(() => compareActive.value && activeTab.value === 'websites');
const colCount = computed(() => 5 + (activeTabMeta.value.extra ? 1 : 0) + (showChangeCol.value ? 1 : 0));

// ── Chart ─────────────────────────────────────────────────────────────────
const trend = computed(() => is24hMode.value ? aggregateByHour(filteredHourly.value) : aggregateByDate(filteredDaily.value));
const hasTrend = computed(() => trend.value.length > 1);
const shortDate = (d: string) => d.slice(5);
const formatHourLabel = (dtStr: string) => {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
};
const metricValue = (p: { clicks: number; impressions: number; ctr: number; position: number }): number => {
  if (activeMetric.value === 'ctr') return Math.round(p.ctr * 1000) / 10;
  if (activeMetric.value === 'position') return Math.round(p.position * 10) / 10;
  return p[activeMetric.value];
};
const chartSeries = computed(() => {
  if (is24hMode.value) {
    return aggregateByHour(filteredHourly.value).map((p) => ({ label: formatHourLabel(p.datetime), value: metricValue(p) }));
  }
  return aggregateByDate(filteredDaily.value).map((p) => ({ label: shortDate(p.date), value: metricValue(p) }));
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

// ── Tab data ───────────────────────────────────────────────────────────────
interface Row { key: string; label: string; clicks: number; impressions: number; ctr: number; position: number; id?: string; extra?: string; change?: number }

// Use each website's OWN latest snapshot date (websites can be synced on
// different days). A single global "latest date" would hide query/page rows for
// any site not synced on that exact day — including when one such site is filtered.
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

const queriesRows = computed(() => aggTerms(latestTerms(perf.queries), 'query'));
const pagesRows = computed(() => aggTerms(latestTerms(perf.pages), 'page_url'));
const datesRows = computed<Row[]>(() => {
  if (is24hMode.value) {
    return aggregateByHour(filteredHourly.value).map((p) => ({ key: p.datetime, label: formatHourLabel(p.datetime), clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position }));
  }
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
  const m = aggByWebsite(is24hMode.value ? filteredHourly.value : filteredDaily.value);
  return [...m.entries()].map(([id, v]) => ({
    key: id, id, label: websiteName(id), clicks: v.clicks, impressions: v.impr,
    ctr: v.impr ? v.clicks / v.impr : 0, position: v.impr ? v.wpos / v.impr : 0,
    extra: fmtDateTime(perf.connectionByWebsite.get(id)?.last_synced_at),
    change: compareActive.value ? v.clicks - (compareClicksByWebsite.value.get(id) ?? 0) : undefined
  }));
});
const membersRows = computed<Row[]>(() => {
  const rows = is24hMode.value ? filteredHourly.value : filteredDaily.value;
  const memberOf = (wid: string) => data.websites.find((w) => w.id === wid)?.createdBy ?? null;
  const m = new Map<string, { clicks: number; impr: number; wpos: number; sites: Set<string> }>();
  for (const r of rows) {
    const mid = memberOf(r.website_id);
    if (!mid) continue;
    const c = m.get(mid) ?? { clicks: 0, impr: 0, wpos: 0, sites: new Set<string>() };
    c.clicks += r.clicks; c.impr += r.impressions; c.wpos += r.position * r.impressions; c.sites.add(r.website_id);
    m.set(mid, c);
  }
  return [...m.entries()].map(([mid, v]) => ({
    key: mid, id: mid, label: data.memberById(mid)?.fullName || data.memberById(mid)?.email || 'Member',
    clicks: v.clicks, impressions: v.impr, ctr: v.impr ? v.clicks / v.impr : 0, position: v.impr ? v.wpos / v.impr : 0,
    extra: String(v.sites.size)
  }));
});

type Tab = 'queries' | 'pages' | 'dates' | 'websites' | 'members';
const tabList: { key: Tab; label: string }[] = [
  { key: 'queries', label: 'Queries' },
  { key: 'pages', label: 'Pages' },
  { key: 'dates', label: 'Dates' },
  { key: 'websites', label: 'Websites' },
  { key: 'members', label: 'Members' }
];
const activeTab = ref<Tab>('queries');
const tabMeta: Record<Tab, { header: string; noun: string; extra?: string; clickable?: boolean }> = {
  queries: { header: 'Query', noun: 'queries' },
  pages: { header: 'Page', noun: 'pages' },
  dates: { header: 'Date', noun: 'dates' },
  websites: { header: 'Website', noun: 'websites', extra: 'Last sync', clickable: true },
  members: { header: 'Member', noun: 'members', extra: 'Websites', clickable: true }
};
const activeTabMeta = computed(() => tabMeta[activeTab.value]);
const tabRows = computed<Row[]>(() => {
  switch (activeTab.value) {
    case 'queries': return queriesRows.value;
    case 'pages': return pagesRows.value;
    case 'dates': return datesRows.value;
    case 'websites': return websitesRows.value;
    case 'members': return membersRows.value;
    default: return [];
  }
});

// ── Sort / search / paginate ──────────────────────────────────────────────
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
watch([activeTab, tableSearch, activeWebsiteIds, is24hMode], () => { page.value = 1; });

const onRowClick = (r: Row) => {
  if (activeTab.value === 'websites' && r.id) openDetail(r.id);
  else if (activeTab.value === 'members' && r.id) { memberFilter.value = r.id; activeTab.value = 'websites'; }
};

// ── Insights ──────────────────────────────────────────────────────────────
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
  if (is24hMode.value) {
    for (const r of filteredHourly.value) { const a = byWebsite.get(r.website_id) ?? []; a.push({ sortKey: r.datetime, clicks: r.clicks }); byWebsite.set(r.website_id, a); }
  } else {
    for (const r of filteredDaily.value) { const a = byWebsite.get(r.website_id) ?? []; a.push({ sortKey: r.date, clicks: r.clicks }); byWebsite.set(r.website_id, a); }
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

// ── Detail drawer ─────────────────────────────────────────────────────────
const detailId = ref<string | null>(null);
const detailWebsite = computed(() => (detailId.value ? data.websites.find((w) => w.id === detailId.value) : null));
const detailDaily = computed(() => perf.daily.filter((r) => r.website_id === detailId.value));
const detailHourly = computed(() => perf.latest24hHourly.filter((r) => r.website_id === detailId.value));
const detailTotals = computed(() => is24hMode.value ? sumTotals(detailHourly.value) : sumTotals(detailDaily.value));
const detailCompareTotals = computed(() => sumTotals(perf.compareDaily.filter((r) => r.website_id === detailId.value)));
const detailDelta = (metric: Metric): Delta | null => {
  if (!compareActive.value) return null;
  const prev = detailCompareTotals.value[metric];
  if (!prev) return null; // no last-month baseline for this website → no delta
  return makeDelta(detailTotals.value[metric], prev, metric);
};
const detailSeries = computed(() => {
  if (is24hMode.value) return aggregateByHour(detailHourly.value).map((p) => ({ label: formatHourLabel(p.datetime), value: p.clicks }));
  return aggregateByDate(detailDaily.value).map((p) => ({ label: shortDate(p.date), value: p.clicks }));
});
const groupClicks = (rows: GscTermStat[], key: 'query' | 'page_url') =>
  aggTerms(rows, key).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
const detailQueries = computed(() => groupClicks(latestTerms(perf.queries).filter((r) => r.website_id === detailId.value), 'query'));
const detailPages = computed(() => groupClicks(latestTerms(perf.pages).filter((r) => r.website_id === detailId.value), 'page_url'));
const openDetail = (id: string) => { detailId.value = id; };

// ── Connections management ───────────────────────────────────────────────
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
  if (!conn || !conn.gsc_property_url) return { label: 'Not mapped', class: 'perf-status--none', error: null as string | null };
  const prop = conn.gsc_property_url;
  if (!prop.startsWith('sc-domain:') && !prop.startsWith('http://') && !prop.startsWith('https://')) {
    return { label: 'Invalid property URL', class: 'perf-status--error', error: 'Invalid Search Console property URL format.' };
  }
  if (conn.sync_status === 'syncing') return { label: 'Syncing…', class: 'perf-status--syncing', error: null };
  if (conn.sync_status === 'error') {
    const err = conn.sync_error || '';
    if (err.includes('access') || err.includes('permission') || err.includes('403')) return { label: 'No permission', class: 'perf-status--error', error: err };
    if (err.includes('not found') || err.includes('404')) return { label: 'Invalid property URL', class: 'perf-status--error', error: err };
    if (err.includes('format') || err.includes('400')) return { label: 'Invalid property URL', class: 'perf-status--error', error: err };
    if (err.includes('token') || err.includes('refresh') || err.includes('expired') || err.includes('reconnect') || err.includes('401')) return { label: 'Reconnect needed', class: 'perf-status--error', error: err };
    return { label: 'Google API error', class: 'perf-status--error', error: err };
  }
  if (conn.sync_status === 'ok') return { label: 'Synced', class: 'perf-status--ok', error: null };
  return { label: 'Idle', class: 'perf-status--none', error: null };
};

const onSaveConnection = async (websiteId: string) => {
  const cleaned = cleanProperty(propInputs[websiteId] ?? '');
  propInputs[websiteId] = cleaned;
  if (!cleaned.startsWith('sc-domain:') && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    connectMsg.value = 'Invalid Search Console property URL format.'; connectOk.value = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const ok = await perf.saveConnection(websiteId, cleaned);
  connectMsg.value = ok ? 'Connection saved.' : (perf.error || 'Failed to save connection.');
  connectOk.value = ok;
};
const onRemoveConnection = async (websiteId: string) => {
  if (!confirm('Remove this Search Console connection? Stored stats are kept.')) return;
  await perf.removeConnection(websiteId);
};

// ── Connect / sync ───────────────────────────────────────────────────────
const connectMsg = ref('');
const connectOk = ref(false);
const onConnect = async () => {
  const url = await perf.connectGoogle();
  if (url) window.location.href = url;
  else { connectMsg.value = perf.error || 'Could not start Google connection. Check the edge function setup.'; connectOk.value = false; }
};
const onSyncAll = async () => {
  const ok = await perf.syncAll();
  connectMsg.value = perf.lastSyncMessage || (ok ? 'Sync complete.' : 'Could not sync Search Console data. Check connection.');
  connectOk.value = ok;
};
const changeRange = (d: '24h' | 7 | 28 | 90) => { void perf.setRange(d); };

// ── Formatters ───────────────────────────────────────────────────────────
const fmtNum = (n: number) => (n >= 1000 ? n.toLocaleString() : String(Math.round(n)));
const fmtPct = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
const fmtPos = (p: number) => (p ? p.toFixed(1) : '—');
const fmtDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : 'Never');
const shortUrl = (u: string) => { try { const url = new URL(u); return url.pathname === '/' ? url.hostname : url.pathname; } catch { return u; } };
const noDataMsg = computed(() => is24hMode.value ? 'No hourly data available yet.' : 'No Search Console data found for this date range.');

onMounted(() => {
  void data.fetchWebsites();
  void data.fetchMembers();
  void fetchMemberProfiles();
  loadData();

  const gsc = route.query.gsc;
  if (gsc === 'connected') { connectMsg.value = 'Google Search Console connected. You can now sync websites.'; connectOk.value = true; }
  else if (gsc === 'error_norefresh') { connectMsg.value = 'Connected, but Google did not return a refresh token. Remove KiuQ access in your Google account, then reconnect.'; connectOk.value = false; }
  else if (gsc === 'error_store') { connectMsg.value = 'Connected to Google, but could not save the token — make sure migration 0126 has been applied, then reconnect.'; connectOk.value = false; }
  else if (gsc === 'not_configured') { connectMsg.value = 'Google API is not configured yet. Set the edge function secrets first.'; connectOk.value = false; }
  else if (typeof gsc === 'string' && gsc.startsWith('error')) { connectMsg.value = 'Could not connect Google Search Console. Please try again.'; connectOk.value = false; }
});
</script>

<style scoped>
/* Filter bar */
.perf-filterbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; border: 1px solid var(--border); border-radius: 0.7rem; background: var(--card-bg); }
.seg { display: inline-flex; border: 1px solid var(--border); border-radius: 0.6rem; overflow: hidden; }
.seg button { border: 0; background: transparent; color: var(--text-muted); font-size: 0.78rem; font-weight: 700; padding: 0.4rem 0.7rem; cursor: pointer; }
.seg button + button { border-left: 1px solid var(--border); }
.seg button.active { background: var(--primary, #15D6C2); color: #04201d; }
.perf-filter { height: 2.25rem; font-size: 0.8rem; max-width: 12rem; }

/* Metric cards */
.perf-metric { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; text-align: left; padding: 0.75rem 0.9rem; border: 1.5px solid var(--border); border-radius: 0.8rem; background: var(--card-bg); cursor: pointer; transition: border-color 0.15s ease; }
.perf-metric:hover { border-color: var(--text-muted); }
.perf-metric.active { background: var(--soft-bg, transparent); }
.perf-metric-dot { width: 0.55rem; height: 0.55rem; border-radius: 9999px; }
.perf-metric-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
.perf-metric-value { font-size: 1.4rem; font-weight: 800; color: var(--text-main); line-height: 1.1; }

/* Tabs */
.perf-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; border-bottom: 1px solid var(--border); padding: 0.5rem 0.75rem; }
.perf-tab { border: 0; background: transparent; color: var(--text-muted); font-size: 0.82rem; font-weight: 600; padding: 0.4rem 0.7rem; border-radius: 0.5rem; cursor: pointer; }
.perf-tab:hover { color: var(--text-main); }
.perf-tab.active { background: var(--primary, #15D6C2); color: #04201d; }
.perf-tabsearch { height: 2rem; font-size: 0.78rem; max-width: 14rem; margin-left: auto; }

/* Tables */
.perf-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.perf-table td { padding: 0.45rem 0.6rem; border-bottom: 1px solid var(--border); }
.perf-table--lined th { text-align: left; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
.perf-table .num, .perf-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
.perf-row-click { cursor: pointer; }
.perf-row-click:hover td { background: var(--soft-bg, rgba(0,0,0,0.03)); }
.perf-sort { color: var(--primary, #15D6C2); font-size: 0.6rem; }
.perf-pager { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border); }

/* Insights */
.perf-insight { border: 1px solid var(--border); border-radius: 0.7rem; padding: 0.7rem 0.85rem; background: var(--card-bg); }
.perf-insight-l { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.perf-insight-v { font-size: 1rem; font-weight: 800; color: var(--text-main); margin-top: 0.15rem; }
.perf-insight-s { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.1rem; }

/* Status pills */
.perf-status { display: inline-block; font-size: 0.66rem; font-weight: 700; padding: 0.05rem 0.45rem; border-radius: 9999px; background: var(--soft-bg); color: var(--text-muted); }
.perf-status--ok { background: rgba(34,197,94,0.15); color: #15803d; }
.perf-status--error { background: rgba(239,68,68,0.15); color: #b91c1c; }
.perf-status--syncing { background: rgba(21,214,194,0.15); color: var(--primary, #15D6C2); }

/* Detail KV */
.perf-kv { border: 1px solid var(--border); border-radius: 0.6rem; padding: 0.6rem 0.7rem; }
.perf-kv-l { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.perf-kv-v { font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-top: 0.1rem; }

/* Website selector dropdown */
.perf-wsel { position: relative; }
.perf-wsel-btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.25rem; min-width: 12rem; max-width: 14rem; font-size: 0.8rem; cursor: pointer; transition: all 150ms ease; }
.perf-wsel-btn:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 2px var(--primary-ring) !important; }
.perf-wsel-backdrop { position: fixed; inset: 0; z-index: 30; }
.perf-wsel-list { position: absolute; z-index: 31; top: calc(100% + 4px); left: 0; width: 18rem; max-height: 20rem; overflow-y: auto; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-lg); padding: 0.35rem; }
.perf-wsel-item { position: relative; display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.35rem 0.75rem; border: 0; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: 'Raleway', sans-serif; color: var(--text-main); text-align: left; transition: background 120ms ease, color 120ms ease; }
.perf-wsel-item:hover { background: var(--soft-bg); }
.perf-wsel-item.active { background: var(--primary-soft) !important; color: var(--primary) !important; font-weight: 600; }
.perf-wsel-item.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 1rem; width: 3px; background: var(--primary); border-radius: 0 3px 3px 0; }
.perf-wsel-all { display: inline-flex; width: 20px; justify-content: center; color: var(--primary, #15D6C2); }
.perf-wsel-conn { color: #15803d; font-size: 0.7rem; }
.perf-wsel-avatar { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; overflow: hidden; background: var(--border); flex-shrink: 0; }
.perf-wsel-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.perf-wsel-avatar-initials { font-size: 0.55rem; font-weight: 700; color: var(--text-muted); }

/* Comparison */
.perf-metric-cmp { font-size: 0.72rem; font-weight: 700; margin-top: 0.2rem; }
.perf-metric-prev { font-size: 0.64rem; color: var(--text-muted); }
.perf-metric-cmp.is-up, .perf-up { color: #15803d; }
.perf-metric-cmp.is-down, .perf-down { color: #b91c1c; }
.perf-kv-cmp { font-size: 0.68rem; font-weight: 700; margin-top: 0.15rem; }

@media (max-width: 640px) {
  .perf-filter { max-width: none; flex: 1 1 8rem; }
  .perf-tabsearch { margin-left: 0; max-width: none; flex: 1 1 100%; }
  .perf-wsel-btn { max-width: none; width: 100%; }
}
</style>
