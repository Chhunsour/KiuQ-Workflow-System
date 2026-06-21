<template>
  <div class="fu-page">
    <!-- ════ Hero ════ -->
    <section class="fu-hero">
      <div class="fu-hero-copy">
        <span class="fu-hero-kicker">Recurring Work</span>
        <h1 class="fu-hero-title">Followup Center</h1>
        <p class="fu-hero-sub">Track recurring website responsibilities, maintenance tasks, publishing schedules, and team routines.</p>
      </div>
      <div class="fu-hero-metrics" aria-label="Team followup metrics">
        <div class="fu-stat-pill">
          <span class="fu-stat-pill-num">{{ membersAllDone }}</span>
          <span class="fu-stat-pill-label">Fully Done</span>
        </div>
        <div class="fu-stat-pill">
          <span class="fu-stat-pill-num fu-stat-pill-num--warn">{{ membersWithPending }}</span>
          <span class="fu-stat-pill-label">Pending</span>
        </div>
        <div class="fu-stat-pill">
          <span class="fu-stat-pill-num">{{ blogDoneTotal }}/{{ blogTotal }}</span>
          <span class="fu-stat-pill-label">Blog</span>
        </div>
        <div class="fu-stat-pill">
          <span class="fu-stat-pill-num">{{ pluginDoneTotal }}/{{ pluginTotal }}</span>
          <span class="fu-stat-pill-label">Plugin</span>
        </div>
        <div class="fu-stat-pill">
          <span class="fu-stat-pill-num">{{ ebayDoneTotal }}/{{ ebayRequiredTotal }}</span>
          <span class="fu-stat-pill-label">eBay</span>
        </div>
        <div class="fu-stat-pill">
          <span class="fu-stat-pill-num">{{ speedDoneTotal }}/{{ speedTotal }}</span>
          <span class="fu-stat-pill-label">Speed</span>
        </div>
      </div>
    </section>

    <!-- ════ Followup type workspace cards ════ -->
    <div class="fu-cards">
      <!-- Blog Followup -->
      <div class="fu-card fu-card--blog">
        <div class="fu-card-top">
          <span class="fu-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </span>
          <div class="fu-card-top-right">
            <span class="fu-card-freq">Tue &amp; Sat</span>
            <div v-if="canManageFollowups" class="fu-card-opt-wrapper">
              <button
                type="button"
                class="fu-card-opt-btn"
                @click.prevent.stop="toggleDropdown('blog')"
                aria-label="Quick Actions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              
              <div v-if="activeDropdownCard === 'blog'" class="fu-card-dropdown">
                <RouterLink to="/followup/blog" class="fu-dropdown-item">Open Blog Followup</RouterLink>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('blog', 'admin_auto_completed')">Mark Due Blog Followups Done</button>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('blog', 'admin_marked_not_required')">Mark Due Blog Followups Not Required</button>
                <RouterLink to="/followup/blog" class="fu-dropdown-item">View Due Today</RouterLink>
                <RouterLink to="/followup/blog" class="fu-dropdown-item">View Overdue</RouterLink>
              </div>
            </div>
          </div>
        </div>
        <h2 class="fu-card-title">Blog Followup</h2>
        <p class="fu-card-desc">Track scheduled blog publishing requirements for each website.</p>
        <div class="fu-card-foot">
          <span class="fu-card-stat">{{ blogDoneTotal }}/{{ blogTotal }} done</span>
          <RouterLink to="/followup/blog" class="fu-card-btn">
            Open
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </RouterLink>
        </div>
      </div>

      <!-- Plugin Update -->
      <div class="fu-card fu-card--plugin">
        <div class="fu-card-top">
          <span class="fu-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </span>
          <div class="fu-card-top-right">
            <span class="fu-card-freq">Weekly</span>
            <div v-if="canManageFollowups" class="fu-card-opt-wrapper">
              <button
                type="button"
                class="fu-card-opt-btn"
                @click.prevent.stop="toggleDropdown('plugin')"
                aria-label="Quick Actions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              
              <div v-if="activeDropdownCard === 'plugin'" class="fu-card-dropdown">
                <RouterLink to="/followup/plugins" class="fu-dropdown-item">Open Plugin Update</RouterLink>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('plugin', 'admin_auto_completed')">Mark This Week’s Plugin Updates Done</button>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('plugin', 'admin_marked_not_required')">Mark This Week Not Required</button>
                <RouterLink to="/followup/plugins" class="fu-dropdown-item">View Pending This Week</RouterLink>
                <RouterLink to="/followup/plugins" class="fu-dropdown-item">View Overdue</RouterLink>
              </div>
            </div>
          </div>
        </div>
        <h2 class="fu-card-title">Plugin Update</h2>
        <p class="fu-card-desc">Check &amp; update WordPress plugins once per week per website.</p>
        <div class="fu-card-foot">
          <span class="fu-card-stat">{{ pluginDoneTotal }}/{{ pluginTotal }} done</span>
          <RouterLink to="/followup/plugins" class="fu-card-btn">
            Open
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </RouterLink>
        </div>
      </div>

      <!-- eBay Click Followup -->
      <div class="fu-card fu-card--ebay">
        <div class="fu-card-top">
          <span class="fu-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </span>
          <div class="fu-card-top-right">
            <span class="fu-card-freq">Mon – Sat</span>
            <div v-if="canManageFollowups" class="fu-card-opt-wrapper">
              <button
                type="button"
                class="fu-card-opt-btn"
                @click.prevent.stop="toggleDropdown('ebay')"
                aria-label="Quick Actions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              
              <div v-if="activeDropdownCard === 'ebay'" class="fu-card-dropdown">
                <RouterLink to="/followup/ebay-click" class="fu-dropdown-item">Open eBay Click Followup</RouterLink>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('ebay', 'admin_auto_fill')">Auto Fill Today for All Members</button>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('ebay', 'not_required_today')">Mark Today Not Required</button>
                <RouterLink to="/followup/ebay-click" class="fu-dropdown-item">View Today’s Pending Members</RouterLink>
                <RouterLink to="/followup/ebay-click" class="fu-dropdown-item">View Overdue</RouterLink>
              </div>
            </div>
          </div>
        </div>
        <h2 class="fu-card-title">eBay Click Followup</h2>
        <p class="fu-card-desc">Check the eBay listing daily and tick it off when done.</p>
        <div class="fu-card-foot">
          <span class="fu-card-stat">{{ ebayDoneTotal }}/{{ ebayRequiredTotal }} done</span>
          <a
            href="https://www.ebay.com/sch/i.html?_nkw=mini+excavator&_sacat=0&_from=R40&_trksid=p4624852.m570.l1312"
            target="_blank"
            rel="noopener"
            class="fu-card-ghost"
            title="Open eBay listing"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <RouterLink to="/followup/ebay-click" class="fu-card-btn">
            Open
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </RouterLink>
        </div>
      </div>

      <!-- Website Optimization -->
      <div class="fu-card fu-card--speed">
        <div class="fu-card-top">
          <span class="fu-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </span>
          <div class="fu-card-top-right">
            <span class="fu-card-freq">Weekly</span>
            <div v-if="canManageFollowups" class="fu-card-opt-wrapper">
              <button
                type="button"
                class="fu-card-opt-btn"
                @click.prevent.stop="toggleDropdown('speed')"
                aria-label="Quick Actions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              
              <div v-if="activeDropdownCard === 'speed'" class="fu-card-dropdown">
                <RouterLink to="/followup/speed-optimization" class="fu-dropdown-item">Open Website Optimization</RouterLink>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('speed', 'admin_auto_completed')">Mark This Week’s Speed Checks Done</button>
                <button type="button" class="fu-dropdown-item" @click="openConfirmModal('speed', 'admin_marked_not_required')">Mark This Week Not Required</button>
                <RouterLink to="/followup/speed-optimization" class="fu-dropdown-item">View Pending Websites</RouterLink>
                <RouterLink to="/followup/speed-optimization" class="fu-dropdown-item">View Overdue</RouterLink>
              </div>
            </div>
          </div>
        </div>
        <h2 class="fu-card-title">Website Optimization</h2>
        <p class="fu-card-desc">Run a weekly speed check &amp; performance review per website.</p>
        <div class="fu-card-foot">
          <span class="fu-card-stat">{{ speedDoneTotal }}/{{ speedTotal }} done</span>
          <RouterLink to="/followup/speed-optimization" class="fu-card-btn">
            Open
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- ════ Followup Summary ════ -->
    <section class="fu-summary">
      <div class="fu-summary-head">
        <div>
          <h2 class="fu-summary-title">Team Followup Summary</h2>
          <p class="fu-summary-sub">{{ periodSubLabel }} — who has completed their followups and who hasn't.</p>
        </div>
        <div class="fu-summary-toolbar">
          <!-- Mode Toggle -->
          <div class="fu-mode-toggle">
            <button
              v-for="m in (['daily', 'weekly', 'monthly'] as const)"
              :key="m"
              type="button"
              class="fu-mode-btn"
              :class="{ 'fu-mode-btn--active': viewMode === m }"
              @click="setViewMode(m)"
            >
              {{ capitalize(m) }}
            </button>
          </div>

          <!-- Date/Period Switcher -->
          <div class="fu-period-switcher">
            <button class="fu-nav-btn" type="button" @click="adjustPeriod(-1)" aria-label="Previous period">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span class="fu-period-text">{{ currentPeriodLabel }}</span>
            <button class="fu-nav-btn" type="button" @click="adjustPeriod(1)" aria-label="Next period">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="fu-reset-btn" type="button" @click="resetPeriod">
              {{ viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Top stat row -->
      <div class="fu-stat-row">
        <div class="fu-stat">
          <span class="fu-stat-num">{{ membersAllDone }}</span>
          <span class="fu-stat-label">Fully done</span>
        </div>
        <div class="fu-stat">
          <span class="fu-stat-num fu-stat-num--warn">{{ membersWithPending }}</span>
          <span class="fu-stat-label">Has pending</span>
        </div>
        <div class="fu-stat">
          <span class="fu-stat-num">{{ blogDoneTotal }}/{{ blogTotal }}</span>
          <span class="fu-stat-label">Blog websites done</span>
        </div>
        <div class="fu-stat">
          <span class="fu-stat-num">{{ pluginDoneTotal }}/{{ pluginTotal }}</span>
          <span class="fu-stat-label">Plugin websites done</span>
        </div>
        <div class="fu-stat">
          <span class="fu-stat-num">{{ ebayDoneTotal }}/{{ ebayRequiredTotal }}</span>
          <span class="fu-stat-label">eBay clicks done</span>
        </div>
        <div class="fu-stat">
          <span class="fu-stat-num">{{ speedDoneTotal }}/{{ speedTotal }}</span>
          <span class="fu-stat-label">Speed optimization done</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="fu-summary-loading card card-pad">Loading team summary…</div>

      <!-- Empty -->
      <div v-else-if="rows.length === 0" class="fu-summary-empty card card-pad">
        No members to show.
      </div>

      <!-- Member table -->
      <div v-else class="fu-table card">
        <div class="fu-thead">
          <div class="fu-th fu-th-member">Member</div>
          <div class="fu-th">Blog</div>
          <div class="fu-th">Plugin</div>
          <div class="fu-th">eBay</div>
          <div class="fu-th">Speed</div>
          <div class="fu-th fu-th-overall">Overall</div>
        </div>
        <div v-for="r in rows" :key="r.member.id" class="fu-trow">
          <div class="fu-td fu-td-member">
            <div class="fu-avatar">
              <img
                v-if="r.member.avatarUrl"
                :src="r.member.avatarUrl"
                :alt="r.member.fullName"
                class="fu-avatar-img cursor-pointer transition hover:scale-110"
                @click.prevent.stop="openPhotoPreview(r.member)"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else>{{ initials(r.member.fullName) }}</span>
            </div>
            <div class="fu-member-info">
              <div class="fu-member-name">{{ r.member.fullName }}</div>
              <div class="fu-member-meta">{{ r.member.position || r.member.email }}</div>
            </div>
          </div>

          <div class="fu-td">
            <span class="fu-pill" :class="pillClass(r.blog.state)">{{ r.blog.label }}</span>
          </div>
          <div class="fu-td">
            <span class="fu-pill" :class="pillClass(r.plugin.state)">{{ r.plugin.label }}</span>
          </div>
          <div class="fu-td">
            <span class="fu-pill" :class="pillClass(r.ebay.state)">{{ r.ebay.label }}</span>
          </div>
          <div class="fu-td">
            <span class="fu-pill" :class="pillClass(r.speed.state)">{{ r.speed.label }}</span>
          </div>
          <div class="fu-td fu-td-overall">
            <span class="fu-overall" :class="r.allDone ? 'fu-overall--done' : 'fu-overall--pending'">
              {{ r.allDone ? 'All done' : `${r.doneCount}/${r.requiredCount}` }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ Confirmation Modal ════ -->
    <div v-if="confirmModal" class="fu-modal-overlay" role="dialog" aria-modal="true">
      <div class="fu-modal card">
        <div class="fu-modal-head">
          <h3 class="fu-modal-title">
            {{ getModalTitle(confirmModal) }}
          </h3>
          <p class="fu-modal-sub">
            {{ getModalSub(confirmModal) }}
          </p>
        </div>

        <div class="fu-modal-body">
          <div class="fu-modal-meta-grid">
            <div class="fu-modal-meta-item">
              <span class="fu-meta-label">Period / Date</span>
              <span class="fu-meta-value">{{ confirmModal.periodLabel }}</span>
            </div>
            <div class="fu-modal-meta-item">
              <span class="fu-meta-label">Pending Updates</span>
              <span class="fu-meta-value font-bold text-amber-500">{{ confirmModal.affectedCount }}</span>
            </div>
            <div class="fu-modal-meta-item">
              <span class="fu-meta-label">Already Completed</span>
              <span class="fu-meta-value text-green-500">{{ confirmModal.completedCount }}</span>
            </div>
          </div>

          <!-- Sunday warning for eBay Click -->
          <div v-if="confirmModal.cardType === 'ebay' && isSundayDate(confirmModal.targetKey)" class="fu-warning-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 flex-shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <p class="font-bold text-sm">Sunday Warning</p>
              <p class="text-xs text-text-muted mt-0.5">Sunday is normally a non-working day for eBay Click. Please confirm if you want to proceed.</p>
              <label class="fu-checkbox-label mt-2">
                <input v-model="confirmModal.sundayConfirmed" type="checkbox" />
                <span class="text-xs">Yes, auto fill this Sunday date</span>
              </label>
            </div>
          </div>

          <!-- Affected items list -->
          <div v-if="confirmModal.affectedNames.length > 0" class="fu-modal-affected">
            <h4 class="fu-affected-title">
              {{ confirmModal.cardType === 'ebay' ? 'Members affected:' : 'Websites affected:' }}
            </h4>
            <div class="fu-affected-list">
              <span v-for="name in confirmModal.affectedNames" :key="name" class="fu-affected-tag">
                {{ name }}
              </span>
            </div>
          </div>

          <!-- Reason Field -->
          <div class="fu-field mt-4">
            <span class="fu-field-label">Reason <em class="text-xs text-text-muted">(optional)</em></span>
            <textarea
              v-model="confirmModal.reason"
              rows="3"
              class="fu-textarea"
              placeholder="e.g. Completed during weekly review, holiday, etc."
            ></textarea>
          </div>
        </div>

        <div class="fu-modal-foot">
          <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="confirmModal = null">
            Cancel
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="isSubmitting || (confirmModal.cardType === 'ebay' && isSundayDate(confirmModal.targetKey) && !confirmModal.sundayConfirmed)"
            @click="executeBulkAction"
          >
            {{ isSubmitting ? 'Processing…' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member } from '@/stores/data';
import { useImagePreviewStore } from '@/stores/imagePreview';
import { pushToast, usePageRealtime } from '@/services/realtimeService';

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
import { useFollowupStore, type EbayAutoFillActionType } from '@/stores/followup';
import { isFollowupParticipant } from '@/lib/roles';

const auth = useAuthStore();
const data = useDataStore();
const followup = useFollowupStore();

// Live updates: followup completions / admin auto-fills / schedule changes made
// anywhere patch the followup store reactively, so counts and rows stay current
// without a manual refresh.
usePageRealtime([
  'blog_upload_slots',
  'blog_followup_schedules',
  'plugin_update_slots',
  'speed_optimization_slots',
  'ebay_click_followup',
  'websites'
]);

const loading = ref(false);

// ── Timezone-safe date helpers (local parts, never toISOString) ──────────────
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(new Date());

const viewMode = ref<'daily' | 'weekly' | 'monthly'>('weekly');
const periodOffset = ref(0);

const setViewMode = (mode: 'daily' | 'weekly' | 'monthly') => {
  viewMode.value = mode;
  periodOffset.value = 0;
};

const adjustPeriod = (delta: number) => {
  periodOffset.value += delta;
};

const resetPeriod = () => {
  periodOffset.value = 0;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Resolve target bounds/labels
const dailyBounds = computed(() => {
  const t = new Date();
  t.setDate(t.getDate() + periodOffset.value);
  const dateStr = iso(t);
  const formatted = t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return { dateStr, label: formatted };
});

const weeklyBounds = computed(() => {
  const t = new Date();
  const dow = t.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(t);
  mon.setDate(t.getDate() + diffToMon + periodOffset.value * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const monStr = iso(mon);
  const sunStr = iso(sun);

  const fmt = (s: string) =>
    new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { monStr, sunStr, label: `Week of ${fmt(monStr)} – ${fmt(sunStr)}` };
});

const monthlyBounds = computed(() => {
  const t = new Date();
  const target = new Date(t.getFullYear(), t.getMonth() + periodOffset.value, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const startStr = iso(start);
  const endStr = iso(end);
  const label = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { startStr, endStr, label };
});

const currentPeriodLabel = computed(() => {
  if (viewMode.value === 'daily') return dailyBounds.value.label;
  if (viewMode.value === 'weekly') return weeklyBounds.value.label;
  return monthlyBounds.value.label;
});

const periodSubLabel = computed(() => {
  if (viewMode.value === 'daily') return `Day of ${dailyBounds.value.label}`;
  if (viewMode.value === 'weekly') return weeklyBounds.value.label;
  return `Month of ${monthlyBounds.value.label}`;
});

const weekBounds = () => {
  if (viewMode.value === 'weekly') {
    return { monStr: weeklyBounds.value.monStr, sunStr: weeklyBounds.value.sunStr };
  }
  const t = new Date();
  const dow = t.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(t);
  mon.setDate(t.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { monStr: iso(mon), sunStr: iso(sun) };
};

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';

// ── Members shown: active members + admins who own websites ──────────────────
const summaryMembers = computed(() => {
  const all = data.members.filter(isFollowupParticipant);
  if (auth.isAdmin) return all;
  const userId = auth.user?.id;
  return all.filter((m) => m.id === userId);
});

// ── Status calc ──────────────────────────────────────────────────────────────
type CellState = 'done' | 'pending' | 'missed' | 'none';
interface Cell { state: CellState; label: string }

type DayState = 'done' | 'pending' | 'missed' | 'upcoming';
interface BlogDay {
  label: string;
  date: string;
  dow: number;
  state: DayState;
}

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isBlogDateRequired = (websiteId: string, dateStr: string, schedule: any | null): boolean => {
  const cur = new Date(`${dateStr}T12:00:00`);
  const dow = cur.getDay();
  const dayOfMonth = cur.getDate();

  if (!schedule) {
    return [2, 6].includes(dow);
  }
  if (schedule.kind === 'custom') {
    return schedule.customDates.includes(dateStr);
  }
  if (schedule.kind === 'weekly') {
    return (schedule.weekdays || []).includes(dow);
  }
  if (schedule.kind === 'monthly') {
    const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const wantedDays = (schedule.monthlyDays ?? [])
      .filter((d: any) => Number.isInteger(d) && d >= 1 && d <= 31)
      .map((d: any) => Math.min(d, lastDay));
    if (wantedDays.includes(dayOfMonth)) return true;
    if (wantedDays.length === 0 && schedule.monthlyTarget) {
      const slot = followup.blogSlots.find(
        (s) => s.websiteId === websiteId && s.scheduledDate === dateStr
      );
      return !!slot;
    }
  }
  return false;
};

const blogDaysInCustomRange = (websiteId: string, startIso: string, endIso: string): BlogDay[] => {
  const schedule = followup.scheduleFor(websiteId);
  const days: BlogDay[] = [];
  const cur = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  while (cur <= end) {
    const dateStr = iso(cur);
    const required = isBlogDateRequired(websiteId, dateStr, schedule);

    if (required) {
      const slot = followup.blogSlots.find(
        (s) => s.websiteId === websiteId && s.scheduledDate === dateStr
      );
      let state: DayState = 'pending';
      if (slot && (slot.status === 'done' || slot.status === 'late')) {
        state = 'done';
      } else if (slot && slot.status === 'missed') {
        state = 'missed';
      } else if (dateStr < today) {
        state = 'missed';
      } else if (dateStr > today) {
        state = 'upcoming';
      }
      days.push({ label: SHORT_DAY[cur.getDay()], date: dateStr, dow: cur.getDay(), state });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const blogWeekDays = (websiteId: string): BlogDay[] => {
  const start = viewMode.value === 'weekly' ? weeklyBounds.value.monStr : monthlyBounds.value.startStr;
  const end = viewMode.value === 'weekly' ? weeklyBounds.value.sunStr : monthlyBounds.value.endStr;
  return blogDaysInCustomRange(websiteId, start, end);
};

// Blog: count actual DONE blog slots vs all scheduled slots in selected period
const blogCell = (memberId: string): Cell => {
  const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === memberId);
  if (ownWebsites.length === 0) return { state: 'none', label: '—' };
  
  let done = 0;
  let total = 0;
  let missed = 0;
  let pending = 0;

  if (viewMode.value === 'daily') {
    const targetDate = dailyBounds.value.dateStr;
    ownWebsites.forEach((wsite) => {
      const schedule = followup.scheduleFor(wsite.id);
      const isRequired = isBlogDateRequired(wsite.id, targetDate, schedule);
      if (isRequired) {
        total++;
        const slot = followup.blogSlots.find(
          (s) => s.websiteId === wsite.id && s.scheduledDate === targetDate
        );
        const isDone = slot && (slot.status === 'done' || slot.status === 'late');
        const isMissed = slot ? slot.status === 'missed' : targetDate < today;
        if (isDone) done++;
        else if (isMissed) missed++;
        else pending++;
      }
    });
  } else {
    const start = viewMode.value === 'weekly' ? weeklyBounds.value.monStr : monthlyBounds.value.startStr;
    const end = viewMode.value === 'weekly' ? weeklyBounds.value.sunStr : monthlyBounds.value.endStr;
    ownWebsites.forEach((wsite) => {
      const days = blogDaysInCustomRange(wsite.id, start, end);
      days.forEach((d) => {
        total++;
        if (d.state === 'done') done++;
        else if (d.state === 'missed') missed++;
        else pending++;
      });
    });
  }

  if (total === 0) return { state: 'none', label: '—' };
  if (done >= total) return { state: 'done', label: 'Done' };
  if (done === 0 && missed > 0 && pending === 0)
    return { state: 'missed', label: `0/${total}` };
  return { state: 'pending', label: `${done}/${total}` };
};

// Plugin: count DONE plugin slots vs all in selected period for websites owned by this member
const pluginCell = (memberId: string): Cell => {
  const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === memberId);
  if (ownWebsites.length === 0) return { state: 'none', label: '—' };

  if (viewMode.value === 'daily') {
    const targetDate = dailyBounds.value.dateStr;
    let completedCount = 0;
    ownWebsites.forEach((wsite) => {
      const slot = followup.pluginSlots.find(
        (s) => s.websiteId === wsite.id && s.completedBy === memberId && s.completedAt?.startsWith(targetDate)
      );
      if (slot && slot.status === 'done') completedCount++;
    });
    if (completedCount > 0) return { state: 'done', label: `${completedCount} Done` };
    return { state: 'none', label: '—' };
  }

  let done = 0;
  let total = 0;
  let missed = 0;
  let pending = 0;

  const targetStarts = new Set<string>();
  if (viewMode.value === 'weekly') {
    targetStarts.add(weeklyBounds.value.monStr);
  } else {
    const { startStr, endStr } = monthlyBounds.value;
    const cur = new Date(`${startStr}T12:00:00`);
    const end = new Date(`${endStr}T12:00:00`);
    while (cur <= end) {
      if (cur.getDay() === 1) targetStarts.add(iso(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  ownWebsites.forEach((wsite) => {
    targetStarts.forEach((ws) => {
      total++;
      const slot = followup.pluginSlots.find(
        (s) => s.websiteId === wsite.id && s.weekStart === ws
      );
      const st = slot?.status ?? 'pending';
      if (st === 'done') done++;
      else if (st === 'missed') missed++;
      else pending++;
    });
  });

  if (total === 0) return { state: 'none', label: '—' };
  if (done >= total) return { state: 'done', label: 'Done' };
  if (done === 0 && missed > 0 && pending === 0)
    return { state: 'missed', label: `0/${total}` };
  return { state: 'pending', label: `${done}/${total}` };
};

// eBay: required Mon–Sat (skip Sun)
const ebayEntryFor = (memberId: string, date: string) =>
  followup.ebayEntries.find((e) => e.userId === memberId && e.date === date && e.status === 'done');

const ebayCompletionLabel = (entry: ReturnType<typeof ebayEntryFor>) => {
  if (entry?.completionSource === 'admin_auto_fill') return 'Admin Auto Completed';
  if (entry?.completionSource === 'not_required_today') return 'Not Required Today';
  if (entry?.completionSource === 'admin_manual') return 'Admin Completed';
  return 'Completed by Member';
};

const ebayCell = (memberId: string): Cell => {
  const doneDates = new Set(
    followup.ebayEntries
      .filter((e) => e.userId === memberId && e.status === 'done')
      .map((e) => e.date)
  );

  if (viewMode.value === 'daily') {
    const targetDate = dailyBounds.value.dateStr;
    const targetDow = new Date(`${targetDate}T12:00:00`).getDay();
    if (targetDow === 0) return { state: 'none', label: '—' }; // Sunday
    if (doneDates.has(targetDate)) return { state: 'done', label: ebayCompletionLabel(ebayEntryFor(memberId, targetDate)) };
    if (targetDate < today) return { state: 'missed', label: 'Missed' };
    if (targetDate > today) return { state: 'none', label: '—' };
    return { state: 'pending', label: 'Pending' };
  }

  let required = 0;
  let done = 0;
  let missed = 0;

  if (viewMode.value === 'weekly') {
    const { monStr } = weeklyBounds.value;
    const mon = new Date(`${monStr}T12:00:00`);
    for (let i = 0; i < 6; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const ds = iso(d);
      required++;
      if (doneDates.has(ds)) done++;
      else if (ds < today) missed++;
    }
  } else {
    const { startStr, endStr } = monthlyBounds.value;
    const cur = new Date(`${startStr}T12:00:00`);
    const end = new Date(`${endStr}T12:00:00`);
    while (cur <= end) {
      const ds = iso(cur);
      const dow = cur.getDay();
      if (dow !== 0) {
        required++;
        if (doneDates.has(ds)) done++;
        else if (ds < today) missed++;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  if (required === 0) return { state: 'none', label: '—' };
  if (done >= required) return { state: 'done', label: 'Done' };
  if (missed > 0 && done === 0) return { state: 'missed', label: `0/${required}` };
  return { state: 'pending', label: `${done}/${required}` };
};

// Speed: count DONE speed slots vs all in selected period for websites owned by this member
const speedCell = (memberId: string): Cell => {
  const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === memberId);
  if (ownWebsites.length === 0) return { state: 'none', label: '—' };

  if (viewMode.value === 'daily') {
    const targetDate = dailyBounds.value.dateStr;
    let completedCount = 0;
    ownWebsites.forEach((wsite) => {
      const slot = followup.speedSlots.find(
        (s) => s.websiteId === wsite.id && s.completedBy === memberId && s.completedAt?.startsWith(targetDate)
      );
      if (slot && slot.status === 'done') completedCount++;
    });
    if (completedCount > 0) return { state: 'done', label: `${completedCount} Done` };
    return { state: 'none', label: '—' };
  }

  let done = 0;
  let total = 0;
  let missed = 0;
  let pending = 0;

  const targetStarts = new Set<string>();
  if (viewMode.value === 'weekly') {
    targetStarts.add(weeklyBounds.value.monStr);
  } else {
    const { startStr, endStr } = monthlyBounds.value;
    const cur = new Date(`${startStr}T12:00:00`);
    const end = new Date(`${endStr}T12:00:00`);
    while (cur <= end) {
      if (cur.getDay() === 1) targetStarts.add(iso(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  ownWebsites.forEach((wsite) => {
    targetStarts.forEach((ws) => {
      total++;
      const slot = followup.speedSlots.find(
        (s) => s.websiteId === wsite.id && s.weekStart === ws
      );
      const st = slot?.status ?? 'pending';
      if (st === 'done') done++;
      else if (st === 'missed') missed++;
      else pending++;
    });
  });

  if (total === 0) return { state: 'none', label: '—' };
  if (done >= total) return { state: 'done', label: 'Done' };
  if (done === 0 && missed > 0 && pending === 0)
    return { state: 'missed', label: `0/${total}` };
  return { state: 'pending', label: `${done}/${total}` };
};

const pillClass = (s: CellState) => ({
  'fu-pill--done': s === 'done',
  'fu-pill--pending': s === 'pending',
  'fu-pill--missed': s === 'missed',
  'fu-pill--none': s === 'none'
});

interface Row {
  member: Member;
  blog: Cell;
  plugin: Cell;
  ebay: Cell;
  speed: Cell;
  doneCount: number;
  requiredCount: number;
  allDone: boolean;
}

const rows = computed<Row[]>(() => {
  return summaryMembers.value
    .map((member) => {
      const blog = blogCell(member.id);
      const plugin = pluginCell(member.id);
      const ebay = ebayCell(member.id);
      const speed = speedCell(member.id);
      // Only count cells that actually apply (state !== 'none')
      const cells = [blog, plugin, ebay, speed].filter((c) => c.state !== 'none');
      const requiredCount = cells.length;
      const doneCount = cells.filter((c) => c.state === 'done').length;
      return {
        member,
        blog,
        plugin,
        ebay,
        speed,
        doneCount,
        requiredCount,
        allDone: requiredCount > 0 && doneCount === requiredCount
      };
    })
    .sort((a, b) => {
      // Pending first (so admin sees who needs attention), then by name
      if (a.allDone !== b.allDone) return a.allDone ? 1 : -1;
      return a.member.fullName.localeCompare(b.member.fullName);
    });
});

// ── Top stats ────────────────────────────────────────────────────────────────
const membersAllDone = computed(() => rows.value.filter((r) => r.allDone).length);
const membersWithPending = computed(
  () => rows.value.filter((r) => !r.allDone && r.requiredCount > 0).length
);

// Sum of all active members' scheduled blog slots in selected period
const blogStats = computed(() => {
  let total = 0;
  let done = 0;
  for (const m of summaryMembers.value) {
    const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === m.id);
    ownWebsites.forEach((wsite) => {
      if (viewMode.value === 'daily') {
        const targetDate = dailyBounds.value.dateStr;
        const schedule = followup.scheduleFor(wsite.id);
        if (isBlogDateRequired(wsite.id, targetDate, schedule)) {
          total++;
          const slot = followup.blogSlots.find(
            (s) => s.websiteId === wsite.id && s.scheduledDate === targetDate
          );
          if (slot && (slot.status === 'done' || slot.status === 'late')) done++;
        }
      } else {
        const start = viewMode.value === 'weekly' ? weeklyBounds.value.monStr : monthlyBounds.value.startStr;
        const end = viewMode.value === 'weekly' ? weeklyBounds.value.sunStr : monthlyBounds.value.endStr;
        const days = blogDaysInCustomRange(wsite.id, start, end);
        days.forEach((d) => {
          total++;
          if (d.state === 'done') done++;
        });
      }
    });
  }
  return { total, done };
});

const blogTotal = computed(() => blogStats.value.total);
const blogDoneTotal = computed(() => blogStats.value.done);

// Sum of all active members' scheduled plugin slots in selected period
const pluginStats = computed(() => {
  let total = 0;
  let done = 0;
  for (const m of summaryMembers.value) {
    const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === m.id);
    if (viewMode.value === 'daily') {
      const targetDate = dailyBounds.value.dateStr;
      ownWebsites.forEach((wsite) => {
        const slot = followup.pluginSlots.find(
          (s) => s.websiteId === wsite.id && s.completedBy === m.id && s.completedAt?.startsWith(targetDate)
        );
        if (slot && slot.status === 'done') {
          total++;
          done++;
        }
      });
    } else {
      const targetStarts = new Set<string>();
      if (viewMode.value === 'weekly') {
        targetStarts.add(weeklyBounds.value.monStr);
      } else {
        const cur = new Date(`${monthlyBounds.value.startStr}T12:00:00`);
        const end = new Date(`${monthlyBounds.value.endStr}T12:00:00`);
        while (cur <= end) {
          if (cur.getDay() === 1) targetStarts.add(iso(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
      ownWebsites.forEach((wsite) => {
        targetStarts.forEach((ws) => {
          total++;
          const slot = followup.pluginSlots.find(
            (s) => s.websiteId === wsite.id && s.weekStart === ws
          );
          if (slot && slot.status === 'done') done++;
        });
      });
    }
  }
  return { total, done };
});

const pluginTotal = computed(() => pluginStats.value.total);
const pluginDoneTotal = computed(() => pluginStats.value.done);

const ebayStats = computed(() => {
  let required = 0;
  let done = 0;
  for (const m of summaryMembers.value) {
    const doneDates = new Set(
      followup.ebayEntries
        .filter((e) => e.userId === m.id && e.status === 'done')
        .map((e) => e.date)
    );
    if (viewMode.value === 'daily') {
      const targetDate = dailyBounds.value.dateStr;
      const dow = new Date(`${targetDate}T12:00:00`).getDay();
      if (dow !== 0) {
        required++;
        if (doneDates.has(targetDate)) done++;
      }
    } else if (viewMode.value === 'weekly') {
      const bounds = weeklyBounds.value;
      const mon = new Date(`${bounds.monStr}T12:00:00`);
      for (let i = 0; i < 6; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        const ds = iso(d);
        required++;
        if (doneDates.has(ds)) done++;
      }
    } else {
      const bounds = monthlyBounds.value;
      const cur = new Date(`${bounds.startStr}T12:00:00`);
      const end = new Date(`${bounds.endStr}T12:00:00`);
      while (cur <= end) {
        const ds = iso(cur);
        const dow = cur.getDay();
        if (dow !== 0) {
          required++;
          if (doneDates.has(ds)) done++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }
  return { required, done };
});
const ebayDoneTotal = computed(() => ebayStats.value.done);
const ebayRequiredTotal = computed(() => ebayStats.value.required);

// Sum of all active members' scheduled speed slots in selected period
const speedStats = computed(() => {
  let total = 0;
  let done = 0;
  for (const m of summaryMembers.value) {
    const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === m.id);
    if (viewMode.value === 'daily') {
      const targetDate = dailyBounds.value.dateStr;
      ownWebsites.forEach((wsite) => {
        const slot = followup.speedSlots.find(
          (s) => s.websiteId === wsite.id && s.completedBy === m.id && s.completedAt?.startsWith(targetDate)
        );
        if (slot && slot.status === 'done') {
          total++;
          done++;
        }
      });
    } else {
      const targetStarts = new Set<string>();
      if (viewMode.value === 'weekly') {
        targetStarts.add(weeklyBounds.value.monStr);
      } else {
        const cur = new Date(`${monthlyBounds.value.startStr}T12:00:00`);
        const end = new Date(`${monthlyBounds.value.endStr}T12:00:00`);
        while (cur <= end) {
          if (cur.getDay() === 1) targetStarts.add(iso(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
      ownWebsites.forEach((wsite) => {
        targetStarts.forEach((ws) => {
          total++;
          const slot = followup.speedSlots.find(
            (s) => s.websiteId === wsite.id && s.weekStart === ws
          );
          if (slot && slot.status === 'done') done++;
        });
      });
    }
  }
  return { total, done };
});

const speedTotal = computed(() => speedStats.value.total);
const speedDoneTotal = computed(() => speedStats.value.done);

// ── Quick Actions and Confirmation Modal ──────────────────────────────────────
const activeDropdownCard = ref<'blog' | 'plugin' | 'ebay' | 'speed' | null>(null);

const canManageFollowups = computed(() => {
  return auth.isAdmin || auth.isHeadOrSupervisor;
});

const toggleDropdown = (card: 'blog' | 'plugin' | 'ebay' | 'speed') => {
  if (activeDropdownCard.value === card) {
    activeDropdownCard.value = null;
  } else {
    activeDropdownCard.value = card;
  }
};

const closeDropdown = () => {
  activeDropdownCard.value = null;
};

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.fu-card-opt-wrapper')) {
    activeDropdownCard.value = null;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});

// Confirmation Modal State
interface ConfirmModalState {
  cardType: 'blog' | 'plugin' | 'ebay' | 'speed';
  actionType: 'admin_auto_completed' | 'admin_marked_not_required' | 'admin_auto_fill' | 'not_required_today';
  periodLabel: string;
  targetKey: string;
  affectedCount: number;
  completedCount: number;
  affectedNames: string[];
  reason: string;
  sundayConfirmed?: boolean;
}

const confirmModal = ref<ConfirmModalState | null>(null);
const isSubmitting = ref(false);

const getCurrentTargetDate = () => {
  if (viewMode.value === 'daily') {
    return dailyBounds.value.dateStr;
  }
  return today;
};

const getCurrentTargetWeekStart = () => {
  if (viewMode.value === 'weekly') {
    return weeklyBounds.value.monStr;
  }
  const refDateStr = viewMode.value === 'daily' ? dailyBounds.value.dateStr : today;
  const refDate = new Date(`${refDateStr}T12:00:00`);
  const dow = refDate.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(refDate);
  mon.setDate(refDate.getDate() + diffToMon);
  return iso(mon);
};

const isSundayDate = (dateStr: string) => {
  if (!dateStr) return false;
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
};

const openConfirmModal = (
  cardType: 'blog' | 'plugin' | 'ebay' | 'speed',
  actionType: 'admin_auto_completed' | 'admin_marked_not_required' | 'admin_auto_fill' | 'not_required_today'
) => {
  closeDropdown();

  let periodLabel = '';
  let targetKey = '';
  let affectedCount = 0;
  let completedCount = 0;
  const affectedNames: string[] = [];

  const activeWebsites = data.websites.filter(w => w.status === 'active');
  const activeMembersList = data.members.filter(isFollowupParticipant);

  if (cardType === 'blog') {
    const targetDate = getCurrentTargetDate();
    targetKey = targetDate;
    periodLabel = new Date(`${targetDate}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    activeWebsites.forEach((w) => {
      const schedule = followup.scheduleFor(w.id);
      if (isBlogDateRequired(w.id, targetDate, schedule)) {
        const slot = followup.blogSlots.find(
          (s) => s.websiteId === w.id && s.scheduledDate === targetDate
        );
        const isDone = slot && (slot.status === 'done' || slot.status === 'late');
        if (isDone) {
          completedCount++;
        } else {
          affectedCount++;
          affectedNames.push(w.name);
        }
      }
    });
  } else if (cardType === 'plugin') {
    const weekStartStr = getCurrentTargetWeekStart();
    targetKey = weekStartStr;
    const weekMon = new Date(`${weekStartStr}T12:00:00`);
    const weekSun = new Date(weekMon);
    weekSun.setDate(weekMon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    periodLabel = `Week of ${fmt(weekMon)} – ${fmt(weekSun)}, ${weekMon.getFullYear()}`;

    activeWebsites.forEach((w) => {
      const slot = followup.pluginSlots.find(
        (s) => s.websiteId === w.id && s.weekStart === weekStartStr
      );
      const isDone = slot && slot.status === 'done';
      if (isDone) {
        completedCount++;
      } else {
        affectedCount++;
        affectedNames.push(w.name);
      }
    });
  } else if (cardType === 'ebay') {
    const targetDate = getCurrentTargetDate();
    targetKey = targetDate;
    const dateObj = new Date(`${targetDate}T12:00:00`);
    periodLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    activeMembersList.forEach((m) => {
      const doneDates = new Set(
        followup.ebayEntries
          .filter((e) => e.userId === m.id && e.status === 'done')
          .map((e) => e.date)
      );
      if (doneDates.has(targetDate)) {
        completedCount++;
      } else {
        affectedCount++;
        affectedNames.push(m.fullName);
      }
    });
  } else if (cardType === 'speed') {
    const weekStartStr = getCurrentTargetWeekStart();
    targetKey = weekStartStr;
    const weekMon = new Date(`${weekStartStr}T12:00:00`);
    const weekSun = new Date(weekMon);
    weekSun.setDate(weekMon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    periodLabel = `Week of ${fmt(weekMon)} – ${fmt(weekSun)}, ${weekMon.getFullYear()}`;

    activeWebsites.forEach((w) => {
      const slot = followup.speedSlots.find(
        (s) => s.websiteId === w.id && s.weekStart === weekStartStr
      );
      const isDone = slot && slot.status === 'done';
      if (isDone) {
        completedCount++;
      } else {
        affectedCount++;
        affectedNames.push(w.name);
      }
    });
  }

  confirmModal.value = {
    cardType,
    actionType,
    periodLabel,
    targetKey,
    affectedCount,
    completedCount,
    affectedNames,
    reason: '',
    sundayConfirmed: false
  };
};

const getModalTitle = (modal: ConfirmModalState) => {
  const action = (modal.actionType === 'not_required_today' || modal.actionType === 'admin_marked_not_required')
    ? 'Mark Not Required'
    : 'Bulk Complete';
  const type = modal.cardType === 'blog' ? 'Blog Followups'
    : modal.cardType === 'plugin' ? 'Plugin Updates'
    : modal.cardType === 'ebay' ? 'eBay Click'
    : 'Speed Checks';
  return `${action} for ${type}?`;
};

const getModalSub = (modal: ConfirmModalState) => {
  const action = (modal.actionType === 'not_required_today' || modal.actionType === 'admin_marked_not_required')
    ? 'as Not Required'
    : 'as Done/Auto Completed';
  
  const entity = modal.cardType === 'ebay' ? 'members' : 'websites';
  const name = modal.cardType === 'blog' ? 'Blog Followup'
    : modal.cardType === 'plugin' ? 'Plugin Update'
    : modal.cardType === 'ebay' ? 'eBay Click'
    : 'Website Optimization';

  return `This will mark ${name} ${action} for ${modal.affectedCount} active ${entity} on ${modal.periodLabel}. This will not count as manual member completion.`;
};

const executeBulkAction = async () => {
  if (!confirmModal.value || isSubmitting.value) return;

  const { cardType, actionType, targetKey, reason, sundayConfirmed } = confirmModal.value;

  if (cardType === 'ebay' && isSundayDate(targetKey) && !sundayConfirmed) {
    pushToast('Confirmation required', 'Please confirm that you want to run this action on a Sunday.', 'warning');
    return;
  }

  isSubmitting.value = true;
  try {
    let result: { affectedCount: number; skippedCount: number } | null = null;

    if (cardType === 'blog') {
      result = await followup.bulkCompleteBlogFollowups(targetKey, actionType, reason);
    } else if (cardType === 'plugin') {
      result = await followup.bulkCompletePluginUpdates(targetKey, actionType, reason);
    } else if (cardType === 'speed') {
      result = await followup.bulkCompleteSpeedOptimization(targetKey, actionType, reason);
    } else if (cardType === 'ebay') {
      const ebayRes = await followup.autoFillEbayClick({
        date: targetKey,
        actionType: actionType as EbayAutoFillActionType,
        reason: reason
      });
      if (ebayRes) {
        result = {
          affectedCount: ebayRes.autoFilledCount,
          skippedCount: ebayRes.alreadyCompletedCount
        };
      }
    }

    if (result) {
      const actionLabel = (actionType === 'not_required_today' || actionType === 'admin_marked_not_required')
        ? 'marked not required'
        : 'marked completed';
      
      const cardTitle = cardType === 'blog' ? 'Blog Followups'
        : cardType === 'plugin' ? 'Plugin Updates'
        : cardType === 'ebay' ? 'eBay Click Followups'
        : 'Speed Optimization Checks';

      const successMsg = `${cardTitle} ${actionLabel}.`;
      const detailMsg = result.skippedCount > 0
        ? `${result.affectedCount} updated, ${result.skippedCount} already completed.`
        : `${result.affectedCount} updated successfully.`;
      
      pushToast('Success', `${successMsg} ${detailMsg}`, 'success');
      confirmModal.value = null;

      // Refresh page summary/stats without full page reload:
      if (cardType === 'blog') {
        await followup.fetchBlogSlots();
      } else if (cardType === 'plugin') {
        await followup.fetchPluginSlots();
      } else if (cardType === 'speed') {
        await followup.fetchSpeedSlots();
      } else if (cardType === 'ebay') {
        await followup.fetchEbayEntries();
      }
    } else {
      pushToast('Error', 'Failed to execute bulk action. Please check permissions.', 'warning');
    }
  } catch (err) {
    console.error('Bulk action failed:', err);
    pushToast('Error', 'An unexpected error occurred.', 'warning');
  } finally {
    isSubmitting.value = false;
  }
};

// ── Load ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true;
  try {
    await Promise.allSettled([
      data.fetchMembers(),
      data.fetchWebsites(),
      followup.fetchBlogSlots(),
      followup.fetchPluginSlots(),
      followup.fetchEbayEntries(),
      followup.fetchBlogSchedules(),
      followup.fetchSpeedSlots()
    ]);
  } catch (err) {
    console.error('[followup-summary] load failed', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.fu-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Hero ── */
.fu-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding: 1.15rem 1.35rem;
  border: 1px solid color-mix(in srgb, var(--primary) 12%, var(--border));
  border-radius: 16px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--primary) 8%, var(--card-bg)),
    var(--card-bg) 60%);
  box-shadow: var(--shadow-sm);
}
.fu-hero-kicker {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
}
.fu-hero-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
  margin: 0.2rem 0 0;
}
.fu-hero-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0.3rem 0 0;
  max-width: 38rem;
  line-height: 1.5;
}
.fu-hero-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.fu-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
}
.fu-stat-pill-num {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1;
}
.fu-stat-pill-num--warn { color: #d97706; }
:global([data-theme='dark-gray']) .fu-stat-pill-num--warn { color: #fbbf24; }
.fu-stat-pill-label {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Type cards: 4 / 2 / 2 grid ── */
.fu-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}
@media (max-width: 1100px) { .fu-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.fu-card {
  --fu-accent: var(--primary);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 1rem 1.05rem 0.9rem;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease;
}
.fu-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
}
/* Per-type identity — only the icon carries the accent; everything else
   stays brand-blue / neutral for a clean, consistent look. */
.fu-card--blog   { --fu-accent: var(--primary); }
.fu-card--plugin { --fu-accent: #6366f1; }
.fu-card--ebay   { --fu-accent: #10b981; }
.fu-card--speed  { --fu-accent: #f59e0b; }

.fu-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.fu-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  flex-shrink: 0;
  color: var(--fu-accent);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--fu-accent) 22%, transparent),
    color-mix(in srgb, var(--fu-accent) 9%, transparent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fu-accent) 18%, transparent);
}
.fu-card-freq {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  white-space: nowrap;
}

.fu-card-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.98rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-main);
  margin: 0.15rem 0 0;
}
.fu-card-desc {
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0;
  flex: 1;
}

.fu-card-foot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--border);
}
.fu-card-stat {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-right: auto;
}
.fu-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  padding: 0.4rem 0.8rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
  margin-left: auto;
  transition: background 150ms ease, transform 120ms ease;
}
.fu-card-btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
.fu-card-btn--solo { margin-left: 0; width: 100%; justify-content: center; }

.fu-card-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9px;
  border: 1px solid var(--border);
  color: var(--text-muted);
  text-decoration: none;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}
.fu-card-ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}

@media (max-width: 480px) {
  .fu-card-stat { display: none; }
  .fu-card-btn { padding: 0.4rem 0.65rem; }
}

/* ── Team Followup Summary ── */
.fu-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fu-summary-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.fu-summary-title {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
}
.fu-summary-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0;
}

.fu-summary-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.fu-mode-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg);
}

.fu-mode-btn {
  padding: 0.42rem 0.8rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  border-right: 1px solid var(--border);
  transition: background 150ms, color 150ms;
}

.fu-mode-btn:last-child {
  border-right: none;
}

.fu-mode-btn--active {
  background: var(--primary);
  color: #fff;
}

.fu-period-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.2rem 0.5rem;
  background: var(--card-bg);
}

.fu-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  transition: background 150ms;
}

.fu-nav-btn:hover {
  background: var(--soft-bg);
}

.fu-period-text {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text-main);
  min-width: 8.5rem;
  text-align: center;
}

.fu-reset-btn {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--primary);
  background: var(--soft-bg);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: opacity 120ms;
  white-space: nowrap;
}

.fu-reset-btn:hover {
  opacity: 0.85;
}

.fu-stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
}
.fu-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  padding: 0.75rem 0.9rem;
}
.fu-stat-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1;
}
.fu-stat-num--warn { color: #dc2626; }
.fu-stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.fu-summary-loading,
.fu-summary-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.fu-table {
  overflow: hidden;
  padding: 0;
}
.fu-thead,
.fu-trow {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
}
.fu-thead {
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--soft-bg) 60%, transparent);
}
.fu-th {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.fu-th-overall,
.fu-td-overall { text-align: right; justify-self: end; }

.fu-trow {
  border-bottom: 1px solid var(--border);
}
.fu-trow:last-child { border-bottom: none; }
.fu-trow:hover { background: color-mix(in srgb, var(--primary) 3%, transparent); }

.fu-td-member {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}
.fu-avatar {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  background: var(--soft-bg);
  border: 1px solid var(--border);
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
.fu-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.fu-member-info { min-width: 0; }
.fu-member-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fu-member-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fu-pill {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
  display: inline-block;
}
.fu-pill--done    { background: rgba(22,163,74,0.14);  color: #16a34a; }
.fu-pill--pending { background: color-mix(in srgb, var(--primary) 13%, transparent); color: var(--primary); }
.fu-pill--missed  { background: rgba(220,38,38,0.12);  color: #dc2626; }
.fu-pill--none    { background: var(--soft-bg);         color: var(--text-muted); }

.fu-overall {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 850;
  border-radius: 999px;
  padding: 0.18rem 0.65rem;
}
.fu-overall--done    { background: rgba(22,163,74,0.14); color: #16a34a; }
.fu-overall--pending { background: rgba(220,38,38,0.10); color: #dc2626; }

/* Dropdown and Option button */
.fu-card-top-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fu-card-opt-wrapper {
  position: relative;
  display: inline-block;
}

.fu-card-opt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 140ms ease;
}

.fu-card-opt-btn:hover {
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
}

.fu-card-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  z-index: 50;
  width: 220px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.fu-dropdown-item {
  display: block;
  width: 100%;
  padding: 0.4rem 0.6rem;
  text-align: left;
  font-family: 'Raleway', 'Kantumruy Pro', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  transition: background 120ms, color 120ms;
}

.fu-dropdown-item:hover {
  background: var(--soft-bg);
  color: var(--primary);
}

/* Modal styling matching KiuQ style */
.fu-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.fu-modal {
  width: 100%;
  max-width: 500px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.fu-modal-head {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.fu-modal-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.fu-modal-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.35rem 0 0;
  line-height: 1.4;
}

.fu-modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fu-modal-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
}

.fu-modal-meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.fu-meta-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.fu-meta-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
}

.fu-warning-box {
  display: flex;
  gap: 0.65rem;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  padding: 0.75rem;
  color: var(--text-main);
}

.fu-modal-affected {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.fu-affected-title {
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--text-main);
  margin: 0;
}

.fu-affected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  max-height: 100px;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--soft-bg);
}

.fu-affected-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text-main);
  border-radius: 6px;
  padding: 0.15rem 0.45rem;
}

.fu-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.fu-field-label {
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--text-main);
}

.fu-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.5rem 0.65rem;
  font-size: 0.82rem;
  resize: vertical;
  outline: none;
}

.fu-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.fu-modal-foot {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  background: var(--soft-bg);
}

.fu-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.fu-checkbox-label input {
  width: 0.9rem;
  height: 0.9rem;
  accent-color: var(--primary);
}

@media (max-width: 760px) {
  .fu-thead { display: none; }
  .fu-trow {
    grid-template-columns: 1fr 1fr;
    row-gap: 0.5rem;
  }
  .fu-td-member { grid-column: 1 / -1; }
  .fu-td-overall { justify-self: start; text-align: left; }
}
</style>
