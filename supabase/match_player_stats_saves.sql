-- Запустите в Supabase → SQL Editor (локально / перед деплоем)

alter table match_player_stats
  add column if not exists saves integer not null default 0;
