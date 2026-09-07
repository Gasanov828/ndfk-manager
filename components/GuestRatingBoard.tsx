"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import {
  MAX_VOTE_SCORE,
  isVotingDeadlinePassed,
  formatVotingTimeRemaining,
  getVotingTimeRemainingMs,
} from "@/lib/matchRatings";
import { filterParticipatingPlayerIds } from "@/lib/matchParticipation";
import {
  getOrCreateGuestToken,
  getSavedGuestName,
  saveGuestName,
  aggregateGuestRatings,
  type GuestRatingVoteRow,
} from "@/lib/guestRating";
import StarRatingPicker from "@/components/StarRatingPicker";
import PlayerAvatar from "@/components/PlayerAvatar";
import { ratingBandTextClass } from "@/lib/ratingBands";

type Player = {
  id: number;
  name: string;
  position: string;
  photo_url?: string | null;
};

type MatchRow = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  is_played: boolean;
  rating_voting_ends_at?: string | null;
  ndfk_goals?: number | null;
  opponent_goals?: number | null;
};

export default function GuestRatingBoard({ matchId }: { matchId: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allVotes, setAllVotes] = useState<GuestRatingVoteRow[]>([]);
  const [guestToken, setGuestToken] = useState("");
  const [guestName, setGuestName] = useState("");
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null);
  const [savedPlayerId, setSavedPlayerId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    setGuestToken(getOrCreateGuestToken());
    setGuestName(getSavedGuestName());
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select("id, opponent, date, time, is_played, rating_voting_ends_at, ndfk_goals, opponent_goals")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      setError("Не удалось загрузить матч");
      setLoading(false);
      return;
    }

    if (!matchRow || !matchRow.is_played) {
      setError("Голосование по этому матчу пока недоступно");
      setLoading(false);
      return;
    }

    setMatch(matchRow as MatchRow);

    const { data: playerRows } = await supabase
      .from("players")
      .select("id, name, position, photo_url")
      .order("name");

    const { data: participationRows } = await supabase
      .from("match_player_participation")
      .select("player_id, participated, skipped_rating_vote")
      .eq("match_id", matchId);

    const participatingIds = filterParticipatingPlayerIds(
      (playerRows ?? []).map((p) => p.id),
      participationRows ?? []
    );
    const participatingSet = new Set(participatingIds);

    setPlayers(
      (playerRows ?? []).filter((p) => participatingSet.has(p.id)) as Player[]
    );

    const { data: guestVotes } = await supabase
      .from("match_guest_rating_votes")
      .select("match_id, guest_token, guest_name, rated_player_id, stars")
      .eq("match_id", matchId);

    setAllVotes((guestVotes ?? []) as GuestRatingVoteRow[]);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!match) return;
    const update = () => setRemainingMs(getVotingTimeRemainingMs(match));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [match]);

  const votingClosed = match ? isVotingDeadlinePassed(match) : false;
  const myVotes = allVotes.filter((v) => v.guest_token === guestToken);
  const myScores = myVotes.reduce<Record<number, number>>((acc, v) => {
    acc[v.rated_player_id] = v.stars;
    return acc;
  }, {});
  const averages = aggregateGuestRatings(allVotes);
  const myVotedCount = myVotes.length;

  const handleNameBlur = () => {
    saveGuestName(guestName);
  };

  const handleRate = async (playerId: number, score: number) => {
    if (!guestToken || votingClosed) return;
    setSaveError(null);
    setSavingPlayerId(playerId);

    const { error: upsertError } = await supabase
      .from("match_guest_rating_votes")
      .upsert(
        {
          match_id: matchId,
          guest_token: guestToken,
          guest_name: guestName.trim() || null,
          rated_player_id: playerId,
          stars: score,
        },
        { onConflict: "match_id,guest_token,rated_player_id" }
      );

    setSavingPlayerId(null);

    if (upsertError) {
      setSaveError("Не удалось сохранить оценку — попробуйте ещё раз");
      return;
    }

    setSavedPlayerId(playerId);
    window.setTimeout(() => {
      setSavedPlayerId((current) => (current === playerId ? null : current));
    }, 1500);

    setAllVotes((prev) => {
      const withoutMine = prev.filter(
        (v) => !(v.guest_token === guestToken && v.rated_player_id === playerId)
      );
      return [
        ...withoutMine,
        {
          match_id: matchId,
          guest_token: guestToken,
          guest_name: guestName.trim() || null,
          rated_player_id: playerId,
          stars: score,
        },
      ];
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center text-sm text-slate-400">
        Загрузка…
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-6 text-sm text-red-100">
          {error ?? "Матч не найден"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-3 py-6 sm:px-4">
      <div className="mb-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/80">
          Оценка от зрителей
        </p>
        <h1 className="mt-1 text-lg font-extrabold text-white">
          НДФК {match.ndfk_goals ?? "–"}:{match.opponent_goals ?? "–"} {match.opponent}
        </h1>
        <p className="mt-0.5 text-[12px] text-slate-400">
          {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
        </p>
        {!votingClosed && remainingMs != null ? (
          <p className="mt-1 text-[11px] font-semibold text-amber-200/70">
            Осталось: {formatVotingTimeRemaining(remainingMs)}
          </p>
        ) : null}
      </div>

      {votingClosed ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-[12px] text-slate-300">
          Голосование зрителей по этому матчу закрыто. Ниже — итоговые оценки.
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3 py-3">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-amber-200/70">
            Ваше имя (необязательно)
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Например, Игорь"
            maxLength={40}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-[13px] text-white placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
          />
          <p className="mt-1.5 text-[10px] font-semibold text-amber-200/80">
            Отправлять ничего не нужно — каждая оценка сохраняется сразу,
            как только вы её поставите.
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Оценили: {myVotedCount} из {players.length}. Оценки не входят в
            официальный рейтинг игроков — это отдельное мнение болельщиков.
          </p>
          {saveError ? (
            <p className="mt-1 text-[10px] font-semibold text-red-300">
              {saveError}
            </p>
          ) : null}
        </div>
      )}

      {!votingClosed && players.length > 0 && myVotedCount === players.length ? (
        <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-center text-[12px] font-bold text-emerald-200">
          ✅ Готово! Все ваши оценки сохранены.
        </div>
      ) : null}

      <div className="space-y-2">
        {players.map((player) => {
          const avg = averages[player.id];
          const myScore = myScores[player.id] ?? 0;
          const saving = savingPlayerId === player.id;
          const justSaved = savedPlayerId === player.id;

          return (
            <div
              key={player.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-2.5 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <PlayerAvatar
                  name={player.name}
                  photoUrl={player.photo_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-white">
                    {player.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {avg ? (
                      <span className={ratingBandTextClass(avg.avgStars)}>
                        🗣 {avg.avgStars.toFixed(1)} ({avg.voteCount}{" "}
                        {avg.voteCount === 1 ? "голос" : "голосов"})
                      </span>
                    ) : (
                      "Пока нет оценок"
                    )}
                  </p>
                </div>
                {saving ? (
                  <span className="text-[10px] text-amber-300">…</span>
                ) : justSaved ? (
                  <span className="text-[10px] font-bold text-emerald-300">
                    ✓ сохранено
                  </span>
                ) : null}
              </div>

              {!votingClosed ? (
                <div className="mt-2">
                  <StarRatingPicker
                    value={myScore}
                    onChange={(score) => {
                      if (score <= 0) return;
                      void handleRate(player.id, score);
                    }}
                    size="sm"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {players.length === 0 ? (
        <p className="mt-6 text-center text-[12px] text-slate-500">
          Для этого матча пока нет списка участников.
        </p>
      ) : null}

      <p className="mt-6 text-center text-[10px] text-slate-600">
        Максимум {MAX_VOTE_SCORE} баллов за игрока · ссылку можно закрыть и
        вернуться позже — ваши оценки сохранены в этом браузере
      </p>
    </div>
  );
}
