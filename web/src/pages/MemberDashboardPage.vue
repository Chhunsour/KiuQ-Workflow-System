<template>
  <div class="md-page">
    <!-- Header -->
    <div class="md-header">
      <div class="md-header-left">
        <div class="md-avatar">
          <img
            v-if="auth.profile?.avatarUrl"
            :src="auth.profile.avatarUrl"
            alt=""
            class="md-avatar-img cursor-pointer transition hover:scale-110"
            @click.prevent.stop="openPhotoPreview"
          />
          <span v-else class="md-avatar-initials">{{ initials }}</span>
        </div>
        <div>
          <h1 class="md-greeting">{{ greeting }}, {{ firstName }}</h1>
          <p class="md-date">{{ todayFormatted }}</p>
        </div>
      </div>
      <div class="md-header-actions">
        <RouterLink to="/work-board/my" class="md-header-btn md-header-btn--primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          My Work Board
        </RouterLink>
      </div>
    </div>

    <!-- My Attention Required Card -->
    <div v-if="hasAttentionRequired" class="md-attention-card">
      <div class="md-attention-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="text-status-needs-fix-fg animate-pulse">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h2 class="md-attention-title">My Attention Required</h2>
      </div>
      <div class="md-attention-grid">
        <!-- Overdue Tasks -->
        <RouterLink v-if="overdueTasksCount > 0" to="/work-board/my" class="md-attention-item border-l-4 border-status-needs-fix-fg">
          <div class="md-attention-item-info">
            <span class="md-attention-count text-status-needs-fix-fg">{{ overdueTasksCount }}</span>
            <span class="md-attention-label">Overdue Tasks</span>
          </div>
          <svg class="md-attention-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </RouterLink>

        <!-- New Tasks -->
        <RouterLink v-if="newTasksCount > 0" to="/work-board/my" class="md-attention-item border-l-4 border-status-pending-fg">
          <div class="md-attention-item-info">
            <span class="md-attention-count text-status-pending-fg">{{ newTasksCount }}</span>
            <span class="md-attention-label">New Tasks</span>
          </div>
          <svg class="md-attention-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </RouterLink>

        <!-- Pending Follow-ups -->
        <RouterLink v-if="followupDueCount > 0" to="/followup" class="md-attention-item border-l-4 border-primary">
          <div class="md-attention-item-info">
            <span class="md-attention-count text-primary">{{ followupDueCount }}</span>
            <span class="md-attention-label">Pending Follow-Ups</span>
          </div>
          <svg class="md-attention-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </RouterLink>

        <!-- Quality Check Issues -->
        <RouterLink v-if="myQualityIssuesCount > 0" to="/work-board/quality-check" class="md-attention-item border-l-4 border-purple-500">
          <div class="md-attention-item-info">
            <span class="md-attention-count text-purple-600 dark:text-purple-400">{{ myQualityIssuesCount }}</span>
            <span class="md-attention-label">Quality Check Issues</span>
          </div>
          <svg class="md-attention-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </RouterLink>
      </div>
    </div>

    <!-- Summary stat cards -->
    <div class="md-stats">
      <div class="md-stat md-stat--tasks" :class="{ 'md-stat--alert': myNeedsFixCount > 0 && activeStatKey === null }">
        <div class="md-stat-top">
          <div class="md-stat-icon md-stat-icon--tasks">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span class="md-stat-num">{{ myAssignments.length || 0 }}</span>
        </div>
        <div class="md-stat-text">
          <span class="md-stat-label">My Tasks</span>
          <span class="md-stat-helper">Assigned this month</span>
        </div>
      </div>

      <div class="md-stat md-stat--progress">
        <div class="md-stat-top">
          <div class="md-stat-icon md-stat-icon--progress">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
          </div>
          <span class="md-stat-num">{{ inProgressCount || 0 }}</span>
        </div>
        <div class="md-stat-text">
          <span class="md-stat-label">In Progress</span>
          <span class="md-stat-helper">Currently active</span>
        </div>
      </div>

      <div class="md-stat md-stat--review">
        <div class="md-stat-top">
          <div class="md-stat-icon md-stat-icon--review">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <span class="md-stat-num">{{ waitingReviewCount || 0 }}</span>
        </div>
        <div class="md-stat-text">
          <span class="md-stat-label">Waiting Review</span>
          <span class="md-stat-helper">Submitted to admin</span>
        </div>
      </div>

      <div class="md-stat md-stat--fix" :class="{ 'md-stat--danger': myNeedsFixCount > 0 }">
        <div class="md-stat-top">
          <div class="md-stat-icon md-stat-icon--fix">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
          </div>
          <span class="md-stat-num">{{ myNeedsFixCount || 0 }}</span>
        </div>
        <div class="md-stat-text">
          <span class="md-stat-label">Needs Fix</span>
          <span class="md-stat-helper">Admin requested changes</span>
        </div>
      </div>

      <div class="md-stat md-stat--done">
        <div class="md-stat-top">
          <div class="md-stat-icon md-stat-icon--done">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <span class="md-stat-num">{{ myApprovedCount || 0 }}</span>
        </div>
        <div class="md-stat-text">
          <span class="md-stat-label">Completed</span>
          <span class="md-stat-helper">Approved or done</span>
        </div>
      </div>

      <div class="md-stat md-stat--followup">
        <div class="md-stat-top">
          <div class="md-stat-icon md-stat-icon--followup">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <span class="md-stat-num">{{ followupDueCount || 0 }}</span>
        </div>
        <div class="md-stat-text">
          <span class="md-stat-label">Followups Due</span>
          <span class="md-stat-helper">Today or this week</span>
        </div>
      </div>
    </div>

    <!-- Needs Fix alert banner -->
    <div v-if="myNeedsFixCount > 0" class="md-alert-banner">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <span><strong>{{ myNeedsFixCount }} task{{ myNeedsFixCount > 1 ? 's' : '' }}</strong> need{{ myNeedsFixCount === 1 ? 's' : '' }} fixing. Open your work board to see admin feedback and resubmit.</span>
      <RouterLink to="/work-board/my" class="md-alert-btn">Fix Now</RouterLink>
    </div>

    <!-- Today's Followups -->
    <section v-if="anyFollowupCardVisible" class="md-tf">
      <div class="md-tf-header">
        <h2 class="md-tf-title">Today's Followups</h2>
        <RouterLink to="/followup" class="md-tf-header-link">View all</RouterLink>
      </div>
      <div class="md-tf-grid">

        <!-- Blog Followup (Tue & Sat only) -->
        <div v-if="showBlogCard" class="md-tf-card md-tf-card--blog" :class="{ 'md-tf-card--done': blogTodayStatus === 'done' }">
          <div class="md-tf-top">
            <div class="md-tf-icon md-tf-icon--blog">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </div>
            <span class="md-fu-badge" :class="fuBadgeClass(blogTodayStatus)">{{ fuBadgeLabel(blogTodayStatus) }}</span>
          </div>
          <div class="md-tf-info">
            <span class="md-tf-name">Blog Followup</span>
            <span class="md-tf-sub">{{ blogProgressText || 'Required Tue & Sat' }}</span>
          </div>
          <div class="md-tf-actions">
            <button
              class="md-tf-btn"
              type="button"
              :disabled="savingFu === 'blog' || blogTodayStatus === 'done'"
              @click="markBlogDone"
            >
              <svg v-if="blogTodayStatus === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {{ blogTodayStatus === 'done' ? 'Done' : (savingFu === 'blog' ? 'Saving…' : 'Mark Done') }}
            </button>
            <RouterLink to="/followup/blog" class="md-tf-link">Open</RouterLink>
          </div>
        </div>

        <!-- Plugin Update (weekly) -->
        <div v-if="showPluginCard" class="md-tf-card md-tf-card--plugin" :class="{ 'md-tf-card--done': pluginWeekStatus === 'done' }">
          <div class="md-tf-top">
            <div class="md-tf-icon md-tf-icon--plugin">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <span class="md-fu-badge" :class="fuBadgeClass(pluginWeekStatus)">{{ fuBadgeLabel(pluginWeekStatus) }}</span>
          </div>
          <div class="md-tf-info">
            <span class="md-tf-name">Plugin Update</span>
            <span class="md-tf-sub">Once per week</span>
          </div>
          <div class="md-tf-actions">
            <button
              class="md-tf-btn"
              type="button"
              :disabled="savingFu === 'plugin' || pluginWeekStatus === 'done'"
              @click="markPluginDone"
            >
              <svg v-if="pluginWeekStatus === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {{ pluginWeekStatus === 'done' ? 'Done' : (savingFu === 'plugin' ? 'Saving…' : 'Mark Done') }}
            </button>
            <RouterLink to="/followup/plugins" class="md-tf-link">Open</RouterLink>
          </div>
        </div>

        <!-- eBay Click Followup (Mon–Sat) -->
        <div v-if="showEbayCard" class="md-tf-card md-tf-card--ebay" :class="{ 'md-tf-card--done': ebayTodayStatus === 'done' }">
          <div class="md-tf-top">
            <div class="md-tf-icon md-tf-icon--ebay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <span class="md-fu-badge" :class="fuBadgeClass(ebayTodayStatus)">{{ ebayBadgeLabel }}</span>
          </div>
          <div class="md-tf-info">
            <span class="md-tf-name">eBay Click</span>
            <span class="md-tf-sub">Required Mon – Sat</span>
          </div>
          <div class="md-tf-actions">
            <button
              class="md-tf-btn"
              type="button"
              :disabled="savingFu === 'ebay' || ebayTodayStatus === 'done'"
              @click="markEbayDone"
            >
              <svg v-if="ebayTodayStatus === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {{ ebayTodayStatus === 'done' ? ebayBadgeLabel : (savingFu === 'ebay' ? 'Saving…' : 'Mark Done') }}
            </button>
            <RouterLink to="/followup/ebay-click" class="md-tf-link">Open</RouterLink>
          </div>
        </div>

        <!-- Website Optimization (weekly) -->
        <div v-if="showSpeedCard" class="md-tf-card md-tf-card--speed" :class="{ 'md-tf-card--done': speedWeekStatus === 'done' }">
          <div class="md-tf-top">
            <div class="md-tf-icon md-tf-icon--speed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></svg>
            </div>
            <span class="md-fu-badge" :class="fuBadgeClass(speedWeekStatus)">{{ fuBadgeLabel(speedWeekStatus) }}</span>
          </div>
          <div class="md-tf-info">
            <span class="md-tf-name">Website Optimization</span>
            <span class="md-tf-sub">Once per week</span>
          </div>
          <div class="md-tf-actions">
            <button
              class="md-tf-btn"
              type="button"
              :disabled="savingFu === 'speed' || speedWeekStatus === 'done'"
              @click="markSpeedDone"
            >
              <svg v-if="speedWeekStatus === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {{ speedWeekStatus === 'done' ? 'Done' : (savingFu === 'speed' ? 'Saving…' : 'Mark Done') }}
            </button>
            <RouterLink to="/followup/speed-optimization" class="md-tf-link">Open</RouterLink>
          </div>
        </div>

      </div>

      <div v-if="fuActionError" class="md-tf-error">{{ fuActionError }}</div>
    </section>

    <!-- Main layout -->
    <div class="md-main">

      <!-- LEFT: Focus + Feedback -->
      <div class="md-col-main">

        <!-- Today / This Week Focus -->
        <div class="md-card">
          <div class="md-card-head">
            <div class="md-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Today's Focus
            </div>
            <RouterLink to="/work-board/my" class="md-card-link">View all</RouterLink>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="md-focus-skeleton">
            <div v-for="i in 3" :key="i" class="md-skel md-skel--task" />
          </div>

          <!-- Empty state -->
          <div v-else-if="focusTasks.length === 0" class="md-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <p class="md-empty-title">No urgent tasks right now</p>
            <p class="md-empty-sub">Check Docs, Resources, or Followup while waiting for assigned work.</p>
            <div class="md-empty-actions">
              <RouterLink to="/docs" class="md-empty-btn">Open Docs</RouterLink>
              <RouterLink to="/followup" class="md-empty-btn">Open Followup</RouterLink>
              <RouterLink to="/websites/my" class="md-empty-btn">My Websites</RouterLink>
            </div>
          </div>

          <!-- Task list -->
          <div v-else class="md-task-list">
            <div
              v-for="task in focusTasks"
              :key="task.id"
              class="md-task"
              :class="`md-task--${task.status}`"
            >
              <div class="md-task-left">
                <span class="md-task-status-dot" :class="`dot--${task.status}`" />
                <div class="md-task-info">
                  <span class="md-task-title">{{ task.title }}</span>
                  <div class="md-task-meta">
                    <span v-if="task.websiteName" class="md-task-site">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
                      {{ task.websiteName }}
                    </span>
                    <span v-if="task.dueDate" class="md-task-due" :class="{ 'due--overdue': task.isOverdue }">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      {{ task.dueDate }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="md-task-right">
                <span class="md-task-badge" :class="`tbadge--${task.status}`">{{ statusLabel(task.status) }}</span>
                <RouterLink :to="`/work-board/my`" class="md-task-open-btn">
                  Open
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT: Shortcuts sidebar -->
      <div class="md-col-side">

        <!-- Work Board shortcut -->
        <div class="md-shortcut-card md-shortcut-card--board">
          <div class="md-shortcut-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </div>
          <div class="md-shortcut-text">
            <div class="md-shortcut-title">My Work Board</div>
            <div class="md-shortcut-sub">View and manage your assigned tasks</div>
          </div>
          <RouterLink to="/work-board/my" class="md-shortcut-btn">
            Open
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </RouterLink>
        </div>

        <!-- My Websites -->
        <div class="md-card">
          <div class="md-card-head">
            <div class="md-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
              My Websites
            </div>
            <RouterLink to="/websites/my" class="md-card-link">View all</RouterLink>
          </div>

          <div v-if="loading" class="md-focus-skeleton">
            <div v-for="i in 3" :key="i" class="md-skel md-skel--site" />
          </div>

          <div v-else-if="myWebsites.length === 0" class="md-empty md-empty--sm">
            <p class="md-empty-title">No websites yet.</p>
            <RouterLink to="/websites/new" class="md-empty-btn">Add Website</RouterLink>
          </div>

          <div v-else class="md-site-list">
            <RouterLink
              v-for="w in myWebsites"
              :key="w.id"
              :to="`/websites/my`"
              class="md-site-row"
            >
              <div class="md-site-avatar">
                <img v-if="w.faviconUrl" :src="w.faviconUrl" alt="" class="md-site-favicon" @error="(e) => ((e.target as HTMLImageElement).style.display='none')" />
                <span v-else>{{ w.name.slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="md-site-info">
                <span class="md-site-name">{{ w.name }}</span>
                <span class="md-site-domain">{{ w.domain || 'No domain' }}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="md-site-arrow"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </RouterLink>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useImagePreviewStore } from '@/stores/imagePreview';

const previewStore = useImagePreviewStore();
const openPhotoPreview = () => {
  if (auth.profile?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: auth.profile.avatarUrl,
      fullName: auth.profile.fullName,
      email: auth.profile.email,
      role: auth.profile.role
    });
  }
};
import { useDataStore } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { useNotificationsStore } from '@/stores/notifications';
import { useQualityCheckStore } from '@/stores/qualityCheck';
import { roleLabel } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { usePageRealtime, debounceRealtime } from '@/services/realtimeService';

const auth     = useAuthStore();
const data     = useDataStore();
const followup = useFollowupStore();
const notifsStore = useNotificationsStore();
const qcStore = useQualityCheckStore();

// Live updates: assignments, followups and quality issues are patched into their
// stores reactively (so the cards/counts update), and we debounce-refetch the
// summary RPC when an underlying table changes — no manual refresh needed.
const memberSummaryTables = new Set([
  'prompt_assignments',
  'section_tasks',
  'submissions',
  'blog_upload_slots',
  'plugin_update_slots',
  'speed_optimization_slots',
  'ebay_click_followup',
  'quality_issues',
  'websites'
]);
const refetchMemberSummary = debounceRealtime(() => {
  void data.fetchDashboardSummary();
}, 800);
usePageRealtime(
  [
    'prompt_assignments',
    'section_tasks',
    'submissions',
    'blog_upload_slots',
    'blog_followup_schedules',
    'plugin_update_slots',
    'speed_optimization_slots',
    'ebay_click_followup',
    'quality_issues',
    'websites'
  ],
  (payload) => {
    if (memberSummaryTables.has(payload.table)) refetchMemberSummary();
  }
);

const overdueTasksCount = computed(() => {
  return myAssignments.value.filter((a) => {
    const dueDate = a.dueDate || data.projectById(a.projectId)?.deadline || '';
    const activeStatus = ['pending', 'in_progress', 'needs_fix', 'needs_resubmission'].includes(a.status);
    return activeStatus && !!dueDate && dueDate < todayStr;
  }).length;
});

const newTasksCount = computed(() => {
  return notifsStore.notifications.filter(
    (n) => (n.type === 'task_assigned' || n.type === 'task_needs_fix') && !n.acknowledgedAt && !n.isRead
  ).length;
});

const myQualityIssuesCount = computed(() => {
  const uid = auth.user?.id;
  return qcStore.issues.filter(
    (i) => i.assignedTo === uid && i.status !== 'approved'
  ).length;
});

const hasAttentionRequired = computed(() => {
  return overdueTasksCount.value > 0 || newTasksCount.value > 0 || followupDueCount.value > 0 || myQualityIssuesCount.value > 0;
});

const loading = ref(false);
const activeStatKey = ref<string | null>(null);

// ── Profile ───────────────────────────────────────────────────────────────────
const firstName = computed(() => auth.profile?.fullName?.split(' ')[0] ?? 'there');
const initials  = computed(() => {
  const name = auth.profile?.fullName ?? '';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
});

const todayFormatted = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
);

// ── Computed from store ───────────────────────────────────────────────────────
const myAssignments   = computed(() => data.myAssignments);
const mySectionTasks  = computed(() => data.mySectionTasks);
const myNeedsFixCount = computed(() => data.myNeedsFixCount);
const myApprovedCount = computed(() => data.myApprovedCount);

const inProgressCount = computed(() =>
  myAssignments.value.filter((a) => a.status === 'in_progress').length +
  mySectionTasks.value.filter((t) => t.status === 'in_progress').length
);

const waitingReviewCount = computed(() =>
  myAssignments.value.filter((a) => a.status === 'submitted').length
);

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = localIso(new Date());

interface FocusTask {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  isOverdue: boolean;
  websiteName: string;
}

const focusTasks = computed((): FocusTask[] => {
  const tasks: FocusTask[] = [];

  for (const a of myAssignments.value) {
    const isUrgent = a.priority === 'urgent';
    const dueDate  = a.dueDate || data.projectById(a.projectId)?.deadline || '';
    const isDueToday = dueDate === todayIso;
    const isNeedsFix = a.status === 'needs_fix';
    const isInProgress = a.status === 'in_progress';
    const isSubmitted = a.status === 'submitted';

    if (isNeedsFix || isDueToday || isUrgent || isInProgress || isSubmitted) {
      const website = a.websiteId ? data.websiteById(a.websiteId) : null;
      const projectWebsiteId = data.projectById(a.projectId)?.websiteId;
      const wsName = website?.name ?? (projectWebsiteId ? data.websiteById(projectWebsiteId)?.name : '') ?? '';

      tasks.push({
        id:          a.id,
        title:       data.promptById(a.promptId)?.title ?? 'Assigned task',
        status:      a.status,
        dueDate,
        isOverdue:   !!dueDate && dueDate < todayIso,
        websiteName: wsName,
      });
    }
  }

  // Priority order: needs_fix → in_progress → submitted → rest
  const order: Record<string, number> = { needs_fix: 0, in_progress: 1, submitted: 2, pending: 3 };
  tasks.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return tasks.slice(0, 5);
});

// ── My websites ───────────────────────────────────────────────────────────────
const currentUserId = computed(() => auth.user?.id ?? '');

const myWebsites = computed(() =>
  data.websites
    .filter((w) => w.createdBy === currentUserId.value)
    .slice(0, 5)
);

// ── Team (directory preview) ────────────────────────────────────────────────
// Reads the privacy-safe `team_directory` view — no presence / activity data.
interface DirectoryTeammate {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string;
}
const teammates = ref<DirectoryTeammate[]>([]);

const fetchTeammates = async () => {
  const { data: rows, error } = await supabase
    .rpc('get_team_directory')
    .select('id, full_name, email, role, avatar_url')
    .order('full_name', { ascending: true });
  if (error || !rows) return;
  teammates.value = (rows as any[])
    .filter((r) => r.id !== currentUserId.value)
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      fullName: r.full_name ?? '',
      email: r.email ?? '',
      role: r.role ?? 'member',
      avatarUrl: r.avatar_url ?? ''
    }));
};

const memberInitials = (name: string) =>
  (name || '?')
    .split(/[\s@.]+/)
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

// ── Followup summary ──────────────────────────────────────────────────────────
const getThisWeekMonday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localIso(d);
};

const thisWeekMonday = getThisWeekMonday();
const todayStr       = localIso(new Date());

const myBlogSlots = computed(() =>
  followup.blogSlots.filter((s) => s.websiteId && myWebsites.value.some((w) => w.id === s.websiteId))
);

const myPluginSlots = computed(() =>
  followup.pluginSlots.filter((s) => s.websiteId && myWebsites.value.some((w) => w.id === s.websiteId))
);

const mySpeedSlots = computed(() => {
  const uid = auth.user?.id ?? '';
  return followup.speedSlots.filter(
    (s) =>
      (s.websiteId && myWebsites.value.some((w) => w.id === s.websiteId)) ||
      s.assignedTo === uid
  );
});

const blogThisWeekDone = computed(() =>
  myBlogSlots.value.some(
    (s) => s.scheduledDate >= thisWeekMonday && s.scheduledDate <= todayStr &&
           (s.status === 'done' || s.status === 'late')
  )
);

const blogThisWeekMissed = computed(() =>
  !blogThisWeekDone.value &&
  myBlogSlots.value.some(
    (s) => s.scheduledDate < todayStr && s.status === 'missed'
  )
);

const pluginThisWeekDone = computed(() =>
  myPluginSlots.value.some((s) => s.weekStart === thisWeekMonday && s.status === 'done')
);

const pluginThisWeekMissed = computed(() =>
  !pluginThisWeekDone.value &&
  myPluginSlots.value.some((s) => s.weekStart < thisWeekMonday && s.status === 'missed')
);

const speedThisWeekDone = computed(() =>
  mySpeedSlots.value.some((s) => s.weekStart === thisWeekMonday && s.status === 'done')
);

const speedThisWeekMissed = computed(() =>
  !speedThisWeekDone.value &&
  mySpeedSlots.value.some((s) => s.weekStart < thisWeekMonday && s.status === 'missed')
);

// ── Today's Followups shortcuts ───────────────────────────────────────────────
type FuStatus = 'pending' | 'done' | 'missed';

// Day of week: 0=Sun, 2=Tue, 6=Sat
const todayDow = new Date().getDay();

// Blog: only required Tue & Sat
const showBlogCard = computed(() => todayDow === 2 || todayDow === 6);
const blogTodayStatus = computed<FuStatus>(() => {
  const todaySlots = myBlogSlots.value.filter((s) => s.scheduledDate === todayStr);
  if (todaySlots.some((s) => s.status === 'done' || s.status === 'late')) return 'done';
  if (todaySlots.length > 0 && todaySlots.every((s) => s.status === 'missed')) return 'missed';
  return 'pending';
});
const blogProgressText = computed(() => {
  const todaySlots = myBlogSlots.value.filter((s) => s.scheduledDate === todayStr);
  if (todaySlots.length === 0) return '';
  const done = todaySlots.filter((s) => s.status === 'done' || s.status === 'late').length;
  return `${done}/${todaySlots.length} websites`;
});

// Plugin: once per week — show until done this week
const pluginWeekStatus = computed<FuStatus>(() => {
  if (pluginThisWeekDone.value) return 'done';
  if (pluginThisWeekMissed.value) return 'missed';
  return 'pending';
});
const showPluginCard = computed(() => !pluginThisWeekDone.value || pluginWeekStatus.value === 'done');

// eBay: required Mon–Sat; Sunday = no work day
const showEbayCard = computed(() => todayDow !== 0);
const ebayTodayEntry = computed(() => {
  const uid = auth.user?.id;
  if (!uid) return null;
  return followup.ebayEntries.find(
    (e) => e.userId === uid && e.date === todayStr && e.status === 'done'
  ) ?? null;
});
const ebayTodayStatus = computed<FuStatus>(() => {
  return ebayTodayEntry.value ? 'done' : 'pending';
});
const ebayBadgeLabel = computed(() => {
  const source = ebayTodayEntry.value?.completionSource;
  if (source === 'admin_auto_fill') return 'Admin Auto Completed';
  if (source === 'not_required_today') return 'Not Required Today';
  if (source === 'admin_manual') return 'Admin Completed';
  return fuBadgeLabel(ebayTodayStatus.value);
});

const speedWeekStatus = computed<FuStatus>(() => {
  if (speedThisWeekDone.value) return 'done';
  if (speedThisWeekMissed.value) return 'missed';
  return 'pending';
});
const showSpeedCard = computed(() => true);

const fuBadgeClass = (s: FuStatus) =>
  s === 'done' ? 'fubadge--done' : s === 'missed' ? 'fubadge--missed' : 'fubadge--pending';
const fuBadgeLabel = (s: FuStatus) =>
  s === 'done' ? 'Done' : s === 'missed' ? 'Missed' : 'Pending';

const anyFollowupCardVisible = computed(
  () => showBlogCard.value || showPluginCard.value || showEbayCard.value || showSpeedCard.value
);

// ── Quick "Mark Done" actions from the dashboard ──────────────────────────────
const allMyWebsiteIds = computed(() =>
  data.websites.filter((w) => w.createdBy === currentUserId.value).map((w) => w.id)
);

const savingFu = ref<'blog' | 'plugin' | 'ebay' | 'speed' | null>(null);
const fuActionError = ref('');

const markBlogDone = async () => {
  if (savingFu.value || blogTodayStatus.value === 'done') return;
  savingFu.value = 'blog';
  fuActionError.value = '';
  try {
    // Mark every pending/missed blog slot scheduled for today (across my websites)
    const todays = followup.blogSlots.filter(
      (s) =>
        allMyWebsiteIds.value.includes(s.websiteId) &&
        s.scheduledDate === todayStr &&
        s.status !== 'done' &&
        s.status !== 'late'
    );
    if (todays.length === 0) {
      fuActionError.value = 'No blog followup scheduled for today.';
      return;
    }
    for (const slot of todays) {
      await followup.upsertBlogSlot({
        id:            slot.id,
        websiteId:     slot.websiteId,
        scheduledDate: slot.scheduledDate,
        dayOfWeek:     slot.dayOfWeek,
        status:        'done',
        completedBy:   auth.user?.id,
        completedAt:   new Date().toISOString(),
      });
    }
  } catch {
    fuActionError.value = 'Could not save. Try the Followup page.';
  } finally {
    savingFu.value = null;
  }
};

const markPluginDone = async () => {
  if (savingFu.value || pluginWeekStatus.value === 'done') return;
  savingFu.value = 'plugin';
  fuActionError.value = '';
  try {
    // Mark this week's plugin slot done for every one of my websites
    const targets = followup.pluginSlots.filter(
      (s) =>
        allMyWebsiteIds.value.includes(s.websiteId) &&
        s.weekStart === thisWeekMonday &&
        s.status !== 'done'
    );
    if (targets.length === 0) {
      fuActionError.value = 'No plugin update scheduled this week.';
      return;
    }
    for (const slot of targets) {
      await followup.upsertPluginSlot({
        id:          slot.id,
        websiteId:   slot.websiteId,
        weekStart:   slot.weekStart,
        status:      'done',
        completedBy: auth.user?.id,
        completedAt: new Date().toISOString(),
      });
    }
  } catch {
    fuActionError.value = 'Could not save. Try the Followup page.';
  } finally {
    savingFu.value = null;
  }
};

const markEbayDone = async () => {
  if (savingFu.value || ebayTodayStatus.value === 'done') return;
  savingFu.value = 'ebay';
  fuActionError.value = '';
  try {
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const ok = await followup.markEbayDone(todayStr, dayName);
    if (!ok) fuActionError.value = 'Could not save. Try the Followup page.';
  } catch {
    fuActionError.value = 'Could not save. Try the Followup page.';
  } finally {
    savingFu.value = null;
  }
};

const markSpeedDone = async () => {
  if (savingFu.value || speedWeekStatus.value === 'done') return;
  savingFu.value = 'speed';
  fuActionError.value = '';
  try {
    const uid = auth.user?.id ?? null;
    const targetWebsiteIds = new Set<string>([
      ...allMyWebsiteIds.value,
      ...followup.speedSlots.filter((s) => s.assignedTo === uid).map((s) => s.websiteId)
    ]);

    if (targetWebsiteIds.size === 0) {
      fuActionError.value = 'No website optimization followup found.';
      return;
    }

    for (const websiteId of targetWebsiteIds) {
      const existing = followup.speedSlots.find(
        (s) => s.websiteId === websiteId && s.weekStart === thisWeekMonday
      );
      await followup.upsertSpeedSlot({
        id:          existing?.id,
        websiteId,
        weekStart:   thisWeekMonday,
        status:      'done',
        assignedTo:  existing?.assignedTo ?? uid,
        completedBy: uid,
        completedAt: new Date().toISOString(),
      });
    }
  } catch {
    fuActionError.value = 'Could not save. Try the Followup page.';
  } finally {
    savingFu.value = null;
  }
};

// Followup due = blog slots pending today + plugin slot pending this week
const followupDueCount = computed(() => {
  let count = 0;
  if (!blogThisWeekDone.value) {
    const pendingToday = myBlogSlots.value.filter(
      (s) => s.scheduledDate === todayStr && s.status === 'pending'
    );
    count += pendingToday.length;
  }
  if (!pluginThisWeekDone.value) count++;
  if (!speedThisWeekDone.value) count++;
  return count;
});

// ── Label helpers ─────────────────────────────────────────────────────────────
const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending:           'Pending',
    in_progress:       'In Progress',
    submitted:         'Waiting Review',
    needs_fix:         'Needs Fix',
    approved:          'Approved',
    rejected:          'Rejected',
    needs_resubmission:'Resubmit',
  };
  return map[s] ?? s;
};

const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Load ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true;
  try {
    await data.fetchDashboardSummary();
    await data.fetchWebsites();
    await fetchTeammates();
    // Light followup fetch (no ensureSlots — just surface what's there)
    await followup.fetchBlogSlots();
    await followup.fetchPluginSlots();
    await followup.fetchEbayEntries();
    await followup.fetchSpeedSlots();
    // Fetch quality issues and notifications
    await qcStore.fetchIssues();
    await notifsStore.fetchNotifications(100);
  } catch {
    // silent — dashboard should not block on error
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.md-page {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  padding-bottom: 3rem;
}

/* ── My Attention Required Card ───────────────────────────────────────── */
.md-attention-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
}
.md-attention-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
}
.md-attention-title {
  font-family: 'Raleway', sans-serif;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
}
.md-attention-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.md-attention-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.1rem;
  background: var(--soft-bg, #f8fafc);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 140ms ease, box-shadow 140ms ease;
  box-shadow: inset 0 0 0 1px var(--border);
}
.md-attention-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06), inset 0 0 0 1px var(--border);
}
.md-attention-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.md-attention-count {
  font-family: 'Jost Numbers', sans-serif;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1;
}
.md-attention-label {
  font-size: 0.76rem;
  font-weight: 750;
  color: var(--text-muted);
}
.md-attention-arrow {
  color: var(--text-muted);
  opacity: 0.6;
  transition: transform 140ms ease, opacity 140ms ease;
}
.md-attention-item:hover .md-attention-arrow {
  transform: translateX(3px);
  opacity: 1;
  color: var(--primary);
}

/* ── Header ── */
.md-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
}

.md-header-left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
}

.md-avatar {
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 900;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}
.md-avatar-img { width: 100%; height: 100%; object-fit: cover; }

.md-greeting {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.01em;
}

.md-date {
  font-size: 0.76rem;
  color: var(--text-muted);
  margin: 0.18rem 0 0;
  font-weight: 600;
}

.md-header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.md-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.5rem 0.95rem;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-main);
  text-decoration: none;
  transition: transform 140ms ease, border-color 140ms, background 140ms, box-shadow 140ms;
  white-space: nowrap;
}
.md-header-btn:hover {
  background: var(--soft-bg);
  border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
  transform: translateY(-1px);
}
.md-header-btn--primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.md-header-btn--primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

/* ── Stats ── */
/* One connected KPI bar: a single bordered surface whose 1px grid gap
   reveals the divider color, so the six metrics read as joined segments
   (and the dividers stay correct even when the grid wraps on mobile). */
.md-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.md-stat {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  background: var(--card-bg);
  padding: 0.95rem 1rem;
  transition: background 150ms ease;
}

.md-stat:hover {
  background: var(--soft-bg);
}

.md-stat--danger {
  background: color-mix(in srgb, #dc2626 5%, var(--card-bg));
}

.md-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.md-stat-icon {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
}

/* Restrained palette: flow-state metrics share the brand blue; only the
   two metrics that carry genuine meaning keep a semantic accent
   (red = needs attention, green = completed). */
.md-stat-icon--tasks    { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.md-stat-icon--progress { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.md-stat-icon--review   { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.md-stat-icon--fix      { background: rgba(220,38,38,0.13); color: #dc2626; }
.md-stat-icon--done     { background: rgba(22,163,74,0.13); color: #16a34a; }
.md-stat-icon--followup { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
:root[data-theme='dark-gray'] .md-stat-icon--fix  { color: #f87171; }
:root[data-theme='dark-gray'] .md-stat-icon--done { color: #4ade80; }

.md-stat-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.85rem;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1;
  letter-spacing: -0.02em;
}

.md-stat-text { display: flex; flex-direction: column; gap: 0.18rem; }

.md-stat-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.15;
}

.md-stat-helper {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  line-height: 1.25;
}

/* ── Alert banner ── */
.md-alert-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: rgba(220,38,38,0.07);
  border: 1px solid rgba(220,38,38,0.3);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  color: #dc2626;
  flex-wrap: wrap;
}
.md-alert-banner svg { flex-shrink: 0; }
.md-alert-banner span { flex: 1; min-width: 0; }
.md-alert-btn {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.28rem 0.75rem;
  border-radius: 7px;
  background: #dc2626;
  color: #fff;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.md-alert-btn:hover { opacity: 0.9; }

/* ── Main layout ── */
.md-main {
  display: grid;
  grid-template-columns: 1fr 18rem;
  gap: 1rem;
  align-items: start;
}

/* ── Card base ── */
.md-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: var(--shadow-sm);
}

.md-col-main { display: flex; flex-direction: column; gap: 1rem; }
.md-col-side  { display: flex; flex-direction: column; gap: 0.85rem; }

.md-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.md-card-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-main);
}
.md-card-title svg { color: var(--primary); flex-shrink: 0; }

.md-card-link {
  font-size: 0.73rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
}
.md-card-link:hover { opacity: 0.75; }

/* ── Skeleton ── */
.md-focus-skeleton { display: flex; flex-direction: column; gap: 0.5rem; }
.md-skel {
  border-radius: 10px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: md-pulse 1.4s ease-in-out infinite;
}
.md-skel--task     { height: 4rem; }
.md-skel--feedback { height: 3.5rem; }
.md-skel--site     { height: 2.8rem; }
@keyframes md-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Empty states ── */
.md-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  padding: 1.5rem 1rem;
}
.md-empty--sm { padding: 0.75rem 0.5rem; }

.md-empty-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.md-empty-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
  max-width: 28rem;
}

.md-empty-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.25rem;
}

.md-empty-btn {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.32rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--text-main);
  text-decoration: none;
  transition: background 120ms;
}
.md-empty-btn:hover { background: var(--card-bg); }

/* ── Task list ── */
.md-task-list { display: flex; flex-direction: column; gap: 0.45rem; }

.md-task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.65rem 0.85rem;
  flex-wrap: wrap;
  transition: border-color 140ms;
}

.md-task--needs_fix { border-left: 3px solid #dc2626; background: color-mix(in srgb, #dc2626 3%, var(--soft-bg)); }
.md-task--in_progress { border-left: 3px solid var(--primary); }
.md-task--submitted  { border-left: 3px solid color-mix(in srgb, var(--primary) 55%, var(--border)); }

.md-task-left {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.md-task-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}
.dot--needs_fix  { background: #dc2626; }
.dot--in_progress { background: var(--primary); }
.dot--submitted  { background: color-mix(in srgb, var(--primary) 60%, var(--text-muted)); }
.dot--pending    { background: var(--text-muted); opacity: 0.5; }
.dot--approved   { background: #16a34a; }

.md-task-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }

.md-task-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-task-meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.md-task-site,
.md-task-due {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.md-task-due.due--overdue { color: #dc2626; font-weight: 700; }

.md-task-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.md-task-badge {
  font-size: 0.65rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
}
.tbadge--needs_fix  { background: rgba(220,38,38,0.12); color: #dc2626; }
.tbadge--in_progress { background: var(--primary-soft); color: var(--primary); }
.tbadge--submitted  { background: var(--soft-bg); color: var(--text-muted); }
.tbadge--pending    { background: var(--soft-bg); color: var(--text-muted); border: 1px solid var(--border); }
.tbadge--approved   { background: rgba(22,163,74,0.12); color: #16a34a; }

.md-task-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  padding: 0.22rem 0.55rem;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  background: color-mix(in srgb, var(--primary) 6%, transparent);
  white-space: nowrap;
  transition: background 120ms;
}
.md-task-open-btn:hover { background: color-mix(in srgb, var(--primary) 12%, transparent); }

/* ── Feedback ── */
.md-feedback-list { display: flex; flex-direction: column; gap: 0.45rem; }

.md-feedback-item {
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 0.65rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: var(--soft-bg);
}
.fb--needs_fix { border-left: 3px solid #dc2626; }
.fb--rejected  { border-left: 3px solid #dc2626; }
.fb--approved  { border-left: 3px solid #16a34a; }

.md-fb-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.md-fb-badge {
  font-size: 0.65rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
}
.fbbadge--needs_fix { background: rgba(220,38,38,0.12); color: #dc2626; }
.fbbadge--rejected  { background: rgba(220,38,38,0.12); color: #dc2626; }
.fbbadge--approved  { background: rgba(22,163,74,0.12); color: #16a34a; }

.md-fb-date { font-size: 0.68rem; color: var(--text-muted); }

.md-fb-note {
  font-size: 0.78rem;
  color: var(--text-main);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ── Shortcut card ── */
.md-shortcut-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.95rem 1rem;
  box-shadow: var(--shadow-sm);
}

/* Primary CTA — clean solid blue, no gradients or glows. */
.md-shortcut-card--board {
  border-color: var(--primary);
  background: var(--primary);
}

.md-shortcut-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 11px;
  background: var(--primary-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.md-shortcut-card--board .md-shortcut-icon {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.md-shortcut-text { flex: 1; min-width: 0; }

.md-shortcut-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
}
.md-shortcut-card--board .md-shortcut-title { color: #fff; }

.md-shortcut-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}
.md-shortcut-card--board .md-shortcut-sub { color: rgba(255, 255, 255, 0.82); }

.md-shortcut-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.42rem 0.9rem;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 120ms ease;
  flex-shrink: 0;
}
.md-shortcut-btn:hover { opacity: 0.88; }
.md-shortcut-card--board .md-shortcut-btn {
  background: #fff;
  color: var(--primary);
}

/* ── Followup card ── */
.md-followup-card { }

.md-followup-rows { display: flex; flex-direction: column; gap: 0.45rem; }

.md-fu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
}

.md-fu-row-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.md-fu-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot--done    { background: #16a34a; }
.dot--missed  { background: #dc2626; }
.dot--pending { background: var(--text-muted); opacity: 0.4; }

.md-fu-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
}

.md-fu-sub {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.md-fu-right { flex-shrink: 0; }

.md-fu-badge {
  font-size: 0.65rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}
.fubadge--done    { background: rgba(22,163,74,0.12); color: #16a34a; }
.fubadge--missed  { background: rgba(220,38,38,0.10); color: #dc2626; }
.fubadge--pending { background: var(--soft-bg); color: var(--text-muted); border: 1px solid var(--border); }

/* ── Today's Followups ── */
.md-tf {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.md-tf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.md-tf-title {
  font-family: 'Raleway', 'Jost Numbers', sans-serif;
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.01em;
}
.md-tf-header-link {
  font-size: 0.73rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}
.md-tf-header-link:hover { opacity: 0.78; }

.md-tf-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}
.md-tf-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.95rem 1rem 0.85rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-shadow: var(--shadow-sm);
}
.md-tf-card:hover {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  box-shadow: var(--shadow-md);
}

/* Completed followups get a calm green left accent so "done" reads at a
   glance without shouting. */
.md-tf-card--done {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background: color-mix(in srgb, #16a34a 3%, var(--card-bg));
}

.md-tf-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.md-tf-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 10px;
  flex-shrink: 0;
  background: var(--primary-soft);
  color: var(--primary);
}
/* All followup types share the brand-blue tile — clean and consistent. */
.md-tf-icon--blog,
.md-tf-icon--plugin,
.md-tf-icon--ebay,
.md-tf-icon--speed { background: var(--primary-soft); color: var(--primary); }

.md-tf-info {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
}
.md-tf-name {
  font-family: 'Raleway', 'Jost Numbers', sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.01em;
}
.md-tf-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}

.md-tf-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.2rem;
}
.md-tf-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  padding: 0.45rem 0.85rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  text-decoration: none;
  transition: background 150ms ease;
  border: none;
  cursor: pointer;
}
.md-tf-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}
.md-tf-btn:disabled {
  background: color-mix(in srgb, #16a34a 90%, transparent);
  color: #fff;
  cursor: default;
  box-shadow: none;
  opacity: 0.9;
}

.md-tf-link {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  padding: 0.3rem 0.55rem;
  border-radius: 8px;
  transition: background 120ms;
}
.md-tf-link:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); }

.md-tf-error {
  margin-top: 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #dc2626;
}

@media (max-width: 1100px) {
  .md-tf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 480px) {
  .md-tf-grid { grid-template-columns: 1fr; }
}

.md-fu-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  padding: 0.32rem 0.65rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  background: color-mix(in srgb, var(--primary) 5%, transparent);
  transition: background 120ms;
  align-self: flex-start;
}
.md-fu-open-btn:hover { background: color-mix(in srgb, var(--primary) 12%, transparent); }

/* ── Sites ── */
.md-site-list { display: flex; flex-direction: column; gap: 0.35rem; }

.md-site-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: background 120ms;
}
.md-site-row:hover { background: var(--soft-bg); }

.md-site-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.md-site-favicon {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.md-site-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }

.md-site-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-site-domain { font-size: 0.68rem; color: var(--text-muted); }

.md-site-arrow { color: var(--text-muted); flex-shrink: 0; }

/* ── Team list ── */
.md-team-list { display: flex; flex-direction: column; gap: 0.2rem; }

.md-team-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: background 120ms;
}
.md-team-row:hover { background: var(--soft-bg); }

.md-team-avatar {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.md-team-avatar img { width: 100%; height: 100%; object-fit: cover; }

.md-team-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }

.md-team-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-team-role { font-size: 0.68rem; color: var(--text-muted); }

/* ── Quick links ── */
.md-quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

.md-qlink {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.5rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  transition: color 120ms, border-color 120ms, background 120ms;
}
.md-qlink svg { color: var(--primary); flex-shrink: 0; }
.md-qlink:hover { color: var(--text-main); background: var(--soft-bg); }

/* ── Responsive ── */
@media (max-width: 1180px) {
  .md-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .md-main {
    grid-template-columns: 1fr;
  }
  .md-col-side {
    order: -1; /* shortcuts above focus on mobile */
  }
}

@media (max-width: 640px) {
  .md-page {
    width: 96%;
    margin-left: auto;
    margin-right: auto;
    gap: 1.1rem;
  }
  .md-header {
    padding: 0.85rem 1rem;
    border-radius: 14px;
  }
  .md-greeting { font-size: 1.05rem; }
  .md-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
  }
  .md-stat {
    padding: 0.9rem 0.9rem 0.85rem;
    gap: 0.7rem;
  }
  .md-stat-num { font-size: 1.55rem; }
  .md-stat-icon { width: 2rem; height: 2rem; border-radius: 10px; }
  .md-stat-label { font-size: 0.78rem; }
  .md-stat-helper { font-size: 0.66rem; }
  .md-header-actions { width: 100%; }
  .md-header-btn { flex: 1; justify-content: center; }
  .md-task-badge { display: none; }
  .md-tf-card { border-radius: 14px; padding: 0.85rem 0.9rem 0.8rem; }
  .md-tf-name { font-size: 0.84rem; }
}

@media (max-width: 380px) {
  .md-stat-num { font-size: 1.4rem; }
}
</style>
