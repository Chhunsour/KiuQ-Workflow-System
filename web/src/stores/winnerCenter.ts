import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { normalizeRole } from '@/lib/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WinnerStatus = 'selected' | 'prize_spun' | 'prize_given' | 'approved_retroactively' | 'winner_selected';

export interface WinnerPrize {
  id: string;
  name: string;
  imageUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyWinner {
  id: string;
  monthKey: string;
  winnerUserId: string | null;
  selectedBy: string | null;
  scoreSnapshot: number;
  achievementSummary: string;
  selectedAt: string;
  prizeId: string | null;
  prizeSpunAt: string | null;
  prizeGivenAt: string | null;
  status: WinnerStatus;
  isRetroactive: boolean;
  retroactiveReason: string | null;
  officialPrizeMode?: 'random' | 'exact';
  exactPrizeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WheelSpin {
  id: string;
  monthKey: string;
  winnerUserId: string;
  prizeId: string | null;
  prizeName: string;
  spinResult: Record<string, unknown>;
  spunBy: string | null;
  spunAt: string;
  isTestSpin: boolean;
  isOfficial?: boolean;
  isLocked?: boolean;
  prizeImageUrl?: string | null;
}

export interface WinnerCenterSettings {
  id: 'global';
  testingModeEnabled: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SelectWinnerInput {
  monthKey: string;
  winnerUserId: string;
  scoreSnapshot: number;
  achievementSummary: string;
}

type PrizePatch = Partial<Pick<WinnerPrize, 'name' | 'imageUrl'>>;

const defaultSettings = (): WinnerCenterSettings => ({
  id: 'global',
  testingModeEnabled: false,
  updatedBy: null,
  createdAt: '',
  updatedAt: ''
});

const nowIso = () => new Date().toISOString();

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPrize = (r: any): WinnerPrize => ({
  id: r.id,
  name: r.name ?? '',
  imageUrl: r.image_url ?? null,
  createdBy: r.created_by ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToWinner = (r: any): MonthlyWinner => ({
  id: r.id,
  monthKey: r.month_key,
  winnerUserId: r.winner_user_id ?? null,
  selectedBy: r.selected_by ?? null,
  scoreSnapshot: typeof r.score_snapshot === 'number' ? r.score_snapshot : Number(r.score_snapshot ?? 0),
  achievementSummary: r.achievement_summary ?? '',
  selectedAt: r.selected_at,
  prizeId: r.prize_id ?? null,
  prizeSpunAt: r.prize_spun_at ?? null,
  prizeGivenAt: r.prize_given_at ?? null,
  status: (r.status ?? 'selected') as WinnerStatus,
  isRetroactive: r.is_retroactive === true,
  retroactiveReason: r.retroactive_reason ?? null,
  officialPrizeMode: r.official_prize_mode ?? 'exact',
  exactPrizeId: r.exact_prize_id ?? null,
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
  spinResult: (r.spin_result ?? {}) as Record<string, unknown>,
  spunBy: r.spun_by ?? null,
  spunAt: r.spun_at,
  isTestSpin: r.is_test_spin === true,
  isOfficial: r.is_official === true,
  isLocked: r.is_locked === true,
  prizeImageUrl: r.prize_image_url ?? null
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToSettings = (r: any): WinnerCenterSettings => ({
  id: 'global',
  testingModeEnabled: r?.testing_mode_enabled === true,
  updatedBy: r?.updated_by ?? null,
  createdAt: r?.created_at ?? '',
  updatedAt: r?.updated_at ?? ''
});

export const canSpinOfficialWheel = (
  user: { role?: string | null; id?: string } | null,
  monthlyWinner: MonthlyWinner | null
): boolean => {
  if (!user || !monthlyWinner) return false;

  const role = normalizeRole(user.role);
  if (role === 'head' || role === 'supervisor') {
    return true;
  }

  const isWinnerUser = monthlyWinner.winnerUserId === user.id;
  const isStatusOk = 
    monthlyWinner.status === 'winner_selected' || 
    monthlyWinner.status === 'selected' || 
    monthlyWinner.status === 'approved_retroactively';

  const isPrizeNull = 
    monthlyWinner.prizeId === null && 
    (monthlyWinner.prizeSpunAt === null || !monthlyWinner.prizeSpunAt);

  return isWinnerUser && isStatusOk && isPrizeNull;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWinnerCenterStore = defineStore('winnerCenter', () => {
  const prizes = ref<WinnerPrize[]>([]);
  const winners = ref<MonthlyWinner[]>([]);
  const spins = ref<WheelSpin[]>([]);
  const settings = ref<WinnerCenterSettings>(defaultSettings());
  const loading = ref(false);
  const settingsSaving = ref(false);
  const error = ref<string | null>(null);

  const testingModeEnabled = computed(() => settings.value.testingModeEnabled);
  const activePrizes = computed(() => prizes.value);

  const winnerForMonth = (monthKey: string): MonthlyWinner | null =>
    winners.value.find((w) => w.monthKey === monthKey) ?? null;

  const spinsForMonth = (monthKey: string, options: { includeTest?: boolean } = {}): WheelSpin[] =>
    spins.value.filter((s) => s.monthKey === monthKey && (options.includeTest || !s.isTestSpin));

  const latestProductionSpinForMonth = (monthKey: string): WheelSpin | null =>
    spinsForMonth(monthKey, { includeTest: false })[0] ?? null;

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSettings = async () => {
    if (!supabaseConfigured) return;
    try {
      const { data, error: err } = await supabase
        .from('winner_center_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (err) {
        console.warn('[winner-center] settings fetch failed', err.message);
        settings.value = defaultSettings();
        return;
      }
      settings.value = data ? rowToSettings(data) : defaultSettings();
    } catch (err: unknown) {
      console.warn('[winner-center] settings fetch failed', err);
      settings.value = defaultSettings();
    }
  };

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
      await fetchSettings();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load Winner Center.';
    } finally {
      loading.value = false;
    }
  };

  // ── Settings ────────────────────────────────────────────────────────────────

  const updateTestingMode = async (enabled: boolean): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    const auth = useAuthStore();
    if (!auth.isHeadOrSupervisor) {
      error.value = 'Only Head or Supervisor can change Winner Center testing mode.';
      return false;
    }

    settingsSaving.value = true;
    error.value = null;
    try {
      const row = {
        id: 'global',
        testing_mode_enabled: enabled,
        updated_by: auth.user?.id ?? null,
        updated_at: nowIso()
      };

      let { data, error: err } = await supabase
        .from('winner_center_settings')
        .update(row)
        .eq('id', 'global')
        .select()
        .single();

      if (err || !data) {
        const upsertRes = await supabase
          .from('winner_center_settings')
          .upsert(row, { onConflict: 'id' })
          .select()
          .single();
        data = upsertRes.data;
        err = upsertRes.error;
      }

      if (err || !data) {
        error.value = err?.message ?? 'Could not update testing mode.';
        return false;
      }

      settings.value = rowToSettings(data);
      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error updating testing mode.';
      return false;
    } finally {
      settingsSaving.value = false;
    }
  };

  // ── Prize CRUD ─────────────────────────────────────────────────────────────

  const createPrize = async (input: PrizePatch): Promise<WinnerPrize | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row = {
        name: input.name ?? 'Untitled Prize',
        image_url: input.imageUrl ?? null,
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

  const updatePrize = async (id: string, patch: PrizePatch): Promise<WinnerPrize | null> => {
    if (!supabaseConfigured) return null;
    try {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row['name'] = patch.name;
      if (patch.imageUrl !== undefined) row['image_url'] = patch.imageUrl;

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

  // ── Winner selection ───────────────────────────────────────────────────────

  const selectWinner = async (input: SelectWinnerInput): Promise<MonthlyWinner | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      // Selecting (or changing) a winner always starts a fresh reward: clear any
      // prize / spin / lock state so the new winner can spin from scratch. This
      // matches the "Any prize won this month will be reset" confirmation and
      // prevents a new winner from inheriting a previous (test) winner's lock.
      const row = {
        month_key: input.monthKey,
        winner_user_id: input.winnerUserId,
        selected_by: auth.user?.id ?? null,
        score_snapshot: input.scoreSnapshot,
        achievement_summary: input.achievementSummary,
        selected_at: nowIso(),
        prize_id: null,
        prize_spun_at: null,
        prize_given_at: null,
        status: 'selected' as WinnerStatus,
        is_retroactive: false,
        retroactive_reason: null
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

  const approveRetroactively = async (params: { monthKey: string; reason: string }): Promise<MonthlyWinner | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const row = {
        month_key: params.monthKey,
        winner_user_id: null,
        selected_by: auth.user?.id ?? null,
        score_snapshot: 0,
        achievement_summary: 'Retroactive reward approved.',
        selected_at: nowIso(),
        prize_id: null,
        prize_spun_at: null,
        prize_given_at: null,
        status: 'approved_retroactively' as WinnerStatus,
        is_retroactive: true,
        retroactive_reason: params.reason
      };
      const { data, error: err } = await supabase
        .from('winner_center_monthly_winners')
        .upsert(row, { onConflict: 'month_key' })
        .select()
        .single();
      if (err || !data) {
        error.value = err?.message ?? 'Could not approve retroactive reward.';
        return null;
      }
      const winner = rowToWinner(data);
      const idx = winners.value.findIndex((w) => w.monthKey === winner.monthKey);
      if (idx !== -1) winners.value[idx] = winner;
      else winners.value.unshift(winner);
      return winner;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error approving retroactive reward.';
      return null;
    }
  };

  const updateOfficialPrizeMode = async (
    monthKey: string,
    mode: 'random' | 'exact',
    exactPrizeId: string | null
  ): Promise<MonthlyWinner | null> => {
    if (!supabaseConfigured) return null;
    try {
      const { data, error: err } = await supabase
        .from('winner_center_monthly_winners')
        .update({
          official_prize_mode: mode,
          exact_prize_id: exactPrizeId
        })
        .eq('month_key', monthKey)
        .select()
        .single();

      if (err || !data) {
        error.value = err?.message ?? 'Could not update official prize mode.';
        return null;
      }
      const winner = rowToWinner(data);
      const idx = winners.value.findIndex((w) => w.monthKey === winner.monthKey);
      if (idx !== -1) winners.value[idx] = winner;
      return winner;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error updating official prize mode.';
      return null;
    }
  };

  // ── Wheel spin ─────────────────────────────────────────────────────────────

  const recordSpin = async (
    params: {
      monthKey: string;
      winnerUserId: string;
      prizeId: string;
      prizeName: string;
      prizeImageUrl?: string | null;
      isOfficial?: boolean;
      isLocked?: boolean;
      spinResult?: Record<string, unknown>;
    },
    options: { isTestSpin?: boolean } = {}
  ): Promise<WheelSpin | null> => {
    if (!supabaseConfigured) return null;
    try {
      const auth = useAuthStore();
      const spinIsTest = options.isTestSpin === true || testingModeEnabled.value;
      const spunAt = nowIso();

      if (spinIsTest) {
        // Return a local mock spin object, do NOT hit the database.
        const mockSpin: WheelSpin = {
          id: 'test-' + Math.random().toString(36).substr(2, 9),
          monthKey: params.monthKey,
          winnerUserId: params.winnerUserId,
          prizeId: params.prizeId,
          prizeName: params.prizeName,
          spinResult: params.spinResult ?? {},
          spunBy: auth.user?.id ?? null,
          spunAt,
          isTestSpin: true,
          isOfficial: false,
          isLocked: false,
          prizeImageUrl: params.prizeImageUrl ?? null
        };
        // Add to local state so the UI displays it if needed (but won't persist)
        if (!spins.value.some((s) => s.id === mockSpin.id)) spins.value.unshift(mockSpin);
        return mockSpin;
      }

      // Block duplicate spin
      const existingWinner = winners.value.find((w) => w.monthKey === params.monthKey);
      if (existingWinner && (existingWinner.prizeSpunAt || existingWinner.prizeId)) {
        error.value = 'Prize has already been spun for this month.';
        return null;
      }

      const { data: spinData, error: spinErr } = await supabase
        .from('winner_center_wheel_spins')
        .insert({
          month_key: params.monthKey,
          winner_user_id: params.winnerUserId,
          prize_id: params.prizeId,
          prize_name: params.prizeName,
          spin_result: params.spinResult ?? {},
          spun_by: auth.user?.id ?? null,
          spun_at: spunAt,
          is_test_spin: spinIsTest,
          is_official: params.isOfficial === true,
          is_locked: params.isLocked === true,
          prize_image_url: params.prizeImageUrl ?? null
        })
        .select()
        .single();
      if (spinErr || !spinData) {
        error.value = spinErr?.message ?? 'Could not save spin result.';
        return null;
      }
      const spin = rowToSpin(spinData);
      if (!spins.value.some((s) => s.id === spin.id)) spins.value.unshift(spin);

      const { data: winnerData, error: winnerErr } = await supabase
        .from('winner_center_monthly_winners')
        .update({ prize_id: params.prizeId, prize_spun_at: spunAt, status: 'prize_spun' })
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
        .update({ prize_given_at: nowIso(), status: 'prize_given' })
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

  // ── Testing reset actions ──────────────────────────────────────────────────

  const ensureTestingResetAllowed = () => {
    const auth = useAuthStore();
    if (!auth.isHeadOrSupervisor) {
      error.value = 'Only Head or Supervisor can reset Winner Center test data.';
      return false;
    }
    if (!testingModeEnabled.value) {
      error.value = 'Enable Testing Mode before resetting Winner Center results.';
      return false;
    }
    return true;
  };

  const writeAuditLog = async (
    action: string,
    monthKey: string | null,
    winnerUserId: string | null,
    details: Record<string, unknown>
  ): Promise<boolean> => {
    const auth = useAuthStore();
    const { error: err } = await supabase
      .from('winner_center_audit_log')
      .insert({
        action,
        month_key: monthKey,
        winner_user_id: winnerUserId,
        actor_id: auth.user?.id ?? null,
        details
      });

    if (err) {
      error.value = err.message;
      return false;
    }
    return true;
  };

  const resetPrizeResultForTesting = async (winner: MonthlyWinner): Promise<MonthlyWinner | null> => {
    if (!supabaseConfigured || !ensureTestingResetAllowed()) return null;
    try {
      const priorSpins = spins.value.filter((s) => s.monthKey === winner.monthKey && s.winnerUserId === winner.winnerUserId);
      const audited = await writeAuditLog('reset_prize_result_for_testing', winner.monthKey, winner.winnerUserId, {
        winner,
        removedSpinCount: priorSpins.length,
        removedSpinIds: priorSpins.map((s) => s.id)
      });
      if (!audited) return null;

      const { error: spinErr } = await supabase
        .from('winner_center_wheel_spins')
        .delete()
        .eq('month_key', winner.monthKey)
        .eq('winner_user_id', winner.winnerUserId);
      if (spinErr) {
        error.value = spinErr.message;
        return null;
      }

      const { data, error: winnerErr } = await supabase
        .from('winner_center_monthly_winners')
        .update({
          prize_id: null,
          prize_spun_at: null,
          prize_given_at: null,
          status: 'selected'
        })
        .eq('id', winner.id)
        .select()
        .single();
      if (winnerErr || !data) {
        error.value = winnerErr?.message ?? 'Could not reset prize result.';
        return null;
      }

      spins.value = spins.value.filter((s) => !(s.monthKey === winner.monthKey && s.winnerUserId === winner.winnerUserId));
      const nextWinner = rowToWinner(data);
      const idx = winners.value.findIndex((w) => w.id === nextWinner.id);
      if (idx !== -1) winners.value[idx] = nextWinner;
      return nextWinner;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error resetting prize result.';
      return null;
    }
  };

  const resetWinnerForTesting = async (winner: MonthlyWinner): Promise<boolean> => {
    if (!supabaseConfigured || !ensureTestingResetAllowed()) return false;
    try {
      const priorSpins = spins.value.filter((s) => s.monthKey === winner.monthKey && s.winnerUserId === winner.winnerUserId);
      const audited = await writeAuditLog('reset_winner_for_testing', winner.monthKey, winner.winnerUserId, {
        winner,
        removedSpinCount: priorSpins.length,
        removedSpinIds: priorSpins.map((s) => s.id)
      });
      if (!audited) return false;

      const { error: spinErr } = await supabase
        .from('winner_center_wheel_spins')
        .delete()
        .eq('month_key', winner.monthKey)
        .eq('winner_user_id', winner.winnerUserId);
      if (spinErr) {
        error.value = spinErr.message;
        return false;
      }

      const { error: winnerErr } = await supabase
        .from('winner_center_monthly_winners')
        .delete()
        .eq('id', winner.id);
      if (winnerErr) {
        error.value = winnerErr.message;
        return false;
      }

      spins.value = spins.value.filter((s) => !(s.monthKey === winner.monthKey && s.winnerUserId === winner.winnerUserId));
      winners.value = winners.value.filter((w) => w.id !== winner.id);
      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error resetting winner.';
      return false;
    }
  };

  const clearTestSpins = async (): Promise<boolean> => {
    if (!supabaseConfigured || !ensureTestingResetAllowed()) return false;
    try {
      const priorTestSpins = spins.value.filter((s) => s.isTestSpin);
      const audited = await writeAuditLog('clear_test_spins', null, null, {
        removedSpinCount: priorTestSpins.length,
        removedSpinIds: priorTestSpins.map((s) => s.id)
      });
      if (!audited) return false;

      const { error: err } = await supabase
        .from('winner_center_wheel_spins')
        .delete()
        .eq('is_test_spin', true);
      if (err) {
        error.value = err.message;
        return false;
      }
      spins.value = spins.value.filter((s) => !s.isTestSpin);
      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error clearing test spins.';
      return false;
    }
  };

  // ── Realtime ───────────────────────────────────────────────────────────────

  const handleRealtimePayload = (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    old: any;
  }) => {
    const { eventType, table, new: newRow, old: oldRow } = payload;

    if (table === 'winner_center_settings') {
      if (eventType !== 'DELETE') settings.value = rowToSettings(newRow);
      return;
    }

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
      if (eventType === 'DELETE') {
        const id = oldRow?.id ?? newRow?.id;
        if (id) spins.value = spins.value.filter((s) => s.id !== id);
        return;
      }
      const spin = rowToSpin(newRow);
      const idx = spins.value.findIndex((s) => s.id === spin.id);
      if (idx !== -1) spins.value[idx] = spin;
      else spins.value.unshift(spin);
    }
  };

  return {
    prizes,
    winners,
    spins,
    settings,
    loading,
    settingsSaving,
    error,
    testingModeEnabled,
    activePrizes,
    winnerForMonth,
    spinsForMonth,
    latestProductionSpinForMonth,
    fetchAll,
    fetchSettings,
    updateTestingMode,
    createPrize,
    updatePrize,
    deletePrize,
    selectWinner,
    approveRetroactively,
    updateOfficialPrizeMode,
    recordSpin,
    markPrizeGiven,
    resetPrizeResultForTesting,
    resetWinnerForTesting,
    clearTestSpins,
    handleRealtimePayload
  };
});
