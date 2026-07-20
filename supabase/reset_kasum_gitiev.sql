-- Сброс аккаунтов Касум и Гитиев М. (Supabase → SQL Editor)
-- После выполнения: админка → Игроки → «Создать invite-ссылку» для каждого

-- 1) Посмотреть привязки
select
  p.id as player_id,
  p.name as player_name,
  pr.id as user_id,
  u.email
from players p
left join profiles pr on pr.player_id = p.id and pr.role = 'player'
left join auth.users u on u.id = pr.id
where p.name ilike '%Касум%' or p.name ilike '%Гитиев М.%'
order by p.name;

-- 2) Отвязать старые invite (иначе auth.users не удалить)
update player_invites
set used_by = null, used_at = null
where player_id in (
  select id from players
  where name ilike '%Касум%' or name ilike '%Гитиев М.%'
);

update player_invites
set expires_at = now()
where player_id in (
  select id from players
  where name ilike '%Касум%' or name ilike '%Гитиев М.%'
)
and used_at is null;

-- 3) Удалить профили игроков
delete from profiles
where player_id in (
  select id from players
  where name ilike '%Касум%' or name ilike '%Гитиев М.%'
)
and role = 'player';

-- 4) Удалить auth-пользователей
delete from auth.users
where id in (
  '029cb589-ae88-4f8b-a943-542f697db327',
  '93534f25-3a66-4910-b918-ba7d679f9588'
);
