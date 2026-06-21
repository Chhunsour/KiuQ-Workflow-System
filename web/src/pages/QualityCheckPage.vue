<template>
  <div class="qc-page">
    <section class="qc-hero">
      <div class="qc-hero-copy">
        <span class="qc-hero-kicker">QUALITY WORKFLOW</span>
        <h1 class="qc-hero-title">Quality Check Board</h1>
        <p class="qc-hero-subtitle">
          Track website issues, review fixes, and manage quality checks across every website in one place.
        </p>
      </div>
      <div class="qc-hero-actions">
        <button v-if="auth.isAdmin" class="btn-secondary" type="button" @click="manageOpen = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Manage Classes
        </button>
        <button
          v-if="auth.isAdmin"
          class="btn-secondary"
          type="button"
          :disabled="qc.classes.length === 0"
          :title="qc.classes.length === 0 ? 'Create a class folder first' : 'Arrange websites into folders'"
          @click="openArrange(selectedClassId === undefined ? (qc.classes[0]?.id ?? null) : selectedClassId)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Arrange Websites
        </button>
        <button v-if="selectedWebsiteId" class="btn-primary" type="button" @click="createOpen = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Issue
        </button>
      </div>
    </section>

    <!-- ── Compact metric pills ───────────────────────────────────────── -->
    <section class="qc-metrics" aria-label="Quality metrics">
      <div class="qc-pill">
        <span class="qc-pill-ico qc-pill-ico--sites">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
        </span>
        <span class="qc-pill-num">{{ qcMetrics.websites }}</span>
        <span class="qc-pill-label">Websites</span>
      </div>
      <div class="qc-pill">
        <span class="qc-pill-dot qc-pill-dot--open" />
        <span class="qc-pill-num">{{ qcMetrics.open }}</span>
        <span class="qc-pill-label">Open</span>
      </div>
      <div class="qc-pill">
        <span class="qc-pill-dot qc-pill-dot--prog" />
        <span class="qc-pill-num">{{ qcMetrics.inProgress }}</span>
        <span class="qc-pill-label">In Progress</span>
      </div>
      <div class="qc-pill">
        <span class="qc-pill-dot qc-pill-dot--review" />
        <span class="qc-pill-num">{{ qcMetrics.review }}</span>
        <span class="qc-pill-label">Review</span>
      </div>
      <div class="qc-pill">
        <span class="qc-pill-dot qc-pill-dot--approved" />
        <span class="qc-pill-num">{{ qcMetrics.approved }}</span>
        <span class="qc-pill-label">Approved</span>
      </div>
      <div class="qc-pill qc-pill--accent">
        <span class="qc-pill-dot qc-pill-dot--fixed" />
        <span class="qc-pill-num">{{ qcMetrics.fixedToday }}</span>
        <span class="qc-pill-label">Fixed Today</span>
      </div>
      <div class="qc-pill">
        <span class="qc-pill-ico">⏱️</span>
        <span class="qc-pill-num">{{ averageResolutionTime }}</span>
        <span class="qc-pill-label">Avg Resolution</span>
      </div>
    </section>

    <!-- ── Class folder tabs ──────────────────────────────────────────── -->
    <section class="qc-classes">
      <div
        v-for="c in classCards"
        :key="c.id"
        class="qc-class-card"
        :class="{ 'qc-class-card--active': selectedClassId === c.id }"
        :style="{ '--class-accent': c.color }"
      >
        <button type="button" class="qc-class-open" @click="selectClass(c.id)">
          <!-- Header: icon tile + name + total badge -->
          <div class="qc-class-head">
            <span class="qc-class-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span class="qc-class-name">{{ c.name }}</span>
            <span class="qc-class-total" :title="`${c.total} total issue${c.total === 1 ? '' : 's'}`">
              {{ c.total }}
            </span>
          </div>

          <!-- Stats — compact 4-column grid, bold tabular numbers, muted labels -->
          <ul class="qc-class-stats">
            <li>
              <span class="qc-stat-num">{{ c.websites }}</span>
              <span class="qc-stat-label">Sites</span>
            </li>
            <li>
              <span class="qc-stat-num">{{ c.open }}</span>
              <span class="qc-stat-label">Open</span>
            </li>
            <li>
              <span class="qc-stat-num">{{ c.assigned }}</span>
              <span class="qc-stat-label">Active</span>
            </li>
            <li>
              <span class="qc-stat-num">{{ c.fixed }}</span>
              <span class="qc-stat-label">Fixed</span>
            </li>
          </ul>
        </button>

        <!-- Footer actions — quiet ghost (Arrange) + clear accent (Open) -->
        <div class="qc-class-actions">
          <button
            v-if="auth.isAdmin"
            type="button"
            class="qc-card-link"
            @click.stop="openArrange(c.id)"
          >
            Arrange
          </button>
          <button type="button" class="qc-card-link qc-card-link--accent" @click.stop="selectClass(c.id)">
            Open
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- "Unclassified" pseudo-folder for legacy websites without a class -->
      <div
        v-if="unclassifiedCard.total > 0 || qc.classes.length === 0"
        class="qc-class-card qc-class-card--unclassified"
        :class="{ 'qc-class-card--active': selectedClassId === null }"
      >
        <button type="button" class="qc-class-open" @click="selectClass(null)">
          <div class="qc-class-head">
            <span class="qc-class-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            </span>
            <span class="qc-class-name">Unclassified</span>
            <span class="qc-class-total">{{ unclassifiedCard.total }}</span>
          </div>
          <ul class="qc-class-stats qc-class-stats--narrow">
            <li>
              <span class="qc-stat-num">{{ unclassifiedCard.websites }}</span>
              <span class="qc-stat-label">Sites</span>
            </li>
            <li>
              <span class="qc-stat-num">{{ unclassifiedCard.open }}</span>
              <span class="qc-stat-label">Open</span>
            </li>
          </ul>
        </button>
        <div class="qc-class-actions">
          <button type="button" class="qc-card-link qc-card-link--accent" @click.stop="selectClass(null)">
            Open
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- Empty state when no classes exist yet -->
      <div v-if="qc.classes.length === 0" class="qc-classes-empty card card-pad">
        <div>
          <p class="qc-empty-title">No quality check folders yet.</p>
          <p class="qc-empty-sub">
            Group your saved websites (admin + member) into class folders, then track issues per folder.
          </p>
        </div>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="manageOpen = true">
          Create Folder
        </button>
      </div>
    </section>

    <!-- ── Selected class board ───────────────────────────────────────── -->
    <section v-if="selectedClassId !== undefined" class="qc-board-section">
      <div class="qc-board-meta">
        <h2 class="qc-board-title">
          <span class="qc-board-swatch" :style="{ background: selectedClassColor }" />
          {{ selectedClassName }}
        </h2>
      </div>

      <!-- Websites in this folder selector — premium dashboard widget -->
      <section v-if="websitesInSelected.length > 0" class="qc-sites-strip">
        <header class="qc-sites-head">
          <div class="qc-sites-label-wrap">
            <span class="qc-sites-label-dot" aria-hidden="true" />
            <span class="qc-sites-label">Websites in this folder</span>
            <span class="qc-sites-count">{{ websitesInSelected.length }}</span>
          </div>
          <button
            v-if="auth.isAdmin && selectedClassId !== undefined"
            type="button"
            class="qc-card-link qc-card-link--ghost"
            @click="openArrange(selectedClassId)"
          >
            Arrange
          </button>
        </header>

        <ul class="qc-sites-list">
          <li v-for="w in websitesInSelected" :key="w.id">
            <button
              type="button"
              class="qc-site-chip"
              :class="{ 'qc-site-chip--active': selectedWebsiteId === w.id }"
              :title="`Open quality board for ${w.domain || w.name}`"
              @click="selectWebsite(w.id)"
            >
              <span class="qc-site-chip-avatar">
                <img v-if="w.faviconUrl" :src="w.faviconUrl" :alt="w.name" loading="lazy" />
                <span v-else class="qc-site-chip-fallback">{{ (w.name || '?').charAt(0).toUpperCase() }}</span>
              </span>
              <span class="qc-site-chip-name">{{ w.name || 'Untitled' }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Folder has no websites: show admin prompt to arrange -->
      <div v-else class="qc-folder-empty card card-pad">
        <div>
          <p class="qc-empty-title">No websites in this folder yet.</p>
          <p class="qc-empty-sub">
            Pick from your existing saved websites — admin, team, and existing entries are all available.
          </p>
        </div>
        <button
          v-if="auth.isAdmin && selectedClassId !== undefined"
          class="btn-primary"
          type="button"
          @click="openArrange(selectedClassId)"
        >
          Arrange Websites
        </button>
      </div>

      <div v-if="selectedWebsite" class="qc-website-context">
        <div class="qc-website-context-main">
          <span class="qc-context-label">Website board</span>
          <!-- Clickable name + URL → live site in a new tab. Falls back
               to a plain span if there's no domain to open. -->
          <template v-if="selectedWebsiteUrl">
            <a
              :href="selectedWebsiteUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="qc-website-context-link"
              :title="`Open ${selectedWebsiteUrl} in a new tab`"
            >
              <strong>{{ selectedWebsite.name || 'Untitled website' }}</strong>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <a
              :href="selectedWebsiteUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="qc-website-context-url"
            >
              {{ selectedWebsite.domain }}
            </a>
          </template>
          <template v-else>
            <strong>{{ selectedWebsite.name || 'Untitled website' }}</strong>
            <span>No domain set</span>
          </template>
        </div>
        <button class="btn-secondary" type="button" @click="clearWebsiteSelection">
          Back to Class
        </button>
      </div>

      <div v-else-if="websitesInSelected.length > 0" class="qc-pick-website card card-pad">
        <div>
          <p class="qc-empty-title">Pick a website board.</p>
          <p class="qc-empty-sub">Use the website buttons above to open that website's Quality Check board.</p>
        </div>
      </div>

      <!-- Inline board (visual structure mirrors My Work Board) -->
      <div v-if="selectedWebsiteId && qc.loading && websiteIssues.length === 0" class="board-loading">
        <div v-for="col in QUALITY_STATUS_COLUMNS" :key="col.value" class="board-column skeleton-column" />
      </div>

      <div v-else-if="selectedWebsiteId" class="board-scroll">
        <div class="board-zoom-layer">
          <section
            v-for="col in QUALITY_STATUS_COLUMNS"
            :key="col.value"
            class="board-column"
            :class="{ 'is-drag-over': dragOverColumn === col.value }"
            :style="{ '--column-accent': columnAccent(col.value) }"
            @dragenter.prevent="dragOverColumn = col.value"
            @dragover.prevent="dragOverColumn = col.value"
            @dragleave="onColumnLeave($event, col.value)"
            @drop.prevent="onDrop(col.value)"
          >
            <header class="column-head">
              <div>
                <h2>{{ col.label }}</h2>
              </div>
              <span>{{ columnIssues(col.value).length }}</span>
            </header>

            <button
              v-if="col.value === 'in_progress'"
              class="add-card-mini"
              type="button"
              @click="createOpen = true"
            >
              + Add issue
            </button>

            <div class="column-card-list">
              <article
                v-for="issue in columnIssues(col.value)"
                :key="issue.id"
                class="tc-card"
                :class="{ 'tc-draggable': canMove(issue), 'tc-dragging': draggedId === issue.id }"
                :draggable="canMove(issue)"
                tabindex="0"
                @dragstart.stop="onDragStart(issue.id)"
                @dragend="onDragEnd"
                @click="openDetail(issue.id)"
                @keydown.enter.prevent="openDetail(issue.id)"
                @keydown.space.prevent="openDetail(issue.id)"
                @mouseenter="onCardEnter(issue, $event)"
                @mousemove="onHoverMove($event)"
                @mouseleave="onHoverLeave"
              >
                <!-- Manager Options Dropdown Menu -->
                <div v-if="isManager" class="tc-menu-container" @click.stop>
                  <button
                    class="tc-menu-trigger"
                    type="button"
                    title="Issue actions"
                    @click.stop="toggleCardMenu(issue.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  <div v-if="activeMenuCardId === issue.id" class="tc-menu-dropdown">
                    <button class="tc-menu-item" type="button" @click.stop="openDetail(issue.id)">Edit</button>
                    <button class="tc-menu-item" type="button" @click.stop="openDetail(issue.id)">Assign</button>
                    <button class="tc-menu-item" type="button" @click.stop="handleAlertCard(issue)">Send Alert</button>
                    <button class="tc-menu-item" type="button" @click.stop="handleReceiptsCard(issue)">View Receipts</button>
                    <div class="tc-menu-divider" />
                    <button class="tc-menu-item tc-menu-item--danger" type="button" @click.stop="handleArchiveCard(issue.id)">Archive</button>
                  </div>
                </div>

                <div
                  v-if="issue.screenshotUrl"
                  class="tc-image-container"
                  @mouseenter.stop="onImageEnter(issue, $event)"
                  @mousemove.stop="onHoverMove($event)"
                  @mouseleave.stop="onImageLeave(issue, $event)"
                >
                  <img class="tc-cover" :src="issue.screenshotUrl" :alt="issue.title" loading="lazy" />
                </div>

                <div class="tc-content">
                  <h3 class="tc-title">{{ issue.title }}</h3>
                  <!-- Website name only — the full page URL lives behind the
                       "Link" action button below so it doesn't take a whole
                       row on the card. -->
                  <span class="tc-website">{{ selectedWebsite?.domain || websiteName(issue.websiteId) }}</span>
                  <p v-if="issue.description" class="tc-desc">{{ issue.description }}</p>
                </div>

                <div class="tc-badges">
                  <span class="tc-status-pill" :class="`tc-status--${issue.status}`">{{ statusLabel(issue.status) }}</span>
                  <span class="tc-type-pill">{{ typeLabel(issue.issueType) }}</span>
                  <span v-if="issue.priority !== 'normal'" class="tc-priority-pill" :class="`tc-priority--${issue.priority}`">
                    {{ priorityLabel(issue.priority) }}
                  </span>
                  <span v-if="issue.dueDate" class="tc-due-pill">Due {{ formatDate(issue.dueDate) }}</span>
                </div>

                <!-- Alert Tracking Panel -->
                <div v-if="isManager && receiptSummaries[issue.id] && receiptSummaries[issue.id].delivered > 0" class="tc-tracking-panel" @click.stop>
                  <div class="tc-tracking-header">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Alert Status
                  </div>
                  <div class="tc-tracking-stats">
                    <span>Delivered: <strong>Yes</strong></span>
                    <span>Opened: <strong>{{ receiptSummaries[issue.id].opened > 0 ? 'Yes' : 'No' }}</strong></span>
                    <span>Acked: <strong>{{ receiptSummaries[issue.id].acknowledged === receiptSummaries[issue.id].delivered ? 'Yes' : 'No' }}</strong></span>
                  </div>
                  <div v-if="receiptSummaries[issue.id].lastAlertAt" class="tc-tracking-time">
                    Last Alert: <strong>{{ formattedAlertDate(receiptSummaries[issue.id].lastAlertAt) }}</strong>
                  </div>
                  <div class="tc-tracking-actions">
                    <button class="tc-track-btn" type="button" @click.stop="handleReceiptsCard(issue)">View Receipts</button>
                    <button class="tc-track-btn" type="button" :disabled="repushingAlerts[issue.id] || receiptSummaries[issue.id].pending === 0" @click.stop="handleRepushCard(issue.id)">
                      {{ repushingAlerts[issue.id] ? 'Nudging...' : 'Repush' }}
                    </button>
                  </div>
                </div>

                <div class="tc-footer">
                  <div v-if="issue.assignedTo && memberById(issue.assignedTo)" class="tc-member">
                    <span class="tc-avatar" :title="memberName(issue.assignedTo)">
                      <img
                        v-if="memberById(issue.assignedTo)?.avatarUrl"
                        :src="memberById(issue.assignedTo)?.avatarUrl"
                        :alt="memberName(issue.assignedTo)"
                        loading="lazy"
                        class="cursor-pointer transition hover:scale-110"
                        @click.stop.prevent="openPhotoPreview(memberById(issue.assignedTo))"
                      />
                      <span v-else>{{ initials(memberName(issue.assignedTo)) }}</span>
                    </span>
                    <span class="tc-name">{{ memberName(issue.assignedTo) }}</span>
                  </div>
                  <span v-else class="tc-unassigned">Unassigned</span>
                  <div class="tc-actions">
                    <a
                      v-if="issue.pageUrl"
                      :href="issue.pageUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="tc-link"
                      :title="`Open ${issue.pageUrl} in a new tab`"
                      @click.stop
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Link
                    </a>
                    <button
                      v-if="canEdit(issue)"
                      type="button"
                      class="tc-edit"
                      title="Edit issue"
                      @click.stop="openEdit(issue.id)"
                    >
                      Edit
                    </button>
                    <button
                      v-if="canDelete(issue)"
                      type="button"
                      class="tc-delete"
                      :title="deletingId === issue.id ? 'Click again to confirm delete' : 'Delete issue'"
                      :class="{ 'tc-delete--confirm': deletingId === issue.id }"
                      :disabled="deleteBusy === issue.id"
                      @click.stop="onDeleteClick(issue.id, $event)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 17.39 19.4A2 2 0 0 1 15.39 21H8.61A2 2 0 0 1 6.61 19.4L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      <span v-if="deletingId === issue.id">Confirm</span>
                    </button>
                    <button class="tc-open" type="button" @click.stop="openDetail(issue.id)">Open</button>
                  </div>
                </div>
              </article>

              <div v-if="columnIssues(col.value).length === 0" class="column-empty">
                No issues here.
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <!-- Modals -->
    <CreateIssueModal
      :open="createOpen"
      :website-id="selectedWebsiteId || undefined"
      :default-class-id="selectedClassId"
      :members="assignableMembers"
      @close="createOpen = false"
      @created="onCreated"
    />
    <IssueDetailModal
      :open="!!detailIssueId"
      :issue-id="detailIssueId"
      :members="assignableMembers"
      @close="detailIssueId = null"
      @edit="openEdit"
    />
    <EditIssueModal
      :open="!!editIssueId"
      :issue-id="editIssueId"
      :members="assignableMembers"
      @close="editIssueId = null"
      @saved="onIssueEdited"
    />
    <ManageClassesModal
      :open="manageOpen"
      @close="manageOpen = false"
    />
    <ArrangeWebsitesModal
      :open="arrangeFor !== undefined"
      :class-id="arrangeFor === undefined ? null : arrangeFor"
      @close="closeArrange"
    />

    <!-- Floating hover preview: large screenshot when hovering the thumbnail,
         expanded card when hovering the card body. Single shared overlay. -->
    <Teleport to="body">
      <Transition name="hp-fade">
        <div
          v-if="hoverPreview"
          class="hp-floater"
          :class="`hp-floater--${hoverPreview.kind}`"
          :style="hoverStyle"
          aria-hidden="true"
        >
          <!-- Image-only preview -->
          <img
            v-if="hoverPreview.kind === 'image'"
            :src="hoverPreview.issue.screenshotUrl ?? ''"
            :alt="hoverPreview.issue.title"
            class="hp-img"
          />

          <!-- Full-card preview -->
          <template v-else>
            <img
              v-if="hoverPreview.issue.screenshotUrl"
              :src="hoverPreview.issue.screenshotUrl"
              :alt="hoverPreview.issue.title"
              class="hp-card-img"
            />
            <div class="hp-card-body">
              <h3 class="hp-card-title">{{ hoverPreview.issue.title }}</h3>
              <p class="hp-card-website">
                {{ websiteName(hoverPreview.issue.websiteId) }}
              </p>
              <p v-if="hoverPreview.issue.description" class="hp-card-desc">
                {{ hoverPreview.issue.description }}
              </p>
              <div class="hp-card-badges">
                <span class="hp-pill" :class="`hp-pill--${hoverPreview.issue.status}`">{{ statusLabel(hoverPreview.issue.status) }}</span>
                <span class="hp-pill hp-pill--type">{{ typeLabel(hoverPreview.issue.issueType) }}</span>
                <span v-if="hoverPreview.issue.priority !== 'normal'" class="hp-pill" :class="`hp-pill--prio-${hoverPreview.issue.priority}`">
                  {{ priorityLabel(hoverPreview.issue.priority) }}
                </span>
                <span v-if="hoverPreview.issue.dueDate" class="hp-pill hp-pill--due">
                  Due {{ formatDate(hoverPreview.issue.dueDate) }}
                </span>
              </div>
              <div class="hp-card-foot">
                <span v-if="hoverPreview.issue.assignedTo && memberById(hoverPreview.issue.assignedTo)" class="hp-assignee">
                  <span class="hp-avatar">
                    <img
                      v-if="memberById(hoverPreview.issue.assignedTo)?.avatarUrl"
                      :src="memberById(hoverPreview.issue.assignedTo)?.avatarUrl"
                      :alt="memberName(hoverPreview.issue.assignedTo)"
                      loading="lazy"
                    />
                    <span v-else>{{ initials(memberName(hoverPreview.issue.assignedTo)) }}</span>
                  </span>
                  {{ memberName(hoverPreview.issue.assignedTo) }}
                </span>
                <span v-else class="hp-unassigned">Unassigned</span>
              </div>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="qc-toast-fade">
        <div v-if="toast" class="qc-toast" :class="`qc-toast--${toast.type}`" role="status" aria-live="polite">
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import CreateIssueModal from '@/components/quality/CreateIssueModal.vue';
import IssueDetailModal from '@/components/quality/IssueDetailModal.vue';
import EditIssueModal from '@/components/quality/EditIssueModal.vue';
import ManageClassesModal from '@/components/quality/ManageClassesModal.vue';
import ArrangeWebsitesModal from '@/components/quality/ArrangeWebsitesModal.vue';
import { playCardDropSound } from '@/composables/useCardDropSound';
import { useAuthStore } from '@/stores/auth';
import { useImagePreviewStore } from '@/stores/imagePreview';

const previewStore = useImagePreviewStore();
const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      email: member.email,
      role: member.role
    });
  }
};
import { useDataStore, type Member } from '@/stores/data';
import {
  useQualityCheckStore,
  QUALITY_ISSUE_TYPES,
  QUALITY_STATUS_COLUMNS,
  type QualityIssue,
  type QualityIssueStatus,
  type QualityIssueType,
  type QualityIssuePriority
} from '@/stores/qualityCheck';
import { usePageRealtime } from '@/services/realtimeService';
import { useTaskAlertsStore } from '@/stores/taskAlerts';

usePageRealtime(['quality_classes', 'quality_issues', 'quality_issue_comments', 'websites']);

const auth = useAuthStore();
const data = useDataStore();
const qc   = useQualityCheckStore();
const alertsStore = useTaskAlertsStore();

const isManager = computed(() => ['admin', 'owner', 'head', 'supervisor'].includes(auth.currentRole || ''));

const activeMenuCardId = ref<string | null>(null);
const receiptSummaries = ref<Record<string, any>>({});
const repushingAlerts = ref<Record<string, boolean>>({});

const toggleCardMenu = (id: string) => {
  if (activeMenuCardId.value === id) {
    closeCardMenu();
  } else {
    activeMenuCardId.value = id;
    document.addEventListener('click', closeCardMenu);
  }
};

const closeCardMenu = () => {
  activeMenuCardId.value = null;
  document.removeEventListener('click', closeCardMenu);
};

const loadReceiptSummaryForCard = async (issueId: string) => {
  if (!isManager.value) return;
  const res = await alertsStore.fetchLinkedReceiptSummary('quality_check_item', issueId);
  receiptSummaries.value[issueId] = res;
};

const handleRepushCard = async (issueId: string) => {
  repushingAlerts.value[issueId] = true;
  const ok = await alertsStore.repushAlertsForLinkedItem('quality_check_item', issueId);
  if (ok) {
    await loadReceiptSummaryForCard(issueId);
  }
  repushingAlerts.value[issueId] = false;
};

const handleAlertCard = (issue: any) => {
  closeCardMenu();
  alertsStore.openSendAlertModal({
    type: 'quality_check_item',
    id: issue.id,
    title: issue.title,
    assigneeId: issue.assignedTo
  });
};

const handleReceiptsCard = (issue: any) => {
  closeCardMenu();
  alertsStore.openReceiptsModal({
    type: 'quality_check_item',
    id: issue.id,
    title: issue.title
  });
};

const handleArchiveCard = async (id: string) => {
  closeCardMenu();
  if (window.confirm('Are you sure you want to archive this Quality Check card?')) {
    const ok = await qc.archiveIssue(id);
    if (!ok) {
      alert('Could not archive Quality Check: ' + (qc.error || ''));
    }
  }
};

const formattedAlertDate = (dStr?: string | null) => {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

// ── Selection ───────────────────────────────────────────────────────────
// `undefined` = no class chosen yet (show only the folder grid).
// A class id = that class. `null` = the "Unclassified" pseudo-folder.
const SEL_KEY = 'kiuq_qc_selected_class';
const selectedClassId = ref<string | null | undefined>(
  (() => {
    try {
      const raw = localStorage.getItem(SEL_KEY);
      if (raw === null) return undefined;
      if (raw === '__none__') return null;
      return raw;
    } catch { return undefined; }
  })()
);
const persistSelection = (v: string | null | undefined) => {
  try {
    if (v === undefined) localStorage.removeItem(SEL_KEY);
    else if (v === null) localStorage.setItem(SEL_KEY, '__none__');
    else                  localStorage.setItem(SEL_KEY, v);
  } catch { /* ignore */ }
};

const selectClass = async (id: string | null) => {
  selectedClassId.value = id;
  selectedWebsiteId.value = null;
  persistSelection(id);
};

const selectedWebsiteId = ref<string | null>(null);
const selectedWebsite = computed(() =>
  selectedWebsiteId.value
    ? data.websites.find((w) => w.id === selectedWebsiteId.value) ?? null
    : null
);

/**
 * Live URL to open when the user clicks the website name. Domains are
 * stored without a protocol, so prefix `https://` ourselves. Returns
 * an empty string if the website has no domain — the template falls
 * back to a non-clickable label in that case.
 */
const selectedWebsiteUrl = computed(() => {
  const d = (selectedWebsite.value?.domain ?? '').trim();
  if (!d) return '';
  if (/^https?:\/\//i.test(d)) return d;
  return `https://${d}`;
});
const selectWebsite = async (websiteId: string) => {
  selectedWebsiteId.value = websiteId;
  search.value = '';
  typeFilter.value = 'all';
  memberFilter.value = 'all';
  detailIssueId.value = null;
  await qc.fetchIssues(websiteId);
};
const clearWebsiteSelection = () => {
  selectedWebsiteId.value = null;
  detailIssueId.value = null;
};

const selectedClassName = computed(() => {
  if (selectedClassId.value === undefined) return '';
  if (selectedClassId.value === null) return 'Unclassified';
  return qc.classes.find((c) => c.id === selectedClassId.value)?.name ?? '';
});
const selectedClassColor = computed(() => {
  if (selectedClassId.value === undefined || selectedClassId.value === null) return '#94a3b8';
  return qc.classes.find((c) => c.id === selectedClassId.value)?.color ?? '#15D6C2';
});

// ── Per-class summaries (for the folder cards) ──────────────────────────
interface ClassCard {
  id: string;
  name: string;
  color: string;
  websites: number;
  total: number;
  open: number;
  assigned: number;
  fixed: number;
}

const classCards = computed<ClassCard[]>(() =>
  qc.classes.map((c) => {
    const siteIds = new Set<string>();
    data.websites.forEach((w) => { if (w.qualityClassId === c.id) siteIds.add(w.id); });
    const classIssues = qc.issues.filter((i) => siteIds.has(i.websiteId) && i.isArchived !== true);
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      websites: siteIds.size,
      total: classIssues.length,
      open: classIssues.filter((i) => i.status === 'new_issue' || i.status === 'reopened' || i.status === 'rejected').length,
      assigned: classIssues.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged').length,
      fixed: classIssues.filter((i) => i.status === 'fixed' || i.status === 'needs_review' || i.status === 'approved' || i.status === 'closed').length
    };
  })
);

const qcMetrics = computed(() => {
  const issues = qc.issues.filter((i) => i.isArchived !== true);
  const today = new Date().toISOString().slice(0, 10);
  return {
    websites: data.websites.length,
    open: issues.filter((i) => i.status === 'new_issue' || i.status === 'reopened' || i.status === 'rejected').length,
    inProgress: issues.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged').length,
    review: issues.filter((i) => i.status === 'needs_review' || i.status === 'fixed').length,
    approved: issues.filter((i) => i.status === 'closed' || i.status === 'approved').length,
    fixedToday: issues.filter(
      (i) => (i.status === 'fixed' || i.status === 'approved' || i.status === 'closed') && (i.updatedAt || '').slice(0, 10) === today
    ).length
  };
});

const averageResolutionTime = computed(() => {
  const closedIssues = qc.issues.filter(
    (i) => (i.status === 'closed' || i.status === 'approved') && i.approvedAt && i.isArchived !== true
  );
  if (closedIssues.length === 0) return '—';
  
  let totalMs = 0;
  closedIssues.forEach((i) => {
    const start = new Date(i.createdAt).getTime();
    const end = new Date(i.approvedAt!).getTime();
    totalMs += Math.max(0, end - start);
  });
  
  const avgHours = totalMs / (1000 * 60 * 60) / closedIssues.length;
  if (avgHours < 24) {
    return `${avgHours.toFixed(1)}h`;
  } else {
    return `${(avgHours / 24).toFixed(1)}d`;
  }
});

const unclassifiedCard = computed<{ websites: number; total: number; open: number }>(() => {
  const siteIds = new Set<string>();
  data.websites.forEach((w) => { if (!w.qualityClassId) siteIds.add(w.id); });
  const classIssues = qc.issues.filter((i) => siteIds.has(i.websiteId) && i.isArchived !== true);
  return {
    websites: siteIds.size,
    total: classIssues.length,
    open: classIssues.filter((i) => i.status === 'new_issue' || i.status === 'reopened' || i.status === 'rejected').length
  };
});

// ── Filters / board buckets ────────────────────────────────────────────
const search = ref('');
const typeFilter = ref<'all' | QualityIssueType>('all');
const memberFilter = ref<'all' | 'me' | string>('all');

const websiteIssues = computed<QualityIssue[]>(() =>
  selectedWebsiteId.value ? qc.issuesForWebsite(selectedWebsiteId.value).filter((i) => i.isArchived !== true) : []
);

const filteredIssues = computed(() => {
  const q = search.value.trim().toLowerCase();
  return websiteIssues.value.filter((i) => {
    if (typeFilter.value !== 'all' && i.issueType !== typeFilter.value) return false;
    if (memberFilter.value === 'me') {
      if (i.assignedTo !== auth.user?.id) return false;
    } else if (memberFilter.value !== 'all' && i.assignedTo !== memberFilter.value) return false;
    if (!q) return true;
    return i.title.toLowerCase().includes(q)
      || (i.pageUrl || '').toLowerCase().includes(q)
      || websiteName(i.websiteId).toLowerCase().includes(q);
  });
});

const columnIssues = (status: QualityIssueStatus) =>
  filteredIssues.value.filter((i) => {
    if (status === 'in_progress') {
      return i.status === 'in_progress' || i.status === 'new_issue' || i.status === 'reopened' || i.status === 'rejected' || i.status === 'acknowledged';
    }
    if (status === 'needs_review') {
      return i.status === 'needs_review' || i.status === 'fixed';
    }
    if (status === 'approved') {
      return i.status === 'approved' || i.status === 'closed';
    }
    return i.status === status;
  });

// ── Drag/drop (same as per-website board) ──────────────────────────────
const dragOverColumn = ref<QualityIssueStatus | ''>('');
const draggedId = ref<string | null>(null);
const canMove = (_issue: QualityIssue) => {
  // Any authenticated team member can move any card.
  // The 'approved' column is still guarded separately in onDrop.
  return true;
};
const onDragStart = (id: string) => {
  const issue = qc.issues.find((i) => i.id === id);
  if (!issue || !canMove(issue)) return;
  draggedId.value = id;
};
const onDragEnd = () => { draggedId.value = null; dragOverColumn.value = ''; };
const onColumnLeave = (e: DragEvent, col: QualityIssueStatus) => {
  if (dragOverColumn.value === col && e.relatedTarget) dragOverColumn.value = '';
};
const onDrop = async (status: QualityIssueStatus) => {
  const id = draggedId.value;
  draggedId.value = null;
  dragOverColumn.value = '';
  if (!id) return;
  const issue = qc.issues.find((i) => i.id === id);
  if (!issue || issue.status === status) return;

  const isManager = ['admin', 'owner', 'head', 'supervisor'].includes(auth.currentRole || '');
  
  if (!isManager) {
    // Regular employees must be the assignee
    if (issue.assignedTo !== auth.user?.id) {
      showToast('Only the assigned employee can update this Quality Check.', 'error');
      return;
    }
    // Employees cannot transition to Completed
    if (status === 'approved') {
      showToast('Employees cannot approve Quality Checks.', 'error');
      return;
    }
    // Employees can only transition to Review
    if (status !== 'needs_review') {
      showToast('Employees can only transition tasks to Review.', 'error');
      return;
    }
    // Employees can only transition issues currently in Progress
    const inProgressStatuses = ['in_progress', 'new_issue', 'reopened', 'rejected', 'acknowledged'];
    if (!inProgressStatuses.includes(issue.status)) {
      showToast('You can only transition tasks that are in Progress.', 'error');
      return;
    }
  } else {
    // Managers: dragging Review -> Progress requires a reason
    if (status === 'in_progress' && (issue.status === 'needs_review' || issue.status === 'fixed')) {
      const reason = window.prompt('Please enter a reason for rejecting the fix (required):');
      if (reason === null) return; // user cancelled
      if (!reason.trim()) {
        showToast('You must enter a reason to reject the fix.', 'error');
        return;
      }
      const ok = await qc.updateIssue(id, {
        status: 'rejected',
        rejectionReason: reason.trim()
      } as any);
      if (ok) {
        playCardDropSound();
        await qc.addComment(id, `Rejection Reason: ${reason.trim()}`);
      } else {
        showToast(qc.error || 'Could not reject issue.', 'error');
      }
      return;
    }
  }

  // If transitioning to Ready For Review, check proof of completion
  if (status === 'needs_review' || status === 'fixed') {
    let hasLocalProof = !!issue.screenshotUrl || (!!issue.pageUrl && issue.pageUrl.trim() !== '');
    if (!hasLocalProof) {
      await qc.fetchComments(id);
      const comments = qc.commentsForIssue(id);
      if (comments.length === 0) {
        showToast(
          'You must provide at least one proof of completion (screenshot, comment, or URL) before submitting for review.',
          'error'
        );
        return;
      }
    }
  }

  const ok = await qc.moveStatus(id, status);
  if (ok) {
    playCardDropSound();
  } else {
    showToast(qc.error || 'Could not move issue.', 'error');
  }
};

// ── Hover preview (image lightbox + full-card preview) ────────────────
// `image` shows the screenshot only (when hovering the thumbnail).
// `card`  shows the whole card data expanded (when hovering the rest of the card).
// A small delay prevents the preview from flashing while users scan the board.
interface HoverPreview {
  kind: 'image' | 'card';
  issue: QualityIssue;
  x: number;
  y: number;
}
const hoverPreview = ref<HoverPreview | null>(null);
const HOVER_DELAY_MS = 260;
let   hoverTimer: number | null = null;

const clearHoverTimer = () => {
  if (hoverTimer !== null) { window.clearTimeout(hoverTimer); hoverTimer = null; }
};

const onCardEnter = (issue: QualityIssue, e: MouseEvent) => {
  // Suppress preview while a drag is in progress to avoid getting in the way.
  if (draggedId.value) return;
  clearHoverTimer();
  hoverTimer = window.setTimeout(() => {
    hoverPreview.value = { kind: 'card', issue, x: e.clientX, y: e.clientY };
  }, HOVER_DELAY_MS);
};

const onImageEnter = (issue: QualityIssue, e: MouseEvent) => {
  if (draggedId.value) return;
  clearHoverTimer();
  // Switch to image-only preview immediately when crossing onto the thumbnail.
  hoverPreview.value = { kind: 'image', issue, x: e.clientX, y: e.clientY };
};

const onImageLeave = (issue: QualityIssue, e: MouseEvent) => {
  // If the cursor is still inside the card, fall back to the card preview.
  // Otherwise let the card's own mouseleave clear it.
  const card = (e.currentTarget as HTMLElement).closest('.tc-card');
  const related = e.relatedTarget as Node | null;
  if (card && related && card.contains(related)) {
    hoverPreview.value = { kind: 'card', issue, x: e.clientX, y: e.clientY };
  }
};

const onHoverMove = (e: MouseEvent) => {
  if (!hoverPreview.value) return;
  hoverPreview.value = { ...hoverPreview.value, x: e.clientX, y: e.clientY };
};

const onHoverLeave = () => {
  clearHoverTimer();
  hoverPreview.value = null;
};

/**
 * Compute the floating preview's position. Default: 18 px right of the cursor.
 * Clamp inside the viewport so it never spills off-screen — flip to the left
 * of the cursor when the right edge would clip.
 */
const hoverStyle = computed(() => {
  if (!hoverPreview.value) return {};
  const w = hoverPreview.value.kind === 'image' ? 520 : 360;
  const h = hoverPreview.value.kind === 'image' ? 380 : 480;
  const pad = 12;
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  let left = hoverPreview.value.x + 18;
  let top  = hoverPreview.value.y - 40;
  if (left + w + pad > vw) left = hoverPreview.value.x - w - 18;
  if (top  + h + pad > vh) top  = Math.max(pad, vh - h - pad);
  if (top  < pad)          top  = pad;
  if (left < pad)          left = pad;
  return { left: `${left}px`, top: `${top}px`, maxWidth: `${w}px` };
});

// Hide the preview when scrolling — the position would lag the page.
const onWindowScrollHidePreview = () => { hoverPreview.value = null; };
onMounted(() => {
  window.addEventListener('scroll', onWindowScrollHidePreview, { passive: true, capture: true });
});
onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScrollHidePreview, true);
  clearHoverTimer();
  if (toastTimer !== null) window.clearTimeout(toastTimer);
});

// ── Visual helpers ─────────────────────────────────────────────────────
const COLUMN_ACCENT: Record<string, string> = {
  in_progress:  '#f59e0b',
  needs_review: '#a855f7',
  approved:     '#16a34a'
};
const COLUMN_HELPER: Record<string, string> = {
  in_progress:  'Fix in progress',
  needs_review: 'Ready for review',
  approved:     'Completed issues'
};
const columnAccent = (s: QualityIssueStatus) => COLUMN_ACCENT[s] || '#9ca3af';
const columnHelper = (s: QualityIssueStatus) => COLUMN_HELPER[s] || '';

const assignableMembers = computed<Member[]>(() => {
  if (auth.isQualityChecker) return auth.profile ? [auth.profile] : [];
  return data.members.filter((m) => m.status === 'active');
});
const memberById = (id: string | null): Member | undefined =>
  id ? data.members.find((m) => m.id === id) ?? (auth.profile?.id === id ? auth.profile : undefined) : undefined;
const memberName = (id: string | null) =>
  memberById(id)?.fullName || memberById(id)?.email || 'Unassigned';
const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';

const websiteName = (id: string) =>
  data.websites.find((w) => w.id === id)?.name || 'Untitled website';

const typeLabel = (t: QualityIssueType) =>
  QUALITY_ISSUE_TYPES.find((x) => x.value === t)?.label ?? t;
const statusLabel = (s: QualityIssueStatus) =>
  ({ new_issue: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress', fixed: 'Fixed', needs_review: 'Needs Review', approved: 'Approved', rejected: 'Rejected', closed: 'Closed', reopened: 'Reopened' }[s] || s);
const priorityLabel = (p: QualityIssuePriority) =>
  p.charAt(0).toUpperCase() + p.slice(1);
const formatDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Modals ─────────────────────────────────────────────────────────────
const createOpen = ref(false);
const detailIssueId = ref<string | null>(null);
const editIssueId = ref<string | null>(null);
const manageOpen = ref(false);
// `arrangeFor` holds the class id the Arrange modal is targeting.
// `undefined` = closed. A string id = that class. `null` = the Unclassified bucket.
const arrangeFor = ref<string | null | undefined>(undefined);
const openArrange = (classId: string | null) => { arrangeFor.value = classId; };
const closeArrange = () => { arrangeFor.value = undefined; };
const onCreated  = () => { createOpen.value = false; };
const openDetail = (id: string) => { detailIssueId.value = id; };
const openEdit = (id: string) => {
  hoverPreview.value = null;
  editIssueId.value = id;
};

const route = useRoute();
watch(
  () => route.query.issue,
  (newVal) => {
    if (newVal) {
      detailIssueId.value = String(newVal);
    }
  },
  { immediate: true }
);

watch(() => websiteIssues.value, (newIssues) => {
  if (isManager.value && newIssues) {
    newIssues.forEach((issue) => {
      loadReceiptSummaryForCard(issue.id);
    });
  }
}, { immediate: true, deep: true });

const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null);
let toastTimer: number | null = null;
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toast.value = { message, type };
  toastTimer = window.setTimeout(() => {
    toast.value = null;
    toastTimer = null;
  }, 2800);
};
const onIssueEdited = () => {
  editIssueId.value = null;
  showToast('Issue updated.');
};

// ── Delete (two-step confirm on the card itself) ───────────────────────
// First click: arms confirm state on the trash button. Second click within
// 4 seconds actually deletes. Permission rules mirror the RLS in 0055:
// admins can delete anything; members can only delete their own issues
// that haven't been approved yet.
const deletingId = ref<string | null>(null);
const deleteBusy = ref<string | null>(null);
let deleteResetTimer: number | null = null;

const canDelete = (issue: QualityIssue): boolean => {
  if (auth.isAdmin) return true;
  return issue.createdBy === auth.user?.id && issue.status !== 'approved';
};
const canEdit = (issue: QualityIssue): boolean => {
  if (auth.isAdmin) return true;
  if (issue.status === 'approved') return false;
  return issue.createdBy === auth.user?.id || issue.assignedTo === auth.user?.id;
};

const armDeleteFor = (id: string) => {
  deletingId.value = id;
  if (deleteResetTimer !== null) window.clearTimeout(deleteResetTimer);
  deleteResetTimer = window.setTimeout(() => {
    if (deletingId.value === id) deletingId.value = null;
    deleteResetTimer = null;
  }, 4000);
};

const onDeleteClick = async (id: string, _e: MouseEvent) => {
  // First click: arm
  if (deletingId.value !== id) { armDeleteFor(id); return; }
  // Second click within window: commit
  if (deleteResetTimer !== null) { window.clearTimeout(deleteResetTimer); deleteResetTimer = null; }
  deletingId.value = null;
  deleteBusy.value = id;
  try {
    const ok = await qc.deleteIssue(id);
    if (!ok && qc.error) console.warn('[qc] delete failed', qc.error);
  } finally {
    deleteBusy.value = null;
  }
};

// Websites currently in the selected folder (for the small "websites in this folder" strip)
const websitesInSelected = computed(() => {
  if (selectedClassId.value === undefined) return [];
  return data.websites.filter((w) => {
    if (selectedClassId.value === null) return !w.qualityClassId;
    return w.qualityClassId === selectedClassId.value;
  });
});

// ── Load ───────────────────────────────────────────────────────────────
onMounted(async () => {
  const loads: Promise<unknown>[] = [
    data.fetchWebsites(),
    qc.fetchClasses(),
    qc.fetchWebsiteClassMap(),
    // Load all issues once so the hero metrics + class counts are accurate
    // on first paint (was lazy-per-class before).
    qc.fetchIssues()
  ];
  if (!auth.isQualityChecker) loads.push(data.fetchMembers());
  await Promise.all(loads);
});
</script>

<style scoped>
/* ── Page shell ────────────────────────────────────────────── */
.qc-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* ── Premium page intro ───────────────────────────────────── */
.qc-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    radial-gradient(circle at left top, color-mix(in srgb, var(--primary) 13%, transparent), transparent 36%),
    linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 96%, #111827), var(--card-bg));
  padding: 1.2rem 1.25rem;
  box-shadow: 0 18px 50px color-mix(in srgb, #000 10%, transparent);
}
.qc-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  min-width: 0;
}
.qc-hero-kicker {
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--primary);
}
.qc-hero-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.56rem;
  line-height: 1.08;
  font-weight: 900;
  color: var(--text-main);
}
.qc-hero-subtitle {
  max-width: 42rem;
  margin: 0.18rem 0 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}
.qc-hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.65rem;
  flex-shrink: 0;
}
@media (max-width: 760px) {
  .qc-hero {
    align-items: stretch;
    flex-direction: column;
    padding: 1rem;
  }
  .qc-hero-actions {
    justify-content: flex-start;
    width: 100%;
  }
}
@media (max-width: 520px) {
  .qc-hero-title { font-size: 1.12rem; }
  .qc-hero-subtitle { font-size: 0.88rem; }
  .qc-hero-actions > * { width: 100%; justify-content: center; }
}

/* ── Compact metric pills (Linear-style) ───────────────────── */
.qc-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.qc-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.75rem 0.4rem 0.6rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.qc-pill:hover {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.qc-pill--accent {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
}

.qc-pill-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.qc-pill-dot--open     { background: #15D6C2; }
.qc-pill-dot--prog     { background: #f59e0b; }
.qc-pill-dot--review   { background: #a855f7; }
.qc-pill-dot--approved { background: #16a34a; }
.qc-pill-dot--fixed    { background: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }

.qc-pill-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 7px;
  background: var(--primary-soft);
  color: var(--primary);
  flex-shrink: 0;
}

.qc-pill-num {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1;
  letter-spacing: -0.02em;
  font-feature-settings: 'tnum' on;
}

.qc-pill-label {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .qc-metrics { gap: 0.4rem; }
  .qc-pill { padding: 0.35rem 0.6rem 0.35rem 0.5rem; }
  .qc-pill-num { font-size: 0.9rem; }
  .qc-pill-label { font-size: 0.66rem; }
}

/* ── Class folder grid ─────────────────────────────────────── */
/* Responsive grid: 4 cards on wide desktop, 2 on tablet, 1 on mobile.
   `auto-fill + minmax` falls back gracefully at every width without
   media queries, and equal heights are guaranteed by the children. */
/* Horizontal scroller — folders extend right and scroll left/right
   instead of wrapping onto new rows as more classes are added. */
.qc-classes {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;
  scroll-snap-type: x proximity;
  scroll-padding-left: 0.25rem;
}
.qc-classes > .qc-class-card {
  flex: 0 0 16rem;
  scroll-snap-align: start;
}
@media (max-width: 520px) {
  .qc-classes > .qc-class-card { flex-basis: 14rem; }
}
.qc-classes-empty {
  flex: 1;
  min-width: min(100%, 28rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.qc-classes-empty p { margin: 0; font-size: 0.86rem; color: var(--text-muted); }

/* ── Class folder card — premium dashboard widget ─────────────────── */
.qc-class-card {
  position: relative;
  display: flex;
  flex-direction: column;
  text-align: left;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.9rem 1rem 0.8rem;
  box-shadow: var(--shadow-sm);
  transition:
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 150ms ease,
    box-shadow 150ms ease;
}
.qc-class-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  box-shadow: var(--shadow-md);
}
/* Active state: brand-blue focus ring (matches the Work Board). */
.qc-class-card--active {
  border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
  box-shadow: 0 0 0 3px var(--primary-ring);
}
.qc-class-card--unclassified { --class-accent: #94a3b8; }

/* The clickable content region — fills the card, leaves the action bar
   below it. `all: unset` to strip default button chrome before styling. */
.qc-class-open {
  all: unset;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  cursor: pointer;
  width: 100%;
  flex: 1;
}

/* Action bar at the bottom */
.qc-class-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 0.85rem;
  padding-top: 0.7rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}
.qc-card-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 140ms ease, background 140ms ease, border-color 140ms ease;
}
.qc-card-link:hover {
  color: var(--text-main);
  background: var(--soft-bg);
}
.qc-card-link--accent {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}
.qc-card-link--accent:hover {
  color: #fff;
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.qc-empty-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
}
.qc-empty-sub {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* Sites strip + folder-empty card */
/* ── Websites-in-folder selector — premium dashboard widget ────────── */
.qc-sites-strip {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 0.95rem 1.1rem 1rem;
}

/* Header row: section label with leading dot + count chip + admin action */
.qc-sites-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.qc-sites-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.qc-sites-label-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
  flex-shrink: 0;
}
.qc-sites-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}
.qc-sites-count {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  min-width: 1.5rem;
  text-align: center;
}

/* Chip wrap */
.qc-sites-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}
.qc-sites-list li {
  display: flex;
  min-width: 0;
}

/* ── Site chip ─────────────────────────────────────────────────────── */
.qc-site-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg));
  color: var(--text-main);
  padding: 0.42rem 0.85rem 0.42rem 0.45rem;
  max-width: 16rem;
  cursor: pointer;
  transition:
    transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}
.qc-site-chip:hover,
.qc-site-chip:focus-visible {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent),
    0 6px 14px rgba(8, 12, 20, 0.08);
  outline: none;
}
.qc-site-chip--active {
  border-color: color-mix(in srgb, var(--primary) 65%, var(--border));
  background: color-mix(in srgb, var(--primary) 14%, var(--card-bg));
  color: var(--primary);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--primary) 18%, transparent),
    0 6px 14px rgba(8, 12, 20, 0.08);
}
.qc-site-chip--active .qc-site-chip-name { font-weight: 700; }

/* Avatar tile: holds favicon or fallback initial — ~9% larger than before
   (1.2rem → matched by chip padding bump) */
.qc-site-chip-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  overflow: hidden;
  flex-shrink: 0;
}
.qc-site-chip-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2px;
}
.qc-site-chip-fallback {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 900;
  color: var(--primary);
}

.qc-site-chip-name {
  font-size: 0.83rem;
  color: currentColor;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.005em;
}

/* Responsive: keep header readable; chips already wrap */
@media (max-width: 560px) {
  .qc-sites-strip { padding: 0.85rem 0.9rem; gap: 0.7rem; }
  .qc-site-chip { max-width: 100%; }
}

.qc-folder-empty,
.qc-pick-website {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.qc-website-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.65rem 0.8rem;
}
.qc-website-context-main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
}
.qc-context-label {
  font-size: 0.68rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.qc-website-context-main strong {
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 850;
}
.qc-website-context-main span:last-child {
  color: var(--text-muted);
  font-size: 0.78rem;
}
/* Clickable website name → opens live site in a new tab */
.qc-website-context-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-decoration: none;
  color: var(--text-main);
  transition: color 140ms ease;
}
.qc-website-context-link strong {
  color: inherit;
  transition: color 140ms ease;
}
.qc-website-context-link svg {
  color: var(--text-muted);
  transition: color 140ms ease, transform 140ms ease;
  flex-shrink: 0;
}
.qc-website-context-link:hover,
.qc-website-context-link:focus-visible {
  color: var(--primary);
  outline: none;
}
.qc-website-context-link:hover svg,
.qc-website-context-link:focus-visible svg {
  color: var(--primary);
  transform: translate(1px, -1px);
}
.qc-website-context-url {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-decoration: none;
  border-bottom: 1px dotted transparent;
  transition: color 140ms ease, border-color 140ms ease;
}
.qc-website-context-url:hover,
.qc-website-context-url:focus-visible {
  color: var(--primary);
  border-bottom-color: color-mix(in srgb, var(--primary) 50%, transparent);
  outline: none;
}

/* Header row — icon tile, class name, total badge */
.qc-class-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.qc-class-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 8px;
  /* Flat neutral tile; identity comes from the class-colored glyph only. */
  background: var(--soft-bg);
  color: var(--class-accent, var(--primary));
  flex-shrink: 0;
}
.qc-class-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.005em;
  color: var(--text-main);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qc-class-total {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.12rem 0.55rem;
  min-width: 1.9rem;
  text-align: center;
  flex-shrink: 0;
}

/* Stats — clean, airy row separated from the header by a hairline. */
.qc-class-stats {
  list-style: none;
  margin: 0;
  padding: 0.7rem 0 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.3rem;
  border-top: 1px solid var(--border);
}
.qc-class-stats--narrow {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.qc-class-stats li {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}
.qc-stat-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
  line-height: 1;
  letter-spacing: -0.01em;
}
.qc-stat-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Board section ─────────────────────────────────────────── */
.qc-board-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}
.qc-board-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.qc-board-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
}
.qc-board-swatch {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 4px;
}
.qc-board-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.qc-search-input {
  position: relative;
  min-width: 14rem;
  flex: 1;
}
.qc-search-input svg {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--text-muted);
  transform: translateY(-50%);
}
.qc-search-input input,
.qc-filter-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.82rem;
  padding: 0.5rem 0.75rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.qc-search-input input { padding-left: 2.1rem; }
.qc-filter-select { width: auto; min-width: 9rem; }
.qc-search-input input:focus,
.qc-filter-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

/* ── Board layout (same visual classes as My Work Board) ─── */
.board-scroll,
.board-loading {
  overflow-x: auto;
  padding-bottom: 0.8rem;
  min-height: 0;
}
.board-loading {
  display: grid;
  grid-template-columns: repeat(3, minmax(20rem, 1fr));
  gap: 0.9rem;
  align-items: start;
  min-width: min(100%, 66rem);
}
.board-zoom-layer {
  display: grid;
  grid-template-columns: repeat(3, minmax(20rem, 1fr));
  gap: 0.9rem;
  align-items: start;
  min-width: min(100%, 66rem);
}
.skeleton-column {
  min-height: 18rem;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: qc-pulse 1.4s ease-in-out infinite;
}
@keyframes qc-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}

.board-column {
  position: relative;
  display: flex;
  min-height: 20rem;
  flex-direction: column;
  border: 1px solid color-mix(in srgb, var(--column-accent, var(--primary)) 24%, var(--border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--soft-bg) 45%, var(--card-bg));
  padding: 0.75rem;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.board-column.is-drag-over {
  border-color: color-mix(in srgb, var(--column-accent, var(--primary)) 70%, var(--border));
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 8%, var(--card-bg));
  box-shadow: 0 20px 50px color-mix(in srgb, var(--column-accent, var(--primary)) 18%, transparent);
  transform: translateY(-4px) scale(1.01);
}

.column-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.65rem;
}
.column-head h2 {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.92rem;
  font-weight: 900;
  margin: 0;
}
.column-head p {
  margin-top: 0.15rem;
  color: var(--text-muted);
  font-size: 0.72rem;
}
.column-head span {
  border-radius: 999px;
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 12%, var(--card-bg));
  color: var(--column-accent, var(--primary));
  padding: 0.25rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 900;
}

.add-card-mini {
  margin-top: 0.6rem;
  border: 1px dashed color-mix(in srgb, var(--column-accent, var(--primary)) 35%, var(--border));
  border-radius: 12px;
  color: var(--text-muted);
  padding: 0.5rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  background: transparent;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
}
.add-card-mini:hover { background: var(--card-bg); color: var(--primary); }

.column-card-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.75rem;
}
.column-empty {
  border: 1px dashed var(--border);
  border-radius: 14px;
  color: var(--text-muted);
  padding: 1rem;
  text-align: center;
  font-size: 0.82rem;
}

/* ── Card (matches TaskCard look) ──────────────────────────── */
.tc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  text-align: left;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
  transition:
    transform 190ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
  cursor: pointer;
  user-select: none;
}
.tc-card:hover,
.tc-card:focus-visible {
  border-color: color-mix(in srgb, var(--primary) 42%, var(--border));
  box-shadow:
    0 10px 28px rgba(15, 23, 42, 0.1),
    0 0 0 2px color-mix(in srgb, var(--primary) 14%, transparent);
  transform: translateY(-2px);
  outline: none;
}
.tc-card.tc-draggable { cursor: grab; }
.tc-card.tc-dragging {
  border-color: color-mix(in srgb, var(--primary) 62%, var(--border));
  box-shadow: 0 24px 60px color-mix(in srgb, var(--primary) 24%, transparent);
  cursor: grabbing;
  opacity: 0.62;
  transform: rotate(1.4deg) scale(0.97);
}
.tc-image-container {
  position: relative;
  width: 100%;
  height: 7.5rem;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
}
.tc-cover { width: 100%; height: 100%; object-fit: cover; display: block; }
.tc-content { padding: 0.85rem 0.9rem 0; }
.tc-title {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 850;
  line-height: 1.3;
  color: var(--text-main);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tc-website {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  margin-top: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tc-desc {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tc-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.9rem 0;
}
.tc-type-pill,
.tc-status-pill,
.tc-priority-pill,
.tc-due-pill {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
}
.tc-status-pill { text-transform: uppercase; }
.tc-status--new_issue    { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
.tc-status--in_progress  { background: rgba(245,158,11,0.16); color: #f59e0b; }
.tc-status--fixed        { background: rgba(22,163,74,0.14); color: #16a34a; }
.tc-status--needs_review { background: rgba(168,85,247,0.16); color: #a855f7; }
.tc-status--approved     { background: rgba(22,163,74,0.16); color: #16a34a; }
.tc-type-pill {
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  text-transform: uppercase;
}
.tc-priority-pill { text-transform: uppercase; }
.tc-priority--urgent { background: rgba(220,38,38,0.14); color: #dc2626; }
.tc-priority--high   { background: rgba(245,158,11,0.16); color: #f59e0b; }
.tc-priority--low    { background: var(--soft-bg); color: var(--text-muted); border: 1px solid var(--border); }
.tc-due-pill {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}
.tc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem 0.8rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border);
}
.tc-member { display: flex; align-items: center; gap: 0.45rem; min-width: 0; flex: 1; }
.tc-avatar {
  display: inline-flex;
  width: 1.9rem;
  height: 1.9rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  border: 1.5px solid var(--card-bg);
  background: color-mix(in srgb, var(--primary) 12%, var(--soft-bg));
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.65rem;
  font-weight: 900;
}
.tc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tc-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.tc-unassigned { font-size: 0.78rem; color: var(--text-muted); flex: 1; }
.tc-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}
/* "Link" pill — only renders when the issue has a pageUrl. Opens in a new tab. */
.tc-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1.5px solid color-mix(in srgb, var(--primary) 35%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  padding: 0.28rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-decoration: none;
  cursor: pointer;
  transition: background 140ms, border-color 140ms, color 140ms, transform 140ms;
}
.tc-link:hover,
.tc-link:focus-visible {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  outline: none;
  transform: translateY(-1px);
}
.tc-delete {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  padding: 0.28rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transition: color 140ms, border-color 140ms, background 140ms;
}
.tc-delete:hover:not(:disabled) {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.5);
  background: rgba(220, 38, 38, 0.06);
}
.tc-delete:disabled { opacity: 0.5; cursor: wait; }
.tc-delete--confirm {
  color: #fff;
  background: #dc2626;
  border-color: #dc2626;
}
.tc-delete--confirm:hover:not(:disabled) {
  color: #fff;
  background: #b91c1c;
  border-color: #b91c1c;
}
.tc-edit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid color-mix(in srgb, var(--primary) 40%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
  padding: 0.28rem 0.7rem;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}
.tc-edit:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.tc-open {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 850;
  padding: 0.28rem 0.8rem;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}
.tc-open:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.qc-toast {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 140;
  border-radius: 12px;
  padding: 0.72rem 0.95rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
}
.qc-toast--success { background: #16a34a; color: #fff; }
.qc-toast--error { background: #dc2626; color: #fff; }
.qc-toast-fade-enter-active,
.qc-toast-fade-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.qc-toast-fade-enter-from,
.qc-toast-fade-leave-to { opacity: 0; transform: translateY(8px); }

@media (prefers-reduced-motion: reduce) {
  .tc-card,
  .board-column,
  .qc-class-card { transition: none !important; animation: none !important; }
}

/* ── Mobile: Quality Check deep tightening ──────────────────────────
   The shared global pass (main.css) already handled PageHeader and
   card padding. The rules below are the page-specific compactness:
   board becomes a single horizontal-snap row, issue card screenshot
   thumbnails shrink so cards aren't dominated by the cover image,
   and folder cards drop to a single column with tighter internal
   spacing. */
@media (max-width: 600px) {
  /* Folder cards: single column already; tighten internal padding. */
  .qc-class-card {
    padding: 0.85rem 0.9rem 0.75rem;
    border-radius: 14px;
  }
  .qc-class-icon { width: 1.6rem; height: 1.6rem; border-radius: 8px; }
  .qc-class-name { font-size: 0.95rem; }
  .qc-class-stats { gap: 0.45rem; }
  .qc-stat-num    { font-size: 1.02rem; }
  .qc-stat-label  { font-size: 0.62rem; }
  .qc-class-actions { padding-top: 0.5rem; margin-top: 0.55rem; }

  /* Website chip strip: trim padding, smaller chips, less wasted space. */
  .qc-sites-strip { padding: 0.75rem 0.85rem 0.8rem; }
  .qc-sites-list  { gap: 0.4rem; }
  .qc-site-chip   { padding: 0.36rem 0.7rem 0.36rem 0.4rem; max-width: 13rem; }
  .qc-site-chip-avatar { width: 1.4rem; height: 1.4rem; }
  .qc-site-chip-name   { font-size: 0.8rem; }

  /* Board: become a true horizontal swipe with snap so columns slide
     into place instead of free-scrolling. Each column shows ~85vw with
     the next one peeking ~12vw — strong "more to the right" affordance. */
  .board-scroll {
    scroll-snap-type: x mandatory;
    scroll-padding-left: 0.5rem;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  .board-zoom-layer,
  .board-loading {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 85vw;
    min-width: 0;
    gap: 0.6rem;
  }
  .board-column {
    scroll-snap-align: start;
    min-height: 16rem;
    border-radius: 14px;
    padding: 0.65rem;
  }
  .column-head h2 { font-size: 0.88rem; }
  .column-head p  { font-size: 0.7rem; }

  /* Issue cards: shorter screenshot thumb, tighter padding so two
     cards fit on screen at once instead of one filling the viewport. */
  .tc-card { border-radius: 16px; }
  .tc-image-container { height: 5.5rem; border-radius: 14px 14px 0 0; }
  .tc-content { padding: 0.7rem 0.75rem 0; }
  .tc-title   { font-size: 0.9rem; }
  .tc-website { font-size: 0.7rem; }
  .tc-desc    { font-size: 0.74rem; -webkit-line-clamp: 2; }
  .tc-badges  { padding: 0.5rem 0.75rem 0; gap: 0.3rem; }
  .tc-status-pill,
  .tc-type-pill,
  .tc-priority-pill,
  .tc-due-pill { font-size: 0.62rem; padding: 0.15rem 0.5rem; }
  .tc-footer  { padding: 0.45rem 0.75rem 0.65rem; }
  .tc-avatar  { width: 1.65rem; height: 1.65rem; }
  .tc-name    { font-size: 0.74rem; max-width: 80px; }
  .tc-open    { padding: 0.22rem 0.65rem; font-size: 0.7rem; }
  .tc-link,
  .tc-edit,
  .tc-delete  { padding: 0.22rem 0.5rem; font-size: 0.68rem; }
}
</style>

<!-- Hover preview floater is teleported to <body>, so its styles live outside
     the scoped block. Class names are .hp-* to avoid collisions. -->
<style>
.hp-floater {
  position: fixed;
  z-index: 120;
  pointer-events: none;       /* never blocks the cursor / underlying card */
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--card-bg, #fff);
  box-shadow:
    0 24px 60px rgba(8, 12, 20, 0.32),
    0 6px 18px rgba(8, 12, 20, 0.2);
  overflow: hidden;
}

/* Image-only flavor */
.hp-floater--image {
  padding: 0;
  background: #0b0f17;
}
.hp-floater--image .hp-img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 70vh;
  object-fit: contain;
}

/* Whole-card flavor */
.hp-floater--card {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.hp-card-img {
  display: block;
  width: 100%;
  max-height: 13rem;
  object-fit: cover;
  background: #0b0f17;
}
.hp-card-body {
  padding: 0.85rem 1rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.hp-card-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.98rem;
  font-weight: 850;
  line-height: 1.3;
  color: var(--text-main, #111);
}
.hp-card-website {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--primary, #15D6C2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-card-desc {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-muted, #6b7280);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.1rem;
}
.hp-pill {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--border, #e5e7eb);
  background: var(--soft-bg, #f3f4f6);
  color: var(--text-muted, #6b7280);
}
.hp-pill--type        { /* default */ }
.hp-pill--new_issue   { color: #15D6C2; background: rgba(21,214,194,0.12); border-color: rgba(21,214,194,0.28); }
.hp-pill--in_progress { color: #f59e0b; background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.3); }
.hp-pill--fixed       { color: #22c55e; background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.3); }
.hp-pill--needs_review{ color: #a855f7; background: rgba(168,85,247,0.14); border-color: rgba(168,85,247,0.3); }
.hp-pill--approved    { color: #16a34a; background: rgba(22,163,74,0.14); border-color: rgba(22,163,74,0.3); }
.hp-pill--prio-urgent { color: #dc2626; background: rgba(220,38,38,0.14); border-color: rgba(220,38,38,0.3); }
.hp-pill--prio-high   { color: #f59e0b; background: rgba(245,158,11,0.16); border-color: rgba(245,158,11,0.32); }
.hp-pill--prio-low    { color: #6b7280; }
.hp-pill--due         { color: #15D6C2; background: rgba(21,214,194,0.1); border-color: rgba(21,214,194,0.24); }

.hp-card-foot {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-top: 0.5rem;
  margin-top: 0.2rem;
  border-top: 1px solid var(--border, #e5e7eb);
  font-size: 0.78rem;
  color: var(--text-main, #111);
  font-weight: 600;
}
.hp-assignee { display: inline-flex; align-items: center; gap: 0.45rem; }
.hp-avatar {
  display: inline-flex;
  width: 1.7rem;
  height: 1.7rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(21,214,194,0.12);
  color: #15D6C2;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
}
.hp-avatar img { width: 100%; height: 100%; object-fit: cover; }
.hp-unassigned { color: var(--text-muted, #6b7280); font-weight: 500; }

/* Transition */
.hp-fade-enter-active,
.hp-fade-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.hp-fade-enter-from,
.hp-fade-leave-to     { opacity: 0; transform: translateY(4px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .hp-fade-enter-active,
  .hp-fade-leave-active { transition: none !important; }
}

/* Hide hover preview on touch devices — it's mouse-only by design */
@media (hover: none) {
  .hp-floater { display: none !important; }
}

/* ── Manager Dropdown menu options ── */
.tc-menu-container {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.tc-menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s;
}

.tc-menu-trigger:hover {
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
}

.tc-menu-dropdown {
  position: absolute;
  top: 1.95rem;
  right: 0;
  width: 130px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  z-index: 20;
}

.tc-menu-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-family: 'Google Sans', 'Kantumruy Pro', sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.tc-menu-item:hover {
  background: var(--soft-bg);
  color: var(--primary);
}

.tc-menu-item--danger {
  color: #ef4444;
}

.tc-menu-item--danger:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

.tc-menu-dropdown-divider, .tc-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 0.15rem 0;
}

/* ── Tracking Panel ── */
.tc-tracking-panel {
  margin: 0.6rem 0.9rem 0;
  padding: 0.6rem 0.7rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.7rem;
}

.tc-tracking-header {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Google Sans', 'Kantumruy Pro', sans-serif;
  font-weight: 800;
  color: var(--text-main);
  text-transform: uppercase;
  font-size: 0.64rem;
  margin-bottom: 0.35rem;
}

.tc-tracking-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.2rem;
  color: var(--text-muted);
}

.tc-tracking-stats span {
  display: block;
}

.tc-tracking-stats strong {
  color: var(--text-main);
}

.tc-tracking-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.45rem;
}

.tc-track-btn {
  flex: 1;
  font-family: 'Google Sans', 'Kantumruy Pro', sans-serif;
  font-size: 0.66rem;
  font-weight: 750;
  padding: 0.2rem 0;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.tc-track-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.tc-track-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tc-tracking-time {
  display: block;
  font-size: 0.64rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.3rem;
  margin-top: 0.3rem;
}
</style>
