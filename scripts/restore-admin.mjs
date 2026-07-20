/**
 * Проверка и восстановление роли admin.
 * node scripts/restore-admin.mjs [email]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

const adminEmail = (process.argv[2] ?? "gasanov.arslan2011@yandex.ru")
  .trim()
  .toLowerCase();

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("=== Все аккаунты ===");
const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  perPage: 200,
});

if (listError) {
  console.error("Не удалось получить пользователей:", listError.message);
  process.exit(1);
}

const users = listData.users ?? [];
for (const user of users) {
  const { data: profile } = await admin
    .from("profiles")
    .select("role, player_id")
    .eq("id", user.id)
    .maybeSingle();

  let playerName = null;
  if (profile?.player_id) {
    const { data: player } = await admin
      .from("players")
      .select("name")
      .eq("id", profile.player_id)
      .maybeSingle();
    playerName = player?.name ?? null;
  }

  console.log(
    `- ${user.email} | role=${profile?.role ?? "NO PROFILE"} | player=${playerName ?? profile?.player_id ?? "-"}`
  );
}

const target = users.find(
  (user) => user.email?.toLowerCase() === adminEmail
);

if (!target) {
  console.error(`\nАккаунт ${adminEmail} не найден в Supabase Auth.`);
  console.error("Создайте пользователя: Supabase → Authentication → Users → Add user");
  process.exit(1);
}

const { data: before } = await admin
  .from("profiles")
  .select("role, player_id")
  .eq("id", target.id)
  .maybeSingle();

console.log(`\n=== До: ${adminEmail} ===`);
console.log(before ?? "профиля нет");

if (before?.role === "admin" && before?.player_id == null) {
  console.log("\nРоль admin уже OK. Если вход не работает — проверьте пароль или выйдите и войдите снова на /login");
  process.exit(0);
}

const { error: upsertError } = await admin.from("profiles").upsert(
  {
    id: target.id,
    role: "admin",
    player_id: null,
  },
  { onConflict: "id" }
);

if (upsertError) {
  console.error("\nОшибка восстановления:", upsertError.message);
  process.exit(1);
}

const { data: after } = await admin
  .from("profiles")
  .select("role, player_id")
  .eq("id", target.id)
  .single();

console.log(`\n=== После: ${adminEmail} ===`);
console.log(after);
console.log("\nГотово. На сайте: Выйти → /login → войти с этим email и паролем админа.");
