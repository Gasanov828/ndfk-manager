"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerPhotoImage from "@/components/PlayerPhotoImage";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import { formatMatchDate } from "@/lib/matches";
import { formatOverallRating } from "@/lib/matchRatings";
import {
  formatMatchVoteScoreline,
  type MatchMvpCandidate,
  type MatchMvpVoteMatchInfo,
  type MatchMvpVoteResult,
  type MatchVotingStatus,
} from "@/lib/matchMvpVote";
import { getPlayerInitials } from "@/lib/playerPhotos";

type VotePayload = {
  ok?: boolean;
  error?: string;
  schemaMissing?: boolean;
  status?: MatchVotingStatus | null;
  match?: MatchMvpVoteMatchInfo | null;
  candidates?: MatchMvpCandidate[];
  votesCast?: number;
  eligibleVoters?: number;
  myVotedPlayerId?: number | null;
  results?: MatchMvpVoteResult[] | null;
  isAdmin?: boolean;
};

type MatchMvpVoteBoardProps = {
  matchId: number;
};

function ProgressBar({ cast, total }: { cast: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((cast / total) * 100)) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-300 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CandidateCard({
  player,
  selected,
  disabled,
  onSelect,
}: {
  player: MatchMvpCandidate;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const initials = getPlayerInitials(player.name) || "?";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition duration-200 ${
        selected
          ? "border-amber-300/55 bg-gradient-to-r from-amber-400/20 via-yellow-300/10 to-cyan-400/10 shadow-[0_0_20px_rgba(251,191,36,0.18)]"
          : "border-white/10 bg-white/[0.04] hover:border-cyan-300/35 hover:bg-white/[0.06]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`shrink-0 rounded-full p-[2px] ${
            selected
              ? "bg-gradient-to-br from-amber-200 via-yellow-300 to-cyan-300"
              : "bg-gradient-to-br from-slate-400/40 via-cyan-400/30 to-slate-500/40"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-950">
            <PlayerPhotoImage
              photoUrl={player.photoUrl}
              alt={player.name}
              className="h-full w-full object-cover object-[center_18%]"
              fallback={
                <span className="text-xs font-bold text-slate-200">{initials}</span>
              }
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-white">{player.name}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-cyan-100/70">
            {player.position} • {formatOverallRating(player.rating)} OVR
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            ⚽ {player.goals} гол • 🎯 {player.assists} передачи
          </p>
        </div>

        <span
          className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
            selected
              ? "bg-amber-300/20 text-amber-100 ring-1 ring-amber-200/40"
              : "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-300/30"
          }`}
        >
          {selected ? "✓ Выбран" : "Выбрать"}
        </span>
      </div>
    </button>
  );
}

export default function MatchMvpVoteBoard({ matchId }: MatchMvpVoteBoardProps) {
  const { playerId, isGuest, loading: authLoading } = useMyPlayerId();
  const canVote = Boolean(playerId && !isGuest);
  const loginHref = `/player/login?return=${encodeURIComponent(`/vote/${matchId}`)}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VotePayload | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/match-vote/${matchId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as VotePayload;
      if (!response.ok) {
        setError(data.error ?? "Не удалось загрузить голосование");
        setPayload(null);
        return;
      }
      setPayload(data);
      if (data.myVotedPlayerId) {
        setSelectedId(data.myVotedPlayerId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedName = useMemo(() => {
    if (selectedId == null) return null;
    return payload?.candidates?.find((c) => c.playerId === selectedId)?.name ?? null;
  }, [payload?.candidates, selectedId]);

  async function confirmVote() {
    if (!selectedId || !canVote) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/match-vote/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votedPlayerId: selectedId }),
      });
      const data = (await response.json()) as VotePayload & { alreadyVoted?: boolean };
      if (!response.ok) {
        setError(data.error ?? "Не удалось сохранить голос");
        if (data.alreadyVoted) await load();
        return;
      }
      setPayload(data);
      setSelectedId(data.myVotedPlayerId ?? selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400">
        Загрузка голосования…
      </div>
    );
  }

  if (payload?.schemaMissing) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-5 text-sm text-amber-100">
        Нужно выполнить SQL: <code>supabase/match_mvp_votes.sql</code>
      </div>
    );
  }

  if (error && !payload?.match) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-5 text-sm text-red-100">
        {error}
      </div>
    );
  }

  const match = payload?.match;
  const status = payload?.status;
  const alreadyVoted = payload?.myVotedPlayerId != null;
  const votesCast = payload?.votesCast ?? 0;
  const eligible = payload?.eligibleVoters ?? 0;
  const closed = status === "closed";

  return (
    <div className="space-y-3 pb-6">
      <section className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-slate-950 via-slate-900/90 to-cyan-950/40 p-4 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/80">
          🏆 Оценка после матча
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
          {match ? formatMatchVoteScoreline(match) : `Матч #${matchId}`}
        </h1>
        {match ? (
          <p className="mt-1 text-[12px] text-slate-400">
            {formatMatchDate(match.date)}
          </p>
        ) : null}

        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-[13px] font-bold text-slate-200">
            {votesCast} / {eligible} проголосовали
          </p>
          <p className="text-[11px] font-semibold text-cyan-200/70">
            {eligible > 0 ? Math.round((votesCast / eligible) * 100) : 0}%
          </p>
        </div>
        <ProgressBar cast={votesCast} total={eligible} />
      </section>

      {closed ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-300">
            🔒 Голосование завершено
          </p>
          <p className="mt-1 text-[13px] text-slate-400">
            Голоса больше не принимаются.
          </p>

          {payload?.results && payload.results.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[13px] font-black text-amber-200">🏆 MVP матча</p>
              {payload.results.slice(0, 8).map((row) => {
                const medal =
                  row.place === 1 ? "🥇" : row.place === 2 ? "🥈" : row.place === 3 ? "🥉" : `${row.place}.`;
                return (
                  <div
                    key={row.playerId}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                      row.place === 1
                        ? "border-amber-300/40 bg-amber-400/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <p className="min-w-0 truncate text-[13px] font-bold text-white">
                      {medal} {row.name}
                    </p>
                    <p className="shrink-0 text-[12px] font-semibold text-cyan-100/80">
                      {row.votes} · {row.percent}%
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-slate-500">Пока нет голосов.</p>
          )}
        </section>
      ) : null}

      {!closed && alreadyVoted ? (
        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4">
          <p className="text-[14px] font-black text-emerald-100">
            ✓ Вы уже проголосовали
          </p>
          <p className="mt-1 text-[13px] text-emerald-100/80">
            Ваш голос учтён
            {selectedName ? ` — ${selectedName}` : ""}.
          </p>
        </section>
      ) : null}

      {!closed && !alreadyVoted ? (
        <section className="space-y-2.5">
          <div className="px-0.5">
            <h2 className="text-[15px] font-black text-white">
              🏆 Кто лучший игрок матча?
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Выберите одного игрока и подтвердите голос.
            </p>
          </div>

          {isGuest || !canVote ? (
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-4">
              <p className="text-[13px] font-bold text-cyan-50">
                Чтобы голосовать, войдите в аккаунт игрока.
              </p>
              <Link
                href={loginHref}
                className="mt-3 inline-flex rounded-xl border border-cyan-300/40 bg-cyan-400/20 px-4 py-2.5 text-[13px] font-extrabold text-cyan-50 transition duration-200"
              >
                Войти
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {(payload?.candidates ?? []).map((player) => (
                  <CandidateCard
                    key={player.playerId}
                    player={player}
                    selected={selectedId === player.playerId}
                    disabled={saving}
                    onSelect={() => setSelectedId(player.playerId)}
                  />
                ))}
              </div>

              {selectedName ? (
                <p className="px-0.5 text-[13px] font-semibold text-amber-100">
                  ✓ Вы выбрали {selectedName}
                </p>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                disabled={!selectedId || saving}
                onClick={() => void confirmVote()}
                className="w-full rounded-2xl border border-amber-300/45 bg-gradient-to-r from-amber-400/25 via-yellow-300/20 to-cyan-400/20 py-3.5 text-[14px] font-black uppercase tracking-[0.08em] text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.18)] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "Подтвердить голос"}
              </button>
            </>
          )}
        </section>
      ) : null}

      {!closed && alreadyVoted ? (
        <div className="space-y-2 opacity-80">
          {(payload?.candidates ?? []).map((player) => (
            <CandidateCard
              key={player.playerId}
              player={player}
              selected={payload?.myVotedPlayerId === player.playerId}
              disabled
              onSelect={() => undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
