"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { logoutViaApi } from "@/lib/playerAuth";
import {
  formatOverallRating,
  formatVoteScore,
  getMatchRatingColorClass,
} from "@/lib/matchRatings";
import { getRankLabel, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

import { ADMIN_NAV_ITEMS } from "@/lib/adminNav";

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
        <LogoutButton />
      </div>
    );
  }

  const positionStyle = getPositionStyle(welcome.positionGroup);
  const rankLabel = getRankLabel(welcome.rank, welcome.totalPlayers);
  const hasMatchVote =
    welcome.matchVoteScore != null && Number.isFinite(welcome.matchVoteScore);
  const afterMatch = hasMatchVote
    ? formatVoteScore(welcome.matchVoteScore!)
    : "—";
  const afterMatchClass = hasMatchVote
    ? getMatchRatingColorClass(welcome.matchVoteScore!)
    : "text-white";

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-2.5 py-2.5">
          <PlayerAvatar
            name={welcome.name}
            photoUrl={welcome.photoUrl}
            size="xs"
            badge={welcome.positionGroup}
            badgeClassName={positionStyle.badge}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-white">
              {welcome.name}
            </h1>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {welcome.position}
              {welcome.lineupLabel ? ` · ${welcome.lineupLabel}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="rating-lime text-xl font-black leading-none">
              {formatOverallRating(welcome.rating)}
            </p>
            <div className="mt-0.5 flex justify-end">
              <RatingChangeBadge delta={welcome.ratingDelta} size="sm" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-white/10">
          <div className="px-1.5 py-2 text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Место
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {welcome.rank}/{welcome.totalPlayers}
            </p>
            <p className="mt-0.5 truncate text-[8px] text-slate-500">
              {rankLabel}
            </p>
          </div>
          <div className="px-1.5 py-2 text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Голы
            </p>
            <p className="mt-0.5 text-sm font-black text-white">{welcome.goals}</p>
          </div>
          <div className="px-1.5 py-2 text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Пасы
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {welcome.assists}
            </p>
          </div>
          <div className="px-1.5 py-2 text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Оценка
            </p>
            <p
              className={`mt-0.5 text-sm font-black tabular-nums ${afterMatchClass}`}
            >
              {afterMatch}
            </p>
            {welcome.lastMatchLabel && (
              <p className="mt-0.5 truncate text-[8px] text-slate-500">
                {welcome.lastMatchLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Link
          href={`/players/${welcome.id}`}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center text-[12px] font-semibold text-slate-200 transition hover:bg-white/[0.06]"
        >
          Моя карточка
        </Link>
        <Link
          href="/lineup"
          className="btn-neon-primary rounded-xl px-3 py-2.5 text-center text-[12px] font-bold text-slate-50"
        >
          Мой состав
        </Link>
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
