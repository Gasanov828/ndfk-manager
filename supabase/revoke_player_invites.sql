-- Отзыв invite-ссылок (выполните один раз в Supabase SQL Editor)

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
