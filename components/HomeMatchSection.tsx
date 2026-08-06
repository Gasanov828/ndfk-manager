"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MatchMvpRichCard from "@/components/MatchMvpRichCard";
import UpcomingMatchPollCard from "@/components/UpcomingMatchPollCard";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import { getHomeMvpDisplayMode, type HomeMvpDisplayMode } from "@/lib/homeMvp";
import {
  formatVoteScore,
  type MatchMvpInfo,
  type RatingVotingMatch,
} from "@/lib/matchRatings";
import {
  getLiveMatch,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { supabase } from "@/lib/supabase";

type HomeNowSectionProps = {
  matches: MatchWithLive[];
};

/** Priority 1 — текущий / ближайший матч */
export function HomeNowSection({ matches }: HomeNowSectionProps) {
  return (
    <section className="mb-2 sm:mb-4">
      <UpcomingMatchPollCard initialMatches={matches} />
    </section>
  );
}

type HomeMvpSectionProps = {
  matchMvp: MatchMvpInfo;
  match: RatingVotingMatch & { opponent: string };
  personal?: boolean;
  matches?: MatchWithLive[];
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function HomeMvpDetailModal({
  open,
  mvp,
  personal,
  onClose,
}: {
  open: boolean;
  mvp: MatchMvpInfo;
  personal: boolean;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      showCloseButton
      title={
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
          🏆 MVP матча
        </p>
      }
      panelClassName="max-w-md border-amber-300/25 bg-gradient-to-br from-[#151d32] via-[#0b1224] to-[#080d18]"
      footer={
        <div className="mb-1 grid grid-cols-2 gap-2">
          <Link
            href={`/players/${mvp.playerId}`}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 py-2.5 text-center text-[12px] font-bold text-cyan-100"
          >
            Профиль
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[12px] font-bold text-slate-200"
          >
            Закрыть
          </button>
        </div>
      }
    >
      <div className="px-3 py-2">
        <div className="mvp-gold-card overflow-hidden rounded-2xl px-2.5 py-2">
          <MatchMvpRichCard mvp={mvp} personal={personal} />
        </div>
      </div>
    </AppBottomSheet>
  );
}

function FeaturedMvpCard({
  mvp,
  personal,
}: {
  mvp: MatchMvpInfo;
  personal: boolean;
}) {
  const photo = mvp.photoUrl ?? null;
  const initials = getPlayerInitials(mvp.playerName) || "?";
  const goals = mvp.matchGoals ?? 0;
  const assists = mvp.matchAssists ?? 0;

  return (
    <section className="mvp-gold-card mb-2 overflow-hidden rounded-[20px] px-3 py-3 sm:mb-4 sm:px-4 sm:py-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-200/85">
        🏆 MVP последнего матча
      </p>
      <div className="mt-2.5 flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-amber-300/35 bg-slate-900 sm:h-16 sm:w-16">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-black text-amber-100">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-black text-white sm:text-lg">
            {mvp.playerName}
            {personal ? (
              <span className="ml-1 text-[11px] font-bold text-amber-200/70">
                (вы)
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-amber-100/60">
            vs {mvp.opponent}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/70">
            Оценка
          </p>
          <p className="rating-gold-mvp text-[1.65rem] font-black leading-none tabular-nums">
            {formatVoteScore(mvp.avgScore)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-amber-300/20 bg-black/25 px-3 py-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Голы
          </p>
          <p className="mt-0.5 text-[18px] font-extrabold tabular-nums text-white">
            {goals}
          </p>
        </div>
        <div className="rounded-xl border border-amber-300/20 bg-black/25 px-3 py-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Ассисты
          </p>
          <p className="mt-0.5 text-[18px] font-extrabold tabular-nums text-white">
            {assists}
          </p>
        </div>
      </div>
    </section>
  );
}

function CompactMvpCard({
  mvp,
  onOpen,
}: {
  mvp: MatchMvpInfo;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-2 flex w-full items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2 text-left transition hover:border-amber-400/40 hover:bg-amber-500/[0.12] sm:mb-3"
    >
      <span className="text-[13px]" aria-hidden>
        🏆
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-amber-50/95">
        Последний MVP · {firstName(mvp.playerName)}
        <span className="text-amber-200/80">
          {" "}
          · ⭐{formatVoteScore(mvp.avgScore)}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-amber-200/60">
        →
      </span>
    </button>
  );
}

/** MVP последнего матча: featured → compact → скрыт; во время LIVE скрыт */
export function HomeMvpSection({
  matchMvp,
  match,
  personal = false,
  matches = [],
}: HomeMvpSectionProps) {
  const [isLive, setIsLive] = useState(() => Boolean(getLiveMatch(matches)));
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshLive() {
      const { data } = await supabase.from("matches").select("*");
      if (cancelled) return;
      setIsLive(Boolean(getLiveMatch((data ?? []) as MatchWithLive[])));
    }

    const onStarted = () => setIsLive(true);
    const onFinished = () => {
      void refreshLive();
    };

    window.addEventListener(MATCH_STARTED_EVENT, onStarted);
    window.addEventListener(MATCH_FINISHED_EVENT, onFinished);
    void refreshLive();

    return () => {
      cancelled = true;
      window.removeEventListener(MATCH_STARTED_EVENT, onStarted);
      window.removeEventListener(MATCH_FINISHED_EVENT, onFinished);
    };
  }, []);

  const mode: HomeMvpDisplayMode = useMemo(
    () =>
      getHomeMvpDisplayMode({
        isLive,
        mvp: matchMvp,
        match,
      }),
    [isLive, matchMvp, match]
  );

  if (mode === "hidden") return null;

  if (mode === "compact") {
    return (
      <>
        <CompactMvpCard mvp={matchMvp} onOpen={() => setDetailOpen(true)} />
        <HomeMvpDetailModal
          open={detailOpen}
          mvp={matchMvp}
          personal={personal}
          onClose={() => setDetailOpen(false)}
        />
      </>
    );
  }

  return <FeaturedMvpCard mvp={matchMvp} personal={personal} />;
}

export function HomeCalendarLink() {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 sm:mb-5">
      <p className="text-[11px] text-slate-400 sm:text-xs">
        Календарь и история матчей
      </p>
      <Link
        href="/matches"
        className="text-[11px] font-semibold text-cyan-300/90 hover:underline sm:text-xs"
      >
        Все матчи →
      </Link>
    </div>
  );
}
