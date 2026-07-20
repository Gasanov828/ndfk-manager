# Доступ: зрители, игроки, админ

## Шаг 1 — SQL в Supabase

В **SQL Editor** выполните содержимое файла `supabase/auth_setup.sql`.

## Шаг 2 — Создайте аккаунт админа

1. Supabase → **Authentication** → **Users** → **Add user**
2. Email + пароль (ваш админский)
3. Скопируйте **User UID**
4. В SQL Editor:

```sql
insert into profiles (id, role)
values ('ВАШ-UUID', 'admin')
on conflict (id) do update set role = 'admin';
```

## Шаг 3 — Вход

- Сайт `/` — **без регистрации**, только просмотр
- `/login` — вход **только для админа**
- `/admin/*` — закрыто без роли admin

## Шаг 4 — Invite-ссылки для игроков

1. В Supabase SQL Editor выполните **`supabase/player_invites.sql`**
2. Войдите как админ → **Админка → Игроки**
3. У игрока без аккаунта нажмите **🔗** в списке или откройте **✏️ редактирование**
4. **«Создать invite-ссылку»** → **Копировать** или **Отправить** в WhatsApp/Telegram
5. **«Сбросить»** — отозвать ссылку (перестанет работать). **«Новая ссылка»** — старая гасится, создаётся новая
6. Игрок: **email** + пароль на `/join/...`, повторный вход — **`/player/login`**

### Supabase Auth (важно)

**Authentication → Providers → Email:**

- **Confirm email** — **выключить** (иначе игрок не войдёт без письма)
- Регистрация — только по invite-ссылке `/join/...`, не через `/player/login`

**«email rate limit exceeded»** — лимит встроенной почты Supabase: **~2 письма в час на весь проект**. Каждая попытка регистрации через `signUp` съедает лимит; «таймер» не сбросится, пока не перестанете жать кнопку и не подождёте час.

**Обход (рекомендуется):** регистрация идёт через сервер без писем. В `.env.local` добавьте:

```
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_ключ
```

Ключ: Supabase → **Project Settings → API → service_role** (secret, не публикуйте). Перезапустите `npm run dev`.

**Authentication → Email:** **Confirm email — выключить**.

Для продакшена позже: свой SMTP (Resend, Gmail и т.д.) → **Authentication → Rate Limits** — можно поднять лимит.

### Статусы в админке

| Бейдж | Значение |
|-------|----------|
| ✅ Аккаунт | Игрок зарегистрировался |
| 🔗 Ссылка отправлена | Есть активная ссылка, ждём регистрации |
| нет аккаунта | Ссылку ещё не создавали |

## Капитан: админ + игрок (два аккаунта)

Рекомендуется **два email**:

| Роль | Email | Вход | Что можно |
|------|-------|------|-----------|
| **Админ** | ваш основной (например `@yandex.ru`) | `/login` | матчи, игроки, история |
| **Игрок** | другой ящик | invite → `/player/login` | опрос, рейтинг, состав |

**Не используйте один email** для админки и игрока — вход будет путаться.

### Настройка один раз

1. SQL: **`supabase/protect_admin_player_accounts.sql`** — защита от случайной привязки игрока к админу
2. Восстановить админа (подставьте email):

```sql
update profiles
set role = 'admin', player_id = null
where id = (select id from auth.users where email = 'gasanov.arslan2011@yandex.ru');
```

3. Admin → Игроки → invite для «Арслан» → регистрация с **другим** email
4. Телефон — игрок, комп — админ (или выход/вход при смене роли)

## Шаг 5 — Вход админа
## Если вошли, но «Админки» нет

Открой меню профиля (аватар справа). Если написано **«Игрок»** или **«Вход без профиля»** — роль admin не назначена.

Проверка в SQL Editor:

```sql
select u.email, p.role
from auth.users u
left join profiles p on p.id = u.id;
```

Вернуть себе админа (подставь свой email):

```sql
insert into profiles (id, role)
select id, 'admin'
from auth.users
where email = 'твой@email.com'
on conflict (id) do update set role = 'admin';
```

Выйди и зайди снова через `/login`.

## Что дальше

- Выполните **`supabase/voting_rls.sql`** — голосовать смогут только вошедшие игроки
- Выполните **`supabase/fix_rls_recursion.sql`** — если «infinite recursion» на profiles
- Выполните **`supabase/lineup_rls.sql`** — игроки смогут менять состав на `/lineup` (или только fix_rls_recursion.sql — там уже всё)
- RLS на остальные таблицы (matches)
- Деплой на Vercel
