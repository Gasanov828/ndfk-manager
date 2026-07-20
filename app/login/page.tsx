"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatNetworkAuthError, logoutViaApi } from "@/lib/playerAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/players";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth" ? "Не удалось войти" : null
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [currentUserLabel, setCurrentUserLabel] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserLabel(null);
        return;
      }

      const { data: rows } = await supabase.rpc("get_my_profile");
      const profile = rows?.[0] as
        | { role: string; player_name: string | null }
        | undefined;

      if (profile?.role === "admin") {
        setCurrentUserLabel(user.email ?? "Админ");
      } else if (profile?.player_name) {
        setCurrentUserLabel(`${profile.player_name} (игрок)`);
      } else {
        setCurrentUserLabel(user.email ?? "Пользователь");
      }
    }

    loadSession();
  }, []);

  async function handleLogout() {
    await logoutViaApi();
    setCurrentUserLabel(null);
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, adminOnly: true }),
      });

      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        code?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Не удалось войти");
        setErrorCode(data.code ?? null);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (error) {
      setError(formatNetworkAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-panel-strong rounded-3xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-blue-600/30 text-2xl">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-white">Вход для админа</h1>
          <p className="mt-2 text-sm text-slate-400">
            Только для управления командой. Если вы и капитан, и игрок —{" "}
            <strong className="text-slate-300">два разных email</strong>. Игрок —{" "}
            <Link href="/player/login" className="text-emerald-300 hover:underline">
              вход игрока
            </Link>
            .
          </p>
        </div>

        {currentUserLabel && (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p>
              Сейчас в браузере: <strong>{currentUserLabel}</strong>
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 text-xs font-semibold text-amber-200 underline hover:text-white"
            >
              Выйти из этого аккаунта
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-violet-400/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <p>{error}</p>
              {errorCode === "wrong_role_player" && (
                <Link
                  href="/player/login"
                  className="mt-2 inline-block font-semibold text-emerald-200 underline hover:text-white"
                >
                  Перейти к входу игрока →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 font-bold text-white transition hover:from-violet-500 hover:to-blue-500 disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти как админ"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Игроки регистрируются только по{" "}
          <span className="text-slate-400">личной ссылке</span> от капитана.
        </p>
        <Link
          href="/"
          className="mt-4 block text-center text-sm text-cyan-400 hover:underline"
        >
          ← На главную (без входа)
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
