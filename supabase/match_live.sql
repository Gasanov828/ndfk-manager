-- Статус «идёт матч» (выполните в Supabase → SQL Editor)

alter table matches
  add column if not exists is_live boolean default false;
