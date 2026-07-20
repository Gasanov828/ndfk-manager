# Деплой НДФК Manager на Vercel

Сайт: Next.js 16 + Supabase. Фото пока не обязательны.

## 1. Сборка должна проходить локально

```powershell
cd C:\Users\PC\football-manager
npm run build
```

Если ошибка — исправьте до деплоя.

## 2. Vercel — новый проект

1. Откройте [vercel.com](https://vercel.com) → войдите (GitHub / email).
2. **Add New… → Project**.
3. **Import** репозиторий с кодом **или** загрузите папку:
   - если нет Git: установите [Git for Windows](https://git-scm.com/download/win), создайте репозиторий на GitHub и запушьте `football-manager`;
   - либо в терминале проекта: `npx vercel` (см. шаг 4).

**Root Directory:** `football-manager` (если репо — вся папка, оставьте `.`)

**Framework Preset:** Next.js (определится автоматически)

## 3. Переменные окружения (Environment Variables)

В Vercel → Project → **Settings → Environment Variables** добавьте **для Production, Preview, Development**:

| Имя | Значение |
|-----|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | из `.env.local` — `https://kfeslirpreumvbwfcrds.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | публичный anon key из Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** key (`sb_secret_...`) — только на сервере Vercel, не в коде |

Скопируйте из локального `.env.local`. **Service role никому не отправляйте.**

## 4. Деплой через CLI (без GitHub)

```powershell
cd C:\Users\PC\football-manager
npx vercel login
npx vercel
```

На вопросы: Link to existing project? **N** → имя например `ndfk-manager`.

Production:

```powershell
npx vercel --prod
```

После деплоя будет URL вида `https://ndfk-manager.vercel.app`.

## 5. Supabase — разрешить новый домен

Supabase → **Authentication → URL Configuration**:

1. **Site URL:** `https://ВАШ-проект.vercel.app`
2. **Redirect URLs** — добавьте:
   - `https://ВАШ-проект.vercel.app/**`
   - `https://ВАШ-проект.vercel.app/auth/callback`

Сохраните.

## 6. Проверка после деплоя

- [ ] Главная открывается
- [ ] `/player/login` — вход игрока
- [ ] `/login` — вход админа
- [ ] Invite-ссылка `/join/...` works
- [ ] Админка `/admin/players` только у админа

## 7. Ссылка для команды

Отправьте в чат:

```
НДФК Manager: https://ВАШ-проект.vercel.app
Вход игрока: https://ВАШ-проект.vercel.app/player/login
```

Invite-ссылки для регистрации — из админки (копировать URL).

## Обновления

После изменений в коде:

- **GitHub + Vercel:** push в main → деплой сам.
- **CLI:** `npx vercel --prod` из папки проекта.

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| Failed to fetch / логин не работает | Site URL и Redirect URLs в Supabase |
| Регистрация по join не работает | Проверьте `SUPABASE_SERVICE_ROLE_KEY` на Vercel |
| Пустая страница | Логи: Vercel → Deployments → View Function Logs |
| infinite recursion profiles | Выполните `supabase/fix_rls_recursion.sql` |
