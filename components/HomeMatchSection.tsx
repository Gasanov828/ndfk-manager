"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UpcomingMatchPollCard from "@/components/UpcomingMatchPollCard";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import { getHomeMvpDisplayMode, type HomeMvpDisplayMode } from "@/lib/homeMvp";
import { formatMatchDate } from "@/lib/matches";
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
import { supabase } from "@/lib/supabase";
import { SHOW_MATCH_MVP_UI } from "@/lib/matchMvpUi";

type HomeNowSectionProps = {
  matches: MatchWithLive[];
  /** Во время чемпионата показываем только LIVE-карточку, без дубля «ближайший матч» */
  liveOnly?: boolean;
};

/** Priority 1 — текущий / ближайший матч */
export function HomeNowSection({ matches, liveOnly = false }: HomeNowSectionProps) {
  return (
    <section className="mb-2 sm:mb-4">
      <UpcomingMatchPollCard initialMatches={matches} liveOnly={liveOnly} />
    </section>
  );
}

type HomeMvpSectionProps = {
  matchMvp: MatchMvpInfo;
  match: RatingVotingMatch & {
    opponent: string;
    ndfk_goals?: number | null;
    opponent_goals?: number | null;
  };
  personal?: boolean;
  matches?: MatchWithLive[];
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function mvpMatchScore(
  ndfk: number | null | undefined,
  opponent: number | null | undefined
): string | null {
  if (ndfk == null || opponent == null) return null;
  return `${ndfk}:${opponent}`;
}

function MvpStatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "rating" | "goal" | "votes";
}) {
  const toneClass =
    tone === "rating"
      ? "border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-100"
      : tone === "goal"
        ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100"
        : tone === "votes"
          ? "border-amber-400/20 bg-amber-500/[0.08] text-amber-100"
          : "border-white/10 bg-white/[0.04] text-slate-200";

  return (
    <div
      className={`home-mvp-stat min-w-0 rounded-md border px-1 py-0.5 text-center ${toneClass}`}
      title={`${label}: ${value}`}
    >
      <p className="truncate text-[7px] font-semibold uppercase leading-none tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-extrabold tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

function formatMvpVotes(mvp: MatchMvpInfo): string {
  const received = Math.max(0, Number(mvp.voteCount) || 0);
  const total = Math.max(0, Number(mvp.voterTotal) || 0);
  if (total > 0 && total !== received) {
    return `${received}/${total}`;
  }
  return String(received);
}

function HomeMvpDetailModal({
  open,
  mvp,
  match,
  personal,
  onClose,
}: {
  open: boolean;
  mvp: MatchMvpInfo;
  match: HomeMvpSectionProps["match"];
  personal: boolean;
  onClose: () => void;
}) {
  const scoreLabel = mvpMatchScore(match.ndfk_goals, match.opponent_goals);

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      showCloseButton
      title={
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300/80">
          MVP матча
        </p>
      }
      panelClassName="max-w-md border-emerald-400/15 bg-gradient-to-br from-[#0c1418] via-[#0a1014] to-[#081018]"
      footer={
        <div className="mb-1 grid grid-cols-2 gap-2">
          <Link
            href={`/players/${mvp.playerId}`}
            className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 py-2.5 text-center text-[12px] font-semibold text-cyan-100"
          >
            Профиль
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[12px] font-semibold text-slate-200"
          >
            Закрыть
          </button>
        </div>
      }
    >
      <div className="space-y-3 px-3 py-2">
        <div>
          <p className="text-[15px] font-bold text-slate-100">{mvp.playerName}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            vs {mvp.opponent} · {formatMatchDate(mvp.matchDate)}
            {personal ? " · это вы" : ""}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {scoreLabel ? (
            <MvpStatPill label="Счёт" value={scoreLabel} />
          ) : null}
          <MvpStatPill
            label="Оценка"
            value={formatVoteScore(mvp.avgScore)}
            tone="rating"
          />
          <MvpStatPill
            label="Голы"
            value={String(mvp.matchGoals ?? 0)}
            tone="goal"
          />
          <MvpStatPill
            label="Пасы"
            value={String(mvp.matchAssists ?? 0)}
            tone="goal"
          />
          <MvpStatPill
            label="Голоса"
            value={formatMvpVotes(mvp)}
            tone="votes"
          />
        </div>
      </div>
    </AppBottomSheet>
  );
}

function MinimalMvpCard({
  mvp,
  personal,
  match,
  dense = false,
  onOpen,
}: {
  mvp: MatchMvpInfo;
  personal: boolean;
  match: HomeMvpSectionProps["match"];
  dense?: boolean;
  onOpen?: () => void;
}) {
  const scoreLabel = mvpMatchScore(match.ndfk_goals, match.opponent_goals);
  const goals = String(mvp.matchGoals ?? 0);
  const assists = String(mvp.matchAssists ?? 0);
  const rating = formatVoteScore(mvp.avgScore);
  const votes = formatMvpVotes(mvp);
  const statCount = (scoreLabel ? 1 : 0) + 4;

  const body = (
    <>
      <div className="min-w-0 flex-[0.95] overflow-hidden">
        <div className="flex min-w-0 items-center gap-1">
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-400/80">
            MVP
          </span>
          {personal ? (
            <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-px text-[8px] font-medium text-emerald-200/90">
              вы
            </span>
          ) : null}
        </div>
        <Link
          href={`/players/${mvp.playerId}`}
          className={`mt-0.5 block truncate font-semibold leading-tight text-slate-100 hover:text-cyan-100 ${
            dense ? "text-[12px]" : "text-[13px]"
          }`}
          onClick={(event) => {
            if (onOpen) event.stopPropagation();
          }}
        >
          {dense ? firstName(mvp.playerName) : mvp.playerName}
        </Link>
        <p className="truncate text-[9px] leading-tight text-slate-500">
          {dense
            ? `vs ${mvp.opponent}`
            : `vs ${mvp.opponent} · ${formatMatchDate(mvp.matchDate)}`}
        </p>
      </div>

      <div
        className="grid min-w-0 flex-[1.15] gap-0.5"
        style={{ gridTemplateColumns: `repeat(${statCount}, minmax(0, 1fr))` }}
      >
        {scoreLabel ? <MvpStatPill label="Счёт" value={scoreLabel} /> : null}
        <MvpStatPill label="★" value={rating} tone="rating" />
        <MvpStatPill label="Голы" value={goals} tone="goal" />
        <MvpStatPill label="Пасы" value={assists} tone="goal" />
        <MvpStatPill label="Голоса" value={votes} tone="votes" />
      </div>
    </>
  );

  const shellClass =
    "home-mvp-card mb-2 flex min-w-0 items-center gap-1.5 overflow-hidden rounded-xl border border-emerald-500/12 bg-gradient-to-r from-emerald-950/35 via-slate-900/50 to-cyan-950/30 px-2 py-2 sm:mb-3 sm:gap-2 sm:px-2.5";

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${shellClass} w-full text-left transition hover:border-emerald-400/20 hover:bg-emerald-950/45`}
      >
        {body}
      </button>
    );
  }

  return <section className={shellClass}>{body}</section>;
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

  if (!SHOW_MATCH_MVP_UI || mode === "hidden") return null;

  if (mode === "compact") {
    return (
      <>
        <MinimalMvpCard
          mvp={matchMvp}
          match={match}
          personal={personal}
          dense
          onOpen={() => setDetailOpen(true)}
        />
        <HomeMvpDetailModal
          open={detailOpen}
          mvp={matchMvp}
          match={match}
          personal={personal}
          onClose={() => setDetailOpen(false)}
        />
      </>
    );
  }

  return (
    <MinimalMvpCard
      mvp={matchMvp}
      match={match}
      personal={personal}
    />
  );
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
