<template>
  <div class="ms-bar">
    <button class="ms-nav-btn" type="button" title="Previous month" @click="prev">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>

    <div class="ms-center">
      <button class="ms-label" type="button" @click="pickerOpen = !pickerOpen">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        <span class="ms-month-label">{{ displayLabel }}</span>
        <span v-if="isCurrentMonth" class="ms-now-chip">Now</span>
      </button>

      <!-- Month picker dropdown -->
      <div v-if="pickerOpen" class="ms-picker" @click.stop>
        <div class="ms-picker-year">
          <button class="ms-nav-btn ms-nav-btn--sm" type="button" @click="pickerYear--">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span class="ms-picker-year-label">{{ pickerYear }}</span>
          <button class="ms-nav-btn ms-nav-btn--sm" type="button" @click="pickerYear++">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div class="ms-picker-grid">
          <button
            v-for="(name, idx) in MONTH_NAMES"
            :key="idx"
            type="button"
            class="ms-picker-month"
            :class="{
              'ms-picker-month--active': pickerYear === selectedYear && (idx + 1) === selectedMonthNum,
              'ms-picker-month--now': pickerYear === todayYear && (idx + 1) === todayMonthNum
            }"
            @click="selectPickerMonth(idx + 1)"
          >
            {{ name.slice(0, 3) }}
          </button>
        </div>
      </div>
    </div>

    <button class="ms-nav-btn" type="button" title="Next month" @click="next">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>

    <button
      v-if="!isCurrentMonth"
      class="ms-today-btn"
      type="button"
      @click="goToCurrentMonth"
    >
      Current month
    </button>
  </div>

  <!-- Click-outside close -->
  <teleport to="body">
    <div v-if="pickerOpen" class="ms-backdrop" @click="pickerOpen = false" />
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const props = defineProps<{
  modelValue: string; // 'YYYY-MM'
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const pickerOpen = ref(false);
const today = new Date();
const todayYear = today.getFullYear();
const todayMonthNum = today.getMonth() + 1;

const selectedYear = computed(() => parseInt(props.modelValue.slice(0, 4), 10));
const selectedMonthNum = computed(() => parseInt(props.modelValue.slice(5, 7), 10));

const pickerYear = ref(selectedYear.value);
watch(() => props.modelValue, () => { pickerYear.value = selectedYear.value; });

const isCurrentMonth = computed(() =>
  selectedYear.value === todayYear && selectedMonthNum.value === todayMonthNum
);

const displayLabel = computed(() =>
  `${MONTH_NAMES[selectedMonthNum.value - 1]} ${selectedYear.value}`
);

const toMonthStr = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`;

const prev = () => {
  let m = selectedMonthNum.value - 1;
  let y = selectedYear.value;
  if (m < 1) { m = 12; y--; }
  emit('update:modelValue', toMonthStr(y, m));
};

const next = () => {
  let m = selectedMonthNum.value + 1;
  let y = selectedYear.value;
  if (m > 12) { m = 1; y++; }
  emit('update:modelValue', toMonthStr(y, m));
};

const goToCurrentMonth = () => {
  emit('update:modelValue', toMonthStr(todayYear, todayMonthNum));
};

const selectPickerMonth = (month: number) => {
  emit('update:modelValue', toMonthStr(pickerYear.value, month));
  pickerOpen.value = false;
};
</script>

<style scoped>
.ms-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.3rem 0.4rem;
  position: relative;
}

.ms-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 120ms;
  flex-shrink: 0;
}
.ms-nav-btn:hover { background: var(--border); color: var(--text-main); }
.ms-nav-btn--sm { width: 1.6rem; height: 1.6rem; }

.ms-center { position: relative; }

.ms-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-main);
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  transition: background 120ms;
  white-space: nowrap;
}
.ms-label:hover { background: var(--border); }

.ms-month-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-main);
}

.ms-now-chip {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  background: var(--primary);
  color: #fff;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}

.ms-today-btn {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  background: transparent;
  border: 1px solid rgba(63,141,254,0.3);
  border-radius: 8px;
  padding: 0.25rem 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms;
  margin-left: 0.25rem;
}
.ms-today-btn:hover { background: rgba(63,141,254,0.08); }

/* Picker dropdown */
.ms-picker {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.75rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.13);
  width: 220px;
}

.ms-picker-year {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.ms-picker-year-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
}

.ms-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
}

.ms-picker-month {
  padding: 0.4rem 0.2rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  text-align: center;
  transition: background 120ms;
}
.ms-picker-month:hover { background: var(--soft-bg); }
.ms-picker-month--now {
  border-color: var(--border);
  color: var(--primary);
}
.ms-picker-month--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* Backdrop to close picker */
.ms-backdrop {
  position: fixed;
  inset: 0;
  z-index: 199;
}
</style>
