"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClubLogo from "@/components/ClubLogo";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { formatOverallRating } from "@/lib/matchRatings";
import {
  getFirstName,
  getRankLabel,
  type PlayerWelcomeData,
} from "@/lib/playerStats";

function ClubWelcomeMark() {
  return (
    <Link
      href="/"
      className="flex min-w-0 flex-1 items-center gap-3.5"
    >
      <ClubLogo size="xl" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="navbar-club-welcome truncate text-[15px]">
          {"\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c"}
        </p>
        <p className="mt-1 truncate text-[14px] tracking-tight">
          <span className="navbar-club-fk mr-1 not-italic">{"\u0424\u041a"}</span>
          <span className="navbar-club-name">
            {"\u041d\u0438\u0436\u043d\u0438\u0439 \u0414\u0436\u0435\u043d\u0433\u0443\u0442\u0430\u0439"}
          </span>
        </p>
      </div>
    </Link>
  );
}

export default function NavbarWelcome() {
  const { user, profile, loading } = useAuthProfile();
  const [welcome, setWelcome] = useState<PlayerWelcomeData | null>(null);

  const canLoadPlayer =
    !!user && !!profile?.player_id && profile.role !== "admin";

  useEffect(() => {
    if (loading || !canLoadPlayer) {
      setWelcome(null);
      return;
    }

    let cancelled = false;

    fetch("/api/me/welcome", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { welcome: PlayerWelcomeData | null }) => {
        if (!cancelled) setWelcome(data.welcome);
      })
      .catch(() => {
        if (!cancelled) setWelcome(null);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, canLoadPlayer, user, profile]);

  const name = welcome?.name ?? profile?.player_name ?? null;
  const firstName = name ? getFirstName(name) : null;

  if (canLoadPlayer && (welcome || firstName)) {
    const rankLabel =
      welcome != null
        ? getRankLabel(welcome.rank, welcome.totalPlayers)
        : null;

    return (
      <Link href="/me" className="flex min-w-0 flex-1 items-center gap-2.5">
        <ClubLogo size="sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-white">
            {firstName}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">
            {welcome?.lineupLabel ??
              "\u041c\u043e\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c"}
          </p>
        </div>

        {welcome ? (
          <div
            className="navbar-rating-glow relative z-[1] shrink-0 rounded-xl px-2.5 py-1 text-right"
            title={"\u0420\u0435\u0439\u0442\u0438\u043d\u0433 \u0438\u0433\u0440\u043e\u043a\u0430"}
          >
            <p className="relative z-[1] text-[8px] font-bold uppercase tracking-[0.14em] text-lime-200/90">
              {"\u2605 \u0420\u0435\u0439\u0442\u0438\u043d\u0433"}
            </p>
            <div className="relative z-[1] mt-0.5 flex items-end justify-end gap-1">
              <span className="navbar-rating-value text-[19px] font-black leading-none">
                {formatOverallRating(welcome.rating)}
              </span>
              <RatingChangeBadge delta={welcome.ratingDelta} size="sm" />
            </div>
            <p className="relative z-[1] mt-0.5 text-[8px] font-semibold text-lime-100/70">
              {welcome.rank}/{welcome.totalPlayers}
              {rankLabel ? ` \u00b7 ${rankLabel}` : ""}
            </p>
          </div>
        ) : null}
      </Link>
    );
  }

  return <ClubWelcomeMark />;
}
