-- Только права (без политик). Безопасно запускать повторно.
-- Если rating_episode.sql уже выполнялся — достаточно ЭТОГО файла.

grant select on public.rating_episodes to anon, authenticated;
grant select, insert, update, delete on public.rating_episodes to authenticated;
grant select on public.rating_episode_votes to anon, authenticated;
grant select, insert, update, delete on public.rating_episode_votes to authenticated;
grant select on public.player_attributes to anon, authenticated;
grant select, insert, update, delete on public.player_attributes to authenticated;

-- Проверка: после «Создать опрос» в /admin/rating здесь должна быть строка
select token, title, status, created_at
from public.rating_episodes
order by created_at desc
limit 5;
