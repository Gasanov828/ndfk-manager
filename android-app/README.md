# НДФК Manager — личный APK

Android-обёртка над сайтом https://ndfk-manager.vercel.app  
Только для личной установки, без Google Play.

## Что внутри

- Открывает ваш сайт в полноэкранном режиме
- Те же данные Supabase, вход, состав, матчи
- Интернет обязателен (как в браузере)

## Быстрая сборка APK

### 1. Установите (один раз)

1. **JDK 21** (Capacitor 7 требует Java 21):
   ```powershell
   winget install Microsoft.OpenJDK.21
   ```
   Или JDK уже скачан в `%USERPROFILE%\.jdks\microsoft-jdk-21` скриптом сборки.
2. **Android SDK** — скрипт `scripts/install-android-sdk.ps1` скачает автоматически,  
   или установите [Android Studio](https://developer.android.com/studio).

### 2. Соберите APK

```powershell
cd android-app
npm run build:apk
```

Готовый файл: `android-app/ndfk-manager-debug.apk`

### 3. Установите на телефон

1. Скопируйте `ndfk-manager-debug.apk` на телефон (USB, Telegram, Google Drive)
2. Откройте файл на телефоне
3. Разрешите установку из неизвестных источников (только для этого файла)

## Альтернатива без сборки

Chrome → ndfk-manager.vercel.app → «Установить приложение» / «На главный экран».

## Сменить URL (локальная разработка)

В `capacitor.config.ts` измените `server.url`, затем:

```powershell
npm run sync
npm run build:apk
```

## Открыть в Android Studio

```powershell
npm run open
```

Build → Build Bundle(s) / APK(s) → Build APK(s)
