-- Игрок может менять только своё имя в таблице players
-- Выполните в Supabase SQL Editor после fix_rls_recursion.sql

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

  if new.name is distinct from old.name then
    if new.id <> v_my_player_id then
      raise exception 'name_self_only';
    end if;
    if length(trim(new.name)) < 2 then
      raise exception 'name_too_short';
    end if;
    if length(trim(new.name)) > 40 then
      raise exception 'name_too_long';
    end if;
  end if;

  if new.position is distinct from old.position
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
