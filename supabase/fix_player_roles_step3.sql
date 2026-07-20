-- ШАГ 3 (необязательно, если шаг 1 уже помог)
-- В SQL Editor: НЕ выделяй текст — просто Run на всём файле
-- Или скопируй ВСЁ от строки create до последней строки с $fn$;

create or replace function public.complete_player_registration(p_token text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
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

  insert into profiles (id, player_id, role)
  values (p_user_id, v_player_id, 'player')
  on conflict (id) do update
  set player_id = excluded.player_id,
      role = 'player';

  update player_invites
  set used_at = now(), used_by = p_user_id
  where id = v_invite_id;
end;
$fn$;
