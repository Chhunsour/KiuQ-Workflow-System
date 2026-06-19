  -- Migration: 0100_winner_center_read_access.sql
  -- Description: Allow all authenticated users to read (SELECT) Winner Center tables so Team Members can view the prize wheel preview.
  -- Idempotent: safe to re-run.

  begin;

  -- 1. winner_center_prizes
  drop policy if exists "winner_center_prizes_access" on public.winner_center_prizes;
  drop policy if exists "winner_center_prizes_select_all" on public.winner_center_prizes;
  drop policy if exists "winner_center_prizes_manage" on public.winner_center_prizes;

  create policy "winner_center_prizes_select_all" on public.winner_center_prizes
    for select to authenticated
    using (true);

  create policy "winner_center_prizes_manage" on public.winner_center_prizes
    for all to authenticated
    using (public.can_manage_winner_center())
    with check (public.can_manage_winner_center());

  -- 2. winner_center_monthly_winners
  drop policy if exists "winner_center_monthly_winners_access" on public.winner_center_monthly_winners;
  drop policy if exists "winner_center_monthly_winners_select_all" on public.winner_center_monthly_winners;
  drop policy if exists "winner_center_monthly_winners_manage" on public.winner_center_monthly_winners;

  create policy "winner_center_monthly_winners_select_all" on public.winner_center_monthly_winners
    for select to authenticated
    using (true);

  create policy "winner_center_monthly_winners_manage" on public.winner_center_monthly_winners
    for all to authenticated
    using (public.can_manage_winner_center())
    with check (public.can_manage_winner_center());

  -- 3. winner_center_wheel_spins
  drop policy if exists "winner_center_wheel_spins_access" on public.winner_center_wheel_spins;
  drop policy if exists "winner_center_wheel_spins_select_all" on public.winner_center_wheel_spins;
  drop policy if exists "winner_center_wheel_spins_manage" on public.winner_center_wheel_spins;

  create policy "winner_center_wheel_spins_select_all" on public.winner_center_wheel_spins
    for select to authenticated
    using (true);

  create policy "winner_center_wheel_spins_manage" on public.winner_center_wheel_spins
    for all to authenticated
    using (public.can_manage_winner_center())
    with check (public.can_manage_winner_center());

  -- 4. winner_center_settings
  drop policy if exists "winner_center_settings_select" on public.winner_center_settings;
  create policy "winner_center_settings_select" on public.winner_center_settings
    for select to authenticated
    using (true);

  commit;
