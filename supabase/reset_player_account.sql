-- Сброс тестового аккаунта игрока (Supabase → SQL Editor)
-- Меняйте только имя между % % :

-- Шаг A — посмотреть (скопируйте id из колонки user_id)
select
  p.name as player_name,
  u.id as user_id,
  u.email
from players p
join profiles pr on pr.player_id = p.id and pr.role = 'player'
join auth.users u on u.id = pr.id
where p.name ilike '%Идрис%';

-- Шаг B — подставьте user_id из шага A (UUID в кавычках)
-- delete from profiles where id = 'ВСТАВЬТЕ-UUID-СЮДА';
-- delete from auth.users where id = 'ВСТАВЬТЕ-UUID-СЮДА';

-- Шаг C — сбросить invite (после B)
-- update player_invites
-- set expires_at = now()
-- where player_id = (select id from players where name ilike '%Идрис%' limit 1)
--   and used_at is null;

-- Дальше: войти как админ → Игроки → у Идриса снова «Создать invite-ссылку»
