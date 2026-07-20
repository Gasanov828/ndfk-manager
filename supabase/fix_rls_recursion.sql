-- Исправление: infinite recursion detected in policy for relation "profiles"
-- Supabase → SQL Editor → Run целиком

-- Проверки роли без RLS (security definer — без рекурсии)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_linked_player()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'player' and player_id is not null
  );
$$;

create or replace function public.my_player_id()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select player_id from profiles where id = auth.uid();
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_linked_player() to authenticated;
grant execute on function public.my_player_id() to authenticated;

-- === profiles: убрать рекурсию ===
drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all"
  on profiles for select to authenticated
  using (public.is_admin());

-- === players ===
alter table players add column if not exists photo_url text;

grant select on players to anon, authenticated;
grant update on players to authenticated;

alter table players enable row level security;

drop policy if exists "players_select_public" on players;
create policy "players_select_public"
  on players for select to anon, authenticated
  using (true);

drop policy if exists "players_admin_all" on players;
create policy "players_admin_all"
  on players for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "players_team_update" on players;
create policy "players_team_update"
  on players for update to authenticated
  using (public.is_linked_player())
  with check (public.is_linked_player());

create or replace function public.guard_players_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_player_id int;
begin
  if public.is_admin() then
    return new;
  end if;

  if not public.is_linked_player() then
    raise exception 'not_allowed';
  end if;

  v_my_player_id := public.my_player_id();

  if new.name is distinct from old.name
    or new.position is distinct from old.position
    or new.rating is distinct from old.rating
    or new.goals is distinct from old.goals
    or new.assists is distinct from old.assists
    or new.photo_url is distinct from old.photo_url
  then
    raise exception 'forbidden_fields';
  end if;

  if new.status is distinct from old.status and new.id <> v_my_player_id then
    raise exception 'status_self_only';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_players_update_trigger on players;
create trigger guard_players_update_trigger
  before update on players
  for each row
  execute function public.guard_players_update();

-- === player_invites (админ) ===
drop policy if exists "invites_admin_all" on player_invites;
create policy "invites_admin_all"
  on player_invites for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- === голосование (если voting_rls.sql уже выполнялся) ===
drop policy if exists "match_availability_insert" on match_availability;
drop policy if exists "match_availability_update" on match_availability;
drop policy if exists "match_availability_delete" on match_availability;

create policy "match_availability_insert"
  on match_availability for insert to authenticated
  with check (public.my_player_id() = player_id);

create policy "match_availability_update"
  on match_availability for update to authenticated
  using (public.my_player_id() = player_id)
  with check (public.my_player_id() = player_id);

create policy "match_availability_delete"
  on match_availability for delete to authenticated
  using (public.my_player_id() = player_id);

drop policy if exists "match_player_rating_votes_insert" on match_player_rating_votes;
drop policy if exists "match_player_rating_votes_update" on match_player_rating_votes;
drop policy if exists "match_player_rating_votes_delete" on match_player_rating_votes;

create policy "match_player_rating_votes_insert"
  on match_player_rating_votes for insert to authenticated
  with check (
    public.my_player_id() = voter_player_id
    and rated_player_id <> voter_player_id
  );

create policy "match_player_rating_votes_update"
  on match_player_rating_votes for update to authenticated
  using (public.my_player_id() = voter_player_id)
  with check (public.my_player_id() = voter_player_id);

create policy "match_player_rating_votes_delete"
  on match_player_rating_votes for delete to authenticated
  using (public.my_player_id() = voter_player_id);
