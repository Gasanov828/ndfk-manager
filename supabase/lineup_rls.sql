-- RLS: игроки могут менять состав (lineup_position), админ — всё
-- Сначала выполните fix_rls_recursion.sql (функции is_admin / is_linked_player)
-- Затем этот файл — или только fix_rls_recursion.sql (он включает всё нужное)

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
