<template>
  <div class="alert-container">
    <TransitionGroup name="alert-slide" tag="div" class="alert-list-wrapper">
      <div
        v-for="alert in pendingAlerts.slice(0, 3)"
        :key="alert.receiptId"
        class="alert-card card"
        :class="`alert-card--priority-${alert.priority.toLowerCase()}`"
      >
        <!-- Decorative indicator strip on the left -->
        <div class="alert-strip" />

        <!-- Optional close button if requireAck is false -->
        <button
          v-if="!alert.requireAck"
          class="alert-close-btn"
          type="button"
          aria-label="Dismiss alert"
          @click="handleDismiss(alert)"
        >
          &times;
        </button>

        <div class="alert-header">
          <span class="alert-badge" :class="`alert-badge--${alert.priority.toLowerCase()}`">
            {{ alert.priority }} Priority
          </span>
          <span class="alert-type">{{ alert.alertType }}</span>
        </div>

        <div class="alert-content">
          <h4 class="alert-title">{{ alert.title }}</h4>
          <p class="alert-message">{{ alert.message }}</p>
        </div>

        <div class="alert-footer-info">
          <span class="alert-author">
            Assigned by <strong>{{ authorName(alert.createdBy) }}</strong>
          </span>
          <span class="alert-time">{{ timeAgo(alert.createdAt) }}</span>
        </div>

        <div class="alert-actions">
          <button
            v-if="alert.relatedId"
            class="btn-open-task"
            :class="`btn-open-task--${alert.priority.toLowerCase()}`"
            type="button"
            @click="handleOpenTask(alert)"
          >
            Open Task
          </button>
          <button class="btn-got-it" type="button" @click="handleGotIt(alert)">
            Got It
          </button>
          <button
            v-if="!alert.requireAck"
            class="btn-dismiss"
            type="button"
            @click="handleDismiss(alert)"
          >
            Dismiss
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskAlertsStore, type TaskAlertWithReceipt } from '@/stores/taskAlerts';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';

const store = useTaskAlertsStore();
const auth = useAuthStore();
const data = useDataStore();
const router = useRouter();

const pendingAlerts = ref<TaskAlertWithReceipt[]>([]);

const authorName = (createdBy: string | null) => {
  if (!createdBy) return 'Admin';
  const member = data.memberById(createdBy);
  return member ? member.fullName || member.email : 'Admin';
};

const timeAgo = (dateStr: string) => {
  if (!dateStr) return 'Just now';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const loadPendingAlerts = async () => {
  if (!auth.user?.id) return;
  const list = await store.fetchPendingAlertsForMe();
  pendingAlerts.value = list;

  // Mark all currently visible ones as seen
  const visible = list.slice(0, 3);
  for (const alert of visible) {
    if (!alert.seenAt) {
      void store.markReceiptSeen(alert.receiptId);
    }
  }
};

// Re-check seen status when list updates
watch(
  () => pendingAlerts.value,
  (newList) => {
    const visible = newList.slice(0, 3);
    for (const alert of visible) {
      if (!alert.seenAt) {
        void store.markReceiptSeen(alert.receiptId);
      }
    }
  },
  { deep: true }
);

const handleGotIt = async (alert: TaskAlertWithReceipt) => {
  const receiptId = alert.receiptId;
  const success = await store.acknowledgeReceipt(receiptId);
  if (success) {
    pendingAlerts.value = pendingAlerts.value.filter((a) => a.receiptId !== receiptId);
  }
};

const handleDismiss = async (alert: TaskAlertWithReceipt) => {
  // Acknowledge receipt to clear it from list permanently without forcing "Got It" click
  const receiptId = alert.receiptId;
  const success = await store.acknowledgeReceipt(receiptId);
  if (success) {
    pendingAlerts.value = pendingAlerts.value.filter((a) => a.receiptId !== receiptId);
  }
};

const handleOpenTask = async (alert: TaskAlertWithReceipt) => {
  const receiptId = alert.receiptId;
  
  // 1. Acknowledge the receipt first
  await store.acknowledgeReceipt(receiptId);

  // 2. Remove it from stack
  pendingAlerts.value = pendingAlerts.value.filter((a) => a.receiptId !== receiptId);

  // 3. Resolve destination route
  let targetRoute = '/dashboard';
  if (alert.relatedType === 'workboard_task') {
    targetRoute = `/work-board/my?task=${alert.relatedId}`;
  } else if (alert.relatedType === 'quality_check_item') {
    targetRoute = `/work-board/quality-check?issue=${alert.relatedId}`;
  } else if (alert.relatedType === 'followup_item') {
    targetRoute = '/followup';
  }

  // 4. Navigate
  router.push(targetRoute);
};

onMounted(() => {
  if (data.members.length === 0) {
    void data.fetchMembers();
  }
  // Load initially
  void loadPendingAlerts();

  // Poll for new banners every 30 seconds for faster updates
  const interval = setInterval(() => {
    if (auth.user?.id) {
      void loadPendingAlerts();
    }
  }, 30 * 1000);
});
</script>

<style scoped>
.alert-container {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  width: 340px;
  max-width: calc(100vw - 2.5rem);
  z-index: 9999;
  pointer-events: none; /* Let clicks pass through empty spaces */
}

.alert-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-card {
  position: relative;
  pointer-events: auto; /* Re-enable pointer events for individual alert cards */
  width: 100%;
  background: rgba(30, 41, 59, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 
    0 10px 25px -5px rgba(0, 0, 0, 0.3),
    0 8px 10px -6px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-strip {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}
.alert-card--priority-critical .alert-strip { background: #ef4444; }
.alert-card--priority-high .alert-strip { background: #f97316; }
.alert-card--priority-medium .alert-strip { background: #3b82f6; }
.alert-card--priority-low .alert-strip { background: #10b981; }

.alert-close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  line-height: 1;
}
.alert-close-btn:hover {
  color: #ffffff;
}

.alert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-right: 1.25rem; /* Ensure close button spacing */
}

.alert-badge {
  font-family: 'Outfit', sans-serif;
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  line-height: 1;
}
.alert-badge--critical { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
.alert-badge--high { background: rgba(249, 115, 22, 0.15); color: #fdba74; }
.alert-badge--medium { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
.alert-badge--low { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }

.alert-type {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.45);
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alert-title {
  font-family: 'Raleway', sans-serif;
  font-size: 0.88rem;
  font-weight: 850;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;
}

.alert-message {
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.alert-footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.45rem;
}

.alert-author strong {
  color: rgba(255, 255, 255, 0.85);
}

.alert-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.15rem;
}

.btn-got-it,
.btn-open-task,
.btn-dismiss {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-got-it,
.btn-dismiss {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
}
.btn-got-it:hover,
.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-open-task {
  border: none;
  color: #ffffff;
}
.btn-open-task--critical { background: #ef4444; }
.btn-open-task--high { background: #f97316; }
.btn-open-task--medium { background: #3b82f6; }
.btn-open-task--low { background: #10b981; }

.btn-open-task:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* Animations using TransitionGroup alert-slide */
.alert-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.alert-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.82, 0.085, 0.395, 0.895);
  position: absolute; /* Needed for move transition during slide out */
}
.alert-slide-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}
.alert-slide-leave-to {
  opacity: 0;
  transform: translateX(80px) scale(0.9);
}
.alert-slide-move {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
