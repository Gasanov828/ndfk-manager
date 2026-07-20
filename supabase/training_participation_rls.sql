-- Игрок сам отмечает участие на тренировке (только своя строка)
-- Выполните после training_participation.sql
-- Безопасно перезапускать: политики пересоздаются

drop policy if exists "training_player_participation_write" on public.training_player_participation;
drop policy if exists "training_player_participation_insert" on public.training_player_participation;
drop policy if exists "training_player_participation_update" on public.training_player_participation;
drop policy if exists "training_player_participation_delete_own" on public.training_player_participation;

create policy "training_player_participation_insert"
  on public.training_player_participation for insert to authenticated
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );

create policy "training_player_participation_update"
  on public.training_player_participation for update to authenticated
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

create policy "training_player_participation_delete_own"
  on public.training_player_participation for delete to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );
