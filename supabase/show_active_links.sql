-- Скопируйте готовую ссылку из колонки join_link (ничего менять не нужно)
select
  p.name as player_name,
  i.token,
  i.expires_at,
  i.used_at,
  case
    when i.used_at is not null then 'уже использована'
    when i.expires_at is not null and i.expires_at <= now() then 'истекла'
    else 'активна'
  end as status,
  'http://localhost:3000/join/' || i.token as join_link_local
from player_invites i
join players p on p.id = i.player_id
order by i.created_at desc
limit 20;
