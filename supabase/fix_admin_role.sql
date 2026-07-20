-- ============================================================
-- «Профиль не найден» — выполните в Supabase SQL Editor
-- ============================================================
-- 1. Замените email на тот, с которым входите на /login
-- 2. Run → Success
-- 3. На сайте: Выйти → снова Войти

insert into profiles (id, role)
select id, 'admin'
from auth.users
where email = 'твой@email.com'
on conflict (id) do update set role = 'admin';

-- Проверка (должна быть одна строка с role = admin):
select u.email, p.id, p.role
from auth.users u
left join profiles p on p.id = u.id
order by u.created_at desc;

-- (Опционально) профили для всех старых пользователей без profiles:
-- insert into profiles (id, role)
-- select u.id, 'player'
-- from auth.users u
-- left join profiles p on p.id = u.id
-- where p.id is null;

-- Не даём invite-регистрации сбрасывать admin → player:
create or replace function complete_player_registration(p_token text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id int;
  v_invite_id uuid;
begin
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

  if exists (select 1 from profiles where player_id = v_player_id) then
    raise exception 'player_already_linked';
  end if;

  insert into profiles (id, player_id, role)
  values (p_user_id, v_player_id, 'player')
  on conflict (id) do update
  set player_id = excluded.player_id,
      role = case
        when profiles.role = 'admin' then profiles.role
        else excluded.role
      end;

  update player_invites
  set used_at = now(), used_by = p_user_id
  where id = v_invite_id;
end;
$$;
