-- LOCAL DEV seed data (loaded by `supabase start` / `supabase db reset`).
insert into public.players (name, position, rating, goals, assists, status, lineup_position)
values
  ('Иван Голкипер', 'Вратарь', 78, 0, 1, 'active', 'ВРТ'),
  ('Пётр Защитник', 'Защитник', 74, 2, 3, 'active', 'ЗАЩ1'),
  ('Сергей Полузащитник', 'Полузащитник', 81, 5, 7, 'active', 'ЦП1'),
  ('Алексей Нападающий', 'Нападающий', 85, 12, 4, 'active', 'НАП1')
on conflict do nothing;

insert into public.matches (opponent, date, time, location, is_played, is_live, ndfk_goals, opponent_goals)
values
  ('Соседний Двор', current_date - 7, '18:00', 'Стадион Н-Дженгутай', true, false, 3, 1),
  ('Городская Команда', current_date + 7, '19:30', 'Центральный стадион', false, false, null, null)
on conflict do nothing;
