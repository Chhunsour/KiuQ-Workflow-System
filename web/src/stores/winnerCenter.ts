import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WinnerStatus = 'selected' | 'prize_spun' | 'prize_given';

export interface WinnerPrize {
  id: string;
  name: string;
  description: string;
  prizeType: string;
  quantity: number;
  imageUrl: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyWinner {
  id: string;
  monthKey: string;
  winnerUserId: string;
  selectedBy: string | null;
  scoreSnapshot: number;
  achievementSummary: string;
  selectedAt: string;
  prizeId: string | null;
  prizeSpunAt: string | null;
  prizeGivenAt: string | null;
  status: WinnerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WheelSpin {
  id: string;
  monthKey: string;
  winnerUserId: string;
  prizeId: string | null;
  prizeName: string;
  spunBy: string | null;
  spunAt: string;
}

export interface SelectWinnerInput {
  monthKey: string;
  winnerUserId: string;
  scoreSnapshot: number;
  achievementSummary: string;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPrize = (r: any): WinnerPrize => ({
  id: r.id,
  name: r.name ?? '',
  description: r.description ?? '',
  prizeType: r.prize_type ?? 'custom',
  quantity: typeof r.quantity === 'number' ? r.quantity : Number(r.quantity ?? 0),
  imageUrl: r.image_url ?? null,
  isActive: r.is_active !== false,
  createdBy: r.created_by ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToWinner = (r: any): MonthlyWinner => ({
  id: r.id,
  monthKey: r.month_key,
  winnerUserId: r.winner_user_id,
  selectedBy: r.selected_by ?? null,
  scoreSnapshot: typeof r.score_snapshot === 'number' ? r.score_snapshot : Number(r.score_snapshot ?? 0),
  achievementSummary: r.achievement_summary ?? '',
  selectedAt: r.selected_at,
  prizeId: r.prize_id ?? null,
  prizeSpunAt: r.prize_spun_at ?? null,
  prizeGivenAt: r.prize_given_at ?? null,
  status: (r.status ?? 'selected') as WinnerStatus,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToSpin = (r: any): WheelSpin => ({
  id: r.id,
  monthKey: r.month_key,
  winnerUserId: r.winner_user_id,
  prizeId: r.prize_id ?? null,
  prizeName: r.prize_name ?? '',
  spunBy: r.spun_by ?? null,
  spunAt: r.spun_at
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWinnerCenterStore = defineStore('winnerCenter', () => {
  const prizes = ref<WinnerPrize[]>([]);
  const winners = ref<MonthlyWinner[]>([]);
  const spins = ref<WheelSpin[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activePrizes = computed(() => prizes.value.filter((p) => p.isActive));

  const winnerForMonth = (monthKey: string): MonthlyWinner | null =>
    winners.value.find((w) => w.monthKey === monthKey) ?? null;

  const spinsForMonth = (monthKey: string): WheelSpin[] =>
    spins.value.filter((s) => s.monthKey === monthKey);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    if (!supabaseConfigured) return;
    loading.value = true;
    error.value = null;
    try {
      const [prizeRes, winnerRes, spinRes] = await Promise.all([
        supabase.from('winner_center_prizes').select('*').order('created_at', { ascending: true }),
        supabase.from('winner_center_monthly_winners').select('*').order('month_key', { ascending: false }),
        supabase.from('winner_center_wheel_spins').select('*').order('spun_at', { ascending: false })
      ]);
      if (prizeRes.error) throw prizeRes.error;
      if (winnerRes.error) throw winnerRes.error;
      if (spinRes.error) throw spinRes.error;
      prizes.value = (prizeRes.data ?? []).map(rowToPrize);
      winners.value = (winnerRes.data ?? []).map(rowToWinner);
      spins.value = (spinRes.data ?? []).map(rowToSpin);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load Winner Center.';
    } finally {
      loading.value = false;
    }
  };

  // ── Prize CRUD ───────────────────────────────────────────────────────────────

  const createPrize = async (
    input: Partial<Omit<WinnerPrize, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>
  ): Promise<WinnerPrize | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row = {
        name: input.name ?? 'Untitled Prize',
        description: input.description ?? '',
        prize_type: input.prizeType ?? 'custom',
        quantity: input.quantity ?? 1,
        image_url: input.imageUrl ?? null,
        is_active: input.isActive ?? true,
        created_by: auth.user?.id ?? null
      };
      const { data, error: err } = await supabase
        .from('winner_center_prizes')
        .insert(row)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not create prize.';
        return null;
      }
      const prize = rowToPrize(data);
      if (!prizes.value.some((p) => p.id === prize.id)) prizes.value.push(prize);
      return prize;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error creating prize.';
      return null;
    }
  };

  const updatePrize = async (
    id: string,
    patch: Partial<Omit<WinnerPrize, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>
  ): Promise<WinnerPrize | null> => {
    if (!supabaseConfigured) return null;
    try {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row['name'] = patch.name;
      if (patch.description !== undefined) row['description'] = patch.description;
      if (patch.prizeType !== undefined) row['prize_type'] = patch.prizeType;
      if (patch.quantity !== undefined) row['quantity'] = patch.quantity;
      if (patch.imageUrl !== undefined) row['image_url'] = patch.imageUrl;
      if (patch.isActive !== undefined) row['is_active'] = patch.isActive;

      const { data, error: err } = await supabase
        .from('winner_center_prizes')
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not update prize.';
        return null;
      }
      const prize = rowToPrize(data);
      const idx = prizes.value.findIndex((p) => p.id === id);
      if (idx !== -1) prizes.value[idx] = prize;
      return prize;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error updating prize.';
      return null;
    }
  };

  const deletePrize = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { error: err } = await supabase.from('winner_center_prizes').delete().eq('id', id);
      if (err) {
        error.value = err.message;
        return false;
      }
      prizes.value = prizes.value.filter((p) => p.id !== id);
      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error deleting prize.';
      return false;
    }
  };

  // ── Winner selection ─────────────────────────────────────────────────────────

  /**
   * Manually select (or change) the winner for a month. Upserts on month_key.
   * Changing the winner resets any prize state — the permanent wheel_spins log
   * is untouched, so prior spin history is never lost.
   */
  const selectWinner = async (input: SelectWinnerInput): Promise<MonthlyWinner | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row = {
        month_key: input.monthKey,
        winner_user_id: input.winnerUserId,
        selected_by: auth.user?.id ?? null,
        score_snapshot: input.scoreSnapshot,
        achievement_summary: input.achievementSummary,
        selected_at: new Date().toISOString(),
        prize_id: null,
        prize_spun_at: null,
        prize_given_at: null,
        status: 'selected' as WinnerStatus
      };
      const { data, error: err } = await supabase
        .from('winner_center_monthly_winners')
        .upsert(row, { onConflict: 'month_key' })
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not select winner.';
        return null;
      }
      const winner = rowToWinner(data);
      const idx = winners.value.findIndex((w) => w.monthKey === winner.monthKey);
      if (idx !== -1) winners.value[idx] = winner;
      else winners.value.unshift(winner);
      return winner;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error selecting winner.';
      return null;
    }
  };

  // ── Wheel spin (permanent result) ──────────────────────────────────────────────

  const recordSpin = async (params: {
    monthKey: string;
    winnerUserId: string;
    prizeId: string;
    prizeName: string;
  }): Promise<WheelSpin | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const nowIso = new Date().toISOString();

      // 1. Permanent immutable spin log
      const { data: spinData, error: spinErr } = await supabase
        .from('winner_center_wheel_spins')
        .insert({
          month_key: params.monthKey,
          winner_user_id: params.winnerUserId,
          prize_id: params.prizeId,
          prize_name: params.prizeName,
          spun_by: auth.user?.id ?? null,
          spun_at: nowIso
        })
        .select()
        .single();
      if (spinErr || !spinData) {
        error.value = spinErr?.message ?? 'Could not save spin result.';
        return null;
      }
      const spin = rowToSpin(spinData);
      if (!spins.value.some((s) => s.id === spin.id)) spins.value.unshift(spin);

      // 2. Reflect the awarded prize on the monthly winner row
      const { data: winnerData, error: winnerErr } = await supabase
        .from('winner_center_monthly_winners')
        .update({ prize_id: params.prizeId, prize_spun_at: nowIso, status: 'prize_spun' })
        .eq('month_key', params.monthKey)
        .select()
        .single();
      if (!winnerErr && winnerData) {
        const winner = rowToWinner(winnerData);
        const idx = winners.value.findIndex((w) => w.monthKey === winner.monthKey);
        if (idx !== -1) winners.value[idx] = winner;
      }

      return spin;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error saving spin result.';
      return null;
    }
  };

  const markPrizeGiven = async (monthKey: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { data, error: err } = await supabase
        .from('winner_center_monthly_winners')
        .update({ prize_given_at: new Date().toISOString(), status: 'prize_given' })
        .eq('month_key', monthKey)
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not mark prize as given.';
        return false;
      }
      const winner = rowToWinner(data);
      const idx = winners.value.findIndex((w) => w.monthKey === winner.monthKey);
      if (idx !== -1) winners.value[idx] = winner;
      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error marking prize as given.';
      return false;
    }
  };

  // ── Realtime ─────────────────────────────────────────────────────────────────

  const handleRealtimePayload = (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    old: any;
  }) => {
    const { eventType, table, new: newRow, old: oldRow } = payload;

    if (table === 'winner_center_prizes') {
      if (eventType === 'DELETE') {
        const id = oldRow?.id ?? newRow?.id;
        if (id) prizes.value = prizes.value.filter((p) => p.id !== id);
        return;
      }
      const prize = rowToPrize(newRow);
      const idx = prizes.value.findIndex((p) => p.id === prize.id);
      if (idx !== -1) prizes.value[idx] = prize;
      else prizes.value.push(prize);
    } else if (table === 'winner_center_monthly_winners') {
      if (eventType === 'DELETE') {
        const id = oldRow?.id ?? newRow?.id;
        if (id) winners.value = winners.value.filter((w) => w.id !== id);
        return;
      }
      const winner = rowToWinner(newRow);
      const idx = winners.value.findIndex((w) => w.id === winner.id);
      if (idx !== -1) winners.value[idx] = winner;
      else winners.value.unshift(winner);
    } else if (table === 'winner_center_wheel_spins') {
      if (eventType === 'INSERT') {
        const spin = rowToSpin(newRow);
        if (!spins.value.some((s) => s.id === spin.id)) spins.value.unshift(spin);
      } else if (eventType === 'DELETE') {
        const id = oldRow?.id ?? newRow?.id;
        if (id) spins.value = spins.value.filter((s) => s.id !== id);
      }
    }
  };

  return {
    prizes,
    winners,
    spins,
    loading,
    error,
    activePrizes,
    winnerForMonth,
    spinsForMonth,
    fetchAll,
    createPrize,
    updatePrize,
    deletePrize,
    selectWinner,
    recordSpin,
    markPrizeGiven,
    handleRealtimePayload
  };
});
