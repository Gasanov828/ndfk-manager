"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MatchPlayerRatingSheet, {
  type MatchPlayerRatingSheetPlayer,
} from "@/components/MatchPlayerRatingSheet";
import MatchRatingVote, {
  type MatchVoteControl,
} from "@/components/MatchRatingVote";
import MatchVoteShareLink from "@/components/MatchVoteShareLink";
import PlayerPhotoImage from "@/components/PlayerPhotoImage";
import { formatMatchDate } from "@/lib/matches";
import {
  formatVoteScore,
  getActiveVoterProgress,
  isVotingDeadlinePassed,
  MAX_VOTE_SCORE,
} from "@/lib/matchRatings";
import { formatMatchVoteScoreline } from "@/lib/matchMvpVote";
import { SHOW_MATCH_MVP_UI } from "@/lib/matchMvpUi";
import {
  filterParticipatingPlayerIds,
  getMatchRatingVoterIds,
} from "@/lib/matchParticipation";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { ratingBandTextClass } from "@/lib/ratingBands";
import { supabase } from "@/lib/supabase";

type MatchMvpVoteBoardProps = {
  matchId: number;
};

type RatingRow = {
  playerId: number;
  name: string;
  position: string;
  photoUrl: string | null;
  score: number | null;
  voteCount: number;
  isMvp: boolean;
  goals: number;
  assists: number;
};

function formatPlayersRemaining(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} игроков`;
  if (mod10 === 1) return `${count} игрок`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} игрока`;
  return `${count} игроков`;
}

function ProgressBar({
  cast,
  total,
  variant = "team",
}: {
  cast: number;
  total: number;
  variant?: "team" | "mine";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((cast / total) * 100)) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          variant === "mine"
            ? "bg-gradient-to-r from-amber-400 to-orange-500"
            : "bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function toSheetPlayer(row: RatingRow): MatchPlayerRatingSheetPlayer {
  return {
    playerId: row.playerId,
    name: row.name,
    position: row.position,
    photoUrl: row.photoUrl,
    goals: row.goals,
    assists: row.assists,
  };
}

export default function MatchMvpVoteBoard({ matchId }: MatchMvpVoteBoardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchLabel, setMatchLabel] = useState<string>(`Матч #${matchId}`);
  const [matchDate, setMatchDate] = useState<string>("");
  const [matchOpponent, setMatchOpponent] = useState<string>("");
  const [matchNdfkGoals, setMatchNdfkGoals] = useState<number | undefined>();
  const [matchOpponentGoals, setMatchOpponentGoals] = useState<number | undefined>();
  const [votingClosed, setVotingClosed] = useState(false);
  const [votersCount, setVotersCount] = useState(0);
  const [votersTotal, setVotersTotal] = useState(0);
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [voteControl, setVoteControl] = useState<MatchVoteControl | null>(null);
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null);
  const [sheetScores, setSheetScores] = useState<Record<number, number>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recentlySavedId, setRecentlySavedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select(
          "id, opponent, date, time, is_played, ndfk_goals, opponent_goals, rating_voting_ends_at"
        )
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) throw new Error(matchError.message);
      if (!match) throw new Error("Матч не найден");

      setMatchLabel(
        formatMatchVoteScoreline({
          opponent: match.opponent,
          ndfkGoals: Number(match.ndfk_goals ?? 0),
          opponentGoals: Number(match.opponent_goals ?? 0),
        })
      );
      setMatchDate(formatMatchDate(match.date));
      setMatchOpponent(match.opponent);
      setMatchNdfkGoals(Number(match.ndfk_goals ?? 0));
      setMatchOpponentGoals(Number(match.opponent_goals ?? 0));

      const closed = isVotingDeadlinePassed({
        date: match.date,
        time: match.time ?? "00:00",
        is_played: match.is_played,
        rating_voting_ends_at: match.rating_voting_ends_at,
      });
      setVotingClosed(closed);

      const [{ data: players }, { data: participation }, { data: summaries }, { data: votes }, { data: stats }] =
        await Promise.all([
          supabase
            .from("players")
            .select("id, name, position, photo_url")
            .order("name"),
          supabase
            .from("match_player_participation")
            .select("player_id, participated, skipped_rating_vote")
            .eq("match_id", matchId),
          supabase
            .from("match_player_rating_summary")
            .select("player_id, match_rating, vote_count, is_mvp")
            .eq("match_id", matchId),
          supabase
            .from("match_player_rating_votes")
            .select("voter_player_id, rated_player_id, stars")
            .eq("match_id", matchId),
          supabase
            .from("match_player_stats")
            .select("player_id, goals, assists")
            .eq("match_id", matchId),
        ]);

      const playerList = players ?? [];
      const participantIds = filterParticipatingPlayerIds(
        playerList.map((p) => Number(p.id)),
        participation ?? []
      );
      const ratingVoterIds = getMatchRatingVoterIds(
        participantIds,
        participation ?? []
      );
      const voterProgress = getActiveVoterProgress(
        ratingVoterIds,
        (votes ?? []).map((vote) => ({
          match_id: matchId,
          voter_player_id: Number(vote.voter_player_id),
          rated_player_id: Number(vote.rated_player_id),
          stars: Number(vote.stars),
        }))
      );
      setVotersCount(voterProgress.votedCount);
      setVotersTotal(voterProgress.total);

      const summaryMap = new Map(
        (summaries ?? []).map((row) => [Number(row.player_id), row])
      );
      const statsMap = new Map(
        (stats ?? []).map((row) => [Number(row.player_id), row])
      );
      const playerMap = new Map(playerList.map((p) => [Number(p.id), p]));

      const nextRows: RatingRow[] = participantIds
        .map((playerId) => {
          const player = playerMap.get(playerId);
          const summary = summaryMap.get(playerId);
          const st = statsMap.get(playerId);
          const voteCount = Number(summary?.vote_count ?? 0);
          return {
            playerId,
            name: player?.name ?? `Игрок #${playerId}`,
            position: player?.position ?? "",
            photoUrl: player?.photo_url ?? null,
            score:
              voteCount > 0 && summary?.match_rating != null
                ? Number(summary.match_rating)
                : null,
            voteCount,
            isMvp: closed && Boolean(summary?.is_mvp),
            goals: Number(st?.goals ?? 0),
            assists: Number(st?.assists ?? 0),
          };
        })
        .sort((a, b) => {
          const aRated = a.score != null ? 1 : 0;
          const bRated = b.score != null ? 1 : 0;
          if (aRated !== bRated) return bRated - aRated;
          if (a.score != null && b.score != null && a.score !== b.score) {
            return b.score - a.score;
          }
          return a.name.localeCompare(b.name, "ru");
        });

      setRows(nextRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
    if (votingClosed) return;
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load, votingClosed]);

  const canRate = Boolean(voteControl?.canRate);
  const myPlayerId = voteControl?.myPlayerId ?? null;
  const savedRatings = voteControl?.savedRatings ?? {};
  const myRatedCount = voteControl?.myRatedCount ?? 0;
  const ratingTargetCount = voteControl?.ratingTargetCount ?? 0;
  const allRated = Boolean(voteControl?.allRated);
  const remainingCount = Math.max(0, ratingTargetCount - myRatedCount);

  const rateableRows = useMemo(
    () => rows.filter((row) => row.playerId !== myPlayerId),
    [rows, myPlayerId]
  );

  const unratedRows = useMemo(
    () =>
      rateableRows.filter(
        (row) =>
          !(
            savedRatings[row.playerId] >= 1 &&
            savedRatings[row.playerId] <= MAX_VOTE_SCORE
          )
      ),
    [rateableRows, savedRatings]
  );

  const sheetRow =
    sheetPlayerId != null
      ? rows.find((row) => row.playerId === sheetPlayerId) ?? null
      : null;

  const sheetPlayer = sheetRow ? toSheetPlayer(sheetRow) : null;
  const sheetSavedScore = sheetRow ? savedRatings[sheetRow.playerId] ?? null : null;
  const sheetAlreadySaved =
    sheetSavedScore != null &&
    sheetSavedScore >= 1 &&
    sheetSavedScore <= MAX_VOTE_SCORE;

  const nextUnratedRow = useMemo(() => {
    if (!sheetRow) return unratedRows[0] ?? null;
    const idx = unratedRows.findIndex((r) => r.playerId === sheetRow.playerId);
    if (idx >= 0 && idx < unratedRows.length - 1) {
      return unratedRows[idx + 1];
    }
    return unratedRows.find((r) => r.playerId !== sheetRow.playerId) ?? null;
  }, [sheetRow, unratedRows]);

  const sheetNavIndex = sheetRow
    ? rateableRows.findIndex((r) => r.playerId === sheetRow.playerId)
    : -1;

  const openSheet = (playerId: number) => {
    setSaveSuccess(false);
    setSheetPlayerId(playerId);
    setSheetScores((prev) =>
      prev[playerId] > 0 ? prev : { ...prev, [playerId]: 7 }
    );
  };

  const closeSheet = () => {
    setSheetPlayerId(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!voteControl || !sheetRow || sheetAlreadySaved) return;
    const score = sheetScores[sheetRow.playerId] ?? 0;
    if (score <= 0) return;

    const result = await voteControl.savePlayerRating(sheetRow.playerId, score);
    if (!result.ok) {
      if (result.error) alert(result.error);
      return;
    }

    setSaveSuccess(true);
    setRecentlySavedId(sheetRow.playerId);
    window.setTimeout(() => setRecentlySavedId(null), 1200);
    void load();
  };

  const handleRateNext = () => {
    if (nextUnratedRow) {
      setSaveSuccess(false);
      setSheetPlayerId(nextUnratedRow.playerId);
      return;
    }
    closeSheet();
  };

  const navigateSheet = (delta: number) => {
    if (sheetNavIndex < 0 || rateableRows.length === 0) return;
    const nextIndex =
      (sheetNavIndex + delta + rateableRows.length) % rateableRows.length;
    setSaveSuccess(false);
    setSheetPlayerId(rateableRows[nextIndex]?.playerId ?? null);
  };

  const handleVoteControlChange = useCallback((control: MatchVoteControl | null) => {
    setVoteControl((prev) => {
      if (prev === control) return prev;
      if (prev == null || control == null) return control;
      if (
        prev.canRate === control.canRate &&
        prev.myPlayerId === control.myPlayerId &&
        prev.saving === control.saving &&
        prev.myRatedCount === control.myRatedCount &&
        prev.ratingTargetCount === control.ratingTargetCount &&
        prev.allRated === control.allRated &&
        JSON.stringify(prev.draftRatings) ===
          JSON.stringify(control.draftRatings) &&
        JSON.stringify(prev.savedRatings) ===
          JSON.stringify(control.savedRatings)
      ) {
        return prev;
      }
      return control;
    });
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400">
        Загрузка оценок…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-5 text-sm text-red-100">
        {error}
      </div>
    );
  }

  const ratedRows = rows.filter((row) => row.score != null);
  const teamVotersPct =
    votersTotal > 0 ? Math.round((votersCount / votersTotal) * 100) : 0;

  return (
    <div className="space-y-3 pb-6">
      <div className="px-0.5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-200/80">
          ⭐ Оценки матча
        </p>
        <h1 className="mt-0.5 text-lg font-black tracking-tight text-white sm:text-xl">
          {matchLabel}
        </h1>
        {matchDate ? (
          <p className="mt-0.5 text-[11px] text-slate-400">{matchDate}</p>
        ) : null}

        {canRate && ratingTargetCount > 0 ? (
          <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.06] px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[12px] font-bold text-white">
              Оценено: {myRatedCount} / {ratingTargetCount}
            </p>
            <ProgressBar
              cast={myRatedCount}
              total={ratingTargetCount}
              variant="mine"
            />
            <p className="mt-1.5 text-[11px] font-medium text-slate-300">
              {allRated ? (
                <span className="text-amber-200">
                  🏆 Все игроки оценены · голосование завершено
                </span>
              ) : (
                <>
                  Осталось оценить:{" "}
                  <span className="font-bold text-cyan-200">
                    {formatPlayersRemaining(remainingCount)}
                  </span>
                </>
              )}
            </p>
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-black text-white">
              {canRate ? "Оцените партнёров" : "Кто какую оценку получил"}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {votersCount} / {votersTotal} поставили оценки · шкала 1–
              {MAX_VOTE_SCORE}
              {canRate ? " · нажмите на строку" : ""}
            </p>
          </div>
          <p className="text-[11px] font-semibold text-amber-200/75">
            {teamVotersPct}%
          </p>
        </div>
        <ProgressBar cast={votersCount} total={votersTotal} />

        {rows.length === 0 ? (
          <p className="mt-4 py-4 text-center text-[13px] text-slate-500">
            Оценок пока нет
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((row, index) => {
              const initials = getPlayerInitials(row.name) || "?";
              const hasScore = row.score != null;
              const isSelf = row.playerId === myPlayerId;
              const userRated =
                savedRatings[row.playerId] >= 1 &&
                savedRatings[row.playerId] <= MAX_VOTE_SCORE;
              const userScore = userRated ? savedRatings[row.playerId] : null;
              const canRateRow = canRate && !isSelf;
              const justSaved = recentlySavedId === row.playerId;

              const rowTone = justSaved
                ? "border-emerald-400/35 bg-emerald-500/10 ring-1 ring-emerald-400/25"
                : userRated
                  ? "border-emerald-400/20 bg-emerald-500/[0.06]"
                  : canRateRow
                    ? "border-cyan-400/20 bg-cyan-500/[0.04] hover:border-cyan-400/35 hover:bg-cyan-500/[0.08]"
                    : row.isMvp
                      ? "border-amber-300/40 bg-amber-400/10"
                      : hasScore
                        ? "border-white/8 bg-white/[0.03]"
                        : "border-white/5 bg-black/20 opacity-80";

              const statusLabel = isSelf ? null : userRated ? (
                <span className="flex items-center justify-end gap-1 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Вы оценили: {formatVoteScore(userScore!)}
                </span>
              ) : canRateRow ? (
                <span className="text-[10px] font-bold text-orange-300">
                  🟠 Оценить →
                </span>
              ) : null;

              const teamScoreLabel = hasScore ? (
                <div className={statusLabel ? "mt-0.5" : ""}>
                  <p
                    className={`text-[1.05rem] font-black tabular-nums leading-none ${ratingBandTextClass(row.score!)}`}
                  >
                    {formatVoteScore(row.score!)}
                  </p>
                  {!canRate ? (
                    <p className="mt-0.5 text-[9px] font-semibold text-slate-500">
                      /{MAX_VOTE_SCORE}
                    </p>
                  ) : null}
                </div>
              ) : null;

              const rowInner = (
                <>
                  <span className="w-4 shrink-0 text-center text-[10px] font-bold text-slate-500">
                    {hasScore ? index + 1 : "—"}
                  </span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                    <PlayerPhotoImage
                      photoUrl={row.photoUrl}
                      alt={row.name}
                      className="h-full w-full object-cover object-[center_18%]"
                      fallback={
                        <span className="text-[10px] font-bold text-slate-300">
                          {initials}
                        </span>
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-white">
                      {row.name}
                      {isSelf ? (
                        <span className="ml-1 text-[10px] font-semibold text-slate-400">
                          (вы)
                        </span>
                      ) : null}
                      {SHOW_MATCH_MVP_UI && row.isMvp ? (
                        <span className="ml-1 text-[10px] font-extrabold text-amber-300">
                          🏆 MVP
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {row.position || "—"}
                      {" · "}
                      ⚽ {row.goals} · 🎯 {row.assists}
                      {hasScore
                        ? ` · ${row.voteCount} оценок`
                        : " · без оценок"}
                    </p>
                  </div>
                  <div className="shrink-0 min-w-[5.5rem] text-right">
                    {canRate && hasScore && !statusLabel ? (
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                        команда
                      </p>
                    ) : null}
                    {teamScoreLabel}
                    {statusLabel ? (
                      <div className={hasScore ? "mt-1" : ""}>{statusLabel}</div>
                    ) : null}
                  </div>
                </>
              );

              return canRateRow ? (
                <button
                  key={row.playerId}
                  type="button"
                  onClick={() => openSheet(row.playerId)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all duration-200 active:scale-[0.99] ${rowTone}`}
                >
                  {rowInner}
                </button>
              ) : (
                <div
                  key={row.playerId}
                  className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 transition-all duration-200 ${rowTone}`}
                >
                  {rowInner}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {!votingClosed ? (
        <MatchVoteShareLink
          matchId={matchId}
          opponent={matchOpponent}
          ndfkGoals={matchNdfkGoals}
          opponentGoals={matchOpponentGoals}
          className="mt-0"
        />
      ) : null}

      {!votingClosed ? (
        <MatchRatingVote
          fullPage
          combinedBoard
          fixedMatchId={matchId}
          onUpdated={() => void load()}
          onVoteControlChange={handleVoteControlChange}
        />
      ) : null}

      {canRate && allRated ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-4 text-center">
          <p className="text-[14px] font-black text-amber-100">
            🏆 Все игроки оценены
          </p>
          <p className="mt-1 text-[12px] text-amber-200/80">
            Голосование завершено.
          </p>
        </div>
      ) : null}

      {votingClosed && ratedRows.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-[13px] text-slate-400">
          Голосование закрыто. Оценок за этот матч не собрано.
        </p>
      ) : null}

      <MatchPlayerRatingSheet
        open={sheetPlayerId != null}
        player={sheetPlayer}
        score={sheetRow ? sheetScores[sheetRow.playerId] ?? 0 : 0}
        onScoreChange={(score) => {
          if (!sheetRow) return;
          setSheetScores((prev) => ({ ...prev, [sheetRow.playerId]: score }));
        }}
        onClose={closeSheet}
        onSave={handleSave}
        saving={voteControl?.saving}
        saveSuccess={saveSuccess}
        nextPlayer={nextUnratedRow ? toSheetPlayer(nextUnratedRow) : null}
        onRateNext={handleRateNext}
        onPrevPlayer={() => navigateSheet(-1)}
        onNextPlayer={() => navigateSheet(1)}
        canNavigatePrev={rateableRows.length > 1}
        canNavigateNext={rateableRows.length > 1}
        ballotScores={savedRatings}
        alreadySaved={sheetAlreadySaved}
        savedScore={sheetSavedScore}
      />
    </div>
  );
}
