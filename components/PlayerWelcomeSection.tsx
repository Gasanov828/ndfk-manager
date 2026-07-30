"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlayerWelcomeCard from "@/components/PlayerWelcomeCard";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import type { MatchMvpInfo } from "@/lib/matchRatings";
import {
  getLiveMatch,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { supabase } from "@/lib/supabase";

type PlayerWelcomeSectionProps = {
  initialWelcome: PlayerWelcomeData | null;
  /** Kept for API compatibility; MVP is shown in the match block */
  initialPersonalMvp?: MatchMvpInfo | null;
  isMatchMvp?: boolean;
};

export default function PlayerWelcomeSection({
  initialWelcome,
  initialPersonalMvp = null,
  isMatchMvp = false,
}: PlayerWelcomeSectionProps) {
  const { user, profile, loading } = useAuthProfile();
  const [welcome, setWelcome] = useState<PlayerWelcomeData | null>(
    initialWelcome
  );
  const [matchMvpBadge, setMatchMvpBadge] = useState(
    isMatchMvp || Boolean(initialPersonalMvp?.isConfirmedMvp)
  );
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    setWelcome(initialWelcome);
    setMatchMvpBadge(isMatchMvp || Boolean(initialPersonalMvp?.isConfirmedMvp));
  }, [initialWelcome, initialPersonalMvp, isMatchMvp]);

  useEffect(() => {
    let cancelled = false;

    async function syncLive() {
      const { data } = await supabase.from("matches").select("*");
      if (cancelled) return;
      if (getLiveMatch((data ?? []) as MatchWithLive[])) {
        setMatchMvpBadge(false);
      }
    }

    const onStarted = () => setMatchMvpBadge(false);
    const onFinished = () => {
      setMatchMvpBadge(
        isMatchMvp || Boolean(initialPersonalMvp?.isConfirmedMvp)
      );
      void syncLive();
    };

    window.addEventListener(MATCH_STARTED_EVENT, onStarted);
    window.addEventListener(MATCH_FINISHED_EVENT, onFinished);
    void syncLive();

    return () => {
      cancelled = true;
      window.removeEventListener(MATCH_STARTED_EVENT, onStarted);
      window.removeEventListener(MATCH_FINISHED_EVENT, onFinished);
    };
  }, [initialPersonalMvp, isMatchMvp]);

  useEffect(() => {
    if (welcome || loading || fetching || !user) return;
    if (!profile?.player_id || profile.role === "admin") return;

    let cancelled = false;
    setFetching(true);

    fetch("/api/me/welcome", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (data: {
          welcome: PlayerWelcomeData | null;
          personalMvp: MatchMvpInfo | null;
        }) => {
          if (cancelled) return;
          if (data.welcome) setWelcome(data.welcome);
          if (data.personalMvp?.isConfirmedMvp) setMatchMvpBadge(true);
        }
      )
      .catch(() => {
        // guest view stays
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [welcome, loading, fetching, user, profile]);

  function handleNameUpdated(name: string) {
    setWelcome((prev) =>
      prev
        ? {
            ...prev,
            name,
            firstName: getFirstName(name),
          }
        : null
    );
  }

  if (welcome) {
    return (
      <PlayerWelcomeCard
        data={welcome}
        onNameUpdated={handleNameUpdated}
        isMatchMvp={matchMvpBadge}
      />
    );
  }

  if (loading || fetching) {
    return (
      <section className="glass-panel-strong mb-2 animate-pulse rounded-2xl p-4 sm:mb-4 sm:p-5">
        <div className="h-16 rounded-xl bg-white/5" />
      </section>
    );
  }

  if (user && profile && profile.role !== "admin" && !profile.player_id) {
    return (
      <section className="mb-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 sm:mb-6 sm:rounded-3xl sm:p-5">
        <p className="text-sm font-semibold text-amber-100">
          Аккаунт не привязан к игроку
        </p>
        <p className="mt-2 text-sm text-amber-100/80">
          Откройте приглашение по invite-ссылке от капитана — тогда на главной
          появятся ваш профиль и статистика.
        </p>
        <Link
          href="/player/login"
          className="mt-3 inline-block text-sm font-medium text-cyan-300 hover:underline"
        >
          Вход в кабинет игрока →
        </Link>
      </section>
    );
  }

  return null;
}
