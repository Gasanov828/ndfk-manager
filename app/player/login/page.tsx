"use client";

import Link from "next/link";
import {
  formatNetworkAuthError,
  formatPlayerAuthError,
  normalizePlayerEmail,
} from "@/lib/playerAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function PlayerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return")?.trim() || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizePlayerEmail(email),
          password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        code?: string;
      };

      if (!response.ok || !data.ok) {
        setError(formatPlayerAuthError(data.error ?? "Не удалось войти"));
        setErrorCode(data.code ?? null);
        return;
      }

      router.push(returnTo.startsWith("/") ? returnTo : "/");
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-600/30 text-2xl">
            ⚽
          </div>
          <h1 className="text-2xl font-bold text-white">Вход игрока</h1>
          <p className="mt-2 text-sm text-slate-400">
            Email и пароль, которые задали при регистрации по invite-ссылке.
            Капитану нужен{" "}
            <strong className="text-slate-300">другой email</strong>, не админский.
          </p>
        </div>

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
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Пароль</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-emerald-400/50 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <p>{error}</p>
              {errorCode === "wrong_role_admin" && (
                <Link
                  href="/login"
                  className="mt-2 inline-block font-semibold text-violet-200 underline hover:text-white"
                >
                  Перейти к входу админа →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 font-bold text-white transition hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Нет аккаунта? Попросите invite-ссылку у капитана.
        </p>
        <Link
          href="/"
          className="mt-4 block text-center text-sm text-cyan-400 hover:underline"
        >
          ← На главную
        </Link>
        <Link
          href="/login"
          className="mt-2 block text-center text-xs text-slate-500 hover:text-slate-400"
        >
          Вход для админа →
        </Link>
      </div>
    </div>
  );
}

export default function PlayerLoginPage() {
  return (
    <Suspense>
      <PlayerLoginForm />
    </Suspense>
  );
}
