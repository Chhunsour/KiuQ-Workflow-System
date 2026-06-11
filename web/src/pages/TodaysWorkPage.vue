<template>
  <div class="work-board-page">
    <section v-if="!embedded" class="board-hero">
      <div class="hero-left">
        <span class="hero-kicker">{{ auth.isAdmin ? 'Live Board' : 'My Work Board' }}</span>
        <h1 class="page-title">My Work Board</h1>
        <p class="page-subtitle">Manage assigned website tasks from start to review.</p>
      </div>
      <div class="hero-right">
        <MonthSelector v-model="localBoardMonth" />
        <div class="hero-actions">
          <RouterLink to="/docs" class="btn-secondary">Open Docs</RouterLink>
          <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="openAddTask()">
            Add Task
          </button>
        </div>
      </div>
    </section>

    <div
      v-if="pageError"
      class="card card-pad flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between"
    >
      <div>
        <div class="ui-font font-semibold text-status-needs-fix-fg">Could not load work board.</div>
        <p class="mt-1 text-text-muted">{{ pageError }}</p>
      </div>
      <button class="btn-primary w-fit" type="button" @click="loadBoardData">Retry</button>
    </div>

    <section v-else-if="isInitialLoading" class="board-loading">
      <div v-for="column in boardColumns" :key="column.key" class="board-column skeleton-column">
        <div class="skeleton-line h-5 w-32" />
        <div class="skeleton-card" />
        <div class="skeleton-card" />
      </div>
    </section>

    <EmptyState
      v-else-if="allCards.length === 0 && !auth.isAdmin && !props.embedded"
      title="No tasks for this month."
      :description="props.boardMonth ? 'No tasks planned for this month yet.' : 'Your admin has not assigned any board cards to you yet. Use Docs or Resources while waiting.'"
    >
      <template #action>
        <div class="flex flex-wrap justify-center gap-2">
          <RouterLink to="/docs" class="btn-primary">Open Docs</RouterLink>
          <RouterLink to="/resources" class="btn-secondary">Open Resources</RouterLink>
        </div>
      </template>
    </EmptyState>

    <section v-else class="board-shell">
      <!-- ── Live metrics bar ─────────────────────────────────────────── -->
      <div class="wb-metrics" aria-label="Board metrics">
        <div class="wb-metric wb-metric--todo">
          <span class="wb-metric-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-num">{{ boardMetrics.toDo }}</span><span class="wb-metric-label">Open</span></span>
        </div>
        <div class="wb-metric wb-metric--prog">
          <span class="wb-metric-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4"/></svg>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-num">{{ boardMetrics.inProgress }}</span><span class="wb-metric-label">In Progress</span></span>
        </div>
        <div class="wb-metric wb-metric--postpone">
          <span class="wb-metric-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-num">{{ boardMetrics.postpone }}</span><span class="wb-metric-label">Postpone</span></span>
        </div>
        <div class="wb-metric wb-metric--review">
          <span class="wb-metric-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-num">{{ boardMetrics.review }}</span><span class="wb-metric-label">Review</span></span>
        </div>
        <div class="wb-metric wb-metric--fix">
          <span class="wb-metric-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-num">{{ boardMetrics.needsFix }}</span><span class="wb-metric-label">Needs Fix</span></span>
        </div>
        <div class="wb-metric wb-metric--done">
          <span class="wb-metric-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-num">{{ boardMetrics.completed }}</span><span class="wb-metric-label">Completed</span></span>
        </div>
        <div class="wb-metric wb-metric--rate">
          <span class="wb-rate-ring" :style="{ '--rate': boardMetrics.rate }">
            <span class="wb-rate-val">{{ boardMetrics.rate }}<small>%</small></span>
          </span>
          <span class="wb-metric-data"><span class="wb-metric-label">Completion</span><span class="wb-metric-sub">{{ boardMetrics.completed }}/{{ boardMetrics.total }} done</span></span>
        </div>
      </div>

      <div v-if="allCards.length > 0 && filteredCards.length === 0" class="filter-empty card">
        <div>
          <h2>No cards match these filters.</h2>
          <p>Clear search or filters to see more board cards.</p>
        </div>
        <button class="btn-secondary" type="button" @click="clearFilters">Clear filters</button>
      </div>

      <div class="board-toolbar card">
        <div class="wb-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            v-model="searchQuery"
            type="search"
            class="wb-search-input"
            placeholder="Search tasks, websites, members…"
          />
          <button v-if="searchQuery" type="button" class="wb-search-clear" title="Clear" @click="searchQuery = ''">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="zoom-controls">
          <span class="zoom-label">Board View</span>
          <div class="zoom-actions">
            <button class="zoom-btn" type="button" @click="zoomOut" :disabled="zoomLevel === 70" title="Zoom Out (Cmd -)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <span class="zoom-percentage">{{ zoomLevel }}%</span>
            <button class="zoom-btn" type="button" @click="zoomIn" :disabled="zoomLevel === 120" title="Zoom In Board">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="zoom-reset" type="button" @click="resetZoom" :class="{ visible: zoomLevel !== 100 }" title="Reset Board Zoom">Reset</button>
          </div>
        </div>
      </div>

      <div class="board-scroll" aria-label="Task board columns">
        <div class="board-zoom-layer" :style="{ '--board-zoom': zoomLevel / 100 }">
          <section
            v-for="column in boardColumns"
            :key="column.key"
            class="board-column"
            :class="{
              'is-drag-over': dragOverColumn === column.key,
              'column-celebrate': celebratedColumn === column.key
            }"
            :style="{ '--column-accent': column.color }"
            @dragenter.prevent="setDragOverColumn(column.key)"
            @dragover.prevent="setDragOverColumn(column.key)"
            @dragleave="leaveColumn($event, column.key)"
            @drop.prevent="dropCard(column.key)"
          >
            <header class="column-head">
              <span class="column-dot" aria-hidden="true" />
              <div class="column-head-text">
                <h2>{{ column.title }}</h2>
                <p>{{ column.helper }}</p>
              </div>
              <span class="column-count">{{ cardsByColumn[column.key].length }}</span>
            </header>
            <button
              v-if="auth.isAdmin && !props.readOnly"
              class="add-card-mini"
              type="button"
              @click="openAddTask(column.key)"
            >
              + Add card
            </button>
            <div class="column-card-list">
              <TaskCard
                v-for="card in cardsByColumn[column.key]"
                :key="card.id"
                :card="card"
                :image-url="cardImageUrl(card)"
                :members="cardMembers(card)"
                :is-dragging="draggedCardId === card.id"
                :just-moved="celebratedCardId === card.id"
                :can-drag="!props.readOnly && canMoveCard(card)"
                class="transition-all"
                :class="{ 'ring-4 ring-primary ring-offset-2 !border-primary shadow-2xl': highlightedCardId === card.id }"
                @open="openCard(card)"
                @dragstart="dragCard(card.id)"
                @dragend="endDrag"
              />
              <div v-if="cardsByColumn[column.key].length === 0" class="column-empty">
                No cards here.
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <Modal
      :open="!!activeCard"
      :title="activeCard?.title || 'Task details'"
      size="xl"
      @close="closeCard"
    >
      <div v-if="activeCard" class="td-root">

        <!-- ── Task header bar ──────────────────────────────────────────── -->
        <div class="td-header">
          <div class="td-header-left">
            <div class="td-badges">
              <StatusBadge :status="statusForCard(activeCard)" />
              <TaskDeadlineBadge
                :due-date="activeCard.dueDate"
                :due-time="activeCard.dueTime"
                :status="activeCard.status"
                :column-key="activeCard.columnKey"
              />
              <span v-if="activeCard.priority !== 'normal'" class="td-priority-pill" :class="priorityClass(activeCard.priority)">
                {{ priorityLabel(activeCard.priority) }}
              </span>
            </div>
            <div class="td-members">
              <template v-for="member in cardMembers(activeCard)" :key="member.id">
                <div class="td-member-chip" :title="member.fullName || member.email">
                  <div class="td-member-avatar">
                    <img
                      v-if="member.avatarUrl"
                      :src="member.avatarUrl"
                      :alt="member.fullName"
                      class="td-avatar-img cursor-pointer transition hover:scale-110"
                      @click.prevent.stop="openPhotoPreview(member)"
                    />
                    <span v-else class="td-avatar-initials">{{ (member.fullName || member.email).slice(0,2).toUpperCase() }}</span>
                  </div>
                  <span class="td-member-name">{{ member.fullName || member.email }}</span>
                </div>
              </template>
            </div>
          </div>
          <div class="td-header-right">
            <label class="td-move-label">Move to</label>
            <select
              class="td-move-select"
              :value="activeCard.columnKey"
              :disabled="!canMoveCard(activeCard)"
              @change="moveCard(activeCard, ($event.target as HTMLSelectElement).value as BoardColumnKey)"
            >
              <option v-for="target in boardColumns" :key="target.key" :value="target.key">{{ target.title }}</option>
            </select>
            <button
              v-if="auth.isAdmin"
              class="td-delete-btn"
              type="button"
              :disabled="deletingCard"
              @click="deleteCard(activeCard)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              {{ deletingCard ? 'Deleting…' : 'Delete task' }}
            </button>
          </div>
        </div>

        <!-- ── Cover image ─────────────────────────────────────────────── -->
        <div v-if="cardImageUrl(activeCard)" class="td-cover-wrap">
          <img class="td-cover-img" :src="cardImageUrl(activeCard)" :alt="activeCard.title" />
          <button type="button" class="td-cover-expand" @click="detailPreviewOpen = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            Expand
          </button>
        </div>

        <!-- ── Two-column body ─────────────────────────────────────────── -->
        <div class="td-body">

          <!-- ── LEFT: main content ──────────────────────────────────── -->
          <div class="td-main">

            <!-- Task description -->
            <section class="td-section">
              <div class="td-section-head">
                <h3 class="td-section-title">Task Description</h3>
                <button
                  v-if="canEditDetails(activeCard) && detailDraftDirty"
                  class="td-save-btn"
                  type="button"
                  @click="saveActiveCardDetails"
                >Save Changes</button>
              </div>
              <input
                v-if="canEditDetails(activeCard)"
                v-model="detailDraft.title"
                class="td-title-input"
                placeholder="Task title"
              />
              <p v-else class="td-title-readonly">{{ activeCard.title }}</p>
              <p v-if="activeCard.adminNote" class="td-admin-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ activeCard.adminNote }}
              </p>
              <textarea
                v-if="canEditDetails(activeCard)"
                v-model="detailDraft.description"
                class="td-desc-textarea"
                placeholder="Explain exactly what needs to be done…"
                rows="5"
              />
              <div
                v-else
                class="td-desc-view"
                v-html="linkifyText(activeCard.description)"
              />
            </section>

            <!-- Comments -->
            <section class="td-section cs-section" style="border:none;padding:0;background:transparent;">
              <div class="cs-header">
                <h3 class="cs-title">Comments</h3>
                <span v-if="activeCard.comments.length" class="cs-count">{{ activeCard.comments.length }}</span>
              </div>
              <div v-if="activeCard.comments.length === 0" class="cs-empty">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.28"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
                <p class="cs-empty-title">No comments yet</p>
                <p class="cs-empty-sub">Add an update, instruction, or question.</p>
              </div>
              <div v-else class="cs-list">
                <article v-for="comment in activeCard.comments" :key="comment.id" class="cs-card" :class="{ 'cs-card--own': comment.userId === auth.user?.id }">
                  <div class="cs-avatar" :title="memberName(comment.userId)">
                    <img
                      v-if="memberById(comment.userId)?.avatarUrl"
                      :src="memberById(comment.userId)!.avatarUrl"
                      :alt="memberName(comment.userId)"
                      class="cs-avatar-img cursor-pointer transition hover:scale-110"
                      @click.prevent.stop="openPhotoPreview(memberById(comment.userId))"
                    />
                    <span v-else class="cs-avatar-initials">{{ commentInitials(comment.userId) }}</span>
                  </div>
                  <div class="cs-body">
                    <div class="cs-meta">
                      <span class="cs-name">{{ memberName(comment.userId) }}</span>
                      <span v-if="memberById(comment.userId)?.username" class="cs-username">@{{ memberById(comment.userId)!.username }}</span>
                      <span class="cs-role" :class="commentRoleClass(comment.userId)">{{ commentRoleLabel(comment.userId) }}</span>
                      <span class="cs-time">{{ timeAgoComment(comment.createdAt) }}</span>
                    </div>
                    <p class="cs-message" v-if="editingCommentId !== comment.id" v-html="renderComment(comment.message, mentionHandleSet)" />
                    <textarea v-if="editingCommentId === comment.id" v-model="editingCommentText" class="cs-edit-input" rows="3" @keydown.enter.exact.prevent="saveEditComment(comment)" @keydown.escape="cancelEditComment" />
                    <img v-if="comment.attachmentUrl" :src="comment.attachmentUrl" class="cs-attachment" alt="Attachment" />
                    <div class="cs-actions" v-if="editingCommentId !== comment.id">
                      <button v-if="comment.userId === auth.user?.id" class="cs-action-btn" type="button" @click="startEditComment(comment)">Edit</button>
                      <button v-if="canDeleteComment(comment)" class="cs-action-btn cs-action-btn--danger" type="button" @click="deleteComment(comment.id)">Delete</button>
                    </div>
                    <div class="cs-edit-actions" v-if="editingCommentId === comment.id">
                      <button class="btn-primary" style="font-size:0.75rem;padding:0.3rem 0.8rem;" type="button" @click="saveEditComment(comment)">Save</button>
                      <button class="btn-secondary" style="font-size:0.75rem;padding:0.3rem 0.8rem;" type="button" @click="cancelEditComment">Cancel</button>
                    </div>
                  </div>
                </article>
              </div>
              <div class="cs-input-row">
                <div class="cs-avatar cs-avatar--sm">
                  <img
                    v-if="auth.profile?.avatarUrl"
                    :src="auth.profile.avatarUrl"
                    :alt="auth.profile?.fullName || 'You'"
                    class="cs-avatar-img cursor-pointer transition hover:scale-110"
                    @click.prevent.stop="openPhotoPreview(auth.profile)"
                  />
                  <span v-else class="cs-avatar-initials">{{ selfInitials }}</span>
                </div>
                <div class="cs-input-wrap">
                  <MentionInput
                    v-model="commentText"
                    :mentionables="mentionables"
                    :disabled="props.readOnly"
                    placeholder="Write a comment… use @ to mention a teammate"
                    :rows="2"
                    @submit="addComment"
                  />
                  <div class="cs-input-footer">
                    <span class="cs-input-hint">@ to mention · Shift+Enter for new line</span>
                    <button class="btn-primary cs-submit-btn" type="button" :disabled="props.readOnly || !commentText.trim()" @click="addComment">Add Comment</button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Submit Work (member only) -->
            <section v-if="!auth.isAdmin" class="td-section">
              <div class="td-section-head">
                <h3 class="td-section-title">Submit Work</h3>
                <span v-if="activeCard.status === 'submitted'" class="td-submitted-badge">Submitted for review</span>
                <span v-if="activeCard.columnKey === 'needs_fix'" class="td-fix-badge">Admin requested changes</span>
              </div>
              <textarea
                v-model="submitWorkText"
                class="td-desc-textarea"
                placeholder="Paste the finished code, notes, or summary here…"
                rows="4"
              />
              <div class="td-screenshot-wrap">
                <div v-if="submitScreenshotUrl" class="td-screenshot-preview">
                  <img :src="submitScreenshotUrl" class="td-screenshot-img" />
                  <button type="button" class="td-screenshot-remove" @click="submitScreenshotUrl = ''">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <label v-else class="td-screenshot-upload">
                  <input type="file" class="hidden" accept="image/*" @change="uploadSubmissionScreenshot" />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>{{ attachmentUploading ? 'Optimizing…' : 'Upload result screenshot (optional)' }}</span>
                </label>
              </div>

              <!-- Work Evidence Section -->
              <div class="mt-4 border-t border-border pt-4">
                <h4 class="text-xs font-bold text-text-main uppercase tracking-wider mb-2">Work Evidence Archive</h4>
                <div v-if="reports.evidenceList.length" class="flex flex-col gap-2 mb-3">
                  <div v-for="ev in reports.evidenceList" :key="ev.id" class="flex items-center justify-between p-2 rounded-btn bg-soft text-xs">
                    <div class="flex items-center gap-2">
                      <span>{{ ev.evidenceType === 'link' ? '🔗' : ev.evidenceType === 'note' ? '📝' : '📁' }}</span>
                      <a v-if="ev.url" :href="ev.url" target="_blank" class="text-primary hover:underline font-semibold">{{ ev.evidenceType.toUpperCase() }} File/Link</a>
                      <span v-else class="font-semibold">Text Note</span>
                      <span v-if="ev.notes" class="text-text-muted">({{ ev.notes }})</span>
                    </div>
                  </div>
                </div>
                <div v-else class="text-xs text-text-muted mb-3">No custom work evidence uploaded.</div>
                
                <div class="flex flex-wrap gap-2">
                  <label class="btn-secondary py-1 px-3 text-xs cursor-pointer h-auto">
                    <input type="file" class="hidden" @change="uploadCustomEvidence" />
                    📤 Upload File/Doc
                  </label>
                  <button type="button" class="btn-secondary py-1 px-3 text-xs h-auto" @click="promptEvidenceLink">
                    🔗 Add Link
                  </button>
                  <button type="button" class="btn-secondary py-1 px-3 text-xs h-auto" @click="promptEvidenceNote">
                    📝 Add Note
                  </button>
                </div>
              </div>

              <button
                class="btn-primary td-submit-btn mt-4"
                type="button"
                :disabled="props.readOnly || submittingWork || !submitWorkText.trim()"
                @click="submitWork"
              >{{ submittingWork ? 'Submitting…' : 'Submit for Review' }}</button>
              <p v-if="data.errors.submissions" class="td-task-error">{{ data.errors.submissions }}</p>
            </section>
          </div>

          <!-- ── RIGHT: sidebar ──────────────────────────────────────── -->
          <div class="td-side">

            <!-- Task details meta -->
            <section class="td-section">
              <div class="td-section-head">
                <h3 class="td-section-title">Details</h3>
              </div>
              <div class="td-meta-list">
                <div class="td-meta-row">
                  <span class="td-meta-label">Assignee</span>
                  <select v-if="canEditDetails(activeCard)" v-model="detailDraft.assignedMemberId" class="td-meta-date" style="font-size: 0.8rem; padding: 2px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                    <option value="">Unassigned</option>
                    <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.fullName || m.email }}</option>
                  </select>
                  <span v-else class="td-meta-value">{{ memberName(activeCard.assignedMemberId) || 'Unassigned' }}</span>
                </div>
                <div class="td-meta-row">
                  <span class="td-meta-label">Deadline</span>
                  <input v-if="canEditDetails(activeCard)" v-model="detailDraft.dueDate" class="td-meta-date" type="date" />
                  <span v-else class="td-meta-value">{{ activeCard.dueDate || '—' }}</span>
                </div>
                <div class="td-meta-row">
                  <span class="td-meta-label">Status</span>
                  <StatusBadge :status="statusForCard(activeCard)" />
                </div>
                <div class="td-meta-row" v-if="activeCard.assignment.assignedAt">
                  <span class="td-meta-label">Assigned</span>
                  <span class="td-meta-value">{{ activeCard.assignment.assignedAt }}</span>
                </div>
                <div class="td-meta-row" v-if="activeCard.assignment.updatedAt">
                  <span class="td-meta-label">Updated</span>
                  <span class="td-meta-value">{{ activeCard.assignment.updatedAt }}</span>
                </div>
              </div>
            </section>

            <!-- Attachments -->
            <section class="td-section">
              <div class="td-section-head">
                <h3 class="td-section-title">Attachments <span v-if="activeCard.attachments.length" class="td-count-pill">{{ activeCard.attachments.length }}</span></h3>
                <label class="td-icon-btn" :title="attachmentUploading ? 'Uploading…' : 'Add attachment'">
                  <input type="file" class="hidden" multiple accept="image/*,.pdf,.zip,.doc,.docx" @change="uploadAttachment" />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </label>
              </div>
              <div v-if="activeCard.attachments.length === 0" class="td-empty-small">No attachments yet.</div>
              <div v-else class="td-attachment-list">
                <div v-for="att in activeCard.attachments" :key="att.id" class="td-att-card">
                  <img v-if="isImageAttachment(att) && attachmentPreview(att)" :src="attachmentPreview(att)" class="td-att-thumb" @click="previewImage(attachmentPreview(att))" />
                  <div v-else class="td-att-file-icon" @click="openAttachment(att)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div class="td-att-info">
                    <span class="td-att-name">{{ att.fileName }}</span>
                    <span class="td-att-size">
                      <template v-if="att.optimizedSize">{{ formatFileSize(att.optimizedSize) }} · saved {{ att.compressionRatio }}%</template>
                      <template v-else>{{ formatFileSize(att.fileSize) }}</template>
                    </span>
                  </div>
                  <button class="td-att-remove" type="button" title="Remove" @click="removeAttachment(att.id)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            </section>

            <!-- Links -->
            <section class="td-section">
              <div class="td-section-head">
                <h3 class="td-section-title">Links <span v-if="activeCard.links.length" class="td-count-pill">{{ activeCard.links.length }}</span></h3>
              </div>
              <div v-if="activeCard.links.length" class="td-link-list">
                <a v-for="link in activeCard.links" :key="link.id" :href="link.url" target="_blank" class="td-link-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <span class="td-link-label">{{ link.title || link.url }}</span>
                </a>
              </div>
              <div class="td-add-link-row">
                <input v-model="linkForm.url" class="td-add-input" placeholder="https://…" @keyup.enter="addLink" />
                <button class="td-icon-btn" type="button" :disabled="props.readOnly" @click="addLink" title="Add link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </section>

            <!-- Checklist -->
            <section class="td-section">
              <div class="td-section-head">
                <h3 class="td-section-title">Checklist
                  <span v-if="activeCard.checklist.length" class="td-count-pill">{{ activeCard.checklistDone }}/{{ activeCard.checklist.length }}</span>
                </h3>
              </div>
              <div v-if="activeCard.checklist.length" class="td-checklist">
                <label v-for="item in activeCard.checklist" :key="item.id" class="td-check-item">
                  <input type="checkbox" class="td-checkbox" :checked="item.completed" @change="toggleChecklistItem(item.id)" />
                  <span :class="{ 'td-check-done': item.completed }">{{ item.text }}</span>
                </label>
              </div>
              <div class="td-add-link-row">
                <input v-model="checklistText" class="td-add-input" placeholder="Add checklist item…" @keyup.enter="addChecklistItem" />
                <button class="td-icon-btn" type="button" :disabled="props.readOnly" @click="addChecklistItem" title="Add item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </section>

          </div>
        </div>
      </div>
    </Modal>

    <QuickAddTaskModal
      :open="addTaskOpen"
      :initial-column-key="addTaskColumn"
      :initial-member-ids="initialMemberIds"
      :board-month="effectiveBoardMonth || undefined"
      @close="addTaskOpen = false"
    />

    <Modal :open="!!imagePreviewUrl" title="Image preview" size="lg" @close="imagePreviewUrl = ''">
      <img v-if="imagePreviewUrl" class="preview-image" :src="imagePreviewUrl" alt="Task preview" />
    </Modal>

    <!-- Task Image Full Preview (Side-by-side) -->
    <TaskImagePreviewModal
      v-if="activeCard && cardImageUrl(activeCard)"
      :is-open="detailPreviewOpen"
      :image-url="cardImageUrl(activeCard)"
      :task-title="activeCard.title"
      :description="activeCard.description"
      :assigned-member="cardMembers(activeCard)[0]?.fullName || cardMembers(activeCard)[0]?.email"
      :due-date="activeCard.dueDate"
      :status="statusForCard(activeCard)"
      :created-by="getCreatorName(activeCard.assignment.assignedBy)"
      :on-close="() => detailPreviewOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import StatusBadge, { type Status } from '@/components/ui/StatusBadge.vue';
import TaskDeadlineBadge from '@/components/ui/TaskDeadlineBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import QuickAddTaskModal from '@/components/board/QuickAddTaskModal.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { useImagePreviewStore } from '@/stores/imagePreview';

const previewStore = useImagePreviewStore();
const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName || member.name || member.email || 'Member',
      email: member.email,
      role: member.role
    });
  }
};
import TaskCard from '@/components/board/TaskCard.vue';
import TaskImagePreviewModal from '@/components/board/TaskImagePreviewModal.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import MentionInput, { type Mentionable } from '@/components/ui/MentionInput.vue';
import { linkifyText, renderComment, extractMentions } from '@/utils/linkify';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member, type Priority, type PromptAssignment, type BoardColumnKey } from '@/stores/data';
import { useReportsStore } from '@/stores/reports';
import {
  type BoardColumn,
  type BoardLink,
  type BoardAttachment,
  type ChecklistItem,
  type BoardComment,
  type BoardExtra,
  type BoardCard,
  type AssignmentMode,
  type LinkType,
  type TaskType,
  type ChecklistTemplateKey,
  BOARD_COLUMNS,
  LINK_TYPES,
  TASK_TYPES
} from '@/types/board';
import { playCardDropSound } from '@/composables/useCardDropSound';
import { useNotificationsStore, type CreateAdminNotificationInput } from '@/stores/notifications';
import { useTaskAlertsStore } from '@/stores/taskAlerts';
import { optimizeImage, formatFileSize } from '@/utils/imageOptimizer';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['prompt_assignments', 'section_tasks', 'submissions', 'review_comments', 'prompt_templates', 'websites']);


// Board types and constants moved to @/types/board.ts


const CHECKLIST_TEMPLATES: Record<ChecklistTemplateKey, string[]> = {
  website_build: [
    'Open the website page',
    'Build desktop layout',
    'Build mobile layout',
    'Check button links',
    'Add products or content',
    'Submit screenshot'
  ],
  section_fix: [
    'Open the page',
    'Check the screenshot/reference',
    'Fix desktop layout',
    'Fix mobile layout',
    'Submit screenshot'
  ],
  mobile_fix: [
    'Open mobile preview',
    'Fix spacing',
    'Check header/menu',
    'Check button links',
    'Submit mobile screenshot'
  ],
  seo_check: [
    'Check title tag',
    'Check meta description',
    'Check headings',
    'Check image alt text',
    'Check internal links'
  ],
  final_review: [
    'Review desktop layout',
    'Review mobile layout',
    'Check content accuracy',
    'Check forms and buttons',
    'Move card to Waiting Review'
  ]
};

const boardColumnKeys = BOARD_COLUMNS.map((column) => column.key);
const systemKeys = {
  column: '__board_column',
  taskType: '__board_task_type',
  assignmentMode: '__board_assignment_mode',
  pageSection: '__board_page_section',
  title: '__board_title',
  shortDescription: '__board_short_description',
  instructions: '__board_instructions',
  description: '__board_description',
  startDate: '__board_start_date',
  cover: '__board_cover_image_url',
  labels: '__board_labels',
  links: '__board_links',
  attachments: '__board_attachments',
  checklist: '__board_checklist',
  comments: '__board_comments',
  collaborators: '__board_collaborators',
  reviewer: '__board_reviewer_id',
  dueTime: '__board_due_time',
  month: '__board_month'
};

const auth = useAuthStore();
const data = useDataStore();
const reports = useReportsStore();
const notifs = useNotificationsStore();
const taskAlerts = useTaskAlertsStore();
const route = useRoute();

// ── @mentions: teammate directory (safe view — works for every role) ──────────
const mentionables = ref<Mentionable[]>([]);
const mentionHandleSet = computed(() => new Set(mentionables.value.map((m) => m.handle)));
const mentionIdByHandle = computed(() => {
  const map = new Map<string, string>();
  mentionables.value.forEach((m) => map.set(m.handle, m.id));
  return map;
});

const fetchMentionables = async () => {
  const { data: rows, error } = await supabase
    .rpc('get_team_directory')
    .select('id, full_name, username, avatar_url');
  if (error || !rows) return;
  const seen = new Set<string>();
  const list: Mentionable[] = [];
  for (const r of rows as { id: string; full_name: string | null; username: string | null; avatar_url: string | null }[]) {
    const base = (r.username || r.full_name || 'member').toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'member';
    let handle = base;
    let i = 2;
    while (seen.has(handle)) handle = `${base}${i++}`;
    seen.add(handle);
    list.push({ id: r.id, name: r.full_name || 'Team member', handle, avatarUrl: r.avatar_url || '' });
  }
  mentionables.value = list;
};
const props = withDefaults(defineProps<{
  adminMemberId?: string;
  embedded?: boolean;
  readOnly?: boolean;
  showAll?: boolean;
  overrideAssignments?: import('@/stores/data').PromptAssignment[];
  boardMonth?: string; // 'YYYY-MM' — when set, only show tasks for this month
}>(), {
  adminMemberId: '',
  embedded: false,
  readOnly: false,
  showAll: false,
  overrideAssignments: () => [],
  boardMonth: ''
});

const adminRecipientExtras = (ids: Array<string | null | undefined>) =>
  Array.from(new Set(ids.filter((id): id is string => !!id && id !== auth.user?.id)));

const notifyAdmins = (input: CreateAdminNotificationInput) => {
  if (!auth.user?.id || auth.isAdmin) return;
  void notifs.createAdminNotification({ ...input, actorId: auth.user.id });
};

const boardColumns = BOARD_COLUMNS;
const detailPreviewOpen = ref(false);

const getCreatorName = (actorId: string | null | undefined) => {
  if (!actorId) return undefined;
  const member = data.memberById(actorId);
  return member ? (member.fullName || member.email) : 'Admin';
};

const localLoading = ref(false);
const localError = ref<string | null>(null);
const searchQuery = ref('');
const websiteFilter = ref('');
const projectFilter = ref('');
const memberFilter = ref('');
const priorityFilter = ref('');
const draggedCardId = ref('');
const dragOverColumn = ref<BoardColumnKey | ''>('');
const celebratedCardId = ref('');
const celebratedColumn = ref<BoardColumnKey | ''>('');
const selectedCardId = ref('');

// Local month selector state for standalone (non-embedded) mode
const initMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const localBoardMonth = ref(initMonth());
// Effective month: prop takes precedence (embedded), else local selector
const effectiveBoardMonth = computed(() => props.boardMonth || localBoardMonth.value);
const addTaskOpen = ref(false);
const advancedOptionsOpen = ref(false);
const creatingTask = ref(false);
const addTaskError = ref('');
const attachmentUploading = ref(false);
const imagePreviewUrl = ref('');
const checklistText = ref('');
const assignMemberSearch = ref('');
const assignMemberFilter = ref<'all' | 'online' | 'available' | 'fewer_tasks' | 'needs_work'>('all');
const websiteSearch = ref('');
const projectSearch = ref('');
const promptSearch = ref('');
const newChecklistText = ref('');
const taskToast = ref('');
const submitWorkText = ref('');
const submitScreenshotUrl = ref('');
const submittingWork = ref(false);
const commentText = ref('');
const editingCommentId = ref<string | null>(null);
const editingCommentText = ref('');
const attachmentPreviewUrls = ref<Record<string, string>>({});
const highlightedCardId = ref('');

const zoomLevel = ref(100);
const zoomLevels = [70, 80, 90, 100, 110, 120];

const setZoom = (level: number) => {
  if (!zoomLevels.includes(level)) return;
  zoomLevel.value = level;
  localStorage.setItem('kiuq_work_board_zoom', level.toString());
};

const zoomIn = () => {
  const currentIndex = zoomLevels.indexOf(zoomLevel.value);
  if (currentIndex < zoomLevels.length - 1) {
    setZoom(zoomLevels[currentIndex + 1]);
  }
};

const zoomOut = () => {
  const currentIndex = zoomLevels.indexOf(zoomLevel.value);
  if (currentIndex > 0) {
    setZoom(zoomLevels[currentIndex - 1]);
  }
};

const resetZoom = () => setZoom(100);

const newTask = reactive({
  title: '',
  taskType: 'fix_section' as TaskType,
  shortDescription: '',
  instructions: '',
  description: '',
  memberId: '',
  assignmentMode: 'duplicate' as AssignmentMode,
  promptId: '',
  websiteId: '',
  projectId: '',
  pageSection: '',
  columnKey: 'to_do' as BoardColumnKey,
  priority: 'normal' as Priority,
  startDate: '',
  dueDate: '',
  dueDay: '',
  dueTime: '17:00',
  dueYearNum: 0,
  dueMonthNum: 0,
  adminNote: '',
  links: [] as BoardLink[],
  attachments: [] as BoardAttachment[],
  checklist: [] as ChecklistItem[]
});

const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dueMonthYearStr = computed(() => {
  if (!newTask.dueYearNum || !newTask.dueMonthNum) return '';
  return `${monthNamesFull[newTask.dueMonthNum - 1]} ${newTask.dueYearNum}`;
});
const dueDaysInMonth = computed(() => {
  if (!newTask.dueYearNum || !newTask.dueMonthNum) return 31;
  return new Date(newTask.dueYearNum, newTask.dueMonthNum, 0).getDate();
});
const showMonthChanger = ref(false);

const detailDraft = reactive({
  title: '',
  dueDate: '',
  description: '',
  assignedMemberId: ''
});

const linkForm = reactive({
  title: '',
  url: '',
  type: 'website_url' as LinkType
});

const newLinkForm = reactive({
  title: '',
  url: '',
  type: 'website_url' as LinkType
});

const attachmentForm = reactive({
  fileName: '',
  fileUrl: ''
});

const today = computed(() => new Date().toISOString().slice(0, 10));

// Effective month for an assignment: stored __board_month > assignedAt month > today
const assignmentMonth = (assignment: PromptAssignment): string => {
  const stored = assignment.filledValues?.[systemKeys.month];
  if (stored) return stored;
  const date = assignment.assignedAt || assignment.updatedAt;
  if (date && date.length >= 7) return date.slice(0, 7);
  return new Date().toISOString().slice(0, 7);
};

const sourceAssignments = computed(() => {
  const source = props.overrideAssignments?.length ? props.overrideAssignments : null;
  let pool: PromptAssignment[];
  if (props.adminMemberId) {
    const base = source ?? data.assignments;
    pool = base.filter((assignment) => {
      if (assignment.isArchived === true) return false;
      const extra = boardExtraFromAssignment(assignment);
      return assignment.assignedMemberId === props.adminMemberId || extra.collaborators.includes(props.adminMemberId);
    });
  } else if (source) {
    pool = source.filter((a) => a.isArchived !== true);
  } else if (props.showAll) {
    pool = data.assignments.filter((a) => a.isArchived !== true);
  } else {
    const rawPool = auth.isAdmin ? data.assignments : data.myAssignments;
    pool = rawPool.filter((a) => a.isArchived !== true);
  }
  if (effectiveBoardMonth.value) {
    pool = pool.filter((a) => assignmentMonth(a) === effectiveBoardMonth.value);
  }
  return pool;
});

const allCards = computed<BoardCard[]>(() =>
  sourceAssignments.value.map(cardFromAssignment).sort(cardSort)
);
const activeCard = computed(() => allCards.value.find((card) => card.id === selectedCardId.value) || null);

const websiteOptions = computed(() =>
  data.websites.filter((website) => allCards.value.some((card) => card.assignment.websiteId === website.id))
);
const projectOptions = computed(() =>
  data.projects.filter((project) => allCards.value.some((card) => card.assignment.projectId === project.id))
);
const memberOptions = computed(() =>
  data.members.filter((member) => member.status === 'active')
);
const activeTaskCountForMember = (id: string) =>
  data.assignments.filter(
    (assignment) =>
      assignment.isArchived !== true &&
      assignment.assignedMemberId === id &&
      !['approved', 'submitted'].includes(assignment.status)
  ).length;
const filteredAssignMembers = computed(() => {
  const term = assignMemberSearch.value.trim().toLowerCase();
  return memberOptions.value.filter((member) => {
    const count = activeTaskCountForMember(member.id);
    const searchable = `${member.fullName} ${member.email}`.toLowerCase();
    if (term && !searchable.includes(term)) return false;
    if (assignMemberFilter.value === 'online' && member.currentStatus !== 'online') return false;
    if (assignMemberFilter.value === 'available' && !(member.currentStatus !== 'offline' && count <= 5)) return false;
    if (assignMemberFilter.value === 'fewer_tasks' && count > 2) return false;
    if (assignMemberFilter.value === 'needs_work' && count > 0) return false;
    return true;
  });
});
const filteredWebsiteOptions = computed(() => {
  const term = websiteSearch.value.trim().toLowerCase();
  return data.websites.filter((website) => !term || `${website.name} ${website.domain}`.toLowerCase().includes(term));
});
const filteredProjectOptions = computed(() => {
  const term = projectSearch.value.trim().toLowerCase();
  return data.projects.filter((project) => !term || project.name.toLowerCase().includes(term));
});
const filteredPromptOptions = computed(() => {
  const term = promptSearch.value.trim().toLowerCase();
  return data.prompts.filter((prompt) => !term || `${prompt.title} ${prompt.category}`.toLowerCase().includes(term));
});

const filteredCards = computed(() => {
  const term = searchQuery.value.trim().toLowerCase();
  return allCards.value.filter((card) => {
    const searchable = [
      card.title,
      card.websiteName,
      card.projectName,
      card.pageSection,
      card.promptTitle,
      card.adminNote,
      card.description,
      card.labels.join(' ')
    ]
      .join(' ')
      .toLowerCase();
    if (term && !searchable.includes(term)) return false;
    if (websiteFilter.value && card.assignment.websiteId !== websiteFilter.value) return false;
    if (projectFilter.value && card.assignment.projectId !== projectFilter.value) return false;
    if (memberFilter.value && !cardMembers(card).some((member) => member.id === memberFilter.value)) return false;
    if (priorityFilter.value && card.priority !== priorityFilter.value) return false;
    return true;
  });
});

const cardsByColumn = computed<Record<BoardColumnKey, BoardCard[]>>(() => {
  const groups = boardColumns.reduce(
    (acc, column) => {
      acc[column.key] = [];
      return acc;
    },
    {} as Record<BoardColumnKey, BoardCard[]>
  );
  filteredCards.value.forEach((card) => {
    groups[card.columnKey].push(card);
  });
  return groups;
});

// Live board metrics for the metrics bar — derived from the filtered cards
// so the numbers always reflect what's on screen.
const boardMetrics = computed(() => {
  const by = cardsByColumn.value;
  const toDo = by.to_do?.length ?? 0;
  const inProgress = by.in_progress?.length ?? 0;
  const postpone = by.postpone?.length ?? 0;
  const review = by.waiting_review?.length ?? 0;
  const needsFix = by.needs_fix?.length ?? 0;
  const completed = by.completed?.length ?? 0;
  const total = toDo + inProgress + postpone + review + needsFix + completed;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  return { toDo, inProgress, postpone, review, needsFix, completed, total, rate };
});

const isInitialLoading = computed(() => localLoading.value && allCards.value.length === 0);
const pageError = computed(
  () =>
    localError.value ||
    data.errors.assignments ||
    data.errors.prompts ||
    data.errors.projects ||
    data.errors.websites ||
    null
);

const parseJson = <T,>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const boardExtraFromAssignment = (assignment: PromptAssignment): BoardExtra => {
  const filled = assignment.filledValues || {};
  const rawColumn = filled[systemKeys.column] || '';
  const rawTaskType = filled[systemKeys.taskType] || '';
  const rawAssignmentMode = filled[systemKeys.assignmentMode] || '';
  const links = parseJson<Partial<BoardLink>[]>(filled[systemKeys.links], []).map((link) => ({
    id: link.id || makeId(),
    title: link.title || 'Resource link',
    url: link.url || '',
    type: (LINK_TYPES.some((type) => type.value === link.type) ? link.type : 'other') as LinkType,
    addedBy: link.addedBy || '',
    createdAt: link.createdAt || ''
  }));
  const attachments = parseJson<Partial<BoardAttachment>[]>(filled[systemKeys.attachments], []).map((attachment) => ({
    id: attachment.id || makeId(),
    fileName: attachment.fileName || 'Attachment',
    fileUrl: attachment.fileUrl || '',
    filePath: attachment.filePath || '',
    fileType: attachment.fileType || '',
    fileSize: attachment.fileSize || 0,
    caption: attachment.caption || '',
    uploadedBy: attachment.uploadedBy || '',
    createdAt: attachment.createdAt || ''
  }));
  return {
    columnKey: boardColumnKeys.includes(rawColumn as BoardColumnKey) ? (rawColumn as BoardColumnKey) : '',
    taskType: TASK_TYPES.some((type) => type.value === rawTaskType) ? (rawTaskType as TaskType) : '',
    assignmentMode: rawAssignmentMode === 'shared' ? 'shared' : 'duplicate',
    pageSection: filled[systemKeys.pageSection] || '',
    title: filled[systemKeys.title] || '',
    shortDescription: filled[systemKeys.shortDescription] || '',
    instructions: filled[systemKeys.instructions] || filled[systemKeys.description] || '',
    description: filled[systemKeys.description] || '',
    coverImageUrl: filled[systemKeys.cover] || '',
    labels: parseJson<string[]>(filled[systemKeys.labels], []),
    links,
    attachments,
    checklist: parseJson<ChecklistItem[]>(filled[systemKeys.checklist], []),
    comments: parseJson<BoardComment[]>(filled[systemKeys.comments], []),
    collaborators: parseJson<string[]>(filled[systemKeys.collaborators], []),
    reviewerId: filled[systemKeys.reviewer] || '',
    dueTime: filled[systemKeys.dueTime] || ''
  };
};

const cardFromAssignment = (assignment: PromptAssignment): BoardCard => {
  const prompt = data.promptById(assignment.promptId);
  const project = data.projectById(assignment.projectId);
  const website = data.websiteById(assignment.websiteId);
  const extra = boardExtraFromAssignment(assignment);
  const dueDate = assignment.dueDate || project?.deadline || '';
  const columnKey = extra.columnKey || columnFromStatus(assignment.status);
  const checklistDone = extra.checklist.filter((item) => item.completed).length;

  return {
    ...extra,
    id: assignment.id,
    assignment,
    title: extra.title || prompt?.title || 'Assigned website task',
    promptTitle: prompt?.title || 'Assigned prompt',
    promptId: assignment.promptId,
    projectName: project?.name || 'No project',
    websiteName: website?.name || 'No website',
    websiteDomain: website?.domain || '',
    pageSection: extra.pageSection || prompt?.category || 'Website section',
    assignedMemberId: assignment.assignedMemberId,
    priority: assignment.priority,
    dueDate,
    startDate: assignment.startedAt,
    status: assignment.status,
    adminNote: assignment.adminNote,
    updatedAt: assignment.updatedAt,
    columnKey,
    isOverdue: !!dueDate && dueDate < today.value && !['completed', 'approved', 'submitted', 'postponed'].includes(assignment.status),
    isDueToday: dueDate === today.value,
    checklistDone
  };
};

const cardSort = (a: BoardCard, b: BoardCard) => {
  const priority = priorityWeight(b.priority) - priorityWeight(a.priority);
  if (priority) return priority;
  return dateTime(a.dueDate) - dateTime(b.dueDate) || a.title.localeCompare(b.title);
};

const priorityWeight = (priority: Priority) => {
  if (priority === 'urgent') return 4;
  if (priority === 'high') return 3;
  if (priority === 'normal') return 2;
  return 1;
};

const dateTime = (date: string) => (date ? new Date(`${date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY);
const daysFromToday = (date: string) => {
  if (!date) return Number.POSITIVE_INFINITY;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((dateTime(date) - dateTime(today.value)) / oneDay);
};

const columnFromStatus = (status: PromptAssignment['status']): BoardColumnKey => {
  if (status === 'in_progress') return 'in_progress';
  if (status === 'submitted') return 'waiting_review';
  if (status === 'approved') return 'completed';
  if (status === 'postponed') return 'postpone';
  return 'to_do';
};

const statusForColumn = (column: BoardColumnKey): PromptAssignment['status'] => {
  if (column === 'in_progress') return 'in_progress';
  if (column === 'waiting_review') return 'submitted';
  if (column === 'needs_fix') return 'needs_fix';
  if (column === 'completed') return 'approved';
  if (column === 'postpone') return 'postponed';
  return 'pending';
};

const statusForCard = (card: BoardCard): Status => {
  if (card.columnKey === 'to_do') return 'assigned';
  if (card.columnKey === 'in_progress') return 'in_progress';
  if (card.columnKey === 'postpone') return 'postponed';
  if (card.columnKey === 'waiting_review') return 'submitted';
  if (card.columnKey === 'needs_fix') return 'needs_fix';
  if (card.columnKey === 'completed') return 'approved';
  if (card.status === 'pending') return 'pending';
  return card.status;
};

const priorityLabel = (priority: Priority) =>
  priority === 'normal' ? 'Normal' : priority[0].toUpperCase() + priority.slice(1);

const priorityClass = (priority: Priority) => {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'calm';
  return 'normal';
};


const labelClass = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('urgent') || normalized.includes('bug')) return 'red';
  if (normalized.includes('seo') || normalized.includes('blog')) return 'green';
  if (normalized.includes('design') || normalized.includes('presentation')) return 'purple';
  if (normalized.includes('product')) return 'orange';
  return 'blue';
};

const memberName = (id: string) => {
  const member = data.memberById(id);
  return member?.fullName || member?.email || 'Team member';
};

const memberById = (id: string) => data.memberById(id);

const commentInitials = (userId: string) => {
  const name = memberName(userId);
  return name.split(/[\s@.]+/).map((s) => s[0] ?? '').join('').slice(0, 2).toUpperCase();
};

const selfInitials = computed(() => {
  const name = auth.profile?.fullName || auth.user?.email || '?';
  return name.split(/[\s@.]+/).map((s: string) => s[0] ?? '').join('').slice(0, 2).toUpperCase();
});

const commentRoleLabel = (userId: string) => {
  const member = data.memberById(userId);
  if (!member) return 'Member';
  if (member.role === 'admin') return 'Admin';
  if (member.role === 'member') return 'Team Member';
  return member.role;
};

const commentRoleClass = (userId: string) => {
  const member = data.memberById(userId);
  return member?.role === 'admin' ? 'cs-role--admin' : 'cs-role--member';
};

const timeAgoComment = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const canDeleteComment = (comment: BoardComment) => {
  if (auth.isAdmin) return true;
  return comment.userId === auth.user?.id;
};

const deleteComment = async (commentId: string) => {
  const card = activeCard.value;
  if (!card) return;
  await saveCardPatch(card, { comments: card.comments.filter((c) => c.id !== commentId) });
};

const startEditComment = (comment: BoardComment) => {
  editingCommentId.value = comment.id;
  editingCommentText.value = comment.message;
};

const cancelEditComment = () => {
  editingCommentId.value = null;
  editingCommentText.value = '';
};

const saveEditComment = async (comment: BoardComment) => {
  const card = activeCard.value;
  const text = editingCommentText.value.trim();
  if (!card || !text) return;
  const updated = card.comments.map((c) =>
    c.id === comment.id ? { ...c, message: text } : c
  );
  await saveCardPatch(card, { comments: updated });
  cancelEditComment();
};

const taskTypeLabel = (value: TaskType | '') =>
  TASK_TYPES.find((type) => type.value === value)?.label || 'Task';

const linkTypeLabel = (value: LinkType) =>
  LINK_TYPES.find((type) => type.value === value)?.label || 'Link';

const memberStatusLabel = (member: Member) => {
  if (member.currentStatus === 'online') return 'Online';
  if (member.currentStatus === 'away') return 'Away';
  return 'Offline';
};

const initials = (name: string, email: string) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const cardMembers = (card: BoardCard): Member[] => {
  const ids = [card.assignedMemberId, ...card.collaborators, card.reviewerId].filter(Boolean);
  const unique = Array.from(new Set(ids));
  return unique
    .map((id) => data.memberById(id))
    .filter((member): member is Member => !!member);
};

const canMoveCard = (card: BoardCard) => {
  if (props.readOnly) return false;
  if (auth.isAdmin) return true;
  const userId = auth.user?.id;
  if (!userId) return false;
  return card.assignedMemberId === userId || card.collaborators.includes(userId);
};

const canEditDetails = (_card: BoardCard) => {
  if (props.readOnly) return false;
  return auth.isAdmin;
};

const deletingCard = ref(false);

const deleteCard = async (card: BoardCard) => {
  if (!auth.isAdmin) return;
  if (!confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
  deletingCard.value = true;
  try {
    const ok = await data.removeAssignment(card.id);
    if (ok) closeCard();
  } finally {
    deletingCard.value = false;
  }
};

const detailDraftDirty = computed(() => {
  const card = activeCard.value;
  if (!card) return false;
  return (
    detailDraft.title !== card.title ||
    detailDraft.dueDate !== card.dueDate ||
    detailDraft.description !== card.description ||
    detailDraft.assignedMemberId !== (card.assignedMemberId || '')
  );
});

const isImageAttachment = (attachment: BoardAttachment) =>
  attachment.fileType.startsWith('image/') ||
  attachment.fileType === 'image' ||
  isImageUrl(attachment.fileUrl || attachment.fileName);

const attachmentPreview = (attachment: BoardAttachment) =>
  attachment.fileUrl || attachmentPreviewUrls.value[attachment.id] || '';

const firstImageAttachment = (card: BoardCard) =>
  card.attachments.find((attachment) => isImageAttachment(attachment));

const cardImageUrl = (card: BoardCard) => {
  if (card.coverImageUrl) return card.coverImageUrl;
  const image = firstImageAttachment(card);
  return image ? attachmentPreview(image) : '';
};

const loadAttachmentPreviews = async (card: BoardCard) => {
  const next = { ...attachmentPreviewUrls.value };
  await Promise.allSettled(
    card.attachments
      .filter((attachment) => isImageAttachment(attachment) && attachment.filePath && !next[attachment.id])
      .map(async (attachment) => {
        const url = await data.getResourceDownloadUrl(attachment.filePath);
        if (url) next[attachment.id] = url;
      })
  );
  attachmentPreviewUrls.value = next;
};

const clearFilters = () => {
  searchQuery.value = '';
  websiteFilter.value = '';
  projectFilter.value = '';
  memberFilter.value = '';
  priorityFilter.value = '';
};

let celebrationTimer: number | undefined;

const triggerMoveCelebration = (cardId: string, column: BoardColumnKey) => {
  celebratedCardId.value = cardId;
  celebratedColumn.value = column;
  playCardDropSound();
  if (celebrationTimer) window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(() => {
    celebratedCardId.value = '';
    celebratedColumn.value = '';
  }, 1200);
};

const fillDetailDraft = (card: BoardCard) => {
  detailDraft.title = card.title;
  detailDraft.dueDate = card.dueDate;
  detailDraft.description = card.description;
  detailDraft.assignedMemberId = card.assignedMemberId || '';
  linkForm.title = '';
  linkForm.url = '';
  linkForm.type = 'website_url';
  attachmentForm.fileName = '';
  attachmentForm.fileUrl = '';
  checklistText.value = '';
  submitWorkText.value = '';
  submitScreenshotUrl.value = '';
  commentText.value = '';
};

const openCard = (card: BoardCard) => {
  selectedCardId.value = card.id;
  fillDetailDraft(card);
  void loadAttachmentPreviews(card);
  void data.addActivityLog('opened_task', 'assignment', card.id, `Opened task: ${card.title}.`);
  void reports.fetchEvidence(card.assignment.id);
};

const closeCard = () => {
  selectedCardId.value = '';
};

watch(activeCard, (card) => {
  if (card) {
    fillDetailDraft(card);
    void loadAttachmentPreviews(card);
    void reports.fetchEvidence(card.assignment.id);
  }
});

watch(
  allCards,
  (cards) => {
    cards.slice(0, 24).forEach((card) => {
      if (firstImageAttachment(card)) void loadAttachmentPreviews(card);
    });
  },
  { immediate: true }
);

const dragCard = (id: string) => {
  draggedCardId.value = id;
};

const setDragOverColumn = (column: BoardColumnKey) => {
  if (draggedCardId.value) dragOverColumn.value = column;
};

const leaveColumn = (event: DragEvent, column: BoardColumnKey) => {
  if (dragOverColumn.value !== column) return;
  const currentTarget = event.currentTarget as HTMLElement | null;
  const relatedTarget = event.relatedTarget as Node | null;
  if (!currentTarget || !relatedTarget || !currentTarget.contains(relatedTarget)) {
    dragOverColumn.value = '';
  }
};

const endDrag = () => {
  draggedCardId.value = '';
  dragOverColumn.value = '';
};

const dropCard = (column: BoardColumnKey) => {
  const card = allCards.value.find((item) => item.id === draggedCardId.value);
  endDrag();
  if (card && canMoveCard(card)) void moveCard(card, column);
};

const serializeBoardPatch = (base: BoardCard, patch: Partial<BoardExtra>) => {
  const next: BoardExtra = { ...base, ...patch };
  return {
    [systemKeys.column]: next.columnKey || base.columnKey,
    [systemKeys.taskType]: next.taskType,
    [systemKeys.assignmentMode]: next.assignmentMode,
    [systemKeys.pageSection]: next.pageSection,
    [systemKeys.title]: next.title,
    [systemKeys.shortDescription]: next.shortDescription,
    [systemKeys.instructions]: next.instructions,
    [systemKeys.description]: next.description,
    [systemKeys.startDate]: base.assignment.startedAt || '',
    [systemKeys.cover]: next.coverImageUrl,
    [systemKeys.labels]: JSON.stringify(next.labels),
    [systemKeys.links]: JSON.stringify(next.links),
    [systemKeys.attachments]: JSON.stringify(next.attachments),
    [systemKeys.checklist]: JSON.stringify(next.checklist),
    [systemKeys.comments]: JSON.stringify(next.comments),
    [systemKeys.collaborators]: JSON.stringify(next.collaborators),
    [systemKeys.reviewer]: next.reviewerId,
    [systemKeys.month]: base.assignment.filledValues?.[systemKeys.month] || assignmentMonth(base.assignment)
  };
};

const saveCardPatch = async (card: BoardCard, patch: Partial<BoardExtra>) => {
  const filledValues = {
    ...card.assignment.filledValues,
    ...serializeBoardPatch(card, patch)
  };
  return data.upsertAssignment({
    ...card.assignment,
    filledValues
  });
};

const moveCard = async (card: BoardCard, column: BoardColumnKey) => {
  if (column === card.columnKey || !canMoveCard(card)) return;
  const status = statusForColumn(column);
  
  // Instant visual feedback
  triggerMoveCelebration(card.id, column);
  
  const filledValues = {
    ...card.assignment.filledValues,
    ...serializeBoardPatch(card, { columnKey: column })
  };
  
  const ok = await data.upsertAssignment({
    ...card.assignment,
    status,
    filledValues,
    startedAt: column === 'in_progress' && !card.assignment.startedAt ? today.value : card.assignment.startedAt,
    completedAt: column === 'completed' ? today.value : card.assignment.completedAt
  });
  
  if (ok) {
    const columnLabel = boardColumns.find((item) => item.key === column)?.title || column;
    await data.addActivityLog(
      column === 'in_progress' ? 'task_started' : column === 'completed' ? 'completed_task' : 'page_navigated',
      'assignment',
      card.id,
      `Moved task to ${columnLabel}.`
    );

    if (auth.isAdmin && column === 'to_do' && card.assignedMemberId && card.assignedMemberId !== auth.user?.id) {
      const sendAlert = window.confirm('Send Alert To Assignee?');
      if (sendAlert) {
        const alertPayload = {
          alertId: `task-moved-${card.id}-${Date.now()}`,
          alertType: 'Reminder' as const,
          title: 'TASK MOVED BACK TO TO DO',
          message: `Your task "${card.title}" has been moved back to To Do.\n\nAssigned By: ${auth.profile?.fullName || 'Admin'}`,
          priority: 'High' as const,
          relatedType: 'workboard_task' as const,
          relatedId: card.id,
          status: 'published' as const,
          requireAck: true
        };
        void taskAlerts.createOrUpdateAlert(alertPayload, [card.assignedMemberId]);
      }
    }

    if (!auth.isAdmin && (column === 'in_progress' || column === 'waiting_review')) {
      const memberName = auth.profile?.fullName || 'A member';
      const waitingReview = column === 'waiting_review';
      notifyAdmins({
        type: waitingReview ? 'submission_received' : 'task_updated',
        title: waitingReview ? 'Task waiting for review' : 'Task started',
        message: waitingReview
          ? `${memberName} submitted "${card.title}" for review.`
          : `${memberName} started "${card.title}".`,
        link: '/work-board/members',
        relatedType: 'task',
        relatedId: card.id,
        taskId: card.id,
        relatedWebsiteId: card.assignment.websiteId ?? undefined,
        extraRecipientIds: adminRecipientExtras([card.assignment.assignedBy, card.reviewerId]),
      });
    }

    // Notify assigned member when admin moves to needs_fix or approved/completed
    if (auth.isAdmin && card.assignedMemberId && card.assignedMemberId !== auth.user?.id) {
      const actorName = auth.profile?.fullName || 'Admin';
      const taskTitle = card.title;
      if (column === 'needs_fix') {
        void notifs.createNotification({
          recipientId: card.assignedMemberId,
          actorId:     auth.user?.id,
          type:        'task_needs_fix',
          title:       'Task needs fix',
          message:     `${actorName} requested fixes on your task: "${taskTitle}"`,
          relatedType: 'task',
          taskId:      card.id,
        });
      } else if (column === 'completed') {
        void notifs.createNotification({
          recipientId: card.assignedMemberId,
          actorId:     auth.user?.id,
          type:        'task_approved',
          title:       'Task approved',
          message:     `${actorName} approved your task: "${taskTitle}"`,
          relatedType: 'task',
          taskId:      card.id,
        });
      }
    }
  }
};

const saveActiveCardDetails = async () => {
  const card = activeCard.value;
  if (!card || !canEditDetails(card)) return;
  const dueDateChanged = detailDraft.dueDate !== card.dueDate;
  const assigneeChanged = detailDraft.assignedMemberId !== (card.assignedMemberId || '');
  const filledValues = {
    ...card.assignment.filledValues,
    ...serializeBoardPatch(card, {
      title: detailDraft.title.trim() || card.promptTitle,
      instructions: detailDraft.description,
      description: detailDraft.description
    })
  };
  const ok = await data.upsertAssignment({
    ...card.assignment,
    dueDate: detailDraft.dueDate,
    assignedMemberId: detailDraft.assignedMemberId,
    filledValues,
    updatedAt: today.value
  });

  if (ok) {
    // Notify member if admin changed the deadline
    if (auth.isAdmin && dueDateChanged && card.assignedMemberId && card.assignedMemberId !== auth.user?.id) {
      void notifs.createNotification({
        recipientId: card.assignedMemberId,
        actorId:     auth.user?.id,
        type:        'task_deadline_changed',
        title:       'Task deadline changed',
        message:     `${auth.profile?.fullName || 'Admin'} updated the deadline for "${card.title}" to ${detailDraft.dueDate || 'no deadline'}`,
        relatedType: 'task',
        taskId:      card.id,
      });
    }

    // Task alert integration on assignment reassignment
    if (auth.isAdmin && assigneeChanged && detailDraft.assignedMemberId && detailDraft.assignedMemberId !== auth.user?.id) {
      void notifs.createNotification({
        recipientId: detailDraft.assignedMemberId,
        actorId:     auth.user?.id,
        type:        'task_assigned',
        title:       'New task assigned',
        message:     `${auth.profile?.fullName || 'Admin'} assigned you a task: "${detailDraft.title.trim() || card.title}"`,
        relatedType: 'task',
        taskId:      card.id,
        relatedId:    card.id,
        relatedWebsiteId: card.assignment.websiteId || undefined,
      });

      const sendAlert = window.confirm('Send Alert To Assignee?');
      if (sendAlert) {
        const alertPayload = {
          alertId: `task-assign-${card.id}-${Date.now()}`,
          alertType: 'New Task' as const,
          title: 'TASK ASSIGNED TO YOU',
          message: `You have been assigned the task: "${detailDraft.title.trim()}"\n\nPriority: Normal\nAssigned By: ${auth.profile?.fullName || 'Admin'}`,
          priority: 'Medium' as const,
          relatedType: 'workboard_task' as const,
          relatedId: card.id,
          status: 'published' as const,
          requireAck: true
        };
        void taskAlerts.createOrUpdateAlert(alertPayload, [detailDraft.assignedMemberId]);
      }
    }
  }
};

const addLink = async () => {
  const card = activeCard.value;
  if (!card || !linkForm.url.trim()) return;
  const link: BoardLink = {
    id: makeId(),
    title: linkForm.title.trim() || 'Resource link',
    url: linkForm.url.trim(),
    type: linkForm.type,
    addedBy: auth.user?.id || '',
    createdAt: new Date().toISOString()
  };
  const ok = await saveCardPatch(card, { links: [...card.links, link] });
  if (ok) {
    await data.addActivityLog('saved_link', 'assignment', card.id, `Saved link: ${link.title}.`);
    linkForm.title = '';
    linkForm.url = '';
    linkForm.type = 'website_url';
  }
};

const addAttachmentUrl = async () => {
  const card = activeCard.value;
  if (!card || !attachmentForm.fileUrl.trim()) return;
  const attachment: BoardAttachment = {
    id: makeId(),
    fileName: attachmentForm.fileName.trim() || 'Attachment',
    fileUrl: attachmentForm.fileUrl.trim(),
    filePath: '',
    fileType: isImageUrl(attachmentForm.fileUrl) ? 'image' : 'link',
    fileSize: 0,
    caption: '',
    uploadedBy: auth.user?.id || '',
    createdAt: new Date().toISOString()
  };
  const ok = await saveCardPatch(card, { attachments: [...card.attachments, attachment] });
  if (ok) {
    await data.addActivityLog('uploaded_resource', 'assignment', card.id, `Added image: ${attachment.fileName}.`);
    attachmentForm.fileName = '';
    attachmentForm.fileUrl = '';
  }
};

const uploadAttachment = async (event: Event) => {
  const card = activeCard.value;
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (!card || files.length === 0) return;
  attachmentUploading.value = true;
  try {
    const attachments: BoardAttachment[] = [];
    for (const file of files) {
      let fileToUpload = file;
      let optimizationMeta = {};

      if (file.type.startsWith('image/')) {
        if (file.size > 15 * 1024 * 1024) {
          showTaskToast('This image is too large (>15MB).');
          continue;
        }

        try {
          showTaskToast('Optimizing image...');
          const optimized = await optimizeImage(file);
          fileToUpload = optimized.file;
          optimizationMeta = {
            originalSize: optimized.originalSize,
            optimizedSize: optimized.optimizedSize,
            compressionRatio: optimized.compressionRatio
          };
        } catch (err) {
          console.error('[image-optimization] failed', err);
          showTaskToast('Could not optimize image.');
          continue;
        }
      }

      const uploaded = await data.uploadResourceFile(fileToUpload);
      if (!uploaded) continue;
      const attachment: BoardAttachment = {
        id: makeId(),
        fileName: uploaded.name,
        fileUrl: '',
        filePath: uploaded.path,
        fileType: uploaded.type,
        fileSize: uploaded.size,
        caption: '',
        uploadedBy: auth.user?.id || '',
        createdAt: new Date().toISOString(),
        ...optimizationMeta
      };
      attachments.push(attachment);
    }
    if (attachments.length > 0) {
      await saveCardPatch(card, { attachments: [...card.attachments, ...attachments] });
      await loadAttachmentPreviews({ ...card, attachments: [...card.attachments, ...attachments] });
    }
  } finally {
    attachmentUploading.value = false;
    input.value = '';
  }
};

const openAttachment = async (attachment: BoardAttachment) => {
  let url = attachment.fileUrl;
  if (!url && attachment.filePath) {
    url = (await data.getResourceDownloadUrl(attachment.filePath)) || '';
  }
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

const removeAttachment = async (id: string) => {
  const card = activeCard.value;
  if (!card) return;
  const attachment = card.attachments.find((a) => a.id === id);
  if (!attachment) return;
  
  if (confirm('Are you sure you want to remove this image?')) {
    const updatedAttachments = card.attachments.filter((a) => a.id !== id);
    const updates: Partial<BoardExtra> = { attachments: updatedAttachments };
    
    // If we're removing the cover image, clear it or set it to the next image
    if (card.coverImageUrl && (attachment.fileUrl === card.coverImageUrl || attachmentPreview(attachment) === card.coverImageUrl)) {
      const nextImage = updatedAttachments.find(a => isImageAttachment(a));
      updates.coverImageUrl = nextImage ? (nextImage.fileUrl || attachmentPreview(nextImage)) : '';
    }
    
    await saveCardPatch(card, updates);
  }
};

const previewImage = (url: string) => {
  imagePreviewUrl.value = url;
};

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);

const addChecklistItem = async () => {
  const card = activeCard.value;
  const text = checklistText.value.trim();
  if (!card || !text) return;
  const item: ChecklistItem = {
    id: makeId(),
    text,
    completed: false,
    completedBy: '',
    completedAt: '',
    createdAt: new Date().toISOString()
  };
  const ok = await saveCardPatch(card, { checklist: [...card.checklist, item] });
  if (ok) checklistText.value = '';
};

const toggleChecklistItem = async (id: string) => {
  const card = activeCard.value;
  if (!card) return;
  const checklist = card.checklist.map((item) =>
    item.id === id
      ? {
          ...item,
          completed: !item.completed,
          completedBy: !item.completed ? auth.user?.id || '' : '',
          completedAt: !item.completed ? new Date().toISOString() : ''
        }
      : item
  );
  await saveCardPatch(card, { checklist });
};

const addComment = async () => {
  const card = activeCard.value;
  const message = commentText.value.trim();
  if (!card || !message) return;
  const comment: BoardComment = {
    id: makeId(),
    userId: auth.user?.id || '',
    message,
    attachmentUrl: '',
    createdAt: new Date().toISOString()
  };
  const ok = await saveCardPatch(card, { comments: [...card.comments, comment] });
  if (ok) {
    commentText.value = '';
    const actorName = auth.profile?.fullName || (auth.isAdmin ? 'Admin' : 'Member');
    const taskTitle  = card.title;

    if (auth.isAdmin && card.assignedMemberId && card.assignedMemberId !== auth.user?.id) {
      // Admin commented → notify assigned member
      void notifs.createNotification({
        recipientId: card.assignedMemberId,
        actorId:     auth.user?.id,
        type:        'task_comment',
        title:       'Admin commented on your task',
        message:     `${actorName} commented on "${taskTitle}": "${message.slice(0, 80)}${message.length > 80 ? '…' : ''}"`,
        relatedType: 'task',
        taskId:      card.id,
      });
    } else if (!auth.isAdmin) {
      notifyAdmins({
        type: 'task_comment',
        title: 'New task comment',
        message: `${actorName} commented on "${taskTitle}".`,
        link: '/work-board/members',
        relatedType: 'task',
        relatedId: card.id,
        taskId: card.id,
        relatedWebsiteId: card.assignment.websiteId ?? undefined,
        extraRecipientIds: adminRecipientExtras([card.assignment.assignedBy, card.reviewerId]),
      });
    }

    // ── @mentions → ping each mentioned teammate directly ──
    const mentionedHandles = extractMentions(message, mentionHandleSet.value);
    const mentionedIds = new Set<string>();
    mentionedHandles.forEach((h) => {
      const id = mentionIdByHandle.value.get(h);
      if (id && id !== auth.user?.id) mentionedIds.add(id);
    });
    mentionedIds.forEach((recipientId) => {
      void notifs.createNotification({
        recipientId,
        actorId:     auth.user?.id,
        type:        'mention',
        title:       `${actorName} mentioned you`,
        message:     `${actorName} mentioned you on "${taskTitle}": "${message.slice(0, 80)}${message.length > 80 ? '…' : ''}"`,
        relatedType: 'task',
        taskId:      card.id,
        link:        '/work-board/my',
      });
    });
  }
};

const uploadSubmissionScreenshot = async (event: Event | File) => {
  const file = event instanceof File ? event : (event.target as HTMLInputElement).files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  
  attachmentUploading.value = true;
  try {
    showTaskToast('Optimizing screenshot...');
    const optimized = await optimizeImage(file);
    const uploaded = await data.uploadResourceFile(optimized.file);
    if (uploaded) {
      const url = await data.getResourceDownloadUrl(uploaded.path);
      if (url) submitScreenshotUrl.value = url;
    }
  } catch (err) {
    console.error('[submission-screenshot] failed', err);
    showTaskToast('Failed to optimize screenshot.');
  } finally {
    attachmentUploading.value = false;
    if (event instanceof Event) (event.target as HTMLInputElement).value = '';
  }
};

const submitWork = async () => {
  const card = activeCard.value;
  if (!card || !submitWorkText.value.trim()) return;
  submittingWork.value = true;
  try {
    const ok = await data.submitAssignment(
      card.assignment,
      card.assignment.filledValues,
      submitWorkText.value,
      submitScreenshotUrl.value
    );
    if (ok) {
      submitWorkText.value = '';
      submitScreenshotUrl.value = '';

      const submitterName = auth.profile?.fullName || 'A member';
      const taskTitle = card.title;
      notifyAdmins({
        type: 'submission_received',
        title: 'Task waiting for review',
        message: `${submitterName} submitted "${taskTitle}" for review.`,
        link: '/reviews',
        relatedType: 'submission',
        relatedId: card.id,
        taskId: card.id,
        relatedWebsiteId: card.assignment.websiteId ?? undefined,
        extraRecipientIds: adminRecipientExtras([card.assignment.assignedBy, card.reviewerId]),
      });

      closeCard();
    }
  } finally {
    submittingWork.value = false;
  }
};

const uploadCustomEvidence = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !activeCard.value) return;

  const notes = prompt('Enter a short note for this evidence (optional):') || '';
  let type: 'screenshot' | 'document' | 'pdf' | 'image' | 'video' = 'document';
  const fileType = file.type.toLowerCase();
  
  if (fileType.includes('image')) {
    type = 'image';
  } else if (fileType.includes('pdf')) {
    type = 'pdf';
  } else if (fileType.includes('video')) {
    type = 'video';
  }

  const success = await reports.uploadEvidenceFile(
    activeCard.value.assignment.id,
    null,
    file,
    notes,
    type
  );
  if (!success) {
    alert('Failed to upload evidence: ' + reports.error);
  }
};

const promptEvidenceLink = async () => {
  if (!activeCard.value) return;
  const url = prompt('Enter the full link URL (e.g. https://github.com/...):');
  if (!url) return;
  const notes = prompt('Enter a short description/title for this link (optional):') || '';
  const success = await reports.addEvidenceLinkOrNote(
    activeCard.value.assignment.id,
    null,
    'link',
    url,
    notes
  );
  if (!success) {
    alert('Failed to save link evidence: ' + reports.error);
  }
};

const promptEvidenceNote = async () => {
  if (!activeCard.value) return;
  const notes = prompt('Enter your work evidence notes:');
  if (!notes) return;
  const success = await reports.addEvidenceLinkOrNote(
    activeCard.value.assignment.id,
    null,
    'note',
    '',
    notes
  );
  if (!success) {
    alert('Failed to save note evidence: ' + reports.error);
  }
};

const addNewTaskLink = () => {
  const url = newLinkForm.url.trim();
  if (!url) return;
  newTask.links = [
    ...newTask.links,
    {
      id: makeId(),
      title: newLinkForm.title.trim() || linkTypeLabel(newLinkForm.type),
      url,
      type: newLinkForm.type,
      addedBy: auth.user?.id || '',
      createdAt: new Date().toISOString()
    }
  ];
  newLinkForm.title = '';
  newLinkForm.url = '';
  newLinkForm.type = 'website_url';
};

const removeNewTaskLink = (id: string) => {
  newTask.links = newTask.links.filter((link) => link.id !== id);
};

const addNewChecklistItem = (text = newChecklistText.value) => {
  const value = text.trim();
  if (!value) return;
  newTask.checklist = [
    ...newTask.checklist,
    {
      id: makeId(),
      text: value,
      completed: false,
      completedBy: '',
      completedAt: '',
      createdAt: new Date().toISOString()
    }
  ];
  newChecklistText.value = '';
};

const removeNewChecklistItem = (id: string) => {
  newTask.checklist = newTask.checklist.filter((item) => item.id !== id);
};

const applyChecklistTemplate = (key: ChecklistTemplateKey) => {
  CHECKLIST_TEMPLATES[key].forEach((item) => addNewChecklistItem(item));
};

const removeNewAttachment = (id: string) => {
  newTask.attachments = newTask.attachments.filter((attachment) => attachment.id !== id);
};

const setQuickDeadline = (kind: 'today' | 'tomorrow' | 'friday' | 'monday') => {
  const date = new Date();
  if (kind === 'tomorrow') date.setDate(date.getDate() + 1);
  if (kind === 'friday') {
    const offset = (5 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + offset);
  }
  if (kind === 'monday') {
    const offset = (1 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + offset);
  }
  newTask.dueDate = date.toISOString().slice(0, 10);
};

const showTaskToast = (message: string) => {
  taskToast.value = message;
  window.setTimeout(() => {
    if (taskToast.value === message) taskToast.value = '';
  }, 2400);
};

const uploadNewTaskFiles = async (files: FileList | File[]) => {
  const list = Array.from(files);
  if (!list.length) return;
  attachmentUploading.value = true;
  try {
    for (const file of list) {
      let fileToUpload = file;
      let optimizationMeta = {};

      if (file.type.startsWith('image/')) {
        if (file.size > 15 * 1024 * 1024) {
          showTaskToast('Image too large (>15MB).');
          continue;
        }

        try {
          showTaskToast('Optimizing image...');
          const optimized = await optimizeImage(file);
          fileToUpload = optimized.file;
          optimizationMeta = {
            originalSize: optimized.originalSize,
            optimizedSize: optimized.optimizedSize,
            compressionRatio: optimized.compressionRatio
          };
        } catch (err) {
          console.error('[image-optimization] failed', err);
          showTaskToast('Optimization failed.');
          continue;
        }
      }

      const uploaded = await data.uploadResourceFile(fileToUpload);
      if (!uploaded) continue;
      const attachment: BoardAttachment = {
        id: makeId(),
        fileName: uploaded.name,
        fileUrl: '',
        filePath: uploaded.path,
        fileType: uploaded.type,
        fileSize: uploaded.size,
        caption: '',
        uploadedBy: auth.user?.id || '',
        createdAt: new Date().toISOString(),
        ...optimizationMeta
      };
      if (isImageAttachment(attachment)) {
        const preview = await data.getResourceDownloadUrl(uploaded.path);
        if (preview) attachmentPreviewUrls.value = { ...attachmentPreviewUrls.value, [attachment.id]: preview };
      }
      newTask.attachments = [...newTask.attachments, attachment];
    }
    showTaskToast(list.length === 1 ? 'Screenshot added.' : `${list.length} files added.`);
  } finally {
    attachmentUploading.value = false;
  }
};

const uploadNewTaskInput = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) await uploadNewTaskFiles(input.files);
  input.value = '';
};

const PASTE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PASTE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const canPasteIntoCard = (card: BoardCard): boolean => {
  if (props.readOnly) return false;
  if (auth.isAdmin) return true;
  const uid = auth.user?.id;
  if (!uid) return false;
  return card.assignedMemberId === uid || card.collaborators.includes(uid);
};

const pasteImageToCard = async (card: BoardCard, file: File): Promise<void> => {
  if (!PASTE_ALLOWED_TYPES.includes(file.type)) return;
  if (file.size > PASTE_MAX_BYTES) {
    showTaskToast('Screenshot is too large. Please use an image under 5MB.');
    return;
  }
  attachmentUploading.value = true;
  try {
    const timestamp = Date.now();
    const ext = file.type.split('/')[1] || 'png';
    const named = new File([file], `task-screenshot-${card.id}-${timestamp}.${ext}`, { type: file.type });
    let fileToUpload: File = named;
    try {
      showTaskToast('Uploading screenshot…');
      const optimized = await optimizeImage(named);
      fileToUpload = optimized.file;
    } catch {
      // proceed with original if optimization fails
    }
    const uploaded = await data.uploadResourceFile(fileToUpload);
    if (!uploaded) {
      showTaskToast('Could not attach screenshot. Please try again.');
      return;
    }
    const attachment: BoardAttachment = {
      id: makeId(),
      fileName: uploaded.name,
      fileUrl: '',
      filePath: uploaded.path,
      fileType: uploaded.type,
      fileSize: uploaded.size,
      caption: '',
      uploadedBy: auth.user?.id || '',
      createdAt: new Date().toISOString()
    };
    const updated = [...card.attachments, attachment];
    await saveCardPatch(card, { attachments: updated });
    await loadAttachmentPreviews({ ...card, attachments: updated });
    showTaskToast('Screenshot attached.');
  } catch {
    showTaskToast('Could not attach screenshot. Please try again.');
  } finally {
    attachmentUploading.value = false;
  }
};

const handleTaskPaste = async (event: ClipboardEvent) => {
  if (!addTaskOpen.value && !selectedCardId.value) return;
  if (!event.clipboardData) return;

  const imageItems = Array.from(event.clipboardData.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'));

  if (imageItems.length) {
    // When the task-card modal is open, route pasted images to card attachments
    if (selectedCardId.value) {
      const card = activeCard.value;
      if (!card || !canPasteIntoCard(card)) return;
      const file = imageItems[0].getAsFile();
      if (!file) return;
      event.preventDefault();
      await pasteImageToCard(card, file);
      return;
    }

    // New-task modal: paste into new task files
    const itemFiles = imageItems
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
    if (itemFiles.length) {
      event.preventDefault();
      const target = event.target as HTMLElement | null;
      const isSubmissionTextarea = target?.tagName === 'TEXTAREA' && submitWorkText.value !== undefined;
      if (isSubmissionTextarea && !auth.isAdmin) {
        await uploadSubmissionScreenshot(itemFiles[0]);
      } else {
        await uploadNewTaskFiles(itemFiles);
      }
    }
    return;
  }

  const text = event.clipboardData.getData('text/plain').trim();
  const target = event.target as HTMLElement | null;
  const isTypingTarget =
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.isContentEditable;
  if (!isTypingTarget && /^https?:\/\//i.test(text)) {
    event.preventDefault();
    newLinkForm.url = text;
    addNewTaskLink();
    showTaskToast('Link added.');
  }
};

const handleTaskDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (files?.length) await uploadNewTaskFiles(files);
};

const saveTaskDraft = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('kiuq-work-board-task-draft', JSON.stringify(newTask));
  showTaskToast('Draft saved on this device.');
};

const addTaskColumn = ref<BoardColumnKey | undefined>(undefined);
const initialMemberIds = ref<string[]>([]);

const openAddTask = (column: BoardColumnKey = 'to_do', memberId?: string) => {
  if (!auth.isAdmin) return;
  addTaskColumn.value = column;
  initialMemberIds.value = memberId ? [memberId] : [];
  addTaskOpen.value = true;
};



const withTimeout = <T,>(promise: Promise<T>, message: string, ms = 10000) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    })
  ]);

const loadBoardData = async () => {
  localLoading.value = true;
  localError.value = null;
  try {
    await Promise.allSettled([
      data.fetchAssignments(),
      data.fetchPrompts(),
      data.fetchProjects(),
      data.fetchWebsites(),
      data.fetchMembers(),
      data.fetchSubmissions(),
      data.fetchActivityLogs()
    ]);
  } catch (err) {
    console.error('[work-board] load failed', err);
    localError.value = 'Could not load work board. Please try again.';
  } finally {
    localLoading.value = false;
  }
};

onMounted(() => {
  void loadBoardData();
  void fetchMentionables();
  window.addEventListener('paste', handleTaskPaste as unknown as EventListener);

  const savedZoom = localStorage.getItem('kiuq_work_board_zoom');
  if (savedZoom) {
    const level = parseInt(savedZoom, 10);
    if (zoomLevels.includes(level)) zoomLevel.value = level;
  }

  if (props.adminMemberId && route.query.assign === '1') {
    window.setTimeout(() => openAddTask('to_do', props.adminMemberId), 0);
  }

  checkTaskQuery();
});

const checkTaskQuery = () => {
  const taskId = route.query.task as string;
  if (!taskId) return;

  const tryOpen = () => {
    const card = allCards.value.find((c) => c.id === taskId);
    if (card) {
      openCard(card);
      highlightedCardId.value = taskId;
      window.setTimeout(() => {
        highlightedCardId.value = '';
      }, 5000);
    }
  };

  if (localLoading.value) {
    const stop = watch(localLoading, (loading) => {
      if (!loading) {
        tryOpen();
        stop();
      }
    });
  } else {
    tryOpen();
  }
};

watch(() => route.query.task, (newId) => {
  if (newId) checkTaskQuery();
});

onUnmounted(() => {
  window.removeEventListener('paste', handleTaskPaste as unknown as EventListener);
});

defineExpose({ openAddTask });
</script>

<style scoped>
.work-board-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.board-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    radial-gradient(circle at left top, color-mix(in srgb, var(--primary) 10%, transparent), transparent 34%),
    var(--card-bg);
  padding: 1.1rem;
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.hero-kicker {
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
  flex-shrink: 0;
}

.hero-actions,
.toolbar-main,
.toolbar-filters,
.quick-filter-row,
.column-head,
.card-title-row,
.card-meta,
.card-footer,
.card-actions,
.detail-badges,
.section-head,
.inline-form,
.upload-line {
  display: flex;
  align-items: center;
}



.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.65rem;
}

.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  /* Sticky just below the app topbar (h-16 = 4rem) so filters stay
     reachable while scrolling a long board. */
  position: sticky;
  top: 4rem;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

/* ── Toolbar search ─────────────────────────────────────────────────── */
.wb-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
  max-width: 420px;
  padding: 0.4rem 0.7rem;
  background: var(--soft-bg);
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--text-muted);
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}
.wb-search:focus-within {
  background: var(--card-bg);
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
  color: var(--primary);
}
.wb-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font: inherit;
  font-size: 0.85rem;
  color: var(--text-main);
}
.wb-search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}
.wb-search-clear:hover { background: var(--border); color: var(--text-main); }

/* ── Live metrics bar (connected segmented strip) ───────────────────── */
.wb-metrics {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  margin-bottom: 0.75rem;
}
.wb-metric {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  background: var(--card-bg);
  transition: background 150ms ease;
}
.wb-metric:hover { background: var(--soft-bg); }

.wb-metric-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 9px;
  flex-shrink: 0;
}
.wb-metric--todo   .wb-metric-ico { background: color-mix(in srgb, #64748b 14%, transparent); color: #64748b; }
.wb-metric--prog   .wb-metric-ico { background: var(--primary-soft); color: var(--primary); }
.wb-metric--postpone .wb-metric-ico { background: rgba(139,92,246,0.14); color: #8b5cf6; }
.wb-metric--review .wb-metric-ico { background: rgba(249,115,22,0.14); color: #f97316; }
.wb-metric--fix    .wb-metric-ico { background: rgba(220,38,38,0.14); color: #dc2626; }
.wb-metric--done   .wb-metric-ico { background: rgba(22,163,74,0.14); color: #16a34a; }
:root[data-theme='dark-gray'] .wb-metric--postpone .wb-metric-ico { color: #a78bfa; }
:root[data-theme='dark-gray'] .wb-metric--review .wb-metric-ico { color: #fb923c; }
:root[data-theme='dark-gray'] .wb-metric--fix .wb-metric-ico { color: #f87171; }
:root[data-theme='dark-gray'] .wb-metric--done .wb-metric-ico { color: #4ade80; }

.wb-metric-data { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; }
.wb-metric-num {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--text-main);
  letter-spacing: -0.02em;
  font-feature-settings: 'tnum' on;
}
.wb-metric-label {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-metric-sub {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.64rem;
  font-weight: 600;
  color: var(--text-soft);
}

/* Completion rate ring */
.wb-rate-ring {
  position: relative;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  flex-shrink: 0;
  background: conic-gradient(var(--primary) calc(var(--rate) * 1%), var(--soft-bg) 0);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wb-rate-ring::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--card-bg);
}
.wb-rate-val {
  position: relative;
  z-index: 1;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-main);
}
.wb-rate-val small { font-size: 0.5rem; font-weight: 700; }

@media (max-width: 1024px) {
  .wb-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .wb-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wb-metric-num { font-size: 1.2rem; }
  .board-toolbar { top: 0; }
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

@media (max-width: 540px) {
  .zoom-label {
    display: none;
  }
  
  .board-toolbar {
    justify-content: center;
  }
}

.zoom-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.zoom-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--soft-bg);
  padding: 0.2rem;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 7px;
  border: 1px solid transparent;
  background: var(--card-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 160ms ease;
}

.zoom-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.06);
}

.zoom-btn:active:not(:disabled) {
  transform: translateY(0);
}

.zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-percentage {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 850;
  min-width: 2.8rem;
  text-align: center;
  color: var(--text-main);
}

.zoom-reset {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: all 200ms ease;
  background: transparent;
  border: none;
}

.zoom-reset.visible {
  opacity: 1;
  pointer-events: auto;
}

.zoom-reset:hover {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.zoom-helper {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  opacity: 0.75;
}

@media (max-width: 860px) {
  .zoom-helper {
    display: none;
  }
}

.toolbar-main {
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-search {
  position: relative;
  min-width: min(100%, 22rem);
  flex: 1;
}

.toolbar-search svg {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  transform: translateY(-50%);
}

.toolbar-search input,
.filter-select,
.move-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text-main);
  font-size: 0.86rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.toolbar-search input {
  padding: 0.72rem 0.9rem 0.72rem 2.4rem;
}

.toolbar-search input:focus,
.filter-select:focus,
.move-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.toolbar-filters {
  flex-wrap: wrap;
  gap: 0.55rem;
}

.filter-select {
  width: auto;
  min-width: 9rem;
  padding: 0.72rem 0.8rem;
}

.quick-filter-row {
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.quick-filter {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--text-muted);
  padding: 0.42rem 0.72rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 750;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
}

.quick-filter:hover,
.quick-filter.active {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  background: color-mix(in srgb, var(--primary) 9%, var(--card-bg));
  color: var(--primary);
}

.board-loading,
.board-scroll {
  overflow-x: auto;
  padding-bottom: 0.8rem;
  min-height: 0;
}

.board-zoom-layer {
  display: grid;
  grid-auto-columns: minmax(18rem, 20rem);
  grid-auto-flow: column;
  gap: 0.9rem;
  align-items: start;
  transform-origin: top left;
  zoom: var(--board-zoom, 1);
}

/* Firefox fallback */
@-moz-document url-prefix() {
  .board-zoom-layer {
    transform: scale(var(--board-zoom, 1));
    width: calc(100% / var(--board-zoom, 1));
    /* We don't scale height to avoid breaking vertical scroll */
  }
}

.board-loading {
  display: grid;
  grid-auto-columns: minmax(18rem, 20rem);
  grid-auto-flow: column;
  gap: 0.9rem;
  align-items: start;
}

.board-shell {
  min-width: 0;
}

.filter-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
  padding: 1rem;
}

.filter-empty h2 {
  font-size: 0.95rem;
  font-weight: 850;
}

.filter-empty p {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.board-column {
  position: relative;
  display: flex;
  min-height: 24rem;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--soft-bg) 50%, var(--card-bg));
  padding: 0.75rem;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.board-column::before {
  position: absolute;
  inset: -1px;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--column-accent, var(--primary)) 65%, transparent);
  border-radius: inherit;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--column-accent, var(--primary)) 20%, transparent);
  content: '';
  opacity: 0;
  transition: opacity 180ms ease, box-shadow 180ms ease;
}

.board-column.is-drag-over {
  border-color: color-mix(in srgb, var(--column-accent, var(--primary)) 70%, var(--border));
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 8%, var(--card-bg));
  box-shadow: 0 20px 50px color-mix(in srgb, var(--column-accent, var(--primary)) 18%, transparent);
  transform: translateY(-4px) scale(1.01);
}

.board-column.is-drag-over::before {
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--column-accent, var(--primary)) 12%, transparent);
  opacity: 1;
  animation: columnTargetPulse 950ms ease-in-out infinite;
}

.board-column.column-celebrate {
  animation: columnDropPop 700ms cubic-bezier(0.16, 1, 0.3, 1);
}

.column-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  /* Accent "color strip" as the header underline. */
  border-bottom: 2px solid color-mix(in srgb, var(--column-accent, var(--primary)) 40%, var(--border));
  padding-bottom: 0.6rem;
}

/* Status indicator dot */
.column-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 4px;
  background: var(--column-accent, var(--primary));
  flex-shrink: 0;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--column-accent, var(--primary)) 16%, transparent);
}

.column-head-text { flex: 1; min-width: 0; }

.column-head h2 {
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.column-head p {
  margin-top: 0.1rem;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.column-count {
  border-radius: 999px;
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 13%, var(--card-bg));
  color: var(--column-accent, var(--primary));
  padding: 0.18rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  flex-shrink: 0;
  min-width: 1.6rem;
  text-align: center;
}

.add-card-mini {
  margin-top: 0.6rem;
  border: 1px dashed color-mix(in srgb, var(--column-accent, var(--primary)) 35%, var(--border));
  border-radius: 12px;
  color: var(--text-muted);
  padding: 0.5rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  transition: color 160ms ease, background 160ms ease;
}

.add-card-mini:hover {
  background: var(--card-bg);
  color: var(--primary);
}

.column-card-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.75rem;
}

.task-card {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--card-bg);
  padding: 0.72rem;
  text-align: left;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  transition: transform 190ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
  will-change: transform;
}

.task-card[draggable='true'] {
  cursor: grab;
}

.task-card:hover {
  border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.task-card.is-dragging {
  border-color: color-mix(in srgb, var(--primary) 62%, var(--border));
  box-shadow: 0 24px 60px color-mix(in srgb, var(--primary) 24%, transparent);
  cursor: grabbing;
  opacity: 0.62;
  transform: rotate(1.4deg) scale(0.97);
}

.task-card.just-moved {
  border-color: color-mix(in srgb, var(--column-accent, var(--primary)) 70%, var(--primary));
  box-shadow: 0 22px 55px color-mix(in srgb, var(--column-accent, var(--primary)) 22%, transparent);
  animation: cardLanded 720ms cubic-bezier(0.16, 1, 0.3, 1);
}

.task-card.just-moved::after {
  position: absolute;
  top: 0.62rem;
  right: 0.62rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 16%, var(--card-bg));
  color: var(--column-accent, var(--primary));
  content: 'Moved';
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
  padding: 0.22rem 0.5rem;
  animation: movedBadge 900ms ease-out forwards;
}

.move-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.move-sparkles span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--column-accent, var(--primary));
  box-shadow: 0 0 18px color-mix(in srgb, var(--column-accent, var(--primary)) 42%, transparent);
  opacity: 0;
  animation: sparkleBurst 760ms ease-out forwards;
}

.move-sparkles span:nth-child(1) {
  --spark-x: -5.4rem;
  --spark-y: -2.4rem;
}

.move-sparkles span:nth-child(2) {
  --spark-x: 4.8rem;
  --spark-y: -2rem;
  animation-delay: 40ms;
}

.move-sparkles span:nth-child(3) {
  --spark-x: -4rem;
  --spark-y: 2.7rem;
  animation-delay: 70ms;
}

.move-sparkles span:nth-child(4) {
  --spark-x: 5.2rem;
  --spark-y: 2.2rem;
  animation-delay: 110ms;
}

.move-sparkles span:nth-child(5) {
  --spark-x: 0.6rem;
  --spark-y: -3.4rem;
  animation-delay: 130ms;
}

.card-cover {
  width: 100%;
  height: 7.2rem;
  border-radius: 12px;
  object-fit: cover;
  margin-bottom: 0.65rem;
}

.card-cover-file {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed color-mix(in srgb, var(--primary) 38%, var(--border));
  background: color-mix(in srgb, var(--primary) 7%, var(--soft-bg));
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 850;
}

.task-type-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 11%, var(--card-bg));
  color: var(--primary);
  padding: 0.22rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
}

.card-label-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}

.label-chip {
  border-radius: 999px;
  padding: 0.18rem 0.45rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
}

.label-chip.blue {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.label-chip.green {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

.label-chip.red {
  background: var(--status-needs-fix-bg, rgba(220, 38, 38, 0.12));
  color: var(--status-needs-fix-fg, #dc2626);
}

.label-chip.orange {
  background: rgba(249, 115, 22, 0.13);
  color: #f97316;
}

.label-chip.purple {
  background: rgba(124, 58, 237, 0.12);
  color: #8b5cf6;
}

.card-title-row {
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
}

.card-title-row h3 {
  min-width: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.94rem;
  font-weight: 850;
  line-height: 1.25;
}

.card-context {
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.card-summary {
  margin-top: 0.35rem;
  color: var(--text-main);
  font-size: 0.78rem;
  line-height: 1.45;
}

.card-meta {
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.65rem;
}

.priority-pill {
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 850;
}

.priority-pill.normal {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.priority-pill.calm {
  background: var(--soft-bg);
  color: var(--text-muted);
}

.priority-pill.warning {
  background: rgba(249, 115, 22, 0.14);
  color: #f97316;
}

.priority-pill.danger {
  background: var(--status-needs-fix-bg, rgba(220, 38, 38, 0.14));
  color: var(--status-needs-fix-fg, #dc2626);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.8rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
}

.card-member-info {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.avatar-with-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.avatar-small-wrapper {
  position: relative;
  display: flex;
  flex-shrink: 0;
}

.online-status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 0.7rem;
  height: 0.7rem;
  background: #16a34a;
  border: 1.5px solid var(--card-bg);
  border-radius: 999px;
}

.member-name-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}

.extra-members-badge {
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--soft-bg);
  color: var(--primary);
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
  margin-left: 0.2rem;
  border: 1px solid var(--border);
}

.avatar-stack {
  display: flex;
}

.avatar-small {
  display: inline-flex;
  width: 1.85rem;
  height: 1.85rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1.5px solid var(--card-bg);
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
}

.avatar-stack .avatar-small + .avatar-small {
  margin-left: -0.55rem;
}

.avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
}

.card-counts span {
  border-radius: 999px;
  background: var(--soft-bg);
  padding: 0.18rem 0.4rem;
}

.card-actions {
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.move-select {
  flex: 1;
  min-width: 0;
  padding: 0.48rem 0.5rem;
  font-size: 0.74rem;
}

.open-card-btn {
  border-radius: 10px;
  background: var(--primary);
  color: white;
  padding: 0.5rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 850;
}

.column-empty {
  border: 1px dashed var(--border);
  border-radius: 14px;
  color: var(--text-muted);
  padding: 1rem;
  text-align: center;
  font-size: 0.82rem;
}

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--soft-bg);
  padding: 1rem;
}

.detail-badges {
  flex-wrap: wrap;
  gap: 0.45rem;
}

.detail-admin-note {
  margin-top: 0.65rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.detail-member-row,
.selected-member-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.selected-member-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
  color: var(--primary);
  padding: 0.32rem 0.62rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 850;
}

.detail-move {
  width: min(100%, 14rem);
}

.detail-move label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.detail-main,
.detail-side,
.stack-list,
.activity-list,
.side-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-main {
  grid-column: 1 / -1;
}

.detail-section {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 1rem;
}

.detail-section h3,
.section-head h3 {
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.95rem;
  font-weight: 900;
}

.section-head {
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.section-head span {
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--primary);
  padding: 0.2rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 850;
}

.connection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.connection-grid div {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.7rem;
}

.connection-grid span {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.connection-grid strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--text-main);
  font-size: 0.82rem;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.8rem;
}

.detail-info-grid div {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.65rem;
}

.detail-info-grid span {
  display: block;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.detail-info-grid strong {
  display: block;
  margin-top: 0.2rem;
  overflow-wrap: anywhere;
  color: var(--text-main);
  font-size: 0.82rem;
}

.link-row,
.attachment-row,
.activity-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--soft-bg);
  padding: 0.72rem;
}

.link-row strong,
.attachment-row strong,
.activity-list strong {
  color: var(--text-main);
  font-size: 0.84rem;
}

.link-row p,
.attachment-row p {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  word-break: break-word;
}

.link-row span {
  display: inline-flex;
  margin-top: 0.25rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
  color: var(--primary);
  padding: 0.14rem 0.45rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 850;
}

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.75rem;
}

.attachment-card {
  display: grid;
  grid-template-columns: 5.6rem minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--soft-bg);
  padding: 0.7rem;
}

.attachment-card strong {
  display: block;
  overflow-wrap: anywhere;
  color: var(--text-main);
  font-size: 0.82rem;
}

.attachment-card p {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.74rem;
}

.attachment-thumb,
.attachment-file {
  display: flex;
  width: 5.6rem;
  height: 4.2rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--card-bg);
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
}

.attachment-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-caption {
  color: var(--text-main) !important;
}

.empty-mini {
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  padding: 0.85rem;
  text-align: center;
  font-size: 0.82rem;
}

.inline-form {
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.inline-form .input {
  min-width: 12rem;
  flex: 1;
}

.image-strip {
  display: flex;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.image-strip button {
  overflow: hidden;
  width: 8rem;
  height: 5.5rem;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.image-strip img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-line {
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.75rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.65rem;
  font-size: 0.86rem;
}

.check-item input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary);
}

.check-item .done {
  color: var(--text-muted);
  text-decoration: line-through;
}

.activity-list span {
  display: block;
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.member-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--soft-bg);
  padding: 0.22rem 0.6rem 0.22rem 0.22rem;
  color: var(--text-main);
  font-size: 0.78rem;
}

.side-empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  padding: 0.8rem;
  text-align: center;
  font-size: 0.82rem;
}

.task-create-flow {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.task-toast {
  position: sticky;
  top: 0;
  z-index: 2;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--primary) 26%, var(--border));
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--primary);
  padding: 0.45rem 0.75rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 850;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.task-create-section {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 1rem;
}

.task-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.task-section-head h3 {
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.96rem;
  font-weight: 900;
}

.task-section-head p {
  max-width: 36rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.task-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.span-2 {
  grid-column: span 2;
}

.member-tools {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) minmax(10rem, 13rem) auto auto;
  gap: 0.55rem;
  align-items: center;
}

.assign-member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.assign-member-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 1.5rem;
  gap: 0.6rem;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--soft-bg);
  padding: 0.65rem;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.assign-member-card:hover,
.assign-member-card.selected {
  border-color: color-mix(in srgb, var(--primary) 42%, var(--border));
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

.assign-member-card.selected {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 34%, transparent);
}

.assign-member-card strong,
.assignment-mode-card strong {
  display: block;
  color: var(--text-main);
  font-size: 0.84rem;
}

.assign-member-card small,
.assignment-mode-card small {
  display: block;
  margin-top: 0.16rem;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.member-check {
  display: inline-flex;
  width: 1.5rem;
  height: 1.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 900;
}

.assignment-mode-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.assignment-mode-card {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--soft-bg);
  padding: 0.75rem;
  cursor: pointer;
}

.assignment-mode-card.selected {
  border-color: color-mix(in srgb, var(--primary) 42%, var(--border));
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

.assignment-mode-card input {
  margin-top: 0.15rem;
  accent-color: var(--primary);
}

.drop-zone {
  display: flex;
  min-height: 7.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px dashed color-mix(in srgb, var(--primary) 42%, var(--border));
  border-radius: 15px;
  background: color-mix(in srgb, var(--primary) 5%, var(--soft-bg));
  color: var(--text-muted);
  padding: 1rem;
  text-align: center;
  cursor: pointer;
}

.drop-zone input {
  display: none;
}

.drop-zone strong {
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.9rem;
  font-weight: 900;
}

.drop-zone span {
  font-size: 0.78rem;
}

.checklist-template-row,
.quick-date-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quick-date-row {
  align-items: end;
}

.preview-image {
  width: 100%;
  max-height: 70vh;
  border-radius: 16px;
  object-fit: contain;
}

.skeleton-column,
.skeleton-card,
.skeleton-line {
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-line,
.skeleton-card {
  border-radius: 999px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
}

.skeleton-card {
  height: 10rem;
  border-radius: 15px;
  margin-top: 0.8rem;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@keyframes columnTargetPulse {
  0%,
  100% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--column-accent, var(--primary)) 10%, transparent);
  }
  50% {
    box-shadow: 0 0 0 9px color-mix(in srgb, var(--column-accent, var(--primary)) 18%, transparent);
  }
}

@keyframes columnDropPop {
  0% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.018);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes cardLanded {
  0% {
    opacity: 0.7;
    transform: translateY(-14px) scale(0.96);
  }
  48% {
    opacity: 1;
    transform: translateY(3px) scale(1.025);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes movedBadge {
  0% {
    opacity: 0;
    transform: translateY(-0.35rem) scale(0.82);
  }
  18%,
  70% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-0.25rem) scale(0.96);
  }
}

@keyframes sparkleBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(0.95);
  }
}

@media (prefers-reduced-motion: reduce) {
  .board-column,
  .board-column::before,
  .task-card,
  .task-card.just-moved,
  .task-card.just-moved::after,
  .move-sparkles span,
  .skeleton-column,
  .skeleton-card,
  .skeleton-line {
    animation: none !important;
    transition: none !important;
  }
}

@media (min-width: 1020px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr) 18rem;
  }
}

@media (max-width: 760px) {
  .board-hero,
  .detail-top,
  .filter-empty,
  .link-row,
  .attachment-row,
  .task-section-head {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-right {
    align-items: stretch;
  }

  .hero-actions,
  .toolbar-filters,
  .inline-form {
    width: 100%;
  }

  .filter-select,
  .inline-form .input {
    width: 100%;
  }

  .board-scroll,
  .board-loading {
    grid-auto-columns: minmax(17rem, 88vw);
  }

  .connection-grid {
    grid-template-columns: 1fr;
  }

  .detail-info-grid,
  .task-form-grid,
  .member-tools,
  .assignment-mode-row {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }

  .attachment-card {
    grid-template-columns: 1fr;
  }

  .attachment-thumb,
  .attachment-file {
    width: 100%;
    height: 9rem;
  }
}
/* ── Comment Section (cs-) ─────────────────────────────────────────────────── */

.cs-section {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cs-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cs-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
}

.cs-count {
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--primary);
  padding: 0.15rem 0.5rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
}

/* Empty state */
.cs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
}

.cs-empty-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.cs-empty-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
}

/* List */
.cs-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

/* Comment card */
.cs-card {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

/* Avatar */
.cs-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--primary) 14%, var(--soft-bg));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
}

.cs-avatar--sm {
  width: 36px;
  height: 36px;
  margin-top: 0.15rem;
}

.cs-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cs-avatar-initials {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--primary);
  user-select: none;
}

/* Body */
.cs-body {
  flex: 1;
  min-width: 0;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.65rem 0.85rem 0.5rem;
}

.cs-card--own .cs-body {
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
  border-color: color-mix(in srgb, var(--primary) 20%, var(--border));
}

:root[data-theme='dark-gray'] .cs-body {
  background: color-mix(in srgb, #fff 4%, var(--card-bg));
}

:root[data-theme='dark-gray'] .cs-card--own .cs-body {
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

/* Meta row */
.cs-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
}

.cs-name {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-main);
}

.cs-username {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  opacity: 0.8;
}

.cs-role {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.cs-role--admin {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 25%, transparent);
}

.cs-role--member {
  background: var(--soft-bg);
  color: var(--text-muted);
  border-color: var(--border);
}

.cs-time {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  opacity: 0.75;
  margin-left: auto;
}

/* Message */
.cs-message {
  font-size: 0.8rem;
  color: var(--text-main);
  line-height: 1.55;
  margin: 0 0 0.4rem;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Attachment image */
.cs-attachment {
  max-width: 100%;
  border-radius: 10px;
  margin-top: 0.4rem;
  border: 1px solid var(--border);
  display: block;
}

/* Edit input */
.cs-edit-input {
  width: 100%;
  resize: vertical;
  border: 1.5px solid var(--primary);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.8rem;
  font-family: 'Google Sans', Arial, sans-serif;
  padding: 0.4rem 0.6rem;
  outline: none;
  margin-bottom: 0.4rem;
}

/* Action buttons */
.cs-actions {
  display: flex;
  gap: 0.35rem;
}

.cs-action-btn {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
  transition: background 100ms, color 100ms;
}

.cs-action-btn:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}

.cs-action-btn--danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.cs-edit-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

/* Input row */
.cs-input-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border);
}

.cs-input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cs-textarea {
  width: 100%;
  resize: none;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.82rem;
  font-family: 'Google Sans', Arial, sans-serif;
  padding: 0.55rem 0.75rem;
  outline: none;
  transition: border-color 140ms;
  line-height: 1.5;
}

.cs-textarea:focus {
  border-color: var(--primary);
}

.cs-textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.cs-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.cs-input-hint {
  font-size: 0.68rem;
  color: var(--text-muted);
  opacity: 0.6;
}

.cs-submit-btn {
  font-size: 0.78rem;
  padding: 0.35rem 0.9rem;
  white-space: nowrap;
}

.cs-submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Task Detail Modal (td-) ───────────────────────────────────────────────── */

.td-root {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Header bar ── */
.td-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.9rem;
}

.td-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}

.td-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.td-priority-pill {
  border-radius: 999px;
  padding: 0.24rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 850;
}

.td-priority-pill.normal { background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); }
.td-priority-pill.calm   { background: var(--soft-bg); color: var(--text-muted); }
.td-priority-pill.warning{ background: rgba(249,115,22,.14); color: #f97316; }
.td-priority-pill.danger { background: var(--status-needs-fix-bg, rgba(220,38,38,.14)); color: var(--status-needs-fix-fg, #dc2626); }

.td-members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.td-member-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--soft-bg);
  padding: 0.22rem 0.6rem 0.22rem 0.22rem;
  font-size: 0.78rem;
  color: var(--text-main);
}

.td-member-avatar {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--primary) 14%, var(--soft-bg));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1.5px solid var(--border);
}

.td-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.td-avatar-initials {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--primary);
}

.td-member-name {
  font-size: 0.75rem;
  font-weight: 600;
}

.td-header-right {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

.td-move-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.td-move-select {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg, var(--card-bg));
  color: var(--text-main);
  font-size: 0.82rem;
  padding: 0.45rem 0.7rem;
  outline: none;
  cursor: pointer;
  transition: border-color 140ms;
}

.td-move-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.td-move-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.td-delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid color-mix(in srgb, #dc2626 35%, var(--border));
  border-radius: 8px;
  background: transparent;
  color: #dc2626;
  padding: 0.38rem 0.7rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.35rem;
  transition: background 140ms, color 140ms, border-color 140ms;
}

.td-delete-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.1);
  border-color: #dc2626;
}

.td-delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Cover image ── */
.td-cover-wrap {
  position: relative;
  width: 100%;
  height: 11rem;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 1rem;
  background: var(--soft-bg);
}

.td-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.td-cover-expand {
  position: absolute;
  bottom: 0.65rem;
  right: 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  background: rgba(0,0,0,0.45);
  color: #fff;
  padding: 0.35rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 150ms;
}

.td-cover-expand:hover {
  background: rgba(0,0,0,0.65);
}

/* ── Two-column body ── */
.td-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

@media (min-width: 860px) {
  .td-body {
    grid-template-columns: minmax(0, 1fr) 18rem;
  }
}

.td-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.td-side {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ── Section block ── */
.td-section {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 1rem;
}

.td-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.td-section-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.92rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ── Save button ── */
.td-save-btn {
  border: 1px solid var(--primary);
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  padding: 0.35rem 0.8rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 150ms;
  flex-shrink: 0;
}

.td-save-btn:hover { opacity: 0.86; }

/* ── Title input / readonly ── */
.td-title-input {
  width: 100%;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg, var(--card-bg));
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1rem;
  font-weight: 850;
  padding: 0.5rem 0.75rem;
  outline: none;
  margin-bottom: 0.55rem;
  transition: border-color 140ms;
}

.td-title-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}

.td-title-readonly {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0 0 0.55rem;
  line-height: 1.3;
}

/* ── Admin note ── */
.td-admin-note {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 6%, var(--soft-bg));
  color: var(--text-muted);
  padding: 0.55rem 0.75rem;
  font-size: 0.8rem;
  line-height: 1.5;
  margin-bottom: 0.55rem;
}

.td-admin-note svg { margin-top: 0.15rem; flex-shrink: 0; color: var(--primary); }

/* ── Description textarea ── */
.td-desc-textarea {
  width: 100%;
  resize: vertical;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.84rem;
  font-family: 'Google Sans', Arial, sans-serif;
  padding: 0.6rem 0.75rem;
  outline: none;
  line-height: 1.55;
  transition: border-color 140ms;
}

.td-desc-textarea:focus { border-color: var(--primary); }
.td-desc-textarea:disabled { opacity: 0.65; cursor: not-allowed; }
.td-desc-textarea::placeholder { color: var(--text-muted); opacity: 0.7; }

.td-desc-view {
  font-size: 0.84rem;
  font-family: 'Google Sans', Arial, sans-serif;
  color: var(--text-main);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0.6rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  min-height: 5rem;
}

.td-desc-view :deep(.linkified),
.cs-message :deep(.linkified) {
  color: #15D6C2;
  text-decoration: none;
  word-break: break-all;
}

.td-desc-view :deep(.linkified):hover,
.cs-message :deep(.linkified):hover {
  text-decoration: underline;
}

/* @mention highlight inside comments */
.cs-message :deep(.mention-chip) {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-radius: 5px;
  padding: 0 0.25rem;
  font-weight: 700;
}

/* ── Meta list (sidebar) ── */
.td-meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.td-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.82rem;
}

.td-meta-row:last-child { border-bottom: none; }

.td-meta-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  white-space: nowrap;
}

.td-meta-value {
  color: var(--text-main);
  font-size: 0.82rem;
  text-align: right;
  word-break: break-word;
}

.td-meta-date {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--input-bg, var(--card-bg));
  color: var(--text-main);
  font-size: 0.8rem;
  padding: 0.3rem 0.5rem;
  outline: none;
}

.td-meta-date:focus {
  border-color: var(--primary);
}

/* ── Count pill ── */
.td-count-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--primary);
  padding: 0.12rem 0.45rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 850;
}

/* ── Icon button (add attachment / add link) ── */
.td-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--soft-bg);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 140ms, color 140ms, background 140ms;
}

.td-icon-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

/* ── Empty small ── */
.td-empty-small {
  color: var(--text-muted);
  font-size: 0.8rem;
  text-align: center;
  padding: 0.65rem;
  border: 1px dashed var(--border);
  border-radius: 10px;
}

/* ── Attachment list ── */
.td-attachment-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.td-att-card {
  display: grid;
  grid-template-columns: 3.8rem minmax(0,1fr) auto;
  gap: 0.6rem;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.55rem;
  overflow: hidden;
}

.td-att-thumb {
  width: 3.8rem;
  height: 3rem;
  object-fit: cover;
  border-radius: 8px;
  cursor: zoom-in;
  border: 1px solid var(--border);
}

.td-att-file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.8rem;
  height: 3rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
}

.td-att-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.td-att-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-att-size {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.td-att-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms, color 120ms;
}

.td-att-remove:hover {
  background: rgba(220,38,38,0.1);
  color: #dc2626;
}

/* ── Links ── */
.td-link-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}

.td-link-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
  padding: 0.5rem 0.65rem;
  font-size: 0.8rem;
  color: var(--primary);
  text-decoration: none;
  overflow: hidden;
  transition: background 140ms;
}

.td-link-row:hover {
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

.td-link-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.td-add-link-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.td-add-input {
  flex: 1;
  min-width: 0;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  background: var(--input-bg, var(--card-bg));
  color: var(--text-main);
  font-size: 0.8rem;
  padding: 0.4rem 0.65rem;
  outline: none;
  transition: border-color 140ms;
}

.td-add-input:focus {
  border-color: var(--primary);
}

.td-add-input::placeholder {
  color: var(--text-muted);
  opacity: 0.65;
}

/* ── Checklist ── */
.td-checklist {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}

.td-check-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
  padding: 0.5rem 0.65rem;
  font-size: 0.84rem;
  cursor: pointer;
  transition: background 120ms;
}

.td-check-item:hover {
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
}

.td-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary);
  flex-shrink: 0;
}

.td-check-done {
  color: var(--text-muted);
  text-decoration: line-through;
}

/* ── Submitted / needs-fix badges ── */
.td-submitted-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(22,163,74,0.13);
  color: #16a34a;
  padding: 0.2rem 0.6rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
}

.td-fix-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: var(--status-needs-fix-bg, rgba(220,38,38,0.12));
  color: var(--status-needs-fix-fg, #dc2626);
  padding: 0.2rem 0.6rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
}

/* ── Screenshot upload / preview ── */
.td-screenshot-wrap {
  margin: 0.6rem 0;
}

.td-screenshot-preview {
  position: relative;
  display: inline-block;
}

.td-screenshot-img {
  max-width: 100%;
  max-height: 12rem;
  border-radius: 12px;
  object-fit: contain;
  border: 1px solid var(--border);
  display: block;
}

.td-screenshot-remove {
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 120ms, color 120ms;
}

.td-screenshot-remove:hover {
  background: rgba(220,38,38,0.1);
  color: #dc2626;
}

.td-screenshot-upload {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1.5px dashed color-mix(in srgb, var(--primary) 38%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 5%, var(--soft-bg));
  color: var(--text-muted);
  padding: 0.8rem 1rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 140ms, border-color 140ms;
}

.td-screenshot-upload:hover {
  background: color-mix(in srgb, var(--primary) 9%, var(--soft-bg));
  border-color: var(--primary);
  color: var(--primary);
}

/* ── Submit button ── */
.td-submit-btn {
  width: 100%;
  margin-top: 0.55rem;
}

/* ── Task error ── */
.td-task-error {
  color: var(--status-needs-fix-fg, #dc2626);
  font-size: 0.8rem;
  margin-top: 0.4rem;
}

/* ── Dark mode overrides ── */
:root[data-theme='dark-gray'] .td-section {
  background: color-mix(in srgb, #fff 3%, var(--card-bg));
}

:root[data-theme='dark-gray'] .td-att-card,
:root[data-theme='dark-gray'] .td-check-item,
:root[data-theme='dark-gray'] .td-link-row {
  background: color-mix(in srgb, #fff 4%, var(--card-bg));
}

/* ── Mobile stacking ── */
@media (max-width: 640px) {
  .td-header {
    flex-direction: column;
  }

  .td-header-right {
    width: 100%;
  }

  .td-move-select {
    width: 100%;
  }

  .td-cover-wrap {
    height: 7.5rem;
  }

  .td-att-card {
    grid-template-columns: 3rem minmax(0,1fr) auto;
  }

  .td-att-thumb,
  .td-att-file-icon {
    width: 3rem;
    height: 2.4rem;
  }
}
</style>
