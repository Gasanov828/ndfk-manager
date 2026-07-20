"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ScorePicker from "@/components/ScorePicker";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import {
  aggregateVotes,
  countPendingRatingVotes,
  formatVoteScore,
  formatVotingDeadline,
  formatVotingTimeRemaining,
  getRatingDelta,
  getTrainingVotingTimeRemainingMs,
  hasCompletedRatingVote,
  isRatingVotingComplete,
  isTrainingVotingDeadlinePassed,
  MAX_VOTE_SCORE,
  TRAINING_VOTING_HOURS,
  type TrainingRatingVote as TrainingVoteRow,
} from "@/lib/trainingRatings";
import { recalculateTrainingRatingsViaApi } from "@/lib/trainingRatingRecalcApi";
import { HOME_TRAINING_RATING } from "@/lib/ratingVoteBranding";
import {
  filterTrainingParticipatingPlayerIds,
  getTrainingRatingVoterIds,
  getTrainingVotingProgress,
} from "@/lib/trainingParticipation";
import { getLatestOpenTrainingForVoting, type TrainingSession } from "@/lib/trainingSessions";
import { TRAINING_FINISHED_EVENT } from "@/lib/trainingStatus";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import { useMobileOverlayLock } from "@/hooks/useMobileOverlay";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

type Player = {
  id: number;
  name: string;
  position: string;
};

export default function TrainingRatingVote({ compact = false }: { compact?: boolean }) {
  const { playerId: myPlayerId, playerName, canVote, loading: authLoading } =
    useMyPlayerId();
  const [open, setOpen] = useState(false);
  const [training, setTraining] = useState<TrainingSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [iParticipated, setIParticipated] = useState(true);
  const [votes, setVotes] = useState<TrainingVoteRow[]>([]);
  const [draftRatings, setDraftRatings] = useState<Record<number, number>>({});
  const [summaries, setSummaries] = useState<
    {
      player_id: number;
      training_rating: number;
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
  const pendingCount = countPendingRatingVotes(
    participantIds,
    myPlayerId,
    votes
  );
  const voteComplete = hasCompletedRatingVote(
    participantIds,
    myPlayerId,
    votes
  );
  const teamProgress = getTrainingVotingProgress(
    participantIds,
    ratingVoterIds,
    votes
  );
  const teamVotingComplete = isRatingVotingComplete(
    participantIds,
    ratingVoterIds,
    votes
  );
  const deadlinePassed = training
    ? isTrainingVotingDeadlinePassed(training)
    : false;
  const votingClosed = deadlinePassed;
  const ratingsFinalized = teamVotingComplete || votingClosed;
  const isActive =
    Boolean(training && canVote && iParticipated && !iSkippedVote) &&
    !voteComplete &&
    !votingClosed;
  const previewScores: ReturnType<typeof aggregateVotes> = [];
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

  const loadRatingData = useCallback(async () => {
    const { data: sessions, error: sessionsError } = await supabase
      .from("training_sessions")
      .select("*");

    if (sessionsError?.message.includes("training_sessions")) {
      setSchemaMissing(true);
      setTraining(null);
      return;
    }

    const latestCompleted = getLatestOpenTrainingForVoting(
      (sessions ?? []) as TrainingSession[]
    );

    if (!latestCompleted) {
      setTraining(null);
      return;
    }

    setTraining(latestCompleted);
    setSchemaMissing(false);

    const { data: playerData } = await supabase
      .from("players")
      .select("id, name, position")
      .order("name");

    let guestParticipantIds: number[] = [];
    let guestRatingVoterIds: number[] = [];

    if (playerData) {
      const { data: participationRows, error: participationError } =
        await supabase
          .from("training_player_participation")
          .select("player_id, participated, skipped_rating_vote")
          .eq("training_id", latestCompleted.id);

      if (participationError?.message.includes("training_player_participation")) {
        guestParticipantIds = playerData.map((player) => player.id);
        guestRatingVoterIds = guestParticipantIds;
        setPlayers(playerData);
        setRatingVoterIds(guestRatingVoterIds);
        setIParticipated(true);
        setISkippedVote(false);
      } else {
        guestParticipantIds = filterTrainingParticipatingPlayerIds(
          playerData.map((player) => player.id),
          participationRows ?? []
        );
        const participantSet = new Set(guestParticipantIds);
        guestRatingVoterIds = getTrainingRatingVoterIds(
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
    }

    const { data: voteData, error: voteError } = await supabase
      .from("training_rating_votes")
      .select("*")
      .eq("training_id", latestCompleted.id);

    if (voteError?.message.includes("training_rating")) {
      setSchemaMissing(true);
      return;
    }

    const voteRows = (voteData ?? []) as TrainingVoteRow[];
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
      .from("training_rating_summary")
      .select("player_id, training_rating, rating_before, rating_after")
      .eq("training_id", latestCompleted.id)
      .order("training_rating", { ascending: false });

    const summariesLoaded = summaryData ?? [];
    const votingComplete = isRatingVotingComplete(
      guestParticipantIds,
      guestRatingVoterIds,
      voteRows
    );
    const deadlinePassed = isTrainingVotingDeadlinePassed(latestCompleted);

    if (
      canVote &&
      summariesLoaded.length === 0 &&
      (votingComplete || deadlinePassed)
    ) {
      try {
        await recalculateTrainingRatingsViaApi(latestCompleted.id);
        const { data: freshSummaries } = await supabase
          .from("training_rating_summary")
          .select("player_id, training_rating, rating_before, rating_after")
          .eq("training_id", latestCompleted.id)
          .order("training_rating", { ascending: false });

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
    loadRatingData();

    const interval = setInterval(loadRatingData, 60000);
    const onTrainingFinished = () => loadRatingData();
    window.addEventListener(TRAINING_FINISHED_EVENT, onTrainingFinished);

    return () => {
      clearInterval(interval);
      window.removeEventListener(TRAINING_FINISHED_EVENT, onTrainingFinished);
    };
  }, [loadRatingData, authLoading, myPlayerId]);

  useEffect(() => {
    if (!training) {
      setRemainingMs(null);
      return;
    }

    const update = () => setRemainingMs(getTrainingVotingTimeRemainingMs(training));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [training]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  async function handleDeclineParticipation() {
    if (!training || !myPlayerId || !canVote || votingClosed) return;

    if (
      !confirm(
        "Вы не были на этой тренировке? Вы не будете участвовать в голосовании и оценке ★."
      )
    ) {
      return;
    }

    setDeclining(true);

    const { error: participationError } = await supabase
      .from("training_player_participation")
      .upsert(
        {
          training_id: training.id,
          player_id: myPlayerId,
          participated: false,
        },
        { onConflict: "training_id,player_id" }
      );

    if (participationError) {
      alert(
        participationError.message.includes("training_player_participation")
          ? "Выполните SQL: training_participation.sql и training_participation_rls.sql"
          : participationError.message
      );
      setDeclining(false);
      return;
    }

    await supabase
      .from("training_rating_votes")
      .delete()
      .eq("training_id", training.id)
      .eq("voter_player_id", myPlayerId);

    await supabase
      .from("training_rating_votes")
      .delete()
      .eq("training_id", training.id)
      .eq("rated_player_id", myPlayerId);

    try {
      await recalculateTrainingRatingsViaApi(training.id);
      await loadRatingData();
      setOpen(false);
      alert("Отмечено: вы не были на этой тренировке.");
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
    if (!training || !myPlayerId || !canVote || votingClosed) return;

    if (
      !confirm(
        "Не будете голосовать? Ваши оценки удалятся, но вы остаётесь участником тренировки."
      )
    ) {
      return;
    }

    setSkippingVote(true);

    const { error: participationError } = await supabase
      .from("training_player_participation")
      .upsert(
        {
          training_id: training.id,
          player_id: myPlayerId,
          participated: true,
          skipped_rating_vote: true,
        },
        { onConflict: "training_id,player_id" }
      );

    if (participationError) {
      alert(
        participationError.message.includes("training_player_participation")
          ? "Выполните SQL: training_participation.sql и training_participation_rls.sql"
          : participationError.message
      );
      setSkippingVote(false);
      return;
    }

    await supabase
      .from("training_rating_votes")
      .delete()
      .eq("training_id", training.id)
      .eq("voter_player_id", myPlayerId);

    try {
      await recalculateTrainingRatingsViaApi(training.id);
      await loadRatingData();
      setOpen(false);
      alert("Отмечено: вы не участвуете в голосовании за эту тренировку.");
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
    if (!training || !myPlayerId || !canVote) return;

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
      .from("training_rating_votes")
      .delete()
      .eq("training_id", training.id)
      .eq("voter_player_id", myPlayerId);

    const rows = ratedTargets.map((player) => ({
      training_id: training.id,
      voter_player_id: myPlayerId,
      rated_player_id: player.id,
      stars: draftRatings[player.id],
    }));

    const { error } = await supabase.from("training_rating_votes").insert(rows);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    try {
      const result = await recalculateTrainingRatingsViaApi(training.id);
      await loadRatingData();

      const { data: freshVotes } = await supabase
        .from("training_rating_votes")
        .select("*")
        .eq("training_id", training.id);

      const progress = getTrainingVotingProgress(
        players.map((player) => player.id),
        ratingVoterIds,
        (freshVotes ?? []) as TrainingVoteRow[]
      );

      setSaving(false);

      if (result.votingClosed) {
        alert(
          result.ratingsApplied
            ? result.finalizedByDeadline
              ? "Время голосования вышло. Итоги тренировки подведены."
              : "Голосование закрыто. Итоги подведены."
            : "Голосование закрыто. Недостаточно оценок для итогов."
        );
      } else if (result.ratingsApplied) {
        alert(
          result.finalizedByDeadline
            ? `Время вышло — итоги по собранным оценкам. Проголосовало ${progress.votedCount} из ${progress.total}.`
            : `Все проголосовали — ★ обновлены по средним оценкам команды.`
        );
      } else {
        alert(
          `Сохранено ${ratedTargets.length} оценок. ★ обновятся, когда проголосует вся команда (${progress.votedCount}/${progress.total}).`
        );
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
  if (!training) return null;

  if (!iParticipated) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 md:px-4"
        title="Вы отметили, что не были на этой тренировке"
      >
        <span className="text-base sm:text-lg">⊘</span>
        <span className="hidden text-left text-xs font-bold leading-tight text-slate-400 md:block md:text-sm">
          Не играл
          <span className="block text-[10px] font-semibold text-slate-500 md:text-xs">
            {HOME_TRAINING_RATING.navKind}
          </span>
        </span>
      </div>
    );
  }

  if (iSkippedVote) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 md:px-4"
        title="Вы отказались от голосования за эту тренировку"
      >
        <span className="text-base sm:text-lg">🚫</span>
        <span className="hidden text-left text-xs font-bold leading-tight text-slate-400 md:block md:text-sm">
          Без голоса
          <span className="block text-[10px] font-semibold text-slate-500 md:text-xs">
            {HOME_TRAINING_RATING.navShort.toLowerCase()}
          </span>
        </span>
      </div>
    );
  }

  const deadlineLabel = training ? formatVotingDeadline(training) : null;
  const remainingLabel =
    remainingMs != null ? formatVotingTimeRemaining(remainingMs) : null;

  const panelShellClass =
    "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-emerald-400/20 bg-slate-950/98 shadow-[0_0_40px_rgba(52,211,153,0.12)] backdrop-blur-xl md:max-h-[85vh] md:w-[min(560px,calc(100vw-2rem))] md:rounded-2xl";

  const panelContent = (
    <>
      <div className="border-b border-white/10 bg-gradient-to-r from-emerald-600/20 to-teal-600/15 px-4 py-3 md:px-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-white">
              ★ {HOME_TRAINING_RATING.panelTitle}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-300">
              {training.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl font-bold text-white transition hover:bg-white/20 active:scale-95"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <p className="mt-1.5 inline-flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
            {HOME_TRAINING_RATING.kindLabel} · {HOME_TRAINING_RATING.deltaLabel}
          </span>
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {HOME_TRAINING_RATING.hint} Шкала 1–10 · итоги и ★ — когда
          проголосует вся команда (или истечёт {TRAINING_VOTING_HOURS} ч). Сейчас{" "}
          {teamProgress.votedCount}/{teamProgress.total}.
        </p>
        {!votingClosed && remainingLabel && (
          <p className="mt-1.5 text-xs font-semibold text-emerald-200">
            ⏱ Осталось: {remainingLabel}
            {deadlineLabel ? ` · до ${deadlineLabel}` : ""}
          </p>
        )}
        {votingClosed && (
          <p className="mt-1.5 text-xs font-semibold text-slate-400">
            {summaries.length > 0
              ? "Голосование закрыто · итоги подведены"
              : "Голосование закрыто · оценок не было"}
          </p>
        )}
      </div>

      {schemaMissing ? (
        <div className="space-y-2 px-4 py-3 text-xs text-amber-200">
          <p className="font-semibold">
            Выполните SQL в Supabase → training.sql и training_voting_rls.sql
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 md:px-4">
            {!votingClosed && teamProgress.total > 0 && (
              <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                <span className="font-bold">
                  {HOME_TRAINING_RATING.icon} Дома
                </span>{" "}
                · {HOME_TRAINING_RATING.deltaLabel}. Проголосовало:{" "}
                <span className="font-bold">
                  {teamProgress.votedCount} / {teamProgress.total}
                </span>
                . ★ и средние оценки — после голосования всей команды. Окно —{" "}
                {TRAINING_VOTING_HOURS} ч после тренировки
                {remainingLabel ? ` (осталось ${remainingLabel})` : ""}.
                <span className="mt-1 block text-slate-300">
                  Не были на тренировке? «Не играл». Не хотите оценивать? «Не буду
                  голосовать».
                </span>
              </div>
            )}

            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Все игроки ({ratingTargets.length})
            </p>

            {!canRate && (
              <p className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                {votingClosed
                  ? summaries.length > 0
                    ? "Голосование закрыто — итоги уже подведены."
                    : "Время голосования вышло."
                  : voteComplete
                    ? "Вы уже отправили оценки. Ждём остальных."
                    : "Сейчас нельзя менять оценки."}
              </p>
            )}

            <div className="space-y-2">
              {ratingTargets.map((player) => {
                const group = getPositionGroup(null, player.position);
                const style = getPositionStyle(group);
                const summary = summaries.find(
                  (row) => row.player_id === player.id
                );
                const preview = previewScores.find(
                  (row) => row.player_id === player.id
                );
                const draftValue = draftRatings[player.id] ?? 0;
                const showSummary = ratingsFinalized && Boolean(summary);

                return (
                  <div
                    key={player.id}
                    className="rounded-xl border border-white/5 bg-black/30 px-3 py-3 md:px-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${style.badge}`}
                        >
                          {group}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug text-white">
                            {player.name}
                          </p>
                          <p className="text-[11px] text-slate-400">{player.position}</p>
                          {showSummary && summary && (
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-emerald-300">
                              <span>
                                {formatVoteScore(Number(summary.training_rating))}{" "}
                                балл
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
                          {!showSummary && preview && preview.vote_count > 0 && ratingsFinalized && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              ~{formatVoteScore(preview.match_rating)} балл
                            </p>
                          )}
                        </div>
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
                        scrollable
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-5">
            {!voteComplete && !votingClosed && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    saving || declining || skippingVote || !canSubmitPartial
                  }
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
                >
                  {saving
                    ? "Сохранение..."
                    : myRatedCount >= ratingTargets.length
                      ? "Отправить все оценки"
                      : `Сохранить (${myRatedCount}/${ratingTargets.length})`}
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSkipVoting}
                    disabled={saving || declining || skippingVote}
                    className="rounded-xl border border-white/10 px-2 py-2 text-[11px] font-semibold text-slate-400 hover:bg-white/5 disabled:opacity-50"
                  >
                    Не голосую
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineParticipation}
                    disabled={saving || declining || skippingVote}
                    className="rounded-xl border border-white/10 px-2 py-2 text-[11px] font-semibold text-slate-400 hover:bg-white/5 disabled:opacity-50"
                  >
                    Не играл
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-[11px] font-bold text-white hover:bg-white/15"
                  >
                    Закрыть
                  </button>
                </div>
              </>
            )}

            {(voteComplete || votingClosed) && (
              <>
                <p className="text-center text-xs text-emerald-300">
                  {votingClosed
                    ? summaries.length > 0
                      ? `Голосование завершено (${teamProgress.votedCount}/${teamProgress.total}).`
                      : "Время вышло, но никто не успел проголосовать."
                    : `Вы проголосовали. Ждём остальных (${teamProgress.votedCount}/${teamProgress.total})${remainingLabel ? ` · ${remainingLabel}` : ""}.`}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  Закрыть
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <div ref={panelRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex w-full touch-target items-center gap-1.5 rounded-xl border px-2 py-2 transition sm:gap-2 sm:px-2.5 md:px-4 ${compact ? "justify-center md:justify-start" : ""} ${
          isActive
            ? "border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 shadow-[0_0_16px_rgba(52,211,153,0.2)]"
            : voteComplete
              ? "border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/15"
              : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
        aria-label={`Оценка игроков — ${HOME_TRAINING_RATING.panelTitle}`}
      >
        <span className="text-base sm:text-lg">{HOME_TRAINING_RATING.icon}</span>
        {!compact && (
          <span className="text-left text-[10px] font-bold leading-tight text-white sm:text-xs md:text-sm">
            {isActive
              ? HOME_TRAINING_RATING.navShort
              : voteComplete
                ? "Готово"
                : HOME_TRAINING_RATING.navShort}
            <span className="block font-semibold text-emerald-200/95 sm:text-[10px] md:text-xs">
              {HOME_TRAINING_RATING.navRating}
              <span className="ml-1 font-normal text-slate-400">
                · {HOME_TRAINING_RATING.navKind}
              </span>
            </span>
          </span>
        )}
        {isActive && pendingCount > 0 && (
          <span className="flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
        {voteComplete && (
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
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
              className={`bottom-nav-safe fixed inset-x-0 bottom-0 z-[101] max-h-[92vh] md:hidden ${panelShellClass}`}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {panelContent}
            </div>
          </>,
          document.body
        )}

      {open && (
        <div
          className={`absolute right-0 top-[calc(100%+8px)] z-[110] hidden max-h-[85vh] md:flex ${panelShellClass}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {panelContent}
        </div>
      )}
    </div>
  );
}
