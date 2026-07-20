-- Дробный общий рейтинг (78.5 и т.д.) для шага ±0.5 после голосования.
-- Запустите в Supabase → SQL Editor, если рейтинг сохраняется только целым числом.

alter table players
  alter column rating type numeric(4, 1) using rating::numeric(4, 1);

alter table match_player_rating_summary
  alter column rating_before type numeric(4, 1) using rating_before::numeric(4, 1);

alter table match_player_rating_summary
  alter column rating_after type numeric(4, 1) using rating_after::numeric(4, 1);
