<template>
  <div 
    class="deadline-badge-wrapper" 
    :class="[deadlineInfo.className, { 'is-compact': compact }]"
    :title="deadlineInfo.helperText"
  >
    <div class="deadline-main">
      <span class="deadline-icon">{{ deadlineInfo.icon }}</span>
      <div class="deadline-content">
        <div class="deadline-primary">
          <span class="deadline-status-label">{{ deadlineInfo.label }}</span>
          <span v-if="deadlineInfo.dateStr" class="deadline-separator">·</span>
          <span v-if="deadlineInfo.dateStr" class="deadline-date">{{ deadlineInfo.dateStr }}</span>
          <span v-if="deadlineInfo.timeStr" class="deadline-time">{{ deadlineInfo.timeStr }}</span>
        </div>
        <div v-if="!compact && deadlineInfo.helperText" class="deadline-helper">
          {{ deadlineInfo.helperText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  dueDate: string;
  dueTime?: string;
  status: string;
  columnKey?: string;
  compact?: boolean;
}

const props = defineProps<Props>();

const todayStr = computed(() => new Date().toISOString().slice(0, 10));

const formatTime = (time24: string) => {
  if (!time24) return '';
  const parts = time24.split(':');
  let hours = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${m} ${ampm}`;
};

const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (isNaN(d.getTime())) return dateStr;
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
};

const getDaysDiff = (dateStr: string) => {
  if (!dateStr) return 0;
  const target = new Date(dateStr + 'T00:00:00').getTime();
  const today = new Date(todayStr.value + 'T00:00:00').getTime();
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
};

const deadlineInfo = computed(() => {
  const isCompleted = props.columnKey === 'completed' || ['approved', 'completed'].includes(props.status);
  const daysDiff = getDaysDiff(props.dueDate);
  const timeStr = props.dueTime ? formatTime(props.dueTime) : '';
  const dateStr = props.dueDate ? formatDateDisplay(props.dueDate) : '';
  
  if (isCompleted) {
    return {
      statusKey: 'completed',
      label: 'Completed',
      icon: '✅',
      dateStr: dateStr,
      timeStr: '',
      helperText: 'Task finished',
      className: 'deadline-completed'
    };
  }

  if (!props.dueDate) {
    return {
      statusKey: 'none',
      label: 'No Deadline',
      icon: '📅',
      dateStr: '',
      timeStr: '',
      helperText: '',
      className: 'deadline-future'
    };
  }

  // Overdue logic
  const now = new Date();
  const targetDate = new Date(props.dueDate + 'T' + (props.dueTime || '23:59') + ':00');
  const isOverdue = now > targetDate;

  if (isOverdue) {
    const daysLate = Math.abs(daysDiff);
    return {
      statusKey: 'overdue',
      label: 'Overdue',
      icon: '⚠️',
      dateStr: dateStr,
      timeStr: timeStr,
      helperText: daysLate === 0 ? 'Due earlier today' : `${daysLate} day${daysLate > 1 ? 's' : ''} late`,
      className: 'deadline-overdue pulse-soft'
    };
  }

  if (daysDiff === 0) {
    return {
      statusKey: 'today',
      label: 'Due Today',
      icon: '🔥',
      dateStr: '',
      timeStr: timeStr,
      helperText: 'Finish before end of day',
      className: 'deadline-today pulse-soft'
    };
  }

  if (daysDiff === 1) {
    return {
      statusKey: 'tomorrow',
      label: 'Due Tomorrow',
      icon: '⏰',
      dateStr: '',
      timeStr: timeStr,
      helperText: 'Due in 1 day',
      className: 'deadline-tomorrow'
    };
  }

  if (daysDiff > 1 && daysDiff <= 7) {
    return {
      statusKey: 'this_week',
      label: 'Due This Week',
      icon: '📅',
      dateStr: dateStr,
      timeStr: timeStr,
      helperText: `${daysDiff} days left`,
      className: 'deadline-this-week'
    };
  }

  return {
    statusKey: 'future',
    label: 'Due Date',
    icon: '📅',
    dateStr: dateStr,
    timeStr: timeStr,
    helperText: `${daysDiff} days left`,
    className: 'deadline-future'
  };
});
</script>

<style scoped>
/* ── Base pill ─────────────────────────────────────────── */
.deadline-badge-wrapper {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  border: 1.5px solid transparent;
  min-width: fit-content;
  max-width: 100%;
}

.deadline-main {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  width: 100%;
}

.deadline-icon {
  font-size: 0.9rem;
  line-height: 1;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.deadline-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.deadline-primary {
  display: flex;
  align-items: center;
  gap: 0.22rem;
  white-space: nowrap;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1;
}

.deadline-separator { opacity: 0.55; }

.deadline-helper {
  font-size: 0.67rem;
  font-weight: 600;
  opacity: 0.75;
  margin-top: 1px;
}

/* ── Compact (used on cards) ───────────────────────────── */
.is-compact {
  padding: 0.26rem 0.62rem;
}
.is-compact .deadline-icon { font-size: 0.82rem; }
.is-compact .deadline-primary { font-size: 0.72rem; }

/* ── Light mode colors ─────────────────────────────────── */
.deadline-overdue {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
.deadline-today {
  background: #ffedd5;
  border-color: #fdba74;
  color: #c2410c;
}
.deadline-tomorrow {
  background: #fef3c7;
  border-color: #fde68a;
  color: #92400e;
}
.deadline-this-week {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.deadline-future {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}
.deadline-completed {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

/* ── Dark mode ─────────────────────────────────────────── */
:root[data-theme='dark-gray'] .deadline-overdue {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.38);
  color: #fca5a5;
}
:root[data-theme='dark-gray'] .deadline-today {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.38);
  color: #fdba74;
}
:root[data-theme='dark-gray'] .deadline-tomorrow {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.36);
  color: #fcd34d;
}
:root[data-theme='dark-gray'] .deadline-this-week {
  background: rgba(59, 130, 246, 0.14);
  border-color: rgba(59, 130, 246, 0.38);
  color: #93c5fd;
}
:root[data-theme='dark-gray'] .deadline-future {
  background: rgba(148, 163, 184, 0.10);
  border-color: rgba(148, 163, 184, 0.26);
  color: #cbd5e1;
}
:root[data-theme='dark-gray'] .deadline-completed {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.32);
  color: #86efac;
}

/* ── Pulse animations ──────────────────────────────────── */
@keyframes pulse-red {
  0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
  70%  { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
@keyframes pulse-orange {
  0%   { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.35); }
  70%  { box-shadow: 0 0 0 5px rgba(249, 115, 22, 0); }
  100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
}

.deadline-overdue.pulse-soft { animation: pulse-red 2s infinite; }
.deadline-today.pulse-soft   { animation: pulse-orange 2s infinite; }

@media (prefers-reduced-motion: reduce) {
  .deadline-overdue.pulse-soft,
  .deadline-today.pulse-soft { animation: none; }
}
</style>
