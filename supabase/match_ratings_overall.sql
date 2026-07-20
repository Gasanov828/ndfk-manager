-- Добавляет колонки для связи оценки матча с общим рейтингом.
-- Запустите, если match_ratings.sql уже выполняли раньше.

alter table match_player_rating_summary
  add column if not exists rating_before integer;

alter table match_player_rating_summary
  add column if not exists rating_after integer;
