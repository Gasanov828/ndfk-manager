-- RLS: голосовать могут только вошедшие игроки (profiles.player_id)
-- Выполните в Supabase SQL Editor после match_vote.sql и match_ratings.sql

-- === Готовность на матч ===
drop policy if exists "match_availability_insert" on match_availability;
drop policy if exists "match_availability_update" on match_availability;
drop policy if exists "match_availability_delete" on match_availability;

create policy "match_availability_insert"
  on match_availability for insert to authenticated
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );

create policy "match_availability_update"
  on match_availability for update to authenticated
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

create policy "match_availability_delete"
  on match_availability for delete to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = player_id
    )
  );

-- === Оценки после матча ===
drop policy if exists "match_player_rating_votes_insert" on match_player_rating_votes;
drop policy if exists "match_player_rating_votes_update" on match_player_rating_votes;
drop policy if exists "match_player_rating_votes_delete" on match_player_rating_votes;

create policy "match_player_rating_votes_insert"
  on match_player_rating_votes for insert to authenticated
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = voter_player_id
    )
    and rated_player_id <> voter_player_id
  );

create policy "match_player_rating_votes_update"
  on match_player_rating_votes for update to authenticated
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

create policy "match_player_rating_votes_delete"
  on match_player_rating_votes for delete to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.player_id = voter_player_id
    )
  );

-- Чтение по-прежнему для всех (зрители видят явку и итоги)
-- insert/update summary — только через service role / admin в коде (recalculate)
