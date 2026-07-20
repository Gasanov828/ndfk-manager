-- Запустите ЭТОТ файл целиком в Supabase SQL Editor
-- Проект должен быть: kfeslirpreumvbwfcrds (см. .env.local)

-- Права на таблицу (без этого приложение не видит profiles)
grant usage on schema public to anon, authenticated;
grant select, insert, update on profiles to authenticated;
grant select on profiles to anon;

-- Читать свой профиль (обходит RLS)
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

-- Создать профиль если нет (только player — admin назначается вручную в SQL)
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

-- Ручной admin (если нужно):
-- insert into profiles (id, role)
-- select id, 'admin' from auth.users where email ilike '%gasanov.arslan%'
-- on conflict (id) do update set role = 'admin';

-- Проверка:
-- select u.email, p.role from auth.users u left join profiles p on p.id = u.id;
