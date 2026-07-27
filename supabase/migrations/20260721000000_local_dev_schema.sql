-- LOCAL DEV ONLY.
-- The production project keeps its `players`/`matches` tables in hosted Supabase;
-- they are not defined anywhere in this repo (only the loose supabase/*.sql patch
-- files are). This migration recreates a minimal, compatible schema so the app can
-- run end-to-end against a local `supabase start` stack. It is NOT meant to be
-- pushed to the hosted project.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id serial primary key,
  name text not null,
  position text not null default '',
  rating numeric not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  status text not null default 'active',
  lineup_position text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id serial primary key,
  opponent text not null,
  date date not null,
  time text not null default '',
  location text not null default '',
  is_played boolean not null default false,
  is_live boolean not null default false,
  ndfk_goals int,
  opponent_goals int,
  rating_voting_ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth: profiles + helpers (mirrors supabase/auth_setup.sql, but uses a
-- SECURITY DEFINER is_admin() helper to avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_id int references public.players(id) on delete set null,
  role text not null default 'player' check (role in ('admin', 'player')),
  username text,
  created_at timestamptz not null default now(),
  unique (player_id)
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.get_my_profile()
returns table (
  id uuid,
  player_id int,
  role text,
  player_name text,
  username text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.player_id, p.role, pl.name, p.username
  from public.profiles p
  left join public.players pl on pl.id = p.player_id
  where p.id = auth.uid();
$$;

grant execute on function public.get_my_profile() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'player')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.players, public.matches to anon, authenticated;
grant insert, update, delete on public.players to authenticated;
grant insert, update, delete on public.matches to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists players_public_read on public.players;
create policy players_public_read on public.players
  for select to anon, authenticated using (true);

drop policy if exists players_admin_write on public.players;
create policy players_admin_write on public.players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists matches_public_read on public.matches;
create policy matches_public_read on public.matches
  for select to anon, authenticated using (true);

drop policy if exists matches_admin_write on public.matches;
create policy matches_admin_write on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Existing post-match rating / voting schema (mirrors the loose supabase/*.sql
-- patch files that are hand-run against hosted Supabase:
-- match_history.sql, match_player_stats_saves.sql, match_participation.sql,
-- match_participation_skipped_vote.sql, match_ratings.sql,
-- match_ratings_10scale.sql, match_ratings_decimal.sql, voting_rls.sql,
-- match_participation_rls.sql). Recreated here for local dev.
-- ---------------------------------------------------------------------------
create table if not exists public.match_player_stats (
  id bigint generated by default as identity primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  goals integer not null default 0,
  assists integer not null default 0,
  saves integer not null default 0,
  unique (match_id, player_id)
);
create index if not exists match_player_stats_match_id_idx on public.match_player_stats (match_id);
create index if not exists match_player_stats_player_id_idx on public.match_player_stats (player_id);

create table if not exists public.match_player_participation (
  id bigint generated by default as identity primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  participated boolean not null default true,
  skipped_rating_vote boolean not null default false,
  unique (match_id, player_id)
);
create index if not exists match_player_participation_match_id_idx on public.match_player_participation (match_id);

create table if not exists public.match_player_rating_votes (
  id bigint generated by default as identity primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  voter_player_id bigint not null references public.players(id) on delete cascade,
  rated_player_id bigint not null references public.players(id) on delete cascade,
  stars integer not null check (stars >= 1 and stars <= 10),
  created_at timestamptz default now(),
  unique (match_id, voter_player_id, rated_player_id)
);
create index if not exists match_player_rating_votes_match_id_idx on public.match_player_rating_votes (match_id);

create table if not exists public.match_player_rating_summary (
  id bigint generated by default as identity primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  avg_stars numeric(4, 2) not null default 0,
  match_rating numeric(3, 1) not null default 0,
  vote_count integer not null default 0,
  is_mvp boolean not null default false,
  rating_before numeric(4, 1),
  rating_after numeric(4, 1),
  unique (match_id, player_id)
);
create index if not exists match_player_rating_summary_match_id_idx on public.match_player_rating_summary (match_id);
create index if not exists match_player_rating_summary_player_id_idx on public.match_player_rating_summary (player_id);

alter table public.match_player_stats enable row level security;
alter table public.match_player_participation enable row level security;
alter table public.match_player_rating_votes enable row level security;
alter table public.match_player_rating_summary enable row level security;

grant select on public.match_player_stats, public.match_player_participation,
  public.match_player_rating_votes, public.match_player_rating_summary to anon, authenticated;
grant insert, update, delete on public.match_player_stats,
  public.match_player_participation, public.match_player_rating_votes to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- stats: permissive (admin match editor writes via authenticated client)
create policy match_player_stats_select on public.match_player_stats for select to anon, authenticated using (true);
create policy match_player_stats_write on public.match_player_stats for all to authenticated using (true) with check (true);

-- participation: player may only write their own row
create policy match_player_participation_select on public.match_player_participation for select to anon, authenticated using (true);
create policy match_player_participation_insert on public.match_player_participation for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = player_id));
create policy match_player_participation_update on public.match_player_participation for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = player_id))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = player_id));
create policy match_player_participation_delete on public.match_player_participation for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = player_id));

-- votes: voter must be the linked player and cannot rate self
create policy match_player_rating_votes_select on public.match_player_rating_votes for select to anon, authenticated using (true);
create policy match_player_rating_votes_insert on public.match_player_rating_votes for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = voter_player_id) and rated_player_id <> voter_player_id);
create policy match_player_rating_votes_update on public.match_player_rating_votes for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = voter_player_id))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = voter_player_id));
create policy match_player_rating_votes_delete on public.match_player_rating_votes for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.player_id = voter_player_id));

-- summary: public read; writes only via service role (recalc) so no write policy
create policy match_player_rating_summary_select on public.match_player_rating_summary for select to anon, authenticated using (true);

-- service_role (recalc / dev seed / admin API) needs full table access
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
