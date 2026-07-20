-- Invite-ссылки для игроков (Supabase → SQL Editor)
-- Выполните после auth_setup.sql и fix_profile_access.sql

grant select, insert, update on player_invites to authenticated;

-- Активная ссылка для игрока (только admin)
create or replace function public.get_active_player_invite(p_player_id int)
returns table (
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  return query
  select i.token, i.expires_at
  from player_invites i
  where i.player_id = p_player_id
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now())
  order by i.created_at desc
  limit 1;
end;
$$;

grant execute on function public.get_active_player_invite(int) to authenticated;

-- Статус аккаунта игрока (только admin)
create or replace function public.get_player_account_status(p_player_id int)
returns table (
  is_linked boolean,
  has_active_invite boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  return query
  select
    exists(
      select 1 from profiles pr
      where pr.player_id = p_player_id and pr.role = 'player'
    ),
    exists(
      select 1 from player_invites i
      where i.player_id = p_player_id
        and i.used_at is null
        and (i.expires_at is null or i.expires_at > now())
    );
end;
$$;

grant execute on function public.get_player_account_status(int) to authenticated;

-- Создание invite (обновлённая версия — старые ссылки гасим)
create or replace function public.create_player_invite(p_player_id int)
returns table (token text, invite_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  if not exists (select 1 from players where id = p_player_id) then
    raise exception 'player_not_found';
  end if;

  if exists (
    select 1 from profiles pr
    where pr.player_id = p_player_id and pr.role = 'player'
  ) then
    raise exception 'player_already_registered';
  end if;

  update player_invites
  set expires_at = now()
  where player_id = p_player_id
    and used_at is null
    and (expires_at is null or expires_at > now());

  v_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  insert into player_invites (player_id, token, expires_at, created_by)
  values (p_player_id, v_token, now() + interval '30 days', auth.uid());

  return query select v_token, v_token;
end;
$$;

grant execute on function public.create_player_invite(int) to authenticated;

-- Отозвать все активные ссылки игрока (только admin)
create or replace function public.revoke_player_invites(p_player_id int)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count int;
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  update player_invites
  set expires_at = now()
  where player_id = p_player_id
    and used_at is null
    and (expires_at is null or expires_at > now());

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

grant execute on function public.revoke_player_invites(int) to authenticated;

-- Регистрация по invite (если уже вошли — без signUp)
create or replace function public.complete_player_registration(p_token text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id int;
  v_invite_id uuid;
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

  insert into profiles (id, player_id, role)
  values (p_user_id, v_player_id, 'player')
  on conflict (id) do update
  set player_id = excluded.player_id,
      role = 'player';

  update player_invites
  set used_at = now(), used_by = p_user_id
  where id = v_invite_id;
end;
$$;

grant execute on function complete_player_registration(text, uuid) to authenticated;

-- Статусы всех игроков для админки
create or replace function public.list_players_account_status()
returns table (
  player_id int,
  is_linked boolean,
  has_active_invite boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    exists(
      select 1 from profiles pr
      where pr.player_id = p.id and pr.role = 'player'
    ),
    exists(
      select 1 from player_invites i
      where i.player_id = p.id
        and i.used_at is null
        and (i.expires_at is null or i.expires_at > now())
    )
  from players p
  where exists (
    select 1 from profiles admin
    where admin.id = auth.uid() and admin.role = 'admin'
  )
  order by p.name;
$$;

grant execute on function public.list_players_account_status() to authenticated;
