-- Шкала голосования после матча: 1–10.
-- Запустите в Supabase → SQL Editor.
--
-- Если ранее успели сконвертировать голоса в 5★ (все значения ≤ 5),
-- возвращаем их на шкалу 10. Если уже есть оценки 6–10 — ничего не трогаем.

alter table match_player_rating_votes
  drop constraint if exists match_player_rating_votes_stars_check;

do $$
declare
  max_stars numeric;
begin
  select coalesce(max(stars), 0) into max_stars from match_player_rating_votes;

  -- Все голоса ≤ 5 → скорее всего была миграция на 5★
  if max_stars > 0 and max_stars <= 5 then
    update match_player_rating_votes
    set stars = greatest(1, least(10, round(stars::numeric * 2)::integer));

    update match_player_rating_summary
    set
      avg_stars = round(avg_stars * 2, 2),
      match_rating = round(match_rating * 2, 1)
    where avg_stars <= 5 and match_rating <= 5;
  end if;
end $$;

alter table match_player_rating_votes
  add constraint match_player_rating_votes_stars_check
  check (stars >= 1 and stars <= 10);
