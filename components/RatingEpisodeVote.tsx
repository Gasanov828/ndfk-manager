"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ScorePicker from "@/components/ScorePicker";
import PageHeader from "@/components/PageHeader";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import { formatOverallRating } from "@/lib/matchRatings";
import {
  aggregateEpisodeRatings,
  buildScoresMapFromVotes,
  formatAttributeScore,
  formatEpisodeOverall,
  formatFifaStat,
  getAttributesForPosition,
  getVotesForPlayerPair,
  hasPreviewRating,
  isPairRatingComplete,
  normalizeEpisodeToken,
  RATING_EPISODE_MAX_SCORE,
  RATING_EPISODE_MIN_SCORE,
  type RatingEpisodeRow,
  type RatingEpisodeStatus,
  type RatingVoteRow,
} from "@/lib/ratingEpisode";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

type PlayerRow = {
  id: number;
  name: string;
  position: string;
  rating: number;
};

type RatingEpisodeVoteProps = {
  token: string;
};

export default function RatingEpisodeVote({ token }: RatingEpisodeVoteProps) {
  const router = useRouter();
  const { playerId, playerName, isGuest, loading: authLoading } = useMyPlayerId();
  const canVote = Boolean(playerId && !isGuest);
  const loginReturnUrl = `/rate/${encodeURIComponent(token)}`;
  const [episode, setEpisode] = useState<RatingEpisodeRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [votes, setVotes] = useState<RatingVoteRow[]>([]);
  const [progress, setProgress] = useState({
    completedVoters: 0,
    totalVoters: 0,
    votingComplete: false,
    acknowledgedPlayers: 0,
    revealComplete: false,
  });
  const [previews, setPreviews] = useState<
    Record<number, { attrs: Record<string, number>; overall: number }>
  >({});
  const [acknowledgedPlayerIds, setAcknowledgedPlayerIds] = useState<number[]>([]);
  const [episodeResults, setEpisodeResults] = useState<
    Record<number, { attrs: Record<string, number>; overall: number }> | null
  >(null);
  const [finalAttrs, setFinalAttrs] = useState<
    Record<number, Record<string, number>>
  >({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundHint, setNotFoundHint] = useState<string | null>(null);
  const [justRevealing, setJustRevealing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [acking, setAcking] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(
        `/api/rating-episode/${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );

      if (response.status === 404) {
        const payload = (await response.json()) as { hint?: string };
        setNotFoundHint(payload.hint ?? null);
        setEpisode(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string; hint?: string };
        setError(payload.hint ?? payload.error ?? "Не удалось загрузить опрос");
        setLoading(false);
        return;
      }

      setNotFoundHint(null);

      const payload = (await response.json()) as {
        episode: RatingEpisodeRow;
        players: PlayerRow[];
        votes: RatingVoteRow[];
        previews: Record<number, { attrs: Record<string, number>; overall: number }>;
        acknowledgedPlayerIds: number[];
        progress: {
          completedVoters: number;
          totalVoters: number;
          votingComplete: boolean;
          acknowledgedPlayers: number;
          revealComplete: boolean;
        };
        results: Record<number, { attrs: Record<string, number>; overall: number }> | null;
      };

      setEpisode(payload.episode);
      setPlayers(payload.players);
      setVotes(payload.votes);
      setPreviews(payload.previews ?? {});
      setAcknowledgedPlayerIds(payload.acknowledgedPlayerIds ?? []);
      setProgress(payload.progress);
      setEpisodeResults(payload.results);

      if (payload.episode.status === "closed") {
        const map: Record<number, Record<string, number>> = {};
        for (const [id, result] of Object.entries(payload.results ?? {})) {
          map[Number(id)] = result.attrs;
        }
        setFinalAttrs(map);

        const { data: attrRows } = await supabase
          .from("player_attributes")
          .select("player_id, attrs");

        for (const row of attrRows ?? []) {
          map[row.player_id] = row.attrs as Record<string, number>;
        }
        setFinalAttrs(map);
      }
    } catch {
      setError("Ошибка сети");
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (authLoading || loading || !episode || !isGuest) return;
    router.replace(
      `/player/login?return=${encodeURIComponent(loginReturnUrl)}`
    );
  }, [authLoading, loading, episode, isGuest, loginReturnUrl, router]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedId) ?? null,
    [players, selectedId]
  );

  const completedVoters = progress.completedVoters;

  const myProgress = useMemo(() => {
    if (!playerId) return { done: 0, total: 0 };
    const others = players.filter((player) => player.id !== playerId);
    const done = others.filter((player) =>
      isPairRatingComplete(playerId, player.id, player.position, votes)
    ).length;
    return { done, total: others.length };
  }, [playerId, players, votes]);

  const aggregated = useMemo(() => {
    if (Object.keys(previews).length > 0) return previews;
    if (episode?.status === "closed") {
      return episodeResults ?? aggregateEpisodeRatings(players, votes);
    }
    return aggregateEpisodeRatings(players, votes);
  }, [previews, episode?.status, episodeResults, players, votes]);

  const hasAcknowledged = playerId != null && acknowledgedPlayerIds.includes(playerId);
  const myPreview = playerId != null ? aggregated[playerId] : null;

  useEffect(() => {
    if (!selectedId || !playerId) {
      setScores({});
      return;
    }

    const pairVotes = getVotesForPlayerPair(votes, playerId, selectedId);
    setScores(buildScoresMapFromVotes(pairVotes));
    // votes intentionally omitted — only reload scores when opening another player
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, playerId]);

  async function handleSave() {
    if (!episode || !selectedPlayer || !canVote) return;

    const attributes = getAttributesForPosition(selectedPlayer.position);
    const allFilled = attributes.every(
      (attribute) =>
        scores[attribute.key] >= RATING_EPISODE_MIN_SCORE &&
        scores[attribute.key] <= RATING_EPISODE_MAX_SCORE
    );

    if (!allFilled) {
      setError(
        `Оцените все характеристики от ${RATING_EPISODE_MIN_SCORE} до ${RATING_EPISODE_MAX_SCORE}`
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/rating-episode/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId: episode.id,
          ratedPlayerId: selectedPlayer.id,
          scores,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        revealing?: boolean;
        preview?: { overall: number };
      };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось сохранить");
        return;
      }

      if (payload.revealing) {
        setJustRevealing(true);
      }

      await loadData();
      setSelectedId(null);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge() {
    if (!episode || !playerId) return;

    setAcking(true);
    setError(null);

    try {
      const response = await fetch("/api/rating-episode/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId: episode.id }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось подтвердить");
        return;
      }

      await loadData();
      setSelectedId(null);
    } catch {
      setError("Ошибка сети");
    } finally {
      setAcking(false);
    }
  }

  if (loading || authLoading || (isGuest && episode)) {
    return (
      <div className="py-16 text-center text-slate-400">
        {isGuest && episode ? "Переход на вход..." : "Загрузка опроса..."}
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="mt-4 text-xl font-bold text-white">Ссылка не найдена</h1>
        <p className="mt-2 text-sm text-slate-400">
          {notFoundHint ??
            "Попросите капитана прислать актуальную ссылку из раздела «Рейтинг» в админке."}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Код ссылки: {normalizeEpisodeToken(token) || "пусто"}
        </p>
        <Link href="/" className="mt-6 inline-block text-cyan-400 hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  const isOpen = episode.status === "open";
  const isRevealing = episode.status === "revealing";
  const isClosed = episode.status === "closed";
  const canVoteNow = canVote && isOpen;

  return (
    <div>
      <PageHeader
        icon="⭐"
        title={episode.title}
        subtitle={
          isClosed
            ? "Рейтинги опубликованы — ★ обновлён в составе"
            : isRevealing
              ? "Все проголосовали. Посмотрите свой ★ и нажмите «Видел» — капитан опубликует в состав"
              : `Оцените каждого игрока (${RATING_EPISODE_MIN_SCORE}–${RATING_EPISODE_MAX_SCORE}) — ★ появится сразу после оценок`
        }
        extra={
          !isClosed && progress.totalVoters > 0 ? (
            <div className="glass-panel rounded-2xl px-4 py-3 text-sm">
              <p className="font-semibold text-white">
                Проголосовало: {completedVoters}/{progress.totalVoters}
              </p>
              {isRevealing && (
                <p className="mt-1 text-emerald-200">
                  Видели свой ★: {progress.acknowledgedPlayers}/{progress.totalVoters}
                </p>
              )}
              {canVoteNow && (
                <p className="mt-1 text-slate-400">
                  Ваш прогресс: {myProgress.done}/{myProgress.total}
                </p>
              )}
            </div>
          ) : null
        }
      />

      {playerName && !isGuest && (
        <p className="mb-4 text-center text-sm text-slate-400">
          Вы вошли как <span className="text-white">{playerName}</span> — можно голосовать
        </p>
      )}

      {justRevealing && isRevealing && (
        <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          Все оценили друг друга. Откройте карточку с вашим именем — там новый ★. Нажмите «Видел свой
          рейтинг», затем капитан опубликует в состав.
        </div>
      )}

      {justPublished && isClosed && (
        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Рейтинги опубликованы — ★ обновлён по всей команде.
        </div>
      )}

      {isRevealing && playerId && myPreview && !hasAcknowledged && (
        <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-100">Ваш новый рейтинг</p>
          <p className="rating-gold mt-2 text-4xl font-extrabold">
            {formatEpisodeOverall(myPreview.overall)}
          </p>
          <button
            type="button"
            disabled={acking}
            onClick={() => {
              setSelectedId(playerId);
            }}
            className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Подробнее
          </button>
        </div>
      )}

      {isRevealing && playerId && hasAcknowledged && (
        <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          ✓ Вы подтвердили свой рейтинг. Ждём остальных — капитан опубликует в состав.
        </div>
      )}

      {isGuest && isOpen && (
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Чтобы голосовать,{" "}
          <Link
            href={`/player/login?return=${encodeURIComponent(loginReturnUrl)}`}
            className="font-semibold text-cyan-300 hover:underline"
          >
            войдите как игрок
          </Link>{" "}
          — после входа откроется этот же опрос.
        </div>
      )}

      {!isGuest && !canVote && isOpen && (
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Аккаунт не привязан к игроку. Войдите через invite-ссылку или попросите капитана
          создать новую.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {selectedPlayer ? (
        <RatingPlayerDetail
          player={selectedPlayer}
          scores={scores}
          isSelf={playerId === selectedPlayer.id}
          phase={episode.status}
          canVote={canVoteNow}
          preview={aggregated[selectedPlayer.id]}
          finalAttrs={finalAttrs[selectedPlayer.id]}
          hasAcknowledged={hasAcknowledged}
          saving={saving}
          acking={acking}
          onBack={() => setSelectedId(null)}
          onScoreChange={(key, value) =>
            setScores((prev) => ({ ...prev, [key]: value }))
          }
          onSave={handleSave}
          onAcknowledge={handleAcknowledge}
          loginReturnUrl={loginReturnUrl}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => {
            const group = getPositionGroup(null, player.position);
            const style = getPositionStyle(group);
            const isSelf = playerId === player.id;
            const ratedByMe =
              playerId != null &&
              isPairRatingComplete(playerId, player.id, player.position, votes);
            const preview = aggregated[player.id];
            const showPreview = hasPreviewRating(player.id, aggregated);
            const displayRating = showPreview ? preview.overall : player.rating;
            const attrs = showPreview ? preview.attrs : null;
            const playerAcked = acknowledgedPlayerIds.includes(player.id);

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedId(player.id)}
                className={`glass-panel group rounded-2xl p-4 text-left transition hover:border-cyan-400/25 hover:shadow-[0_0_24px_rgba(56,189,248,0.08)] ${
                  isRevealing && isSelf ? "ring-2 ring-amber-400/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${style.badge}`}
                    >
                      {group}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-white">{player.name}</h3>
                      <p className="text-xs text-slate-400">{player.position}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rating-gold text-xl font-extrabold">
                      {formatEpisodeOverall(displayRating)}
                    </span>
                    {showPreview && !isClosed && displayRating !== player.rating && (
                      <p className="text-[10px] text-slate-500 line-through">
                        было {formatEpisodeOverall(player.rating)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {isSelf && (
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-slate-400">
                      Это вы
                    </span>
                  )}
                  {canVoteNow && !isSelf && ratedByMe && (
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-emerald-200">
                      ✓ Оценён
                    </span>
                  )}
                  {canVoteNow && !isSelf && !ratedByMe && (
                    <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">
                      Нужна оценка
                    </span>
                  )}
                  {showPreview && !isSelf && isOpen && (
                    <span className="rounded-lg bg-cyan-500/15 px-2 py-1 text-cyan-200">
                      OVR {formatEpisodeOverall(displayRating)}
                    </span>
                  )}
                  {isRevealing && playerAcked && (
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-emerald-200">
                      ✓ Видел
                    </span>
                  )}
                  {isRevealing && isSelf && !playerAcked && (
                    <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">
                      Откройте и подтвердите
                    </span>
                  )}
                </div>

                {attrs && Object.keys(attrs).length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-1 border-t border-white/5 pt-3 text-[11px] text-slate-400">
                    {getAttributesForPosition(player.position).map((attribute) => {
                      const vote10 = attrs[attribute.key] ?? 0;
                      if (vote10 <= 0) return null;
                      return (
                        <span key={attribute.key}>
                          {attribute.emoji} {attribute.label}:{" "}
                          <strong className="text-slate-200">
                            {formatFifaStat(vote10)}
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isClosed && (
        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/" className="text-cyan-400 hover:underline">
            На главную
          </Link>{" "}
          — рейтинг уже виден в составе и списке игроков
        </p>
      )}
    </div>
  );
}

type DetailProps = {
  player: PlayerRow;
  scores: Record<string, number>;
  isSelf: boolean;
  phase: RatingEpisodeStatus;
  canVote: boolean;
  preview?: { attrs: Record<string, number>; overall: number };
  finalAttrs?: Record<string, number>;
  hasAcknowledged: boolean;
  saving: boolean;
  acking: boolean;
  onBack: () => void;
  onScoreChange: (key: string, value: number) => void;
  onSave: () => void;
  onAcknowledge: () => void;
  loginReturnUrl: string;
};

function RatingPlayerDetail({
  player,
  scores,
  isSelf,
  phase,
  canVote,
  preview,
  finalAttrs,
  hasAcknowledged,
  saving,
  acking,
  onBack,
  onScoreChange,
  onSave,
  onAcknowledge,
  loginReturnUrl,
}: DetailProps) {
  const attributes = getAttributesForPosition(player.position);
  const group = getPositionGroup(null, player.position);
  const style = getPositionStyle(group);
  const isOpen = phase === "open";
  const isRevealing = phase === "revealing";
  const isClosed = phase === "closed";
  const showPreview = hasPreviewRating(player.id, preview ? { [player.id]: preview } : null);
  const displayAttrs =
    isClosed || isRevealing
      ? (finalAttrs ?? preview?.attrs)
      : showPreview
        ? preview?.attrs
        : null;
  const displayOverall = showPreview || isRevealing || isClosed
    ? (preview?.overall ?? player.rating)
    : player.rating;
  const allScoresFilled = attributes.every(
    (attribute) =>
      scores[attribute.key] >= RATING_EPISODE_MIN_SCORE &&
      scores[attribute.key] <= RATING_EPISODE_MAX_SCORE
  );

  return (
    <div className="glass-panel-strong mx-auto max-w-lg rounded-3xl p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-cyan-400 hover:underline"
      >
        ← Все игроки
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${style.badge}`}
          >
            {group}
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">{player.name}</h2>
            <p className="text-sm text-slate-400">{player.position}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="rating-gold text-3xl font-extrabold">
            {formatOverallRating(displayOverall)}
          </span>
          {showPreview && displayOverall !== player.rating && !isClosed && (
            <p className="text-xs text-slate-500 line-through">
              было {formatOverallRating(player.rating)}
            </p>
          )}
        </div>
      </div>

      {isSelf && isOpen && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
          Себя оценивать не нужно — только других игроков.
        </p>
      )}

      {isSelf && isRevealing && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
          <p>Это ваш новый рейтинг по голосам команды.</p>
          {!hasAcknowledged ? (
            <button
              type="button"
              disabled={acking}
              onClick={onAcknowledge}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 font-bold text-white disabled:opacity-50"
            >
              {acking ? "..." : "✓ Видел свой рейтинг"}
            </button>
          ) : (
            <p className="mt-2 text-emerald-200">✓ Вы подтвердили просмотр</p>
          )}
        </div>
      )}

      {!isSelf && isOpen && !canVote && (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Оценки неактивны —{" "}
          <Link
            href={`/player/login?return=${encodeURIComponent(loginReturnUrl)}`}
            className="font-semibold text-cyan-300 hover:underline"
          >
            войдите как игрок
          </Link>
          .
        </p>
      )}

      <div className="mt-6 space-y-5">
        {attributes.map((attribute) => (
          <div
            key={attribute.key}
            className="flex flex-col gap-2 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-white">
                {attribute.emoji} {attribute.label}
              </p>
              {displayAttrs && displayAttrs[attribute.key] != null && (
                <p className="mt-1 text-sm text-amber-200/90">
                  {isOpen ? "Стат" : "Итог"}:{" "}
                  <strong>{formatFifaStat(displayAttrs[attribute.key] ?? 0)}</strong>
                  <span className="text-slate-500">
                    {" "}
                    (голос {formatAttributeScore(displayAttrs[attribute.key] ?? 0)}/10)
                  </span>
                </p>
              )}
            </div>

            {isClosed || isRevealing || isSelf ? (
              displayAttrs && displayAttrs[attribute.key] != null ? (
                <span className="text-2xl font-bold text-amber-200">
                  {formatFifaStat(displayAttrs[attribute.key] ?? 0)}
                </span>
              ) : null
            ) : (
              <ScorePicker
                value={scores[attribute.key] ?? 0}
                onChange={(value) => onScoreChange(attribute.key, value)}
                disabled={!canVote}
                max={RATING_EPISODE_MAX_SCORE}
              />
            )}
          </div>
        ))}
      </div>

      {isOpen && canVote && !isSelf && (
        <button
          type="button"
          disabled={saving || !allScoresFilled}
          onClick={onSave}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-bold text-white transition hover:from-amber-400 hover:to-orange-500 disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "Сохранить оценку"}
        </button>
      )}

      {canVote && !isSelf && isOpen && allScoresFilled && (
        <p className="mt-3 text-center text-xs text-slate-500">
          После сохранения ★ игрока обновится на карточке
        </p>
      )}
    </div>
  );
}
