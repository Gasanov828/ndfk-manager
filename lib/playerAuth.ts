export function normalizePlayerEmail(input: string): string {
  return input.trim().toLowerCase();
}

export type AuthErrorCode =
  | "wrong_role_player"
  | "wrong_role_admin"
  | "admin_use_separate_player_email";

export function formatAuthRoleError(code: AuthErrorCode): string {
  if (code === "wrong_role_player") {
    return "Это игровой аккаунт. Войдите через «Вход игрока» (/player/login). Админка — отдельный email на /login.";
  }
  if (code === "wrong_role_admin") {
    return "Это админский аккаунт. Войдите через /login. Для опроса и рейтинга зарегистрируйте игрока по invite-ссылке с другим email.";
  }
  return "Админский email нельзя использовать для игрока. Выйдите, зарегистрируйтесь по ссылке с другим email (например личная почта или второй ящик).";
}

export function formatPlayerAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("admin_use_separate_player_email")) {
    return formatAuthRoleError("admin_use_separate_player_email");
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("terminated")
  ) {
    return "Нет связи с Supabase. Проверьте интернет, обновите страницу или перезапустите dev-сервер. Если проект давно не использовали — откройте Supabase Dashboard и «разбудите» проект.";
  }
  if (lower.includes("rate limit") || lower.includes("over_email_send")) {
    return "Слишком много попыток входа/регистрации. Подождите около часа. В Supabase: Authentication → Email — «Confirm email» должен быть выключен.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (lower.includes("already") || lower.includes("registered")) {
    return "Этот email уже зарегистрирован. Если это вы — проверьте пароль.";
  }
  return message;
}

export function formatNetworkAuthError(error: unknown): string {
  if (error instanceof Error) {
    return formatPlayerAuthError(error.message);
  }
  return formatPlayerAuthError("Failed to fetch");
}

export async function logoutViaApi(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
}
