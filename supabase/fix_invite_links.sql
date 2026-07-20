-- Исправление invite-ссылок (Supabase → SQL Editor)
-- Запустите, если ссылка «не работает» после сброса/создания новой

-- Проверка invite: trim токена, короткий токен (32 символа)
create or replace function public.get_player_invite(p_token text)
returns table (
  invite_id uuid,
  player_id int,
  player_name text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select i.id, i.player_id, p.name, i.expires_at
  from player_invites i
  join players p on p.id = i.player_id
  where i.token = trim(p_token)
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function public.get_player_invite(text) to anon, authenticated;

-- Создание invite: гасим старые, токен покороче (не обрезается в мессенджерах)
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

  v_token := replace(gen_random_uuid()::text, '-', '');

  insert into player_invites (player_id, token, expires_at, created_by)
  values (p_player_id, v_token, now() + interval '30 days', auth.uid());

  return query select v_token, v_token;
end;
$$;

grant execute on function public.create_player_invite(int) to authenticated;

-- Диагностика (только admin): активные ссылки игрока
create or replace function public.list_player_invites_debug(p_player_id int)
returns table (
  token_prefix text,
  created_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  is_active boolean
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
    left(i.token, 8) || '…' as token_prefix,
    i.created_at,
    i.expires_at,
    i.used_at,
    (i.used_at is null and (i.expires_at is null or i.expires_at > now())) as is_active
  from player_invites i
  where i.player_id = p_player_id
  order by i.created_at desc
  limit 10;
end;
$$;

grant execute on function public.list_player_invites_debug(int) to authenticated;
