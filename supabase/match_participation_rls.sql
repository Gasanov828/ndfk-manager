-- Игрок сам отмечает «не играл» (только своя строка)
-- Выполните после match_participation.sql
-- Безопасно перезапускать: политики пересоздаются

drop policy if exists "match_player_participation_write" on public.match_player_participation;
drop policy if exists "match_player_participation_insert" on public.match_player_participation;
drop policy if exists "match_player_participation_update" on public.match_player_participation;
drop policy if exists "match_player_participation_delete_own" on public.match_player_participation;

create policy "match_player_participation_insert"
  on public.match_player_participation for insert to authenticated
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );

create policy "match_player_participation_update"
  on public.match_player_participation for update to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );

create policy "match_player_participation_delete_own"
  on public.match_player_participation for delete to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );
