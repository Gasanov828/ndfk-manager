"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildGuestVoteAbsoluteUrl,
  buildGuestVotePath,
  buildGuestVoteWhatsAppText,
  buildGuestVoteWhatsAppUrl,
} from "@/lib/guestRating";
import { formatMatchVoteScoreline } from "@/lib/matchMvpVote";

type GuestVoteShareLinkProps = {
  matchId: number;
  opponent: string;
  ndfkGoals?: number | null;
  opponentGoals?: number | null;
  className?: string;
};

/** Карточка со ссылкой для болельщиков — отдельная от командной ссылки на /vote. */
export default function GuestVoteShareLink({
  matchId,
  opponent,
  ndfkGoals,
  opponentGoals,
  className = "mx-3 mt-2",
}: GuestVoteShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const votePath = buildGuestVotePath(matchId);
  const voteUrl = buildGuestVoteAbsoluteUrl(matchId, origin || undefined);
  const shareUrl = voteUrl || votePath;
  const displayUrl = shareUrl.replace(/^https?:\/\//, "");

  const hasScore =
    ndfkGoals != null &&
    opponentGoals != null &&
    Number.isFinite(Number(ndfkGoals)) &&
    Number.isFinite(Number(opponentGoals));

  const matchLabel = hasScore
    ? formatMatchVoteScoreline({
        opponent,
        ndfkGoals: Number(ndfkGoals),
        opponentGoals: Number(opponentGoals),
      })
    : `НДФК vs ${opponent}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку:", shareUrl);
    }
  }

  function shareWhatsApp() {
    const text = buildGuestVoteWhatsAppText({
      matchLabel,
      voteUrl: shareUrl,
    });
    window.open(
      buildGuestVoteWhatsAppUrl(text),
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border border-fuchsia-300/25 bg-gradient-to-br from-slate-900/95 via-fuchsia-950/25 to-amber-950/20 p-2.5 shadow-[0_0_20px_rgba(232,121,249,0.08)] ${className}`}
    >
      <div className="flex items-start gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-400/20 to-amber-400/10 text-lg font-black text-fuchsia-100 shadow-[0_0_14px_rgba(232,121,249,0.12)]">
          🗣
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-fuchsia-200/90">
            Оценки от зрителей · ссылка для друзей
          </p>
          <p className="mt-0.5 truncate text-[12px] font-bold text-white">
            {matchLabel}
          </p>
          <Link
            href={votePath}
            className="mt-1.5 block truncate rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[10px] font-semibold text-fuchsia-200 transition hover:border-fuchsia-300/35 hover:bg-black/50 sm:text-[11px]"
          >
            {displayUrl}
          </Link>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className={`min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition duration-200 ${
            copied
              ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
              : "border-fuchsia-300/30 bg-fuchsia-500/15 text-fuchsia-50 hover:bg-fuchsia-500/22"
          }`}
        >
          {copied ? "✓ Скопировано" : "📋 Копировать ссылку"}
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="shrink-0 rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide text-emerald-50 transition duration-200 hover:bg-emerald-500/22"
          title="Отправить в WhatsApp"
        >
          WhatsApp
        </button>
      </div>
    </section>
  );
}
