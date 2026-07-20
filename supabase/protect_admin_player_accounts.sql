-- ============================================================
-- Капитан = два аккаунта: admin (управление) + player (опрос, рейтинг)
-- Выполните в Supabase SQL Editor один раз.
-- ============================================================

-- Не даём привязать игрока к админскому аккаунту (тот же login).
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
  v_existing_role text;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'user_mismatch';
  end if;

  select role into v_existing_role
  from profiles
  where id = p_user_id;

  if v_existing_role = 'admin' then
    raise exception 'admin_use_separate_player_email';
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
      role = case
        when profiles.role = 'admin' then profiles.role
        else 'player'
      end,
      username = coalesce(excluded.username, profiles.username);

  update player_invites
  set used_at = now(), used_by = p_user_id
  where id = v_invite_id;
end;
$fn$;

grant execute on function public.complete_player_registration(text, uuid, text) to authenticated;

-- Восстановить админа (подставьте свой админский email):
-- update profiles
-- set role = 'admin', player_id = null
-- where id = (select id from auth.users where email = 'gasanov.arslan2011@yandex.ru');

-- Проверка:
-- select u.email, p.role, p.player_id, pl.name
-- from auth.users u
-- left join profiles p on p.id = u.id
-- left join players pl on pl.id = p.player_id
-- order by u.email;
