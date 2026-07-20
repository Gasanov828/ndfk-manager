-- Восстановить admin (ваш email @yandex.ru)
update profiles
set role = 'admin', player_id = null
where id = (
  select id from auth.users
  where email = 'gasanov.arslan2011@yandex.ru'
);

-- Проверка:
select u.email, p.role, p.player_id, pl.name
from auth.users u
join profiles p on p.id = u.id
left join players pl on pl.id = p.player_id;
