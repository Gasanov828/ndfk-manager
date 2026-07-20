-- Игрок может отказаться от голосования (играл, но не хочет оценивать)
-- Выполните после match_participation.sql

alter table public.match_player_participation
  add column if not exists skipped_rating_vote boolean not null default false;
