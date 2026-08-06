-- LIVE-события матча (гол / ассист / замена + запас под будущие типы).
-- Запустите в Supabase → SQL Editor.

create table if not exists match_live_events (
  id bigserial primary key,
  match_id bigint not null references matches (id) on delete cascade,
  event_type text not null,
  player_id bigint references players (id) on delete set null,
  related_player_id bigint references players (id) on delete set null,
  related_event_id bigint references match_live_events (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_live_events_match_id_idx
  on match_live_events (match_id, created_at, id);

alter table match_live_events enable row level security;

drop policy if exists "match_live_events_select" on match_live_events;
drop policy if exists "match_live_events_insert" on match_live_events;
drop policy if exists "match_live_events_update" on match_live_events;
drop policy if exists "match_live_events_delete" on match_live_events;

create policy "match_live_events_select"
  on match_live_events for select to anon, authenticated using (true);

create policy "match_live_events_insert"
  on match_live_events for insert to anon, authenticated with check (true);

create policy "match_live_events_update"
  on match_live_events for update to anon, authenticated using (true) with check (true);

create policy "match_live_events_delete"
  on match_live_events for delete to anon, authenticated using (true);
