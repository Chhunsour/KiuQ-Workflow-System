<template>
  <div v-if="store.receiptsModalOpen && target" class="modal-overlay" @click.self="close">
    <div class="receipts-modal card p-5 flex flex-col max-h-[90vh]">
      <header class="flex justify-between items-center mb-4 border-b border-border/60 pb-3 flex-shrink-0">
        <div>
          <span class="text-text-muted text-[10px] font-bold uppercase tracking-wider block mb-0.5">Alert Delivery Status</span>
          <h3 class="text-sm font-bold text-text-main uppercase tracking-wider line-clamp-1">{{ target.title }}</h3>
        </div>
        <button class="text-text-muted hover:text-text-main text-lg" @click="close">&times;</button>
      </header>

      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center py-10">
        <span class="text-xs text-text-muted">Loading receipt logs...</span>
      </div>

      <!-- Content -->
      <div v-else class="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
        <!-- Stats Summary -->
        <div class="grid grid-cols-3 gap-3 bg-soft/20 p-3 rounded-xl text-center">
          <div>
            <span class="text-text-muted block text-[10px] uppercase font-semibold">Delivered</span>
            <strong class="text-text-main text-lg">{{ summary.delivered }}</strong>
          </div>
          <div>
            <span class="text-status-approved-fg block text-[10px] uppercase font-semibold">Acknowledged</span>
            <strong class="text-status-approved-fg text-lg">{{ summary.acknowledged }}</strong>
          </div>
          <div>
            <span class="text-status-needs-fix-fg block text-[10px] uppercase font-semibold">Pending</span>
            <strong class="text-status-needs-fix-fg text-lg">{{ summary.pending }}</strong>
          </div>
        </div>

        <!-- Alerts history dropdown/list if multiple alerts were sent -->
        <div v-if="alerts.length > 1" class="text-xs flex items-center gap-2 flex-shrink-0">
          <span class="text-text-muted">Filter by Alert:</span>
          <select v-model="selectedAlertId" class="filter-select text-xs py-1 px-2">
            <option value="all">All Alerts (Aggregated)</option>
            <option v-for="a in alerts" :key="a.id" :value="a.id">
              {{ a.alertType }} - {{ formattedDate(a.publishedAt || a.createdAt) }}
            </option>
          </select>
        </div>

        <!-- Detailed Receipts List -->
        <div class="flex-1 overflow-y-auto border border-border/60 rounded-xl min-h-[150px]">
          <div v-for="r in filteredReceipts" :key="r.id" class="receipt-row flex justify-between items-center p-3 border-b border-border/60 last:border-none">
            <div class="flex items-center gap-2">
              <span class="avatar-sm">
                <img v-if="r.avatarUrl" :src="r.avatarUrl" :alt="r.fullName" />
                <span v-else>{{ initials(r.fullName) }}</span>
              </span>
              <div>
                <strong class="text-xs block text-text-main">{{ r.fullName }}</strong>
                <span class="text-[10px]" :class="r.status === 'acknowledged' ? 'text-status-approved-fg' : 'text-text-muted'">
                  {{ r.status === 'acknowledged' ? 'Acknowledged' : 'Pending' }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Timestamp or Repush button -->
              <span v-if="r.status === 'acknowledged'" class="text-[10px] text-text-muted">
                {{ formattedDate(r.acknowledgedAt) }}
              </span>
              <div v-else class="flex items-center gap-2">
                <span v-if="r.escalationLevel > 0" class="badge badge--critical text-[8px] px-1 py-0.5">
                  Escalated L{{ r.escalationLevel }}
                </span>
                <button
                  class="btn-repush"
                  :disabled="repushing === r.alertId"
                  @click="repushAlert(r.alertId, r.userId)"
                >
                  {{ repushing === r.alertId ? 'Nudging...' : 'Repush' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="filteredReceipts.length === 0" class="text-center text-text-muted text-xs py-10">
            No alerts have been sent for this task yet.
          </div>
        </div>

        <!-- Repush All button at the bottom -->
        <div v-if="summary.pending > 0" class="flex justify-end border-t border-border/60 pt-3 flex-shrink-0">
          <button
            class="btn-primary px-4 text-xs h-9"
            type="button"
            :disabled="repushingAll"
            @click="repushAllPending"
          >
            {{ repushingAll ? 'Repushing All...' : 'Repush All Pending' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTaskAlertsStore, type TaskAlert } from '@/stores/taskAlerts';
import { supabase } from '@/lib/supabase';

const store = useTaskAlertsStore();

const target = computed(() => store.receiptsTarget);
const loading = ref(false);
const alerts = ref<TaskAlert[]>([]);
const receipts = ref<any[]>([]);
const selectedAlertId = ref<string>('all');

const repushing = ref<string | null>(null);
const repushingAll = ref(false);

const close = () => {
  store.receiptsModalOpen = false;
};

// Reload data when target updates
watch(target, async (val) => {
  if (val) {
    await loadReceipts();
  }
});

const loadReceipts = async () => {
  if (!target.value) return;
  loading.value = true;
  selectedAlertId.value = 'all';
  try {
    // 1. Fetch published alerts linked to this card
    const { data: alertsData } = await supabase
      .from('task_alerts')
      .select('*')
      .eq('related_type', target.value.type)
      .eq('related_id', target.value.id)
      .eq('status', 'published')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    alerts.value = (alertsData || []).map((r: any) => ({
      id: r.id,
      alertId: r.alert_id,
      alertType: r.alert_type,
      title: r.title,
      message: r.message,
      priority: r.priority,
      relatedType: r.related_type,
      relatedId: r.related_id,
      createdBy: r.created_by,
      createdAt: r.created_at,
      publishedAt: r.published_at,
      status: r.status,
      isArchived: r.is_archived
    }));

    if (alerts.value.length === 0) {
      receipts.value = [];
      loading.value = false;
      return;
    }

    const alertIds = alerts.value.map(a => a.id);

    // 2. Fetch receipts with profile info
    const { data: receiptsData } = await supabase
      .from('task_alert_receipts')
      .select('*, profiles(full_name, avatar_url)')
      .in('alert_id', alertIds);

    receipts.value = (receiptsData || []).map((r: any) => ({
      id: r.id,
      alertId: r.alert_id,
      userId: r.user_id,
      seenAt: r.seen_at,
      acknowledgedAt: r.acknowledged_at,
      status: r.status,
      escalationLevel: r.escalation_level,
      lastPushedAt: r.last_pushed_at,
      fullName: r.profiles?.full_name || 'Team member',
      avatarUrl: r.profiles?.avatar_url || null
    }));
  } catch (err) {
    console.error('[receiptsModal] loadReceipts failed:', err);
  } finally {
    loading.value = false;
  }
};

const summary = computed(() => {
  const list = filteredReceipts.value;
  const delivered = list.length;
  const acknowledged = list.filter(r => r.status === 'acknowledged').length;
  const pending = delivered - acknowledged;
  return { delivered, acknowledged, pending };
});

const filteredReceipts = computed(() => {
  if (selectedAlertId.value === 'all') {
    // Unique by user, keeping the latest status
    const map = new Map<string, any>();
    receipts.value.forEach(r => {
      const prev = map.get(r.userId);
      if (!prev || new Date(r.lastPushedAt) > new Date(prev.lastPushedAt)) {
        map.set(r.userId, r);
      }
    });
    return Array.from(map.values());
  }
  return receipts.value.filter(r => r.alertId === selectedAlertId.value);
});

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formattedDate = (dStr?: string | null) => {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const repushAlert = async (alertId: string, userId: string) => {
  repushing.value = alertId;
  try {
    await store.repushAlert(alertId, [userId]);
    await loadReceipts();
  } finally {
    repushing.value = null;
  }
};

const repushAllPending = async () => {
  if (alerts.value.length === 0) return;
  repushingAll.value = true;
  try {
    for (const alert of alerts.value) {
      await store.repushAlert(alert.id);
    }
    await loadReceipts();
  } finally {
    repushingAll.value = false;
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

.receipts-modal {
  width: 100%;
  max-width: 500px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  border-radius: 20px;
}

.avatar-sm {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
  overflow: hidden;
  border: 1px solid var(--border);
}
.avatar-sm img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-repush {
  font-family: 'Outfit', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  border: 1px solid var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-repush:hover {
  background: var(--primary);
  color: white;
}

.badge--critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.filter-select {
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-main);
  border-radius: 8px;
}
</style>
