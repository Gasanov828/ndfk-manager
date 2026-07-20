-- RLS: голосовать за тренировку могут только вошедшие игроки (profiles.player_id)
-- Выполните после training.sql

drop policy if exists "training_rating_votes_insert" on public.training_rating_votes;
drop policy if exists "training_rating_votes_update" on public.training_rating_votes;
drop policy if exists "training_rating_votes_delete" on public.training_rating_votes;

create policy "training_rating_votes_insert"
  on public.training_rating_votes for insert to authenticated
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = voter_player_id
    )
    and rated_player_id <> voter_player_id
  );

create policy "training_rating_votes_update"
  on public.training_rating_votes for update to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = voter_player_id
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = voter_player_id
    )
  );

create policy "training_rating_votes_delete"
  on public.training_rating_votes for delete to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = voter_player_id
    )
  );
