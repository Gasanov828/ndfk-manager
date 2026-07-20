"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import {
  getFirstName,
  getRankLabel,
  getTimeGreeting,
  type PlayerWelcomeData,
} from "@/lib/playerStats";
import {
  formatOverallRating,
  formatVoteScore,
  getMatchRatingColorClass,
  MAX_VOTE_SCORE,
} from "@/lib/matchRatings";
import { getPositionStyle } from "@/lib/positionStyles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlayerWelcomeCardProps = {
  data: PlayerWelcomeData;
  onNameUpdated?: (name: string) => void;
  /** On mobile, greeting/name/rating live in the navbar — hide them here. */
  hideMobileHeader?: boolean;
};

function StatTile({
  label,
  value,
  hint,
  valueClassName = "text-slate-100",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.015] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-black leading-none tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function MobileStatCell({
  label,
  value,
  hint,
  accent,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-[58px] flex-col items-center justify-center px-1.5 py-2 text-center">
      <div className={`mb-1 h-1 w-5 rounded-full ${accent}`} aria-hidden />
      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[18px] font-black leading-none tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 max-w-full truncate text-[8px] leading-tight text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function PlayerWelcomeCard({
  data,
  onNameUpdated,
  hideMobileHeader = true,
}: PlayerWelcomeCardProps) {
  const router = useRouter();
  const greeting = getTimeGreeting();
  const positionStyle = getPositionStyle(data.positionGroup);
  const rankLabel = getRankLabel(data.rank, data.totalPlayers);

  const [displayName, setDisplayName] = useState(data.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const firstName = getFirstName(displayName);
  const hasMatchVote =
    data.matchVoteScore != null && Number.isFinite(data.matchVoteScore);
  const afterMatchValue = hasMatchVote
    ? formatVoteScore(data.matchVoteScore!)
    : "\u2014";
  const afterMatchHint = hasMatchVote
    ? data.lastMatchLabel ?? "голос. команды"
    : data.lastMatchLabel ?? "ещё нет оценок";
  const afterMatchAccent = hasMatchVote
    ? getMatchRatingColorClass(data.matchVoteScore!)
    : "text-white";

  function startEditingName() {
    setNameDraft(displayName);
    setNameError(null);
    setEditingName(true);
  }

  function cancelEditingName() {
    setNameDraft(displayName);
    setNameError(null);
    setEditingName(false);
  }

  async function saveName() {
    const trimmed = nameDraft.trim();

    if (trimmed.length < 2) {
      setNameError("\u041c\u0438\u043d\u0438\u043c\u0443\u043c 2 \u0441\u0438\u043c\u0432\u043e\u043b\u0430");
      return;
    }

    if (trimmed === displayName) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError(null);

    try {
      const response = await fetch("/api/me/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = (await response.json()) as { error?: string; name?: string };

      if (!response.ok) {
        setNameError(
          payload.error ??
            "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
        );
        return;
      }

      const nextName = payload.name ?? trimmed;
      setDisplayName(nextName);
      setEditingName(false);
      onNameUpdated?.(nextName);
      router.refresh();
    } catch {
      setNameError("\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <section className="premium-card mb-2 overflow-hidden rounded-[18px] sm:mb-6">
      <div className="bg-gradient-to-br from-blue-500/[0.05] via-violet-500/[0.03] to-cyan-500/[0.03] p-2 sm:p-5">
        <div
          className={`items-start gap-2 sm:gap-4 ${
            hideMobileHeader ? "hidden sm:flex" : "flex"
          }`}
        >
          <PlayerAvatar
            name={displayName}
            photoUrl={data.photoUrl}
            size="lg"
            badge={data.positionGroup}
            badgeClassName={positionStyle.badge}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-violet-200/80 sm:text-xs">
              {greeting},
            </p>

            {editingName ? (
              <div className="mt-1 space-y-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={40}
                  autoFocus
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-base font-bold text-white focus:border-emerald-400/40 focus:outline-none sm:max-w-xs sm:text-lg"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={savingName}
                    className="rounded-lg bg-emerald-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingName
                      ? "..."
                      : "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingName}
                    disabled={savingName}
                    className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
                  >
                    {"\u041e\u0442\u043c\u0435\u043d\u0430"}
                  </button>
                </div>
                {nameError && (
                  <p className="text-[11px] text-red-300">{nameError}</p>
                )}
              </div>
            ) : (
              <div className="mt-0.5 flex items-center gap-1.5">
                <h2 className="truncate text-lg font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
                  {firstName}!
                </h2>
                <button
                  type="button"
                  onClick={startEditingName}
                  title={"\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0438\u043c\u044f"}
                  className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-violet-400/30 hover:text-violet-200"
                >
                  {"\u270F\uFE0F"}
                </button>
              </div>
            )}

            {data.lineupLabel && (
              <div className="mt-2">
                <span className="rounded-md bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200 ring-1 ring-violet-400/20">
                  {"\u26BD"} {data.lineupLabel}
                </span>
              </div>
            )}
          </div>

          <div className="premium-rating-box shrink-0 rounded-2xl px-3 py-2.5 text-right sm:min-w-[108px]">
            <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-lime-300/75 sm:text-[10px]">
              {"\u2605 \u0420\u0435\u0439\u0442\u0438\u043d\u0433"}
            </p>
            <p className="rating-lime text-3xl font-black leading-none">
              {formatOverallRating(data.rating)}
            </p>
            <div className="mt-1 flex items-center justify-end gap-1">
              <RatingChangeBadge delta={data.ratingDelta} size="sm" />
            </div>
            <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-300">
              {rankLabel}
            </p>
            <p className="text-[9px] text-slate-500 sm:text-[10px]">
              {data.rank}/{data.totalPlayers}
            </p>
          </div>
        </div>

        {hideMobileHeader && data.lineupLabel && (
          <div className="mb-1.5 sm:hidden">
            <span className="rounded-md bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200 ring-1 ring-violet-400/20">
              {"\u26BD"} {data.lineupLabel}
            </span>
          </div>
        )}

        {/* Mobile: one shared stats strip */}
        <div
          className={`sm:hidden ${hideMobileHeader ? "mt-0" : "mt-1.5"}`}
          data-welcome-stats="v2"
        >
          <div className="overflow-hidden rounded-2xl border border-lime-400/25 bg-[linear-gradient(180deg,rgba(163,230,53,0.10),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              <MobileStatCell
                label={"\u0413\u043e\u043b\u044b"}
                value={String(data.goals)}
                accent="bg-lime-400"
              />
              <MobileStatCell
                label={"\u041f\u0435\u0440\u0435\u0434\u0430\u0447\u0438"}
                value={String(data.assists)}
                accent="bg-cyan-400"
              />
              <MobileStatCell
                label="Оценка"
                value={afterMatchValue}
                hint={afterMatchHint}
                accent={hasMatchVote ? "bg-amber-400" : "bg-violet-400"}
                valueClassName={afterMatchAccent}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 border-t border-white/10 bg-black/25 p-1.5">
              <Link
                href="/lineup"
                className="btn-neon-primary flex items-center justify-center rounded-xl px-2 py-2 text-[11px] font-bold text-slate-50 active:scale-[0.98]"
              >
                {"\u041c\u043e\u0439 \u0441\u043e\u0441\u0442\u0430\u0432"}
              </Link>
              <Link
                href="/players"
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] font-semibold text-slate-300 active:scale-[0.98]"
              >
                {"\u0412\u0441\u0435 \u0438\u0433\u0440\u043e\u043a\u0438"}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop tiles + buttons */}
        <div className="mt-4 hidden grid-cols-3 gap-2 sm:grid">
          <StatTile
            label={"\u0413\u043e\u043b\u044b"}
            value={String(data.goals)}
          />
          <StatTile
            label={"\u041f\u0435\u0440\u0435\u0434\u0430\u0447\u0438"}
            value={String(data.assists)}
          />
          <StatTile
            label={`Оценка /${MAX_VOTE_SCORE}`}
            value={afterMatchValue}
            hint={afterMatchHint}
            valueClassName={afterMatchAccent}
          />
        </div>

        <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid">
          <Link
            href="/lineup"
            className="btn-neon-primary flex items-center justify-center rounded-xl px-2.5 py-2 text-xs font-bold text-slate-50 transition hover:opacity-90 active:scale-[0.98]"
          >
            {"\u041c\u043e\u0439 \u0441\u043e\u0441\u0442\u0430\u0432"}
          </Link>
          <Link
            href="/players"
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 active:scale-[0.98]"
          >
            {"\u0412\u0441\u0435 \u0438\u0433\u0440\u043e\u043a\u0438"}
          </Link>
        </div>
      </div>
    </section>
  );
}
