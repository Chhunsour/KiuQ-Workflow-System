import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export interface TaskAlert {
  id: string;
  alertId: string;
  alertType: 'Quality Check' | 'New Task' | 'Follow Up' | 'Urgent Fix' | 'Reminder' | 'Website Review' | 'Deadline Alert';
  title: string;
  message: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  relatedType: 'workboard_task' | 'followup_item' | 'quality_check_item' | null;
  relatedId: string | null;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
  status: 'draft' | 'published';
  isArchived?: boolean;
  requireAck?: boolean;
}

export interface TaskAlertReceipt {
  id: string;
  alertId: string;
  userId: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
  status: 'pending' | 'acknowledged';
  escalationLevel: number;
  lastPushedAt: string;
  isArchived?: boolean;
}

export interface TaskAlertWithReceipt extends TaskAlert {
  receiptId: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
  receiptStatus: 'pending' | 'acknowledged';
  escalationLevel: number;
  lastPushedAt: string;
}

export interface TaskAlertMetrics {
  activeAlerts: number;
  pendingAcknowledgements: number;
  overdueAcknowledgements: number;
  qualityCheckAlerts: number;
  followUpAlerts: number;
}

export const useTaskAlertsStore = defineStore('taskAlerts', () => {
  const alerts = ref<TaskAlert[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const rowToAlert = (r: any): TaskAlert => ({
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
    isArchived: r.is_archived || false,
    requireAck: r.require_ack !== false,
  });

  const rowToReceipt = (r: any): TaskAlertReceipt => ({
    id: r.id,
    alertId: r.alert_id,
    userId: r.user_id,
    seenAt: r.seen_at,
    acknowledgedAt: r.acknowledged_at,
    status: r.status,
    escalationLevel: r.escalation_level,
    lastPushedAt: r.last_pushed_at,
    isArchived: r.is_archived || false,
  });

  // Fetch all alerts (managers see all, employees see targeted)
  const fetchAlerts = async () => {
    if (!supabaseConfigured) return [];
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('task_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      alerts.value = (data || []).map(rowToAlert);
      return alerts.value;
    } catch (err: any) {
      console.error('[taskAlerts] fetchAlerts failed:', err.message);
      error.value = err.message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Fetch receipts for a specific alert
  const fetchReceipts = async (alertId: string): Promise<TaskAlertReceipt[]> => {
    if (!supabaseConfigured) return [];
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('task_alert_receipts')
        .select('*')
        .eq('alert_id', alertId);

      if (err) throw err;
      return (data || []).map(rowToReceipt);
    } catch (err: any) {
      console.error('[taskAlerts] fetchReceipts failed:', err.message);
      error.value = err.message;
      return [];
    }
  };

  // Create or update task alert and target receipts
  const createOrUpdateAlert = async (
    alertPayload: Omit<TaskAlert, 'id' | 'createdAt' | 'createdBy' | 'publishedAt'> & { id?: string },
    recipientUserIds: string[]
  ): Promise<TaskAlert | null> => {
    if (!supabaseConfigured) return null;
    loading.value = true;
    error.value = null;
    try {
      const auth = useAuthStore();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Not authenticated.');

      const isPublishing = alertPayload.status === 'published';
      const now = new Date().toISOString();

      const dbRow: any = {
        alert_id: alertPayload.alertId.trim(),
        alert_type: alertPayload.alertType,
        title: alertPayload.title.trim(),
        message: alertPayload.message.trim(),
        priority: alertPayload.priority,
        related_type: alertPayload.relatedType || null,
        related_id: alertPayload.relatedId || null,
        status: alertPayload.status,
        is_archived: alertPayload.isArchived || false,
        require_ack: alertPayload.requireAck !== false,
      };

      if (isPublishing) {
        dbRow.published_at = now;
      }

      let alertData: any;
      if (alertPayload.id) {
        // Update existing alert
        const { data, error: err } = await supabase
          .from('task_alerts')
          .update(dbRow)
          .eq('id', alertPayload.id)
          .select()
          .single();

        if (err) throw err;
        alertData = data;
      } else {
        // Insert new alert
        dbRow.created_by = uid;
        const { data, error: err } = await supabase
          .from('task_alerts')
          .insert(dbRow)
          .select()
          .single();

        if (err) throw err;
        alertData = data;
      }

      const createdAlert = rowToAlert(alertData);

      // Handle Receipts Sync
      // 1. Delete old receipts if updating
      if (alertPayload.id) {
        const { error: delErr } = await supabase
          .from('task_alert_receipts')
          .delete()
          .eq('alert_id', createdAlert.id);
        if (delErr) throw delErr;
      }

      // 2. Insert new receipts
      if (recipientUserIds.length > 0) {
        const receiptRows = recipientUserIds.map((userId) => ({
          alert_id: createdAlert.id,
          user_id: userId,
          status: 'pending',
          escalation_level: 0,
          last_pushed_at: isPublishing ? now : now,
        }));

        const { error: insErr } = await supabase
          .from('task_alert_receipts')
          .insert(receiptRows);

        if (insErr) throw insErr;
      }

      // Refresh list
      await fetchAlerts();
      return createdAlert;
    } catch (err: any) {
      console.error('[taskAlerts] createOrUpdateAlert failed:', err.message);
      error.value = err.message;
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Publish a draft alert
  const publishAlert = async (alertId: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    loading.value = true;
    error.value = null;
    try {
      const now = new Date().toISOString();
      const { error: err } = await supabase
        .from('task_alerts')
        .update({
          status: 'published',
          published_at: now,
        })
        .eq('id', alertId);

      if (err) throw err;

      // Update receipts' last_pushed_at to now
      const { error: recErr } = await supabase
        .from('task_alert_receipts')
        .update({
          last_pushed_at: now,
          seen_at: null,
          acknowledged_at: null,
          status: 'pending',
          escalation_level: 0,
        })
        .eq('alert_id', alertId);

      if (recErr) throw recErr;

      await fetchAlerts();
      return true;
    } catch (err: any) {
      console.error('[taskAlerts] publishAlert failed:', err.message);
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Repush a published alert
  const repushAlert = async (alertId: string, selectedUserIds?: string[]): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    loading.value = true;
    error.value = null;
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('task_alert_receipts')
        .update({
          seen_at: null,
          escalation_level: 0,
          last_pushed_at: now,
          status: 'pending',
        })
        .eq('alert_id', alertId)
        .eq('status', 'pending'); // DO NOT resend to users who already clicked "Got It"

      if (selectedUserIds && selectedUserIds.length > 0) {
        query = query.in('user_id', selectedUserIds);
      }

      const { error: err } = await query;
      if (err) throw err;

      return true;
    } catch (err: any) {
      console.error('[taskAlerts] repushAlert failed:', err.message);
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Mark a receipt as seen
  const markReceiptSeen = async (receiptId: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { error: err } = await supabase
        .from('task_alert_receipts')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', receiptId)
        .is('seen_at', null);

      if (err) throw err;
      return true;
    } catch (err: any) {
      console.error('[taskAlerts] markReceiptSeen failed:', err.message);
      return false;
    }
  };

  // Acknowledge a receipt (Got It or Open Task)
  const acknowledgeReceipt = async (receiptId: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    error.value = null;
    try {
      const now = new Date().toISOString();
      const { error: err } = await supabase
        .from('task_alert_receipts')
        .update({
          acknowledged_at: now,
          status: 'acknowledged',
          seen_at: now, // Ensure it's marked seen too
        })
        .eq('id', receiptId);

      if (err) throw err;
      return true;
    } catch (err: any) {
      console.error('[taskAlerts] acknowledgeReceipt failed:', err.message);
      error.value = err.message;
      return false;
    }
  };

  // Fetch pending alerts for the current user
  const fetchPendingAlertsForMe = async (): Promise<TaskAlertWithReceipt[]> => {
    if (!supabaseConfigured) return [];
    const auth = useAuthStore();
    const uid = auth.user?.id;
    if (!uid) return [];

    try {
      const { data, error: err } = await supabase
        .from('task_alert_receipts')
        .select('*, task_alerts!inner(*)')
        .eq('user_id', uid)
        .eq('status', 'pending')
        .eq('task_alerts.status', 'published');

      if (err) throw err;

      return (data || []).map((row: any) => {
        const alertObj = rowToAlert(row.task_alerts);
        return {
          ...alertObj,
          receiptId: row.id,
          seenAt: row.seen_at,
          acknowledgedAt: row.acknowledged_at,
          receiptStatus: row.status,
          escalationLevel: row.escalation_level,
          lastPushedAt: row.last_pushed_at,
        };
      });
    } catch (err: any) {
      console.error('[taskAlerts] fetchPendingAlertsForMe failed:', err.message);
      return [];
    }
  };

  // Fetch dashboard summary counts
  const fetchDashboardMetrics = async (): Promise<TaskAlertMetrics> => {
    if (!supabaseConfigured) {
      return {
        activeAlerts: 0,
        pendingAcknowledgements: 0,
        overdueAcknowledgements: 0,
        qualityCheckAlerts: 0,
        followUpAlerts: 0,
      };
    }

    try {
      // Fetch active alerts count
      const { count: activeCount } = await supabase
        .from('task_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Fetch pending acknowledgements
      const { count: pendingCount } = await supabase
        .from('task_alert_receipts')
        .select('*, task_alerts!inner(*)')
        .eq('status', 'pending')
        .eq('task_alerts.status', 'published');

      // Fetch overdue acknowledgements (pending & pushed > 24 hours ago)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: overdueCount } = await supabase
        .from('task_alert_receipts')
        .select('*, task_alerts!inner(*)')
        .eq('status', 'pending')
        .eq('task_alerts.status', 'published')
        .lt('last_pushed_at', oneDayAgo);

      // Fetch Quality Check alerts count
      const { count: qcCount } = await supabase
        .from('task_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('alert_type', 'Quality Check')
        .eq('status', 'published');

      // Fetch Follow-Up/Reminders alerts count
      const { count: fuCount } = await supabase
        .from('task_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .in('alert_type', ['Follow Up', 'Reminder', 'Deadline Alert']);

      return {
        activeAlerts: activeCount || 0,
        pendingAcknowledgements: pendingCount || 0,
        overdueAcknowledgements: overdueCount || 0,
        qualityCheckAlerts: qcCount || 0,
        followUpAlerts: fuCount || 0,
      };
    } catch (err: any) {
      console.error('[taskAlerts] fetchDashboardMetrics failed:', err.message);
      return {
        activeAlerts: 0,
        pendingAcknowledgements: 0,
        overdueAcknowledgements: 0,
        qualityCheckAlerts: 0,
        followUpAlerts: 0,
      };
    }
  };

  // Modal states
  const sendAlertModalOpen = ref(false);
  const sendAlertTarget = ref<{ type: 'workboard_task' | 'quality_check_item'; id: string; title: string; assigneeId?: string | null } | null>(null);

  const receiptsModalOpen = ref(false);
  const receiptsTarget = ref<{ type: 'workboard_task' | 'quality_check_item'; id: string; title: string } | null>(null);

  const openSendAlertModal = (target: { type: 'workboard_task' | 'quality_check_item'; id: string; title: string; assigneeId?: string | null }) => {
    sendAlertTarget.value = target;
    sendAlertModalOpen.value = true;
  };

  const openReceiptsModal = (target: { type: 'workboard_task' | 'quality_check_item'; id: string; title: string }) => {
    receiptsTarget.value = target;
    receiptsModalOpen.value = true;
  };

  // Fetch aggregated receipts summary for a specific linked item
  const fetchLinkedReceiptSummary = async (relatedType: 'workboard_task' | 'quality_check_item', relatedId: string) => {
    if (!supabaseConfigured) return null;
    try {
      const { data: alertsData, error: aErr } = await supabase
        .from('task_alerts')
        .select('id, published_at, created_at')
        .eq('related_type', relatedType)
        .eq('related_id', relatedId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (aErr) throw aErr;
      if (!alertsData || alertsData.length === 0) return null;

      const alertIds = alertsData.map((a) => a.id);
      const lastAlertAt = alertsData[0]?.published_at || alertsData[0]?.created_at || null;

      const { data: receiptsData, error: rErr } = await supabase
        .from('task_alert_receipts')
        .select('*')
        .in('alert_id', alertIds);

      if (rErr) throw rErr;

      const total = receiptsData.length;
      const acknowledged = receiptsData.filter((r) => r.status === 'acknowledged').length;
      const opened = receiptsData.filter((r) => r.seen_at !== null).length;
      const pending = total - acknowledged;

      return {
        alertsCount: alertIds.length,
        delivered: total,
        opened,
        acknowledged,
        pending,
        lastAlertAt
      };
    } catch (err: any) {
      console.error('[taskAlerts] fetchLinkedReceiptSummary failed:', err.message);
      return null;
    }
  };

  // Send quick alert immediately
  const sendQuickAlert = async (
    target: { type: 'workboard_task' | 'quality_check_item'; id: string; title: string; assigneeId: string },
    preset: 'urgent' | 'reminder' | 'notify'
  ) => {
    if (!supabaseConfigured) return false;
    
    let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
    let alertType: TaskAlert['alertType'] = 'New Task';
    let message = '';

    if (preset === 'urgent') {
      priority = 'Critical';
      alertType = 'Urgent Fix';
      message = '⚠️ Urgent action required for this task. Please review immediately.';
    } else if (preset === 'reminder') {
      priority = 'High';
      alertType = 'Reminder';
      message = '📅 Nudge: Please review and progress this task.';
    } else {
      priority = 'Medium';
      alertType = 'New Task';
      message = '📢 Update: New task details or status change.';
    }

    const alertPayload = {
      alertId: `quick-alert-${target.id}-${preset}-${Date.now()}`,
      alertType,
      title: target.title.toUpperCase(),
      message,
      priority,
      relatedType: target.type,
      relatedId: target.id,
      status: 'published' as const,
      isArchived: false,
      requireAck: true
    };

    const res = await createOrUpdateAlert(alertPayload, [target.assigneeId]);
    return !!res;
  };

  // Archive alert
  const archiveAlert = async (alertId: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    loading.value = true;
    error.value = null;
    try {
      const { error: err } = await supabase
        .from('task_alerts')
        .update({ is_archived: true })
        .eq('id', alertId);

      if (err) throw err;

      // Update receipts too
      const { error: recErr } = await supabase
        .from('task_alert_receipts')
        .update({ is_archived: true })
        .eq('alert_id', alertId);

      if (recErr) throw recErr;

      await fetchAlerts();
      return true;
    } catch (err: any) {
      console.error('[taskAlerts] archiveAlert failed:', err.message);
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Repush all pending receipts for published alerts associated with this card
  const repushAlertsForLinkedItem = async (
    relatedType: 'workboard_task' | 'quality_check_item',
    relatedId: string
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { data: alertsData } = await supabase
        .from('task_alerts')
        .select('id')
        .eq('related_type', relatedType)
        .eq('related_id', relatedId)
        .eq('status', 'published');

      if (!alertsData || alertsData.length === 0) return false;
      const ids = alertsData.map((a) => a.id);

      const now = new Date().toISOString();
      const { error: err } = await supabase
        .from('task_alert_receipts')
        .update({
          seen_at: null,
          escalation_level: 0,
          last_pushed_at: now,
          status: 'pending'
        })
        .in('alert_id', ids)
        .eq('status', 'pending');

      if (err) throw err;
      return true;
    } catch (err: any) {
      console.error('[taskAlerts] repushAlertsForLinkedItem failed:', err.message);
      return false;
    }
  };

  return {
    alerts,
    loading,
    error,
    fetchAlerts,
    fetchReceipts,
    createOrUpdateAlert,
    publishAlert,
    repushAlert,
    markReceiptSeen,
    acknowledgeReceipt,
    fetchPendingAlertsForMe,
    fetchDashboardMetrics,
    sendAlertModalOpen,
    sendAlertTarget,
    receiptsModalOpen,
    receiptsTarget,
    openSendAlertModal,
    openReceiptsModal,
    fetchLinkedReceiptSummary,
    sendQuickAlert,
    archiveAlert,
    repushAlertsForLinkedItem
  };
});
