-- Логин игрока (латиница) вместо email
-- Выполните в Supabase SQL Editor

alter table profiles add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on profiles (username)
  where username is not null;

-- Старые версии функций (без username) — удалить перед созданием новых
drop function if exists public.get_my_profile();
drop function if exists public.ensure_my_profile();
drop function if exists public.complete_player_registration(text, uuid);
drop function if exists public.complete_player_registration(text, uuid, text);

-- get_my_profile — с username
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
  from profiles p
  left join players pl on pl.id = p.player_id
  where p.id = auth.uid();
$$;

-- ensure_my_profile
create or replace function public.ensure_my_profile()
returns table (
  id uuid,
  player_id int,
  role text,
  player_name text,
  username text
)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from profiles where profiles.id = auth.uid()) then
    insert into profiles (id, role)
    values (auth.uid(), 'player');
  end if;

  return query
  select p.id, p.player_id, p.role, pl.name, p.username
  from profiles p
  left join players pl on pl.id = p.player_id
  where p.id = auth.uid();
end;
$fn$;

-- Регистрация по invite с логином
create or replace function public.complete_player_registration(
  p_token text,
  p_user_id uuid,
  p_username text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_player_id int;
  v_invite_id uuid;
  v_username text;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'user_mismatch';
  end if;

  select i.id, i.player_id
  into v_invite_id, v_player_id
  from player_invites i
  where i.token = p_token
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now())
  order by i.created_at desc
  limit 1;

  if v_invite_id is null then
    raise exception 'invite_invalid';
  end if;

  if exists (
    select 1 from profiles
    where player_id = v_player_id and id <> p_user_id
  ) then
    raise exception 'player_already_linked';
  end if;

  if p_username is not null and trim(p_username) <> '' then
    v_username := lower(trim(p_username));

    if v_username !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then
      raise exception 'invalid_username';
    end if;

    if exists (
      select 1 from profiles
      where username = v_username and id <> p_user_id
    ) then
      raise exception 'username_taken';
    end if;
  end if;

  insert into profiles (id, player_id, role, username)
  values (p_user_id, v_player_id, 'player', v_username)
  on conflict (id) do update
  set player_id = excluded.player_id,
      role = 'player',
      username = coalesce(excluded.username, profiles.username);

  update player_invites
  set used_at = now(), used_by = p_user_id
  where id = v_invite_id;
end;
$fn$;

grant execute on function public.complete_player_registration(text, uuid, text) to authenticated;

-- Проверка логина (для формы регистрации)
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from profiles
    where username = lower(trim(p_username))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.ensure_my_profile() to authenticated;
