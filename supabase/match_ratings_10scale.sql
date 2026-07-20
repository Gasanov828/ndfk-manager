-- Переход на 10-балльную шкалу голосования (1–10 звёзд).
-- Запустите в Supabase → SQL Editor.

alter table match_player_rating_votes
  drop constraint if exists match_player_rating_votes_stars_check;

alter table match_player_rating_votes
  add constraint match_player_rating_votes_stars_check
  check (stars >= 1 and stars <= 10);

-- Старые голоса (1–5) можно сбросить, чтобы не ломать средние:
-- delete from match_player_rating_votes;
-- delete from match_player_rating_summary;
