"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMatchVoteAbsoluteUrl,
  buildMatchVotePath,
  buildMatchVoteWhatsAppText,
  buildMatchVoteWhatsAppUrl,
  formatMatchVoteScoreline,
  type MatchMvpVoteMatchInfo,
  type MatchVotingStatus,
} from "@/lib/matchMvpVote";

type CaptainPayload = {
  ok?: boolean;
  error?: string;
  schemaMissing?: boolean;
  status?: MatchVotingStatus | null;
  match?: MatchMvpVoteMatchInfo | null;
  votesCast?: number;
  eligibleVoters?: number;
};

type MatchMvpVoteCaptainCardProps = {
  matchId: number;
  /** If provided, skip initial match label fetch delay */
  initialLabel?: string;
  compact?: boolean;
  className?: string;
  onClosed?: () => void;
};

export default function MatchMvpVoteCaptainCard({
  matchId,
  initialLabel,
  compact = false,
  className = "",
  onClosed,
}: MatchMvpVoteCaptainCardProps) {
  const [payload, setPayload] = useState<CaptainPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/match-vote/${matchId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as CaptainPayload;
      if (!response.ok) {
        setPayload(null);
        setError(data.error ?? "Нет данных голосования");
        return;
      }
      setPayload(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const voteUrl = buildMatchVoteAbsoluteUrl(matchId, origin || undefined);
  const votePath = buildMatchVotePath(matchId);

  const matchLabel = useMemo(() => {
    if (payload?.match) return formatMatchVoteScoreline(payload.match);
    return initialLabel ?? `Матч #${matchId}`;
  }, [initialLabel, matchId, payload?.match]);

  async function openVoting() {
    setBusy(true);
    try {
      const response = await fetch(`/api/match-vote/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open" }),
      });
      const data = (await response.json()) as CaptainPayload;
      if (!response.ok) {
        setError(data.error ?? "Не удалось открыть");
        return;
      }
      setPayload(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[12px] text-slate-400 ${className}`}
      >
        Загрузка голосования…
      </div>
    );
  }

  if (payload?.schemaMissing) {
    return (
      <div
        className={`rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-[12px] text-amber-100 ${className}`}
      >
        MVP-голосование: выполните SQL <code>match_mvp_votes.sql</code>
      </div>
    );
  }

  if (!payload) {
    return (
      <section
        className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3 ${className}`}
      >
        <p className="text-[12px] font-bold text-slate-200">
          🏆 Голосование за MVP ещё не открыто
        </p>
        {error ? (
          <p className="mt-1 text-[11px] text-slate-500">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void openVoting()}
          className="mt-2 w-full rounded-xl border border-amber-300/35 bg-amber-400/15 px-3 py-2 text-[12px] font-extrabold uppercase tracking-wide text-amber-50 disabled:opacity-50"
        >
          {busy ? "..." : "Открыть голосование"}
        </button>
      </section>
    );
  }

  const votesCast = payload.votesCast ?? 0;
  const eligible = payload.eligibleVoters ?? 0;
  const remaining = Math.max(0, eligible - votesCast);
  const closed = payload.status === "closed";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(voteUrl || votePath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Не удалось скопировать");
    }
  }

  function openWhatsApp(reminder = false) {
    const text = buildMatchVoteWhatsAppText({
      matchLabel,
      voteUrl: voteUrl || votePath,
      reminder,
    });
    window.open(buildMatchVoteWhatsAppUrl(text), "_blank", "noopener,noreferrer");
  }

  async function closeVoting() {
    if (!confirm("Закрыть голосование за MVP?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/match-vote/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const data = (await response.json()) as CaptainPayload;
      if (!response.ok) {
        setError(data.error ?? "Не удалось закрыть");
        return;
      }
      setPayload(data);
      onClosed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-amber-300/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 p-3 shadow-[0_0_24px_rgba(251,191,36,0.12)] ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-200/90">
            🏆 Голосование
          </p>
          {!compact ? (
            <p className="mt-0.5 truncate text-[13px] font-bold text-white">
              {matchLabel}
            </p>
          ) : null}
          <p className="mt-1 text-[18px] font-black tabular-nums text-white">
            {votesCast} / {eligible}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            closed
              ? "bg-slate-500/20 text-slate-300 ring-1 ring-white/15"
              : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35"
          }`}
        >
          {closed ? "CLOSED" : "OPEN"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-2">
          <p className="font-semibold text-emerald-100/80">🟢 Проголосовали</p>
          <p className="mt-0.5 text-[15px] font-black text-emerald-50">{votesCast}</p>
        </div>
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-2.5 py-2">
          <p className="font-semibold text-rose-100/80">🔴 Осталось</p>
          <p className="mt-0.5 text-[15px] font-black text-rose-50">{remaining}</p>
        </div>
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-cyan-50 transition duration-200"
        >
          {copied ? "✓ Скопировано" : "Скопировать ссылку"}
        </button>
        <button
          type="button"
          onClick={() => openWhatsApp(false)}
          className="rounded-xl border border-emerald-300/35 bg-emerald-500/15 px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-emerald-50 transition duration-200"
        >
          Отправить в WhatsApp
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openWhatsApp(true)}
          className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[12px] font-bold text-slate-100 transition duration-200"
        >
          Напоминание
        </button>
        {!closed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void closeVoting()}
            className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] font-bold text-rose-100 transition duration-200 disabled:opacity-50"
          >
            {busy ? "..." : "Закрыть голосование"}
          </button>
        ) : (
          <a
            href={votePath}
            className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-center text-[12px] font-bold text-amber-50 transition duration-200"
          >
            Смотреть результат
          </a>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-[11px] text-red-300">{error}</p>
      ) : null}
    </section>
  );
}
