<template>
  <Modal :open="open" title="Blog Schedule" subtitle="Set how often this website publishes blogs." size="md" @close="close">
    <div class="bs-body">
      <!-- Two clean modes only -->
      <div class="bs-kind-tabs" role="tablist" aria-label="Schedule kind">
        <button
          v-for="k in KINDS"
          :key="k.value"
          type="button"
          role="tab"
          :aria-selected="kind === k.value"
          class="bs-kind"
          :class="{ 'bs-kind--active': kind === k.value }"
          @click="kind = k.value"
        >
          {{ k.label }}
        </button>
      </div>

      <!-- Weekly: pick weekdays -->
      <section v-if="kind === 'weekly'" class="bs-section">
        <p class="bs-section-label">Posting days</p>
        <div class="bs-weekday-row">
          <button
            v-for="d in WEEKDAYS"
            :key="d.value"
            type="button"
            class="bs-day"
            :class="{ 'bs-day--on': weekdays.has(d.value) }"
            :aria-pressed="weekdays.has(d.value)"
            @click="toggleWeekday(d.value)"
          >
            {{ d.label }}
          </button>
        </div>
        <p class="bs-hint">
          Pick the weekdays this website posts on. Example:
          <strong>Tue + Sat</strong> = twice a week.
          Pick one day for once a week, three for three times, etc.
        </p>
      </section>

      <!-- Monthly: pick day-numbers (1..31) -->
      <section v-else class="bs-section">
        <p class="bs-section-label">Days of every month</p>
        <p class="bs-hint">Tap the dates you publish on every month. Example: <strong>8, 16, 27</strong>.</p>
        <div class="bs-day-grid">
          <button
            v-for="day in DAYS_OF_MONTH"
            :key="day"
            type="button"
            class="bs-mday"
            :class="{ 'bs-mday--on': monthlyDays.has(day) }"
            :aria-pressed="monthlyDays.has(day)"
            @click="toggleMonthlyDay(day)"
          >
            {{ day }}
          </button>
        </div>
        <p v-if="hasShortMonthWarning" class="bs-hint bs-hint--warn">
          Days above 28 will land on the last day of shorter months
          (e.g. day 31 → Feb 28).
        </p>
      </section>

      <!-- Preview: next required dates with current settings -->
      <section class="bs-preview">
        <p class="bs-section-label">Next required dates</p>
        <p v-if="previewDates.length === 0" class="bs-hint">No upcoming dates with these settings.</p>
        <ul v-else class="bs-preview-list">
          <li v-for="iso in previewDates" :key="iso">{{ formatPreview(iso) }}</li>
        </ul>
      </section>

      <p v-if="err" class="bs-err">{{ err }}</p>
    </div>

    <template #footer>
      <div class="bs-footer">
        <button class="btn-ghost" type="button" @click="close">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving || !canSave" @click="save">
          {{ saving ? 'Saving…' : 'Save Schedule' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import {
  useFollowupStore,
  DEFAULT_BLOG_WEEKDAYS,
  type BlogScheduleKind
} from '@/stores/followup';

const props = defineProps<{
  open: boolean;
  websiteId: string;
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const followup = useFollowupStore();

/** Only the two modes the UI exposes. The DB still supports 'custom'
 *  for any legacy rows, but users never see that option here. */
type UiKind = Extract<BlogScheduleKind, 'weekly' | 'monthly'>;

const KINDS: { value: UiKind; label: string }[] = [
  { value: 'weekly',  label: 'Weekly by days' },
  { value: 'monthly', label: 'Monthly by date' },
];

// Mon-first for readability
const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

const kind = ref<UiKind>('weekly');
const weekdays = ref<Set<number>>(new Set(DEFAULT_BLOG_WEEKDAYS));
const monthlyDays = ref<Set<number>>(new Set());

const saving = ref(false);
const err = ref('');

/** Hydrate the form whenever the modal opens. Legacy 'custom' schedules
 *  fall back to 'monthly by date' on open (the user can pick fresh days). */
watch(() => props.open, (o) => {
  if (!o) return;
  err.value = '';
  const sched = followup.scheduleFor(props.websiteId);
  if (!sched) {
    kind.value = 'weekly';
    weekdays.value = new Set(DEFAULT_BLOG_WEEKDAYS);
    monthlyDays.value = new Set();
    return;
  }
  if (sched.kind === 'weekly') {
    kind.value = 'weekly';
    weekdays.value = new Set(sched.weekdays.length > 0 ? sched.weekdays : DEFAULT_BLOG_WEEKDAYS);
    monthlyDays.value = new Set();
  } else {
    // 'monthly' (or legacy 'custom') → land in monthly-by-date mode.
    kind.value = 'monthly';
    weekdays.value = new Set(DEFAULT_BLOG_WEEKDAYS);
    monthlyDays.value = new Set(sched.monthlyDays.length > 0 ? sched.monthlyDays : []);
  }
});

const toggleWeekday = (d: number) => {
  const next = new Set(weekdays.value);
  if (next.has(d)) next.delete(d); else next.add(d);
  weekdays.value = next;
};

const toggleMonthlyDay = (d: number) => {
  const next = new Set(monthlyDays.value);
  if (next.has(d)) next.delete(d); else next.add(d);
  monthlyDays.value = next;
};

const hasShortMonthWarning = computed(() =>
  Array.from(monthlyDays.value).some((d) => d > 28)
);

const canSave = computed(() => {
  if (kind.value === 'weekly')  return weekdays.value.size > 0;
  return monthlyDays.value.size > 0;
});

// ── Preview: next 6 required dates with current form
const previewDates = computed<string[]>(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + 90);
  const results: string[] = [];

  if (kind.value === 'monthly') {
    const days = Array.from(monthlyDays.value).sort((a, b) => a - b);
    if (days.length === 0) return [];
    const cur = new Date(today);
    const monthsSeen = new Set<string>();
    while (cur <= limit && results.length < 6) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}`;
      if (!monthsSeen.has(key)) {
        monthsSeen.add(key);
        const year = cur.getFullYear();
        const month = cur.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        for (const wanted of days) {
          if (results.length >= 6) break;
          const day = Math.min(wanted, lastDay);
          const d = new Date(year, month, day);
          if (d >= today) results.push(isoLocal(d));
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return results;
  }

  // weekly
  const want = weekdays.value;
  const cur = new Date(today);
  while (cur <= limit && results.length < 6) {
    if (want.has(cur.getDay())) results.push(isoLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return results;
});

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatPreview = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const close = () => emit('close');

const save = async () => {
  if (!canSave.value) return;
  saving.value = true;
  err.value = '';
  try {
    const ok = await followup.upsertBlogSchedule({
      websiteId: props.websiteId,
      kind: kind.value,
      weekdays:     kind.value === 'weekly'  ? Array.from(weekdays.value).sort() : undefined,
      monthlyDays:  kind.value === 'monthly' ? Array.from(monthlyDays.value).sort((a, b) => a - b) : undefined,
      // Clear the legacy auto-placement target so it doesn't fight the new monthlyDays.
      monthlyTarget: null,
    });
    if (!ok) {
      err.value = 'Could not save the schedule. Please try again.';
      return;
    }
    emit('saved');
    emit('close');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.bs-body { display: flex; flex-direction: column; gap: 1rem; }

/* Kind tabs */
.bs-kind-tabs {
  display: flex;
  gap: 0.3rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.25rem;
}
.bs-kind {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 9px;
  padding: 0.5rem 0.7rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 140ms, color 140ms;
}
.bs-kind--active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.bs-section { display: flex; flex-direction: column; gap: 0.55rem; }
.bs-section-label {
  margin: 0;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

/* Weekday chips */
.bs-weekday-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.bs-day {
  min-width: 2.7rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.45rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms, border-color 140ms, color 140ms;
}
.bs-day--on {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* Day-of-month grid: 7 columns matches the visual mental model of a
   calendar row, and fits clean on mobile too. */
.bs-day-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}
.bs-mday {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 140ms, border-color 140ms, color 140ms, transform 140ms;
}
.bs-mday:hover:not(.bs-mday--on) {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--primary);
}
.bs-mday--on {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  transform: scale(1.02);
}

/* Preview */
.bs-preview {
  border-top: 1px solid var(--border);
  padding-top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.bs-preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.bs-preview-list li {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
}

.bs-hint { margin: 0; font-size: 0.78rem; color: var(--text-muted); }
.bs-hint--warn { color: #b45309; }
.bs-err {
  margin: 0;
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 600;
}
.bs-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  width: 100%;
}
</style>
