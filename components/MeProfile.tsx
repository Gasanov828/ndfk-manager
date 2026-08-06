"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutViaApi } from "@/lib/playerAuth";
import { ADMIN_NAV_ITEMS } from "@/lib/adminNav";
import type { PlayerWelcomeData } from "@/lib/playerStats";

const ADMIN_LINKS = ADMIN_NAV_ITEMS;

type MeProfileProps = {
  mode: "guest" | "player" | "admin";
  displayName?: string | null;
  welcome?: PlayerWelcomeData | null;
};

function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logoutViaApi();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleLogout}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
    >
      {loading ? "..." : "Выйти"}
    </button>
  );
}

export default function MeProfile({
  mode,
  displayName,
  welcome,
}: MeProfileProps) {
  if (mode === "guest") {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
          <div className="border-b border-white/8 px-3 py-2">
            <h1 className="text-sm font-bold text-white">Профиль</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Войдите, чтобы видеть свой рейтинг и менять состав
            </p>
          </div>
          <div className="space-y-1.5 p-2.5">
            <Link
              href="/player/login?return=/me"
              className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2.5 text-[13px] font-semibold text-emerald-100 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
            >
              <span aria-hidden>⚽</span>
              Вход игрока
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-2.5 text-[13px] font-semibold text-violet-100 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25"
            >
              <span aria-hidden>🔐</span>
              Вход админа
            </Link>
          </div>
        </div>
        <p className="px-1 text-[10px] text-slate-500">
          Зрители могут смотреть без входа. Игроки — по invite-ссылке.
        </p>
      </div>
    );
  }

  if (mode === "admin") {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
          <div className="border-b border-white/8 px-3 py-2">
            <h1 className="text-sm font-bold text-white">
              {displayName ?? "Админ"}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Админ · управление командой
            </p>
          </div>
          <div className="divide-y divide-white/8">
            {ADMIN_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-slate-200 transition hover:bg-white/[0.04]"
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
                <span className="ml-auto text-slate-600">›</span>
              </Link>
            ))}
          </div>
        </div>
        <Link
          href="/career"
          className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-[13px] font-semibold text-amber-100 transition hover:bg-amber-500/15"
        >
          <span aria-hidden>🏆</span>
          Карьера и достижения
          <span className="ml-auto text-amber-200/50">›</span>
        </Link>
        <LogoutButton />
      </div>
    );
  }

  if (!welcome) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-white/10 px-3 py-4 text-center">
          <p className="text-sm font-semibold text-white">
            {displayName ?? "Игрок"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Профиль игрока ещё не привязан
          </p>
        </div>
      </div>
    );
  }

  return null;
}
