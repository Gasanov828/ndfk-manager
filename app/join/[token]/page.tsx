"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPlayerAuthError, logoutViaApi, normalizePlayerEmail } from "@/lib/playerAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type InviteInfo = {
  invite_id: string;
  player_id: number;
  player_name: string;
  expires_at: string | null;
};

function formatJoinError(message: string): string {
  if (message.includes("invite_invalid")) {
    return "Ссылка недействительна, уже использована или истекла.";
  }
  if (message.includes("player_already_linked")) {
    return "Этот игрок уже привязан к другому аккаунту.";
  }
  if (message.includes("admin_use_separate_player_email")) {
    return "Админский email нельзя использовать для игрока. Выйдите и зарегистрируйтесь с другим email.";
  }
  if (message.includes("user_mismatch")) {
    return "Ошибка сессии. Выйдите и попробуйте снова.";
  }
  return formatPlayerAuthError(message);
}

function normalizeInviteToken(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = normalizeInviteToken(params.token ?? "");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState(false);
  const [existingAdminSession, setExistingAdminSession] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setExistingSession(!!user);

      if (user) {
        const { data: profileRows } = await supabase.rpc("get_my_profile");
        setExistingAdminSession(profileRows?.[0]?.role === "admin");
      } else {
        setExistingAdminSession(false);
      }

      const { data, error: inviteError } = await supabase.rpc("get_player_invite", {
        p_token: token,
      });

      setLoadingInvite(false);

      if (inviteError) {
        setError(
          inviteError.message.includes("get_player_invite")
            ? "Ошибка сервера. Выполните supabase/fix_invite_links.sql в Supabase."
            : `Не удалось проверить ссылку: ${inviteError.message}`
        );
        return;
      }

      if (!data?.length) {
        setError(
          `Ссылка не найдена (код ${token.length} симв.). Скопируйте join_link из Supabase — файл show_active_links.sql — или «Копировать» в админке после «Новая ссылка».`
        );
        return;
      }

      setInvite(data[0] as InviteInfo);
    }

    loadInvite();
  }, [token]);

  async function completeRegistration(userId: string) {
    const supabase = createClient();
    const { error: completeError } = await supabase.rpc(
      "complete_player_registration",
      {
        p_token: token,
        p_user_id: userId,
      }
    );

    if (completeError) {
      throw new Error(formatJoinError(completeError.message));
    }
  }

  async function signInAndFinish(authEmail: string, userId: string) {
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      throw new Error(formatPlayerAuthError(signInError.message));
    }

    await completeRegistration(userId);
    setRegisteredEmail(authEmail);
    setDone(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
  }

  async function handleExistingSessionJoin() {
    if (!invite) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Сессия истекла. Войдите снова по этой ссылке.");
        setSaving(false);
        return;
      }

      await completeRegistration(user.id);
      setRegisteredEmail(user.email ?? null);
      setDone(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось привязать аккаунт");
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!invite) return;

    setSaving(true);
    setError(null);

    const authEmail = normalizePlayerEmail(email);

    try {
      const response = await fetch("/api/join/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: authEmail, password }),
      });

      const payload = (await response.json()) as {
        userId?: string;
        error?: string;
      };

      if (!response.ok || !payload.userId) {
        setSaving(false);
        setError(payload.error ?? "Не удалось зарегистрироваться.");
        return;
      }

      await signInAndFinish(authEmail, payload.userId);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Не удалось завершить регистрацию");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
        <div className="glass-panel-strong rounded-3xl p-8">
          {loadingInvite ? (
            <p className="text-center text-slate-400">Проверяем ссылку...</p>
          ) : done ? (
            <div className="text-center">
              <p className="text-4xl">⚽</p>
              <h1 className="mt-4 text-2xl font-bold text-white">
                Добро пожаловать, {invite?.player_name?.split(/\s+/)[0]}!
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Аккаунт создан
                {registeredEmail ? ` · ${registeredEmail}` : null}
              </p>
              <p className="mt-4 text-sm text-emerald-200">
                Сейчас откроется главная — там твой рейтинг и место в команде
              </p>
            </div>
          ) : invite ? (
            <>
              <div className="mb-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Регистрация игрока · НДФК
                </p>
                <h1 className="mt-2 text-2xl font-bold text-white">
                  {invite.player_name}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Укажите email и пароль для входа в приложение.
                </p>
              </div>

              {existingSession ? (
                <div className="space-y-4">
                  {existingAdminSession ? (
                    <>
                      <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                        Вы вошли как <strong>админ</strong>. Для игрока «
                        {invite.player_name}» нужен отдельный email — выйдите и
                        зарегистрируйтесь заново.
                      </p>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                        onClick={async () => {
                          await logoutViaApi();
                          setExistingSession(false);
                          setExistingAdminSession(false);
                          router.refresh();
                        }}
                      >
                        Выйти из админского аккаунта
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                        Вы уже вошли. Привязать аккаунт к игроку{" "}
                        <strong>{invite.player_name}</strong>?
                      </p>
                      {error && (
                        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                          {error}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleExistingSessionJoin}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 font-bold text-white transition hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50"
                      >
                        {saving ? "Привязка..." : "Завершить регистрацию"}
                      </button>
                      <p className="text-center text-xs text-slate-500">
                        <button
                          type="button"
                          className="text-cyan-400 hover:underline"
                          onClick={async () => {
                            await logoutViaApi();
                            setExistingSession(false);
                            router.refresh();
                          }}
                        >
                          Выйти и зарегистрироваться заново
                        </button>
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-300">Email</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      spellCheck={false}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-emerald-400/50 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Капитан: другой email, не админский. Повторный вход —{" "}
                      <Link href="/player/login" className="text-cyan-400 hover:underline">
                        /player/login
                      </Link>
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-300">
                      Пароль (мин. 6 символов)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-emerald-400/50 focus:outline-none"
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 font-bold text-white transition hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50"
                  >
                    {saving ? "Регистрация..." : "Зарегистрироваться"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-4xl">⚠️</p>
              <p className="mt-4 text-sm text-red-200">
                {error ?? "Ссылка не работает"}
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm text-cyan-400 hover:underline"
              >
                На главную
              </Link>
            </div>
          )}
        </div>
      </div>
  );
}
