import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export type CommandCenterCategory =
  | 'daily_log'
  | 'idea'
  | 'decision'
  | 'strategy'
  | 'meeting_notes'
  | 'reminder'
  | 'note';

export interface CommandCenterEntry {
  id: string;
  category: CommandCenterCategory;
  title: string;
  content: string;
  tags: string[];
  status: string; // e.g., 'active', 'completed', 'archived', 'draft'
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommandCenterMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToEntry = (r: any): CommandCenterEntry => ({
  id: r.id,
  category: r.category,
  title: r.title ?? '',
  content: r.content ?? '',
  tags: Array.isArray(r.tags) ? r.tags : [],
  status: r.status ?? 'active',
  metadata: r.metadata && typeof r.metadata === 'object' ? r.metadata : {},
  createdBy: r.created_by ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToMetric = (r: any): CommandCenterMetric => ({
  id: r.id,
  label: r.label ?? '',
  value: r.value ?? '',
  trend: r.trend ?? '',
  updatedBy: r.updated_by ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export const useCommandCenterStore = defineStore('commandCenter', () => {
  const entries = ref<CommandCenterEntry[]>([]);
  const metrics = ref<CommandCenterMetric[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchEntries = async () => {
    if (!supabaseConfigured) return;
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('command_center_entries')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) {
        error.value = err.message;
        return;
      }
      entries.value = (data ?? []).map(rowToEntry);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch command center entries';
    } finally {
      loading.value = false;
    }
  };

  const fetchMetrics = async () => {
    if (!supabaseConfigured) return;
    try {
      const { data, error: err } = await supabase
        .from('command_center_metrics')
        .select('*')
        .order('created_at', { ascending: true });
      if (err) {
        error.value = err.message;
        return;
      }
      metrics.value = (data ?? []).map(rowToMetric);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch metrics';
    }
  };

  const createEntry = async (
    category: CommandCenterCategory,
    title: string,
    content = '',
    tags: string[] = [],
    status = 'active',
    metadata: Record<string, any> = {}
  ): Promise<CommandCenterEntry | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row = {
        category,
        title,
        content,
        tags,
        status,
        metadata,
        created_by: auth.user?.id
      };
      const { data, error: err } = await supabase
        .from('command_center_entries')
        .insert(row)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not create entry';
        return null;
      }
      const entry = rowToEntry(data);
      if (!entries.value.some((e) => e.id === entry.id)) {
        entries.value.unshift(entry);
      }
      return entry;
    } catch (err: any) {
      error.value = err.message || 'Error creating entry';
      return null;
    }
  };

  const updateEntry = async (
    id: string,
    patch: Partial<Omit<CommandCenterEntry, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>
  ): Promise<CommandCenterEntry | null> => {
    if (!supabaseConfigured) return null;
    try {
      const row: Record<string, any> = {};
      if (patch.category !== undefined) row['category'] = patch.category;
      if (patch.title !== undefined) row['title'] = patch.title;
      if (patch.content !== undefined) row['content'] = patch.content;
      if (patch.tags !== undefined) row['tags'] = patch.tags;
      if (patch.status !== undefined) row['status'] = patch.status;
      if (patch.metadata !== undefined) row['metadata'] = patch.metadata;

      const { data, error: err } = await supabase
        .from('command_center_entries')
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not update entry';
        return null;
      }
      const entry = rowToEntry(data);
      const idx = entries.value.findIndex((e) => e.id === id);
      if (idx !== -1) {
        entries.value[idx] = entry;
      }
      return entry;
    } catch (err: any) {
      error.value = err.message || 'Error updating entry';
      return null;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { error: err } = await supabase
        .from('command_center_entries')
        .delete()
        .eq('id', id);
      if (err) {
        error.value = err.message;
        return false;
      }
      entries.value = entries.value.filter((e) => e.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.message || 'Error deleting entry';
      return false;
    }
  };

  const createMetric = async (
    label: string,
    value: string,
    trend = ''
  ): Promise<CommandCenterMetric | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row = {
        label,
        value,
        trend,
        updated_by: auth.user?.id
      };
      const { data, error: err } = await supabase
        .from('command_center_metrics')
        .insert(row)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not create metric';
        return null;
      }
      const metric = rowToMetric(data);
      metrics.value.push(metric);
      return metric;
    } catch (err: any) {
      error.value = err.message || 'Error creating metric';
      return null;
    }
  };

  const updateMetric = async (
    id: string,
    patch: { value?: string; trend?: string; label?: string }
  ): Promise<CommandCenterMetric | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row: Record<string, any> = {
        updated_by: auth.user?.id
      };
      if (patch.value !== undefined) row['value'] = patch.value;
      if (patch.trend !== undefined) row['trend'] = patch.trend;
      if (patch.label !== undefined) row['label'] = patch.label;

      const { data, error: err } = await supabase
        .from('command_center_metrics')
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not update metric';
        return null;
      }
      const metric = rowToMetric(data);
      const idx = metrics.value.findIndex((m) => m.id === id);
      if (idx !== -1) {
        metrics.value[idx] = metric;
      }
      return metric;
    } catch (err: any) {
      error.value = err.message || 'Error updating metric';
      return null;
    }
  };

  const deleteMetric = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { error: err } = await supabase
        .from('command_center_metrics')
        .delete()
        .eq('id', id);
      if (err) {
        error.value = err.message;
        return false;
      }
      metrics.value = metrics.value.filter((m) => m.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.message || 'Error deleting metric';
      return false;
    }
  };

  const handleRealtimePayload = (payload: {
    eventType: string;
    table: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    old: any;
  }) => {
    const { eventType, table, new: newRow, old: oldRow } = payload;
    if (table === 'command_center_entries') {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const entry = rowToEntry(newRow);
        const idx = entries.value.findIndex((e) => e.id === entry.id);
        if (idx !== -1) {
          entries.value[idx] = entry;
        } else {
          entries.value.unshift(entry);
        }
      } else if (eventType === 'DELETE') {
        const id = oldRow?.id || newRow?.id;
        if (id) {
          entries.value = entries.value.filter((e) => e.id !== id);
        }
      }
    } else if (table === 'command_center_metrics') {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const metric = rowToMetric(newRow);
        const idx = metrics.value.findIndex((m) => m.id === metric.id);
        if (idx !== -1) {
          metrics.value[idx] = metric;
        } else {
          metrics.value.push(metric);
        }
      } else if (eventType === 'DELETE') {
        const id = oldRow?.id || newRow?.id;
        if (id) {
          metrics.value = metrics.value.filter((m) => m.id !== id);
        }
      }
    }
  };

  return {
    entries,
    metrics,
    loading,
    error,
    fetchEntries,
    fetchMetrics,
    createEntry,
    updateEntry,
    deleteEntry,
    createMetric,
    updateMetric,
    deleteMetric,
    handleRealtimePayload
  };
});
