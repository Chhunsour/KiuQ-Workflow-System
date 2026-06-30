<template>
  <div>
    <PageHeader
      :title="$t('eBay Click Followup')"
      subtitle="Daily checkbox tracker — complete your eBay click followup Monday through Saturday."
    >
      <template #actions>
        <button
          v-if="canAdminAutoFill && !viewingMemberId"
          type="button"
          class="btn-secondary ecf-auto-fill-btn"
          @click="openAutoFillModal"
        >
          {{ $t('Auto Fill All') }}
        </button>
        <a
          href="https://www.ebay.com/sch/i.html?_nkw=mini+excavator&_sacat=0&_from=R40&_trksid=p4624852.m570.l1312"
          target="_blank"
          rel="noopener"
          class="btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          {{ $t('Open eBay') }}
        </a>
        <RouterLink to="/followup" class="btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
          {{ $t('Back') }}
        </RouterLink>
      </template>
    </PageHeader>

    <LoadingBlock :loading="followup.loadingEbay" :error="followup.errorEbay" :retry="load">

      <!-- Direct daily/monthly calendar tracker -->
      <div>
        <!-- Self-view: mini stats -->
        <div class="ecf-self-stats">
          <div class="ecf-self-stat">
            <span class="ecf-self-num">{{ selfWeekDone }}/{{ memberWeekRequired }}</span>
            <span class="ecf-self-label">{{ $t('This Week') }}</span>
          </div>
          <div class="ecf-self-stat">
            <span class="ecf-self-num">{{ selfMonthDone }}/{{ memberMonthRequired }}</span>
            <span class="ecf-self-label">{{ $t('This Month') }}</span>
          </div>
          <div class="ecf-self-stat">
            <span class="ecf-self-num ecf-self-num--missed">{{ selfMissedWeek }}</span>
            <span class="ecf-self-label">{{ $t('Missed This Week') }}</span>
          </div>
        </div>

        <!-- Week / Month toggle -->
        <div class="ecf-view-toggle mb-5">
          <button
            class="ecf-toggle-btn"
            :class="calendarView === 'week' ? 'ecf-toggle-btn--active' : ''"
            type="button"
            @click="calendarView = 'week'"
          >{{ $t('This Week') }}</button>
          <button
            class="ecf-toggle-btn"
            :class="calendarView === 'month' ? 'ecf-toggle-btn--active' : ''"
            type="button"
            @click="calendarView = 'month'"
          >{{ $t('This Month') }}</button>
        </div>

        <!-- ── Calendar grid ── -->
        <div class="ecf-calendar">
          <div
            v-for="day in calendarDays"
            :key="day.date"
            class="ecf-day-card card"
            :class="{
              'ecf-day-card--sunday': day.isSunday,
              'ecf-day-card--today': day.isToday,
              'ecf-day-card--future': day.isFuture,
              [`ecf-st-${calendarDayStatus(day.date)}`]: true
            }"
          >
            <!-- Day header -->
            <div class="ecf-day-header">
              <span class="ecf-day-name">{{ day.label }}</span>
              <span class="ecf-day-date">{{ day.displayDate }}</span>
            </div>

            <!-- Sunday — no work day -->
            <div v-if="day.isSunday" class="ecf-day-nowork">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              {{ $t('No Work Day') }}
            </div>

            <!-- Required day -->
            <template v-else>
              <div class="ecf-day-status">
                <span class="ecf-status-pill" :class="statusPillClass(calendarDayStatus(day.date))">
                  <span class="ecf-status-dot" />
                  {{ statusLabel(calendarDayStatus(day.date), day.date) }}
                </span>
              </div>

              <!-- Future: not yet actionable -->
              <div v-if="day.isFuture" class="ecf-day-upcoming">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {{ $t('Upcoming') }}
              </div>

              <!-- Editable (today, or admin correcting a past day): checkbox -->
              <div v-else-if="canEditDay(day)" class="ecf-day-check">
                <label class="ecf-checkbox-label" :class="{ 'ecf-checkbox-label--disabled': saving === day.date }">
                  <input
                    type="checkbox"
                    class="ecf-checkbox"
                    :checked="calendarDayStatus(day.date) === 'done'"
                    :disabled="saving === day.date"
                    @change="toggleDay(day)"
                  />
                  <span class="ecf-checkbox-text">
                    {{ calendarDayStatus(day.date) === 'done' ? statusLabel('done', day.date) : 'Mark Done' }}
                  </span>
                </label>
              </div>

              <!-- Locked: a past day that's already settled (completed earlier
                   or missed). Can't be changed after the day rolls over. -->
              <div
                v-else
                class="ecf-day-locked"
                :class="calendarDayStatus(day.date) === 'done' ? 'ecf-day-locked--done' : 'ecf-day-locked--missed'"
              >
                <svg v-if="calendarDayStatus(day.date) === 'done'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                {{ calendarDayStatus(day.date) === 'done' ? statusLabel('done', day.date) : 'Missed — locked' }}
              </div>
            </template>
          </div>
        </div>
      </div>

    </LoadingBlock>

    <Modal
      :open="autoFillOpen"
      :title="$t('Auto fill eBay Click for all members?')"
      subtitle="This will mark today’s eBay Click followup for all active team members as handled by Head/Admin. Use this only when eBay Click is not required today."
      size="md"
      @close="closeAutoFillModal"
    >
      <div class="ecf-auto-modal">
        <label class="ecf-field">
          <span>{{ $t('Date') }}</span>
          <input v-model="autoFillForm.date" type="date" class="ecf-input" required :disabled="autoFillSaving" />
        </label>

        <label class="ecf-field">
          <span>{{ $t('Action type') }}</span>
          <select v-model="autoFillForm.actionType" class="ecf-input" :disabled="autoFillSaving">
            <option value="admin_auto_fill">{{ $t('Admin Auto Completed') }}</option>
            <option value="not_required_today">{{ $t('Not Required Today') }}</option>
          </select>
        </label>

        <label class="ecf-field">
          <span>{{ $t('Reason') }} <em>{{ $t('optional') }}</em></span>
          <textarea
            v-model="autoFillForm.reason"
            rows="3"
            class="ecf-input ecf-textarea"
            :placeholder="$t('e.g. eBay Click not required today')"
            :disabled="autoFillSaving"
          ></textarea>
        </label>

        <div v-if="autoFillIsSunday" class="ecf-warning">
          <p>{{ $t('Sunday is normally a non-working day. Are you sure you want to auto fill this date?') }}</p>
          <label>
            <input v-model="autoFillSundayConfirmed" type="checkbox" :disabled="autoFillSaving" />
            <span>{{ $t('Yes, auto fill this Sunday date') }}</span>
          </label>
        </div>

        <div class="ecf-member-picker">
          <div class="ecf-member-picker-head">
            <strong>{{ $t('Members') }}</strong>
            <span>{{ selectedAutoFillMembers.length }}/{{ activeMembers.length }} selected</span>
          </div>
          <div v-if="activeMembers.length === 0" class="ecf-member-picker-empty">
            {{ $t('No active members found for eBay Click followup.') }}
          </div>
          <div v-else class="ecf-member-checks">
            <label v-for="member in activeMembers" :key="member.id" class="ecf-member-check">
              <input
                type="checkbox"
                :checked="!autoFillExcludedIds.has(member.id)"
                :disabled="autoFillSaving"
                @change="toggleAutoFillMember(member.id, $event)"
              />
              <span>{{ member.fullName || member.email }}</span>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="btn-secondary" :disabled="autoFillSaving" @click="closeAutoFillModal">
          {{ $t('Cancel') }}
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="!canConfirmAutoFill"
          @click="confirmAutoFill"
        >
          {{ autoFillSaving ? 'Saving…' : 'Confirm Auto Fill' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Modal from '@/components/ui/Modal.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore, type EbayAutoFillActionType, type EbayClickEntry } from '@/stores/followup';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useImagePreviewStore } from '@/stores/imagePreview';

const previewStore = useImagePreviewStore();
const openPhotoPreview = () => {
  if (viewingMember.value?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: viewingMember.value.avatarUrl,
      fullName: viewingMember.value.fullName,
      email: viewingMember.value.email,
      role: viewingMember.value.role
    });
  }
};
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import FollowupMemberGroups from '@/components/followup/FollowupMemberGroups.vue';
import { pushToast, usePageRealtime } from '@/services/realtimeService';
import { isFollowupParticipant } from '@/lib/roles';

usePageRealtime(['ebay_click_followup']);

const route     = useRoute();
const auth      = useAuthStore();
const data      = useDataStore();
const followup  = useFollowupStore();

// ── Date helpers ─────────────────────────────────────────────────────────────

// Timezone-safe: build YYYY-MM-DD from LOCAL date parts (toISOString
// converts to UTC and shifts the day in non-UTC zones).
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today   = isoDate(new Date());

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Monday of the week containing d */
const weekStart = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

/** First day of month containing d */
const monthStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

/** Last day of month containing d */
const monthEnd = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);

interface CalendarDay {
  date: string;
  label: string;
  displayDate: string;
  isSunday: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const buildDays = (from: Date, to: Date): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const iso  = isoDate(cur);
    const dow  = cur.getDay();
    days.push({
      date:        iso,
      label:       dayNames[dow],
      displayDate: cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      isSunday:    dow === 0,
      isToday:     iso === today,
      isFuture:    iso > today,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

// ── State ────────────────────────────────────────────────────────────────────

const calendarView    = ref<'week' | 'month'>('week');
const viewingMemberId = ref<string | null>(null);   // admin: which member to show
const saving          = ref<string | null>(null);   // date string being toggled
const autoFillOpen = ref(false);
const autoFillSaving = ref(false);
const autoFillSundayConfirmed = ref(false);
const autoFillExcludedIds = ref<Set<string>>(new Set());
const autoFillForm = ref<{
  date: string;
  reason: string;
  actionType: EbayAutoFillActionType;
}>({
  date: today,
  reason: '',
  actionType: 'admin_auto_fill'
});

// Pre-fill memberId from route param if admin navigated directly
onMounted(() => {
  const param = route.params.memberId as string | undefined;
  if (param && auth.isAdmin) viewingMemberId.value = param;
});

// ── Load data ────────────────────────────────────────────────────────────────

const load = async () => {
  if (auth.isAdmin) {
    await followup.fetchEbayEntries();   // all entries
    if (!data.members.length) await data.fetchMembers();
  } else {
    await followup.fetchEbayEntries(auth.user?.id);
  }
};

onMounted(load);

watch(viewingMemberId, async (id) => {
  if (id) await followup.fetchEbayEntries(id);
});

watch(() => autoFillForm.value.date, () => {
  autoFillSundayConfirmed.value = false;
});

// ── Computed: which user we're showing in the calendar ──────────────────────

const calendarUserId = computed(() => {
  if (auth.isAdmin && viewingMemberId.value) return viewingMemberId.value;
  return auth.user?.id ?? '';
});

const viewingMember = computed(() =>
  data.members.find((m) => m.id === viewingMemberId.value)
);

/** Can the current user toggle checkboxes at all (ownership/role gate). */
const canToggle = computed(() => {
  // Admin viewing own: yes. Admin viewing member: yes (manual correction). Member: own only.
  return auth.isAdmin || calendarUserId.value === auth.user?.id;
});

/**
 * Per-day edit gate. A regular member can only ever mark TODAY — once the
 * clock rolls past midnight a missed day is locked and can't be ticked off
 * retroactively. Admins keep the ability to correct past days manually.
 */
const canEditDay = (day: CalendarDay): boolean => {
  if (!canToggle.value) return false;
  if (day.isSunday || day.isFuture) return false;
  if (day.isToday) return true;       // today is always editable
  return auth.isAdmin;                 // past days: admin-only correction
};

// ── Calendar days ────────────────────────────────────────────────────────────

const thisWeekDays = computed((): CalendarDay[] => {
  const now = new Date();
  const from = weekStart(now);
  const to   = new Date(from); to.setDate(from.getDate() + 6);
  return buildDays(from, to);
});

const calendarDays = computed((): CalendarDay[] => {
  const now = new Date();
  if (calendarView.value === 'week') return thisWeekDays.value;
  return buildDays(monthStart(now), monthEnd(now));
});

// ── Required days (Mon–Sat: dow 1–6) ─────────────────────────────────────────

const requiredDow = [1, 2, 3, 4, 5, 6];

const isRequiredDay = (iso: string) => {
  const dow = new Date(iso + 'T12:00:00').getDay();
  return requiredDow.includes(dow);
};

const isPastRequired = (iso: string) => iso < today && isRequiredDay(iso);

// ── Entry lookup ─────────────────────────────────────────────────────────────

const doneSet = computed(() => {
  const uid = calendarUserId.value;
  const set = new Set<string>();
  followup.ebayEntries
    .filter((e) => e.userId === uid)
    .forEach((e) => set.add(e.date));
  return set;
});

type DayStatus = 'done' | 'pending' | 'missed' | 'no_work_day';

const ebayEntryFor = (memberId: string, date: string): EbayClickEntry | undefined =>
  followup.ebayEntries.find((e) => e.userId === memberId && e.date === date);

const calendarDayStatus = (iso: string): DayStatus => {
  const dow = new Date(iso + 'T12:00:00').getDay();
  if (dow === 0) return 'no_work_day';
  if (doneSet.value.has(iso)) return 'done';
  if (iso < today) return 'missed';
  return 'pending';
};

// ── Admin: per-member status ─────────────────────────────────────────────────

const memberDoneSet = (memberId: string) => {
  const set = new Set<string>();
  followup.ebayEntries
    .filter((e) => e.userId === memberId)
    .forEach((e) => set.add(e.date));
  return set;
};

// ── Progress calculations ────────────────────────────────────────────────────

const memberWeekRequired = computed(() => {
  // Count required (Mon–Sat) days in this week
  return thisWeekDays.value.filter((d) => isRequiredDay(d.date)).length;
});

const memberMonthRequired = computed(() => {
  const now = new Date();
  const days = buildDays(monthStart(now), monthEnd(now));
  return days.filter((d) => isRequiredDay(d.date)).length;
});

const memberWeekDone  = (memberId: string) => {
  const done = memberDoneSet(memberId);
  return thisWeekDays.value.filter((d) => isRequiredDay(d.date) && done.has(d.date)).length;
};

const memberMissedWeek = (memberId: string) => {
  const done = memberDoneSet(memberId);
  return thisWeekDays.value.filter((d) => isPastRequired(d.date) && !done.has(d.date)).length;
};

// ── Self stats (member view) ─────────────────────────────────────────────────

const selfWeekDone   = computed(() => {
  return thisWeekDays.value.filter((d) => isRequiredDay(d.date) && doneSet.value.has(d.date)).length;
});
const selfMonthDone  = computed(() => {
  const now  = new Date();
  const days = buildDays(monthStart(now), monthEnd(now));
  return days.filter((d) => isRequiredDay(d.date) && doneSet.value.has(d.date)).length;
});
const selfMissedWeek = computed(() =>
  thisWeekDays.value.filter((d) => isPastRequired(d.date) && !doneSet.value.has(d.date)).length
);

// ── Admin summary cards ──────────────────────────────────────────────────────

const activeMembers = computed(() =>
  data.members.filter(isFollowupParticipant)
);

const canAdminAutoFill = computed(() => auth.isAdmin);
const selectedAutoFillMembers = computed(() =>
  activeMembers.value.filter((m) => !autoFillExcludedIds.value.has(m.id))
);
const autoFillIsSunday = computed(() =>
  !!autoFillForm.value.date && new Date(`${autoFillForm.value.date}T12:00:00`).getDay() === 0
);
const canConfirmAutoFill = computed(() =>
  canAdminAutoFill.value
    && !autoFillSaving.value
    && !!autoFillForm.value.date
    && selectedAutoFillMembers.value.length > 0
    && (!autoFillIsSunday.value || autoFillSundayConfirmed.value)
);

const completedToday = computed(() => {
  const todayIso = today;
  return activeMembers.value.filter((m) => {
    const done = memberDoneSet(m.id);
    return done.has(todayIso);
  }).length;
});

const pendingToday = computed(() => {
  const todayIso = today;
  const dow = new Date().getDay();
  if (dow === 0) return 0; // Sunday
  return activeMembers.value.filter((m) => {
    const done = memberDoneSet(m.id);
    return !done.has(todayIso);
  }).length;
});

const missedThisWeek = computed(() =>
  activeMembers.value.reduce((sum, m) => sum + memberMissedWeek(m.id), 0)
);

const teamWeekDone = computed(() =>
  activeMembers.value.reduce((sum, m) => sum + memberWeekDone(m.id), 0)
);
const teamWeekRequired = computed(() =>
  activeMembers.value.length * memberWeekRequired.value
);

// ── Admin auto fill ─────────────────────────────────────────────────────────

const openAutoFillModal = () => {
  if (!canAdminAutoFill.value) {
    pushToast('Permission denied', 'You do not have permission to auto fill eBay Click followups.', 'warning');
    return;
  }
  autoFillForm.value = { date: today, reason: '', actionType: 'admin_auto_fill' };
  autoFillExcludedIds.value = new Set();
  autoFillSundayConfirmed.value = false;
  autoFillOpen.value = true;
};

const closeAutoFillModal = () => {
  if (autoFillSaving.value) return;
  autoFillOpen.value = false;
};

const toggleAutoFillMember = (memberId: string, event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  const next = new Set(autoFillExcludedIds.value);
  if (checked) next.delete(memberId);
  else next.add(memberId);
  autoFillExcludedIds.value = next;
};

const confirmAutoFill = async () => {
  if (!canAdminAutoFill.value) {
    pushToast('Permission denied', 'You do not have permission to auto fill eBay Click followups.', 'warning');
    return;
  }
  if (selectedAutoFillMembers.value.length === 0) {
    pushToast('No active members found', 'No active members found for eBay Click followup.', 'warning');
    return;
  }
  if (autoFillIsSunday.value && !autoFillSundayConfirmed.value) return;

  autoFillSaving.value = true;
  try {
    const result = await followup.autoFillEbayClick({
      date: autoFillForm.value.date,
      actionType: autoFillForm.value.actionType,
      reason: autoFillForm.value.reason,
      excludedUserIds: [...autoFillExcludedIds.value]
    });

    if (!result) {
      pushToast('Auto fill failed', followup.errorEbay || 'Auto fill failed. Please try again.', 'warning');
      return;
    }
    if (result.affectedMemberCount === 0 && result.alreadyCompletedCount === 0) {
      pushToast('No active members found', 'No active members found for eBay Click followup.', 'warning');
      return;
    }

    const actionLabel = result.actionType === 'not_required_today' ? 'marked not required' : 'auto-filled';
    const detail = result.alreadyCompletedCount > 0
      ? `${result.autoFilledCount} ${actionLabel}, ${result.alreadyCompletedCount} already completed.`
      : `eBay Click followup ${actionLabel} for ${result.autoFilledCount} member${result.autoFilledCount === 1 ? '' : 's'}.`;
    pushToast('eBay Click updated', detail, 'success');
    autoFillOpen.value = false;
  } finally {
    autoFillSaving.value = false;
  }
};

// ── Toggle checkbox ──────────────────────────────────────────────────────────

const toggleDay = async (day: CalendarDay) => {
  // Hard guard: never allow marking a locked (past, non-today) day for
  // members — mirrors the UI lock so it can't be bypassed.
  if (saving.value || !canEditDay(day)) return;
  saving.value = day.date;
  try {
    const uid = calendarUserId.value;
    const isDone = doneSet.value.has(day.date);
    if (isDone) {
      await followup.unmarkEbayDone(day.date, uid === auth.user?.id ? undefined : uid);
    } else {
      await followup.markEbayDone(day.date, day.label, uid === auth.user?.id ? undefined : uid);
    }
  } finally {
    saving.value = null;
  }
};

// ── UI helpers ───────────────────────────────────────────────────────────────

const completionLabel = (entry: EbayClickEntry | undefined) => {
  if (!entry) return 'Completed by Member';
  if (entry.completionSource === 'admin_auto_fill') return 'Admin Auto Completed';
  if (entry.completionSource === 'not_required_today') return 'Not Required Today';
  if (entry.completionSource === 'admin_manual') return 'Admin Completed';
  return 'Completed by Member';
};

const statusLabel = (s: DayStatus, date?: string) => {
  if (s === 'done')       return completionLabel(date ? ebayEntryFor(calendarUserId.value, date) : undefined);
  if (s === 'missed')     return 'Missed';
  if (s === 'no_work_day') return 'No Work Day';
  return 'Pending';
};

const statusPillClass = (s: DayStatus) => ({
  'ecf-pill--done':        s === 'done',
  'ecf-pill--pending':     s === 'pending',
  'ecf-pill--missed':      s === 'missed',
  'ecf-pill--no-work-day': s === 'no_work_day',
});

const initials = (name: string) =>
  (name || '?').split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
</script>

<style scoped>
/* ── Admin auto-fill modal ───────────────────────────────────── */
.ecf-auto-fill-btn {
  white-space: nowrap;
}

.ecf-auto-modal {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.ecf-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ecf-field > span {
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--text-main);
}

.ecf-field em {
  color: var(--text-muted);
  font-style: normal;
  font-weight: 500;
}

.ecf-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.58rem 0.7rem;
  font-size: 0.86rem;
  outline: none;
}

.ecf-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.ecf-textarea {
  resize: vertical;
  min-height: 5rem;
}

.ecf-warning {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  border: 1px solid color-mix(in srgb, #f59e0b 35%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, #f59e0b 10%, var(--card-bg));
  padding: 0.75rem;
  color: var(--text-main);
}

.ecf-warning p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.4;
}

.ecf-warning label,
.ecf-member-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--text-main);
}

.ecf-warning input,
.ecf-member-check input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary);
}

.ecf-member-picker {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--soft-bg) 45%, var(--card-bg));
  overflow: hidden;
}

.ecf-member-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
  padding: 0.65rem 0.75rem;
}

.ecf-member-picker-head strong {
  font-size: 0.84rem;
  color: var(--text-main);
}

.ecf-member-picker-head span {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.ecf-member-picker-empty {
  padding: 0.75rem;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.ecf-member-checks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.4rem 0.75rem;
  max-height: 13rem;
  overflow: auto;
  padding: 0.75rem;
}

/* ── Summary row ─────────────────────────────────────────────── */
.ecf-summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

.ecf-summary-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
}

.ecf-summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  flex-shrink: 0;
}

.ecf-summary-icon--done     { background: color-mix(in srgb, #22c55e 12%, transparent); color: #15803d; }
.ecf-summary-icon--pending  { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
.ecf-summary-icon--missed   { background: color-mix(in srgb, #ef4444 12%, transparent); color: #b91c1c; }
.ecf-summary-icon--progress { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }

:global([data-theme='dark-gray']) .ecf-summary-icon--done    { color: #4ade80; }
:global([data-theme='dark-gray']) .ecf-summary-icon--pending { color: #fbbf24; }
:global([data-theme='dark-gray']) .ecf-summary-icon--missed  { color: #f87171; }

.ecf-summary-num   { font-size: 1.4rem; font-weight: 800; color: var(--text-main); line-height: 1; }
.ecf-summary-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; }

/* ── Member list (admin overview) ────────────────────────────── */
.ecf-member-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ecf-member-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
}

.ecf-member-identity {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 2;
  min-width: 160px;
}

.ecf-member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 13%, transparent);
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
  overflow: hidden;
}

.ecf-member-avatar--sm {
  width: 1.8rem;
  height: 1.8rem;
  font-size: 0.65rem;
}

.ecf-avatar-img { width: 100%; height: 100%; object-fit: cover; }

.ecf-member-name { font-size: 0.88rem; font-weight: 700; color: var(--text-main); }
.ecf-member-pos  { font-size: 0.7rem;  color: var(--text-muted); }

.ecf-member-week {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 2;
  min-width: 140px;
}

.ecf-member-week-bar {
  display: flex;
  gap: 3px;
}

.ecf-week-pip {
  width: 1.4rem;
  height: 0.5rem;
  border-radius: 999px;
}

.ecf-pip--done    { background: #22c55e; }
.ecf-pip--missed  { background: #ef4444; }
.ecf-pip--pending { background: var(--border); }
.ecf-pip--none    { background: var(--soft-bg); opacity: 0.4; }

.ecf-member-week-score { font-size: 0.7rem; color: var(--text-muted); }

.ecf-member-month {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
}

.ecf-member-month-num   { font-size: 0.95rem; font-weight: 700; color: var(--text-main); }
.ecf-member-month-label { font-size: 0.65rem; color: var(--text-muted); }

.ecf-member-missed { min-width: 80px; }

.ecf-missed-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.ecf-missed-badge--red { background: color-mix(in srgb, #ef4444 12%, transparent); color: #b91c1c; }
.ecf-missed-badge--ok  { background: var(--soft-bg); color: var(--text-muted); }

:global([data-theme='dark-gray']) .ecf-missed-badge--red { color: #f87171; }

.ecf-view-btn {
  font-size: 0.78rem;
  padding: 0.32rem 0.75rem;
  height: auto;
  white-space: nowrap;
  margin-left: auto;
}

/* ── Calendar topbar (admin view member) ─────────────────────── */
.ecf-calendar-topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.ecf-back-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  padding: 0.32rem 0.7rem;
  height: auto;
}

.ecf-viewing-member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ecf-viewing-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

/* ── Self stats (member view) ────────────────────────────────── */
.ecf-self-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.ecf-self-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  min-width: 100px;
}

.ecf-self-num        { font-size: 1.35rem; font-weight: 800; color: var(--text-main); line-height: 1; }
.ecf-self-num--missed { color: #ef4444; }
.ecf-self-label      { font-size: 0.68rem; color: var(--text-muted); margin-top: 0.2rem; }

:global([data-theme='dark-gray']) .ecf-self-num--missed { color: #f87171; }

/* ── Week / Month toggle ─────────────────────────────────────── */
.ecf-view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  width: fit-content;
}

.ecf-toggle-btn {
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--card-bg);
  border: none;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}

.ecf-toggle-btn--active {
  background: var(--primary);
  color: #f8fbff;
}

/* ── Calendar day cards ──────────────────────────────────────── */
.ecf-calendar {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.ecf-day-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem 0.9rem;
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 150ms, box-shadow 150ms, transform 150ms;
}
/* A slim status accent strip along the top of each day. */
.ecf-day-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--ecf-accent, transparent);
}
.ecf-st-done    { --ecf-accent: #16a34a; }
.ecf-st-pending { --ecf-accent: var(--primary); }
.ecf-st-missed  { --ecf-accent: #ef4444; }

/* Today = the one actionable card → clear blue emphasis. */
.ecf-day-card--today {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-ring);
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
}

.ecf-day-card--sunday { opacity: 0.6; }
.ecf-day-card--future { opacity: 0.78; }
/* Past missed days are de-emphasised so the eye lands on what's actionable. */
.ecf-st-missed:not(.ecf-day-card--today) { opacity: 0.82; }

.ecf-day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem;
}

.ecf-day-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.ecf-day-date {
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--text-muted);
}

.ecf-day-nowork {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
}

/* ── Status pill ─────────────────────────────────────────────── */
.ecf-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.66rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.ecf-status-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.ecf-pill--done        { background: color-mix(in srgb, #16a34a 15%, transparent); color: #16a34a; }
/* Pending = brand blue (was amber). */
.ecf-pill--pending     { background: var(--primary-soft); color: var(--primary); }
.ecf-pill--missed      { background: color-mix(in srgb, #ef4444 15%, transparent); color: #dc2626; }
.ecf-pill--no-work-day { background: var(--soft-bg); color: var(--text-muted); }

:global([data-theme='dark-gray']) .ecf-pill--done    { color: #4ade80; }
:global([data-theme='dark-gray']) .ecf-pill--missed  { color: #f87171; }

/* ── Checkbox (today / admin) ─────────────────────────────────── */
.ecf-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  padding: 0.15rem 0;
}

.ecf-checkbox-label--disabled {
  opacity: 0.6;
  cursor: wait;
}

.ecf-checkbox {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
}

.ecf-checkbox-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
}

/* ── Upcoming + locked states ─────────────────────────────────── */
.ecf-day-upcoming {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.ecf-day-locked {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.74rem;
  font-weight: 700;
}
.ecf-day-locked--done   { color: #16a34a; }
.ecf-day-locked--missed { color: var(--text-muted); }
:global([data-theme='dark-gray']) .ecf-day-locked--done { color: #4ade80; }

@media (max-width: 640px) {
  .ecf-summary-row { grid-template-columns: repeat(2, 1fr); }
  .ecf-calendar    { grid-template-columns: repeat(2, 1fr); }
  .ecf-member-row  { gap: 0.65rem; }
  .ecf-view-btn    { margin-left: 0; width: 100%; justify-content: center; }
}
</style>
