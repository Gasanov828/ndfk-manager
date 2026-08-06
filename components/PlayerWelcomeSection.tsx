"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomePlayerHero from "@/components/HomePlayerHero";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { PLAYER_PHOTO_UPDATED_EVENT } from "@/lib/playerPhotos";
import type { MatchMvpInfo } from "@/lib/matchRatings";
import {
  getLiveMatch,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { type PlayerWelcomeData } from "@/lib/playerStats";
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

  useEffect(() => {
    if (!user || !profile?.player_id || profile.role === "admin") return;

    function refetchWelcome() {
      fetch("/api/me/welcome", { cache: "no-store" })
        .then((response) => response.json())
        .then((data: { welcome: PlayerWelcomeData | null }) => {
          if (data.welcome) setWelcome(data.welcome);
        })
        .catch(() => {
          // keep current welcome
        });
    }

    window.addEventListener(PLAYER_PHOTO_UPDATED_EVENT, refetchWelcome);
    return () => {
      window.removeEventListener(PLAYER_PHOTO_UPDATED_EVENT, refetchWelcome);
    };
  }, [user, profile]);

  if (welcome) {
    return <HomePlayerHero welcome={welcome} />;
  }

  if (loading || fetching) {
    return (
      <section className="home-hero home-hero--enter mb-2 animate-pulse sm:mb-4">
        <div className="home-hero__main">
          <div className="h-[5.25rem] w-[5.25rem] rounded-full bg-white/5" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-6 w-2/3 rounded-lg bg-white/5" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 rounded-xl bg-white/5" />
              <div className="h-12 rounded-xl bg-white/5" />
              <div className="h-12 rounded-xl bg-white/5" />
            </div>
          </div>
          <div className="h-24 w-24 rounded-2xl bg-white/5" />
        </div>
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
