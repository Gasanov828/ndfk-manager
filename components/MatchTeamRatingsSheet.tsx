"use client";

import { useCallback, useEffect, useState } from "react";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import PlayerPhotoImage from "@/components/PlayerPhotoImage";
import {
  formatVoteScore,
  isVotingDeadlinePassed,
  MAX_VOTE_SCORE,
  type MatchRatingSummary,
} from "@/lib/matchRatings";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { ratingBandTextClass } from "@/lib/ratingBands";
import { supabase } from "@/lib/supabase";
import { SHOW_MATCH_MVP_UI } from "@/lib/matchMvpUi";

type RatingRow = {
  playerId: number;
  name: string;
  position: string;
  photoUrl: string | null;
  score: number;
  voteCount: number;
  isMvp: boolean;
  goals: number;
  assists: number;
};

type MatchTeamRatingsSheetProps = {
  matchId: number;
  opponent: string;
  /** compact chip under MVP / in history */
  className?: string;
  /** if true, only render when voting closed and there are ratings */
  requireClosedVoting?: boolean;
  matchMeta?: {
    date?: string;
    time?: string;
    is_played?: boolean;
    rating_voting_ends_at?: string | null;
  };
};

export default function MatchTeamRatingsSheet({
  matchId,
  opponent,
  className = "",
  requireClosedVoting = true,
  matchMeta,
}: MatchTeamRatingsSheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const votingClosed = matchMeta
    ? isVotingDeadlinePassed({
        date: matchMeta.date ?? "",
        time: matchMeta.time ?? "00:00",
        is_played: matchMeta.is_played,
        rating_voting_ends_at: matchMeta.rating_voting_ends_at,
      })
    : true;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: summaryData, error: summaryError } = await supabase
        .from("match_player_rating_summary")
        .select(
          "player_id, match_rating, vote_count, is_mvp"
        )
        .eq("match_id", matchId)
        .order("match_rating", { ascending: false });

      if (summaryError) {
        setError(summaryError.message);
        setRows([]);
        setAvailable(false);
        return;
      }

      const summaries = (summaryData ?? []) as Pick<
        MatchRatingSummary,
        "player_id" | "match_rating" | "vote_count" | "is_mvp"
      >[];

      const rated = summaries.filter((row) => Number(row.vote_count) > 0);
      if (rated.length === 0) {
        setRows([]);
        setAvailable(false);
        return;
      }

      const playerIds = rated.map((row) => Number(row.player_id));
      const [{ data: players }, { data: stats }] = await Promise.all([
        supabase
          .from("players")
          .select("id, name, position, photo_url")
          .in("id", playerIds),
        supabase
          .from("match_player_stats")
          .select("player_id, goals, assists")
          .eq("match_id", matchId)
          .in("player_id", playerIds),
      ]);

      const playerMap = new Map(
        (players ?? []).map((p) => [
          Number(p.id),
          p as {
            id: number;
            name: string;
            position: string;
            photo_url?: string | null;
          },
        ])
      );
      const statsMap = new Map(
        (stats ?? []).map((s) => [
          Number(s.player_id),
          s as { player_id: number; goals?: number; assists?: number },
        ])
      );

      const nextRows: RatingRow[] = rated
        .map((row) => {
          const player = playerMap.get(Number(row.player_id));
          const st = statsMap.get(Number(row.player_id));
          return {
            playerId: Number(row.player_id),
            name: player?.name ?? `Игрок #${row.player_id}`,
            position: player?.position ?? "",
            photoUrl: player?.photo_url ?? null,
            score: Number(row.match_rating),
            voteCount: Number(row.vote_count),
            isMvp: Boolean(row.is_mvp),
            goals: Number(st?.goals ?? 0),
            assists: Number(st?.assists ?? 0),
          };
        })
        .sort(
          (a, b) =>
            Number(b.isMvp) - Number(a.isMvp) ||
            b.score - a.score ||
            a.name.localeCompare(b.name, "ru")
        );

      setRows(nextRows);
      setAvailable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (requireClosedVoting && !votingClosed) {
      setAvailable(false);
      return;
    }
    void load();
  }, [load, requireClosedVoting, votingClosed]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (requireClosedVoting && !votingClosed) return null;
  if (available === false) return null;
  if (available === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition duration-200 hover:border-cyan-300/25 hover:bg-white/[0.06] ${className}`}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Оценки матча
          </span>
          <span className="mt-0.5 block truncate text-[12px] font-semibold text-slate-200">
            vs {opponent} · кто какую оценку получил
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-bold text-cyan-300/90">
          Смотреть →
        </span>
      </button>

      <AppBottomSheet
        open={open}
        onClose={() => setOpen(false)}
        showCloseButton
        showHandle
        title={
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">
              ★ Оценки команды
            </p>
            <h2 className="mt-0.5 text-[16px] font-extrabold text-white">
              vs {opponent}
            </h2>
          </div>
        }
        panelClassName="border-cyan-400/20 bg-gradient-to-br from-[#0f172a] via-[#0b1224] to-[#080d18]"
      >
        <div className="space-y-1.5 px-3 pb-4 pt-1">
          {loading ? (
            <p className="py-6 text-center text-[13px] text-slate-400">
              Загрузка оценок…
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
              {error}
            </p>
          ) : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-400">
              Оценок за этот матч пока нет
            </p>
          ) : null}
          {rows.map((row, index) => {
            const initials = getPlayerInitials(row.name) || "?";
            return (
              <div
                key={row.playerId}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                  row.isMvp
                    ? "border-amber-300/35 bg-amber-400/10"
                    : "border-white/8 bg-white/[0.03]"
                }`}
              >
                <span className="w-4 shrink-0 text-center text-[10px] font-bold text-slate-500">
                  {index + 1}
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
                    {SHOW_MATCH_MVP_UI && row.isMvp ? (
                      <span className="ml-1 text-[10px] font-extrabold text-amber-300">
                        MVP
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {row.position || "—"}
                    {" · "}
                    ⚽ {row.goals} · 🎯 {row.assists}
                    {" · "}
                    {row.voteCount} гол.
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-[1.15rem] font-black tabular-nums leading-none ${ratingBandTextClass(row.score)}`}
                  >
                    {formatVoteScore(row.score)}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold text-slate-500">
                    /{MAX_VOTE_SCORE}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </AppBottomSheet>
    </>
  );
}
