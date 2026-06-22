<template>
  <div v-if="store.sendAlertModalOpen && target" class="modal-overlay" @click.self="close">
    <div class="quick-alert-modal card p-5">
      <header class="flex justify-between items-center mb-4 border-b border-border/60 pb-3">
        <h3 class="text-sm font-bold text-text-main uppercase tracking-wider">{{ $t('Send Alert From Card') }}</h3>
        <button class="text-text-muted hover:text-text-main text-lg" @click="close">{{ $t('&times;') }}</button>
      </header>

      <div class="flex flex-col gap-4">
        <!-- Prefilled details -->
        <div class="grid grid-cols-2 gap-3 bg-soft/30 p-3 rounded-xl text-xs">
          <div>
            <span class="text-text-muted block font-semibold uppercase tracking-wider text-[10px] mb-0.5">{{ $t('Task Title') }}</span>
            <strong class="text-text-main line-clamp-1">{{ target.title }}</strong>
          </div>
          <div>
            <span class="text-text-muted block font-semibold uppercase tracking-wider text-[10px] mb-0.5">{{ $t('Recipient (Assignee)') }}</span>
            <strong class="text-text-main line-clamp-1" v-if="assigneeName">{{ assigneeName }}</strong>
            <span class="text-status-needs-fix-fg font-semibold" v-else>{{ $t('Unassigned (Cannot Alert)') }}</span>
          </div>
          <div>
            <span class="text-text-muted block font-semibold uppercase tracking-wider text-[10px] mb-0.5">{{ $t('Priority') }}</span>
            <span class="badge" :class="`badge--${alertPriority.toLowerCase()}`">{{ alertPriority }}</span>
          </div>
          <div>
            <span class="text-text-muted block font-semibold uppercase tracking-wider text-[10px] mb-0.5">{{ $t('Alert Type') }}</span>
            <strong class="text-text-main">{{ alertType }}</strong>
          </div>
        </div>

        <!-- Message/Reminder Input -->
        <div class="form-group">
          <label class="label mb-1 font-semibold text-xs text-text-muted">{{ $t('CUSTOM REMINDER MESSAGE (OPTIONAL)') }}</label>
          <textarea
            v-model="form.message"
            class="input min-h-[80px] text-sm"
            :placeholder="$t('e.g. Please review and complete this task before the end of the day.')"
          />
        </div>

        <!-- Require Got It checkbox -->
        <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-main select-none">
          <input type="checkbox" v-model="form.requireAck" class="checkbox-input" />
          <span>{{ $t('Require "Got It" acknowledgement') }}</span>
        </label>

        <div v-if="errorMsg" class="text-status-needs-fix-fg text-xs font-semibold">
          {{ errorMsg }}
        </div>

        <!-- Action buttons -->
        <div class="flex justify-end gap-3 border-t border-border/60 pt-4 mt-1">
          <button class="btn-secondary px-4 text-xs h-9" type="button" @click="close">{{ $t('Cancel') }}</button>
          <button
            class="btn-primary px-5 text-xs h-9"
            type="button"
            :disabled="sending || !target.assigneeId"
            @click="sendAlert"
          >
            {{ sending ? 'Sending...' : 'Send Alert' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useTaskAlertsStore } from '@/stores/taskAlerts';
import { useDataStore } from '@/stores/data';
import { useQualityCheckStore } from '@/stores/qualityCheck';

const store = useTaskAlertsStore();
const dataStore = useDataStore();
const qcStore = useQualityCheckStore();

const target = computed(() => store.sendAlertTarget);
const sending = ref(false);
const errorMsg = ref('');

const form = reactive({
  message: '',
  requireAck: true
});

// Reset form when modal opens
watch(target, (val) => {
  if (val) {
    form.message = '';
    form.requireAck = true;
    errorMsg.value = '';
  }
});

const assigneeName = computed(() => {
  if (!target.value?.assigneeId) return '';
  const member = dataStore.memberById(target.value.assigneeId);
  return member ? member.fullName || member.email : '';
});

// Map task priority (low, normal, high, urgent) to Alert priority (Low, Medium, High, Critical)
const alertPriority = computed(() => {
  if (!target.value) return 'Medium';
  let taskPriority = 'normal';
  
  if (target.value.type === 'workboard_task') {
    const card = dataStore.assignments.find(a => a.id === target.value!.id);
    taskPriority = card?.priority || 'normal';
  } else if (target.value.type === 'quality_check_item') {
    const issue = qcStore.issues.find(i => i.id === target.value!.id);
    taskPriority = issue?.priority || 'normal';
  }
  
  const map: Record<string, 'Low' | 'Medium' | 'High' | 'Critical'> = {
    low: 'Low',
    normal: 'Medium',
    high: 'High',
    urgent: 'Critical'
  };
  return map[taskPriority] || 'Medium';
});

const alertType = computed<'Quality Check' | 'New Task'>(() => {
  if (!target.value) return 'New Task';
  return target.value.type === 'quality_check_item' ? 'Quality Check' : 'New Task';
});

const close = () => {
  store.sendAlertModalOpen = false;
};

const sendAlert = async () => {
  if (!target.value || !target.value.assigneeId) return;
  
  sending.value = true;
  errorMsg.value = '';
  try {
    const payload = {
      alertId: `quick-alert-${target.value.type}-${target.value.id}-${Date.now()}`,
      alertType: alertType.value,
      title: target.value.title.toUpperCase(),
      message: form.message.trim() || 'Please review and progress this task.',
      priority: alertPriority.value,
      relatedType: target.value.type,
      relatedId: target.value.id,
      status: 'published' as const,
      requireAck: form.requireAck
    };
    
    const res = await store.createOrUpdateAlert(payload, [target.value.assigneeId]);
    if (res) {
      close();
    } else {
      errorMsg.value = store.error || 'Could not send task alert.';
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to send alert.';
  } finally {
    sending.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.quick-alert-modal {
  width: 100%;
  max-width: 440px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  border-radius: 20px;
}

.badge {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  line-height: 1;
  display: inline-block;
}
.badge--critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge--high { background: rgba(249, 115, 22, 0.15); color: #f97316; }
.badge--medium { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.badge--low { background: rgba(16, 185, 129, 0.15); color: #10b981; }

.checkbox-input {
  width: 14px;
  height: 14px;
  accent-color: var(--primary);
}
</style>
