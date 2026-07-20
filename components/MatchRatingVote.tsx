"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ScorePicker from "@/components/ScorePicker";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import {
  countPendingRatingVotes,
  formatVoteScore,
  formatVotingCountdown,
  formatVotingTimeRemaining,
  getLatestOpenMatchForVoting,
  getMatchRatingCoverage,
  getRatingDelta,
  getVotingTimeRemainingMs,
  getVotingUrgency,
  hasCompletedRatingVote,
  isVotingDeadlinePassed,
  MAX_VOTE_SCORE,
  type MatchRatingVote,
} from "@/lib/matchRatings";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import {
  filterParticipatingPlayerIds,
  getMatchRatingVoterIds,
} from "@/lib/matchParticipation";
import {
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { recalculateMatchRatingsViaApi } from "@/lib/matchRatingRecalcApi";
import { AWAY_MATCH_RATING } from "@/lib/ratingVoteBranding";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import { useMobileOverlayLock } from "@/hooks/useMobileOverlay";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

type Player = {
  id: number;
  name: string;
  position: string;
};

type PlayedMatch = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  location: string;
  is_played: boolean;
  rating_voting_ends_at?: string | null;
};

export default function MatchRatingVote({ compact = false }: { compact?: boolean }) {
  const { playerId: myPlayerId, canVote, loading: authLoading } =
    useMyPlayerId();
  const [open, setOpen] = useState(false);
  const [match, setMatch] = useState<PlayedMatch | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [iParticipated, setIParticipated] = useState(true);
  const [votes, setVotes] = useState<MatchRatingVote[]>([]);
  const [draftRatings, setDraftRatings] = useState<Record<number, number>>({});
  const [summaries, setSummaries] = useState<
    {
      player_id: number;
      match_rating: number;
      is_mvp: boolean;
      vote_count: number;
      rating_before?: number | null;
      rating_after?: number | null;
    }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [skippingVote, setSkippingVote] = useState(false);
  const [iSkippedVote, setISkippedVote] = useState(false);
  const [ratingVoterIds, setRatingVoterIds] = useState<number[]>([]);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useMobileOverlayLock(open);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const participantIds = players.map((player) => player.id);
  const pendingCount = countPendingRatingVotes(participantIds, myPlayerId, votes);
  const voteComplete = hasCompletedRatingVote(participantIds, myPlayerId, votes);
  const ratingCoverage = getMatchRatingCoverage(participantIds, votes);
  const deadlinePassed = match ? isVotingDeadlinePassed(match) : false;
  const votingClosed = deadlinePassed;
  const ratingsApplied = summaries.length > 0;
  const isActive =
    Boolean(match && canVote && iParticipated && !iSkippedVote) &&
    !voteComplete &&
    !votingClosed;
  const canRate =
    canVote &&
    iParticipated &&
    !iSkippedVote &&
    !voteComplete &&
    !votingClosed &&
    !saving;

  const ratingTargets = players.filter((player) => player.id !== myPlayerId);
  const myRatedCount = ratingTargets.filter(
    (player) =>
      draftRatings[player.id] >= 1 && draftRatings[player.id] <= MAX_VOTE_SCORE
  ).length;
  const canSubmitPartial = myRatedCount > 0 && !votingClosed && !voteComplete;

  const loadGuestData = useCallback(async () => {
    const { data: matches } = await supabase.from("matches").select("*");
    const matchRows = (matches ?? []) as MatchWithLive[];
    const latestPlayed = getLatestOpenMatchForVoting(
      matchRows as PlayedMatch[]
    );

    if (!latestPlayed) {
      setMatch(null);
      return;
    }

    setMatch(latestPlayed);

    const { data: playerData } = await supabase
      .from("players")
      .select("id, name, position")
      .order("name");

    let guestParticipantIds: number[] = [];
    let guestRatingVoterIds: number[] = [];

    if (playerData) {
      const { data: participationRows } = await supabase
        .from("match_player_participation")
        .select("player_id, participated, skipped_rating_vote")
        .eq("match_id", latestPlayed.id);

      guestParticipantIds = filterParticipatingPlayerIds(
        playerData.map((player) => player.id),
        participationRows ?? []
      );
      const participantSet = new Set(guestParticipantIds);
      guestRatingVoterIds = getMatchRatingVoterIds(
        guestParticipantIds,
        participationRows ?? []
      );

      setPlayers(playerData.filter((player) => participantSet.has(player.id)));
      setRatingVoterIds(guestRatingVoterIds);
      setIParticipated(
        myPlayerId != null ? participantSet.has(myPlayerId) : true
      );
      setISkippedVote(
        myPlayerId != null
          ? Boolean(
              participationRows?.find((row) => row.player_id === myPlayerId)
                ?.skipped_rating_vote
            )
          : false
      );
    }

    const { data: voteData, error: voteError } = await supabase
      .from("match_player_rating_votes")
      .select("*")
      .eq("match_id", latestPlayed.id);

    if (voteError?.message.includes("match_player_rating")) {
      setSchemaMissing(true);
      return;
    }

    setSchemaMissing(false);
    const voteRows = (voteData ?? []) as MatchRatingVote[];
    setVotes(voteRows);

    const myVotes = voteRows.filter(
      (vote) => vote.voter_player_id === myPlayerId
    );
    const fromDb = myVotes.reduce<Record<number, number>>((acc, vote) => {
      acc[vote.rated_player_id] = vote.stars;
      return acc;
    }, {});

    setDraftRatings((prev) => {
      if (open && Object.keys(prev).length > 0) {
        return { ...fromDb, ...prev };
      }
      return fromDb;
    });

    const { data: summaryData } = await supabase
      .from("match_player_rating_summary")
      .select("player_id, match_rating, is_mvp, vote_count, rating_before, rating_after")
      .eq("match_id", latestPlayed.id)
      .order("match_rating", { ascending: false });

    const { data: statsRows } = await supabase
      .from("match_player_stats")
      .select("goals, assists, saves")
      .eq("match_id", latestPlayed.id);

    const hasStatActivity = (statsRows ?? []).some(
      (row) =>
        (row.goals ?? 0) > 0 || (row.assists ?? 0) > 0 || (row.saves ?? 0) > 0
    );

    const summariesLoaded = summaryData ?? [];

    if (
      canVote &&
      summariesLoaded.length === 0 &&
      latestPlayed.is_played &&
      (voteRows.length > 0 || hasStatActivity)
    ) {
      try {
        await recalculateMatchRatingsViaApi(latestPlayed.id);
        const { data: freshSummaries } = await supabase
          .from("match_player_rating_summary")
          .select("player_id, match_rating, is_mvp, vote_count, rating_before, rating_after")
          .eq("match_id", latestPlayed.id)
          .order("match_rating", { ascending: false });

        setSummaries(freshSummaries ?? []);
        return;
      } catch {
        // Повторим при следующей загрузке
      }
    }

    setSummaries(summariesLoaded);
  }, [myPlayerId, open, canVote]);

  useEffect(() => {
    if (authLoading || !myPlayerId) return;
    loadGuestData();

    const interval = setInterval(loadGuestData, 60000);
    const onMatchStateChange = () => loadGuestData();

    window.addEventListener(MATCH_FINISHED_EVENT, onMatchStateChange);
    window.addEventListener(MATCH_STARTED_EVENT, onMatchStateChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener(MATCH_FINISHED_EVENT, onMatchStateChange);
      window.removeEventListener(MATCH_STARTED_EVENT, onMatchStateChange);
    };
  }, [loadGuestData, authLoading, myPlayerId]);

  useEffect(() => {
    if (!match) {
      setRemainingMs(null);
      return;
    }

    const update = () => setRemainingMs(getVotingTimeRemainingMs(match));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [match]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  async function handleDeclineParticipation() {
    if (!match || !myPlayerId || !canVote || votingClosed) return;

    if (
      !confirm(
        "Вы не играли в этом матче? Вы не будете участвовать в голосовании и оценке ★."
      )
    ) {
      return;
    }

    setDeclining(true);

    const { error: participationError } = await supabase
      .from("match_player_participation")
      .upsert(
        {
          match_id: match.id,
          player_id: myPlayerId,
          participated: false,
        },
        { onConflict: "match_id,player_id" }
      );

    if (participationError) {
      alert(
        participationError.message.includes("match_player_participation")
          ? "Выполните SQL: match_participation.sql и match_participation_rls.sql"
          : participationError.message
      );
      setDeclining(false);
      return;
    }

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("voter_player_id", myPlayerId);

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("rated_player_id", myPlayerId);

    try {
      await recalculateMatchRatingsViaApi(match.id);
      await loadGuestData();
      setOpen(false);
      alert("Отмечено: вы не играли в этом матче.");
    } catch (recalcError) {
      alert(
        recalcError instanceof Error
          ? recalcError.message
          : "Ошибка обновления голосования"
      );
    }

    setDeclining(false);
  }

  async function handleSkipVoting() {
    if (!match || !myPlayerId || !canVote || votingClosed) return;

    if (
      !confirm(
        "Не будете голосовать? Ваши оценки удалятся, но вы остаётесь участником матча."
      )
    ) {
      return;
    }

    setSkippingVote(true);

    const { error: participationError } = await supabase
      .from("match_player_participation")
      .upsert(
        {
          match_id: match.id,
          player_id: myPlayerId,
          participated: true,
          skipped_rating_vote: true,
        },
        { onConflict: "match_id,player_id" }
      );

    if (participationError) {
      alert(
        participationError.message.includes("skipped_rating_vote")
          ? "Выполните SQL: match_participation_skipped_vote.sql"
          : participationError.message.includes("match_player_participation")
            ? "Выполните SQL: match_participation.sql и match_participation_rls.sql"
            : participationError.message
      );
      setSkippingVote(false);
      return;
    }

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("voter_player_id", myPlayerId);

    try {
      await recalculateMatchRatingsViaApi(match.id);
      await loadGuestData();
      setOpen(false);
      alert("Отмечено: вы не участвуете в голосовании за этот матч.");
    } catch (recalcError) {
      alert(
        recalcError instanceof Error
          ? recalcError.message
          : "Ошибка обновления голосования"
      );
    }

    setSkippingVote(false);
  }

  async function handleSubmit() {
    if (!match || !myPlayerId || !canVote) return;

    const ratedTargets = ratingTargets.filter(
      (player) =>
        draftRatings[player.id] >= 1 && draftRatings[player.id] <= MAX_VOTE_SCORE
    );

    if (ratedTargets.length === 0) {
      alert(`Поставьте хотя бы одну оценку (от 1 до ${MAX_VOTE_SCORE})`);
      return;
    }

    setSaving(true);

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("voter_player_id", myPlayerId);

    const rows = ratedTargets.map((player) => ({
      match_id: match.id,
      voter_player_id: myPlayerId,
      rated_player_id: player.id,
      stars: draftRatings[player.id],
    }));

    const { error } = await supabase.from("match_player_rating_votes").insert(rows);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    try {
      const result = await recalculateMatchRatingsViaApi(match.id);
      await loadGuestData();

      setSaving(false);

      if (result.ratingsApplied) {
        alert(
          result.votingClosed
            ? "Время голосования вышло. ★ обновлены по собранным оценкам и статистике."
            : `Сохранено ${ratedTargets.length} оценок. ★ обновлены (оценено ${ratingCoverage.ratedCount} из ${ratingCoverage.total}).`
        );
      } else {
        alert(`Сохранено ${ratedTargets.length} оценок.`);
      }
    } catch (recalcError) {
      alert(
        recalcError instanceof Error
          ? recalcError.message
          : "Ошибка пересчёта оценок"
      );
      setSaving(false);
    }
  }

  if (authLoading || !canVote) return null;
  if (!match) return null;

  const guestRatingButtonLabel = (
    topLine: string,
    muted = false,
    countdownMs?: number | null
  ) => {
    const urgency =
      countdownMs != null && countdownMs > 0
        ? getVotingUrgency(countdownMs)
        : null;

    return (
      <span
        className={`min-w-0 text-left text-[10px] font-bold leading-tight sm:text-xs ${
          muted ? "text-slate-400" : "text-white"
        }`}
      >
        <span className="block">{topLine}</span>
        {urgency && !muted && (
          <span
            className={`block text-[9px] font-bold leading-snug ${
              urgency.level === "critical" || urgency.level === "urgent"
                ? "text-red-300"
                : urgency.level === "soon"
                  ? "text-orange-300"
                  : "text-amber-300"
            }`}
          >
            {urgency.headline}
          </span>
        )}
        {countdownMs != null && countdownMs > 0 && (
          <span className="block font-mono text-[9px] font-bold tabular-nums leading-snug text-amber-300">
            {"\u23F1"} {formatVotingCountdown(countdownMs)}
          </span>
        )}
      </span>
    );
  };

  if (!iParticipated) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 md:px-4"
        title="Вы отметили, что не играли в этом матче"
      >
        <span className="shrink-0 text-base sm:text-lg">⊘</span>
        {guestRatingButtonLabel("Не играл", true)}
      </div>
    );
  }

  if (iSkippedVote) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 md:px-4"
        title="Вы отказались от голосования за этот матч"
      >
        <span className="shrink-0 text-base sm:text-lg">🚫</span>
        {guestRatingButtonLabel("Без голоса", true)}
      </div>
    );
  }

  if (players.length < 2) {
    return (
      <div
        className="flex max-w-[8rem] items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-2 py-2.5 opacity-55 sm:max-w-none sm:gap-2 sm:px-2.5 md:px-4"
        title="Нужно минимум 2 игрока"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-black text-slate-400">
          ★
        </span>
        {guestRatingButtonLabel(AWAY_MATCH_RATING.navShort, true)}
      </div>
    );
  }

  const mvpSummary = votingClosed ? summaries.find((row) => row.is_mvp) : null;
  const leaderSummary = !votingClosed
    ? [...summaries]
        .filter((row) => row.vote_count > 0)
        .sort(
          (a, b) =>
            Number(b.match_rating) - Number(a.match_rating) ||
            b.vote_count - a.vote_count
        )[0]
    : null;
  const remainingLabel =
    remainingMs != null ? formatVotingTimeRemaining(remainingMs) : null;

  const ratingPanelShellClass =
    "flex max-h-[min(88dvh,90vh)] w-full flex-col overflow-hidden rounded-t-3xl border border-amber-400/30 bg-[#0b1224] shadow-[0_-12px_48px_rgba(0,0,0,0.55)] md:max-h-[80vh] md:w-[min(400px,calc(100vw-2rem))] md:rounded-2xl";

  const closePanel = () => setOpen(false);

  const ratingPanelContent = (
    <>
      {/* Sheet handle + compact header for narrow phones */}
      <div className="shrink-0 border-b border-white/10 px-2.5 pb-2 pt-1.5 sm:px-3">
        <div className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-[14px] font-extrabold leading-tight text-white sm:text-[15px]">
                ★ Оценки
              </p>
              {remainingLabel && !votingClosed && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-200">
                  {remainingMs != null && remainingMs > 0
                    ? formatVotingCountdown(remainingMs)
                    : remainingLabel}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-slate-400 sm:text-[11px]">
              vs {match.opponent}
            </p>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base font-bold text-white transition hover:bg-white/20 active:scale-95 sm:h-10 sm:w-10 sm:text-lg"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[10px] sm:text-[11px]">
          <span className="shrink-0 font-semibold text-slate-300">
            {myRatedCount}/{ratingTargets.length}
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
              style={{
                width: `${
                  ratingTargets.length
                    ? Math.round((myRatedCount / ratingTargets.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <span className="shrink-0 text-amber-200/80">1–10</span>
        </div>
      </div>

      {schemaMissing ? (
        <div className="px-3 py-3 text-xs text-amber-200">
          <p className="font-semibold">Выполните SQL: match_ratings.sql</p>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {ratingsApplied &&
              summaries.length > 0 &&
              (mvpSummary || leaderSummary) && (
                <div className="mx-3 mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[12px] text-amber-50">
                  🏆 {votingClosed ? "MVP" : "Лидер"}:{" "}
                  <span className="font-bold">
                    {
                      players.find(
                        (player) =>
                          player.id ===
                          (mvpSummary ?? leaderSummary)?.player_id
                      )?.name
                    }
                  </span>{" "}
                  ·{" "}
                  {formatVoteScore(
                    Number((mvpSummary ?? leaderSummary)?.match_rating)
                  )}
                  /{MAX_VOTE_SCORE}
                </div>
              )}

            {!canRate && (
              <p className="mx-3 mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300">
                {votingClosed
                  ? summaries.length > 0
                    ? "Голосование закрыто — MVP определён."
                    : "Время голосования вышло."
                  : voteComplete
                    ? "Вы уже отправили оценки."
                    : "Сейчас нельзя менять оценки."}
              </p>
            )}

            <div className="divide-y divide-white/8 py-1">
              {ratingTargets.map((player) => {
                const group = getPositionGroup(null, player.position);
                const style = getPositionStyle(group);
                const summary = summaries.find(
                  (row) => row.player_id === player.id
                );
                const draftValue = draftRatings[player.id] ?? 0;
                const showSummary = Boolean(
                  summary &&
                    ratingsApplied &&
                    (summary.vote_count > 0 ||
                      getRatingDelta(
                        summary.rating_before,
                        summary.rating_after
                      ) !== 0)
                );
                const showMvp = Boolean(
                  summary?.is_mvp && ratingsApplied && votingClosed
                );
                const isTopDraft =
                  draftValue > 0 &&
                  draftValue ===
                    Math.max(
                      0,
                      ...ratingTargets.map((p) => draftRatings[p.id] ?? 0)
                    );

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-3 sm:py-2.5 ${
                      showMvp || isTopDraft ? "bg-amber-500/[0.08]" : ""
                    }`}
                  >
                    <span
                      className={`flex h-5 w-7 shrink-0 items-center justify-center rounded-md text-[8px] font-bold text-white sm:h-6 sm:w-8 sm:text-[9px] ${style.badge}`}
                    >
                      {group}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white sm:text-[13px]">
                        {player.name}
                        {showMvp ? " 🏆" : isTopDraft ? " ★" : ""}
                      </p>
                      {showSummary && summary && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-200/80">
                          <span>
                            ср. {formatVoteScore(Number(summary.match_rating))}
                          </span>
                          <RatingChangeBadge
                            delta={getRatingDelta(
                              summary.rating_before,
                              summary.rating_after
                            )}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                    <ScorePicker
                      value={draftValue}
                      onChange={(score) =>
                        setDraftRatings((prev) => ({
                          ...prev,
                          [player.id]: score,
                        }))
                      }
                      disabled={!canRate}
                      max={MAX_VOTE_SCORE}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 space-y-1.5 border-t border-white/10 bg-[#0b1224] p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:space-y-2 sm:p-3">
            {!voteComplete && !votingClosed && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    saving || declining || skippingVote || !canSubmitPartial
                  }
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2.5 text-[13px] font-bold text-white transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 sm:py-3 sm:text-[14px]"
                >
                  {saving
                    ? "..."
                    : myRatedCount >= ratingTargets.length
                      ? "Отправить"
                      : `Сохранить ${myRatedCount}/${ratingTargets.length}`}
                </button>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={handleSkipVoting}
                    disabled={saving || declining || skippingVote}
                    className="rounded-xl border border-white/10 px-1 py-2 text-[10px] font-semibold leading-tight text-slate-400 hover:bg-white/5 disabled:opacity-50 sm:px-2 sm:text-[11px]"
                  >
                    Не голосую
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineParticipation}
                    disabled={saving || declining || skippingVote}
                    className="rounded-xl border border-white/10 px-1 py-2 text-[10px] font-semibold leading-tight text-slate-400 hover:bg-white/5 disabled:opacity-50 sm:px-2 sm:text-[11px]"
                  >
                    Не играл
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-xl border border-white/15 bg-white/10 px-1 py-2 text-[10px] font-bold leading-tight text-white hover:bg-white/15 sm:px-2 sm:text-[11px]"
                  >
                    Закрыть
                  </button>
                </div>
              </>
            )}

            {(voteComplete || votingClosed) && (
              <button
                type="button"
                onClick={closePanel}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-[14px] font-bold text-white hover:bg-white/15"
              >
                Закрыть
              </button>
            )}
          </div>
        </>
      )}
    </>
  );

  const buttonClass = isActive
    ? "vote-glow border-amber-400/55 bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-violet-500/15 shadow-[0_0_18px_rgba(245,158,11,0.25)]"
    : voteComplete
      ? "border-emerald-400/35 bg-emerald-500/12 hover:bg-emerald-500/18"
      : "border-amber-400/25 bg-gradient-to-r from-amber-500/15 to-violet-500/12 hover:border-amber-400/40 hover:from-amber-500/20";

  const buttonAriaLabel = voteComplete
    ? AWAY_MATCH_RATING.navDone
    : AWAY_MATCH_RATING.navCta;

  const buttonTitle = voteComplete
    ? compact
      ? "Готово"
      : AWAY_MATCH_RATING.navDone
    : AWAY_MATCH_RATING.navShort;

  const buttonHint = voteComplete
    ? compact
      ? "Результат"
      : "Смотреть результат"
    : isActive
      ? AWAY_MATCH_RATING.navCta
      : remainingLabel
        ? `Осталось ${remainingLabel}`
        : "Оцените игроков";

  const showCountdown =
    isActive && remainingMs != null && remainingMs > 0;

  return (
    <div
      ref={panelRef}
      className={`relative min-w-0 ${compact ? "w-full" : "md:min-w-[13.5rem]"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex w-full touch-target items-center gap-2 rounded-xl border px-2.5 py-2 transition sm:gap-2.5 sm:px-3 md:px-4 ${buttonClass}`}
        aria-label={buttonAriaLabel}
        title={buttonAriaLabel}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
            isActive
              ? "bg-amber-400/25 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
              : voteComplete
                ? "bg-emerald-400/20 text-emerald-200"
                : "bg-amber-400/15 text-amber-200"
          }`}
        >
          ★
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate text-[12px] font-extrabold text-white sm:text-[13px]">
            {buttonTitle}
          </span>
          <span
            className={`mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[10px] font-semibold sm:text-[11px] ${
              voteComplete
                ? "text-emerald-200/90"
                : isActive
                  ? "text-amber-200"
                  : "text-slate-300"
            }`}
          >
            <span className="min-w-0 truncate">{buttonHint}</span>
            {showCountdown && (
              <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums tracking-wide text-amber-100 sm:text-[12px]">
                {formatVotingCountdown(remainingMs)}
              </span>
            )}
          </span>
        </span>
        {isActive && pendingCount > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 animate-pulse items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
        {voteComplete && (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        )}
      </button>

      {open &&
        portalReady &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Закрыть"
              className="fixed inset-0 z-[100] bg-black/60 md:hidden"
              onClick={() => setOpen(false)}
            />
            <div
              ref={mobilePanelRef}
              className={`bottom-nav-safe fixed inset-x-0 bottom-0 z-[101] max-h-[min(88dvh,92vh)] md:hidden ${ratingPanelShellClass}`}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {ratingPanelContent}
            </div>
          </>,
          document.body
        )}

      {open && (
        <div
          className={`absolute right-0 top-[calc(100%+8px)] z-[110] hidden max-h-[85vh] md:flex ${ratingPanelShellClass}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {ratingPanelContent}
        </div>
      )}
    </div>
  );
}
