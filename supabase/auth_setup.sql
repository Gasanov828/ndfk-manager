-- Auth + invite-only players (Supabase → SQL Editor)
-- После выполнения: Authentication → Providers → Email → отключите "Enable sign ups" 
-- (или оставьте включённым только если регистрация идёт через /join/...)

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_id int references players(id) on delete set null,
  role text not null default 'player' check (role in ('admin', 'player')),
  created_at timestamptz not null default now(),
  unique (player_id)
);

create table if not exists player_invites (
  id uuid primary key default gen_random_uuid(),
  player_id int not null references players(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists player_invites_token_idx on player_invites(token);

alter table profiles enable row level security;
alter table player_invites enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on profiles to authenticated;
grant select on profiles to anon;

-- profiles
drop policy if exists "profiles_read_own" on profiles;
create policy "profiles_read_own"
  on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all"
  on profiles for select to authenticated
  using (
    exists (
      select 1 from profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  );

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
  on profiles for insert to authenticated
  with check (id = auth.uid());

-- player_invites: только админ через RPC
drop policy if exists "invites_admin_all" on player_invites;
create policy "invites_admin_all"
  on player_invites for all to authenticated
  using (
    exists (
      select 1 from profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  );

-- Проверка invite (без раскрытия всех ссылок)
create or replace function get_player_invite(p_token text)
returns table (
  invite_id uuid,
  player_id int,
  player_name text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.id, i.player_id, p.name, i.expires_at
  from player_invites i
  join players p on p.id = i.player_id
  where i.token = p_token
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function get_player_invite(text) to anon, authenticated;

-- Завершение регистрации игрока по invite
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
      role = 'player';

  update player_invites
  set used_at = now(), used_by = p_user_id
  where id = v_invite_id;
end;
$$;

grant execute on function complete_player_registration(text, uuid) to authenticated;

-- Создание invite (только admin)
create or replace function create_player_invite(p_player_id int)
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

  v_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  insert into player_invites (player_id, token, expires_at, created_by)
  values (p_player_id, v_token, now() + interval '30 days', auth.uid());

  return query select v_token, v_token;
end;
$$;

grant execute on function create_player_invite(int) to authenticated;

-- Профиль: чтение и автосоздание
create or replace function public.get_my_profile()
returns table (
  id uuid,
  player_id int,
  role text,
  player_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.player_id, p.role, pl.name
  from profiles p
  left join players pl on pl.id = p.player_id
  where p.id = auth.uid();
$$;

grant execute on function public.get_my_profile() to authenticated;

create or replace function public.ensure_my_profile()
returns table (
  id uuid,
  player_id int,
  role text,
  player_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from profiles where profiles.id = auth.uid()) then
    insert into profiles (id, role)
    values (auth.uid(), 'player');
  end if;

  return query
  select p.id, p.player_id, p.role, pl.name
  from profiles p
  left join players pl on pl.id = p.player_id
  where p.id = auth.uid();
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

-- Профиль при создании пользователя в Auth (иначе «Профиль не найден»)
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

-- Публичное чтение для зрителей (игроки, матчи, история)
-- Если политики уже открыты — можно пропустить. Иначе раскомментируйте:
-- create policy "public_read_players" on players for select to anon using (true);
-- create policy "public_read_matches" on matches for select to anon using (true);

-- СТАНОВИТЕСЬ АДМИНОМ (один раз после Add user в Authentication):
-- insert into profiles (id, role)
-- select id, 'admin' from auth.users where email = 'ваш@email.com'
-- on conflict (id) do update set role = 'admin';
