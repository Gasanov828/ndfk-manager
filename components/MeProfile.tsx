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
      {loading
        ? "..."
        : "\u0412\u044b\u0439\u0442\u0438"}
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
      <div className="-mt-1 space-y-2 sm:-mt-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
          <div className="border-b border-white/8 px-3 py-2">
            <h1 className="text-sm font-bold text-white">
              {"\u041f\u0440\u043e\u0444\u0438\u043b\u044c"}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {"\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0432\u0438\u0434\u0435\u0442\u044c \u0441\u0432\u043e\u0439 \u0440\u0435\u0439\u0442\u0438\u043d\u0433 \u0438 \u043c\u0435\u043d\u044f\u0442\u044c \u0441\u043e\u0441\u0442\u0430\u0432"}
            </p>
          </div>
          <div className="space-y-1.5 p-2.5">
            <Link
              href="/player/login?return=/me"
              className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2.5 text-[13px] font-semibold text-emerald-100 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
            >
              <span aria-hidden>{"\u26BD"}</span>
              {"\u0412\u0445\u043e\u0434 \u0438\u0433\u0440\u043e\u043a\u0430"}
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-2.5 text-[13px] font-semibold text-violet-100 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25"
            >
              <span aria-hidden>{"\uD83D\uDD10"}</span>
              {"\u0412\u0445\u043e\u0434 \u0430\u0434\u043c\u0438\u043d\u0430"}
            </Link>
          </div>
        </div>
        <p className="px-1 text-[10px] text-slate-500">
          {"\u0417\u0440\u0438\u0442\u0435\u043b\u0438 \u043c\u043e\u0433\u0443\u0442 \u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0431\u0435\u0437 \u0432\u0445\u043e\u0434\u0430. \u0418\u0433\u0440\u043e\u043a\u0438 \u2014 \u043f\u043e invite-\u0441\u0441\u044b\u043b\u043a\u0435."}
        </p>
      </div>
    );
  }

  if (mode === "admin") {
    return (
      <div className="-mt-1 space-y-2 sm:-mt-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
          <div className="border-b border-white/8 px-3 py-2">
            <h1 className="text-sm font-bold text-white">
              {displayName ?? "\u0410\u0434\u043c\u0438\u043d"}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {"\u0410\u0434\u043c\u0438\u043d \u00b7 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u043e\u0439"}
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
                <span className="ml-auto text-slate-600">{"\u203A"}</span>
              </Link>
            ))}
          </div>
        </div>
        <LogoutButton />
      </div>
    );
  }

  if (!welcome) {
    return (
      <div className="-mt-1 space-y-2 sm:-mt-2">
        <div className="rounded-xl border border-white/10 px-3 py-4 text-center">
          <p className="text-sm font-semibold text-white">
            {displayName ?? "\u0418\u0433\u0440\u043e\u043a"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {"\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0438\u0433\u0440\u043e\u043a\u0430 \u0435\u0449\u0451 \u043d\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d"}
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
    : "\u2014";
  const afterMatchClass = hasMatchVote
    ? getMatchRatingColorClass(welcome.matchVoteScore!)
    : "text-white";

  return (
    <div className="-mt-1 space-y-2 sm:-mt-2">
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
              {welcome.lineupLabel ? ` \u00b7 ${welcome.lineupLabel}` : ""}
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
              {"\u041c\u0435\u0441\u0442\u043e"}
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
              {"\u0413\u043e\u043b\u044b"}
            </p>
            <p className="mt-0.5 text-sm font-black text-white">{welcome.goals}</p>
          </div>
          <div className="px-1.5 py-2 text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              {"\u041f\u0430\u0441\u044b"}
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
          {"\u041c\u043e\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430"}
        </Link>
        <Link
          href="/lineup"
          className="btn-neon-primary rounded-xl px-3 py-2.5 text-center text-[12px] font-bold text-slate-50"
        >
          {"\u041c\u043e\u0439 \u0441\u043e\u0441\u0442\u0430\u0432"}
        </Link>
      </div>

      <LogoutButton />
    </div>
  );
}
