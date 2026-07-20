-- ============================================================
-- ШАГ 1 — выполните ТОЛЬКО этот блок (снимает admin у игроков)
-- ============================================================

update profiles
set role = 'player'
where player_id is not null
  and role = 'admin';

-- Проверка:
select u.email, p.role, p.player_id, pl.name as player_name
from auth.users u
join profiles p on p.id = u.id
left join players pl on pl.id = p.player_id
order by p.role desc, u.email;

-- Если ваш admin слетел — раскомментируйте и подставьте email:
-- update profiles set role = 'admin', player_id = null
-- where id = (select id from auth.users where email = 'ваш@email.com');
