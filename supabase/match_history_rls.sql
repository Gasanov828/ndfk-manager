-- Запустите этот SQL в Supabase → SQL Editor (после match_history.sql)

alter table match_player_stats enable row level security;

-- Если политики уже есть — сначала удалите их или пропустите ошибку "already exists"

create policy "match_player_stats_select"
  on match_player_stats
  for select
  to anon, authenticated
  using (true);

create policy "match_player_stats_insert"
  on match_player_stats
  for insert
  to anon, authenticated
  with check (true);

create policy "match_player_stats_update"
  on match_player_stats
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "match_player_stats_delete"
  on match_player_stats
  for delete
  to anon, authenticated
  using (true);

-- На всякий случай: обновление результатов в matches
create policy "matches_update_results"
  on matches
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "matches_delete"
  on matches
  for delete
  to anon, authenticated
  using (true);
