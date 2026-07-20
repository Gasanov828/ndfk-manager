-- ============================================================
-- ШАГ 2 — выполните этот блок ЦЕЛИКОМ (скопируйте от create до $$;)
-- ============================================================

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
as $ensure$
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
$ensure$;
