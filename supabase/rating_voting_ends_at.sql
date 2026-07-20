-- Дедлайн голосования за оценки (12 ч с момента завершения матча)
alter table matches
  add column if not exists rating_voting_ends_at timestamptz;
