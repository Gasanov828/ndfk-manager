"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ClubLogo from "@/components/ClubLogo";
import { getRatingProgress } from "@/lib/ratingProgress";
import { formatOverallRating, formatVoteScore } from "@/lib/matchRatings";
import type { FormRatingPoint } from "@/lib/playerHomeDashboard";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  playedMatchesCount: number;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="player-home-premium__status player-home-premium__status--ready">
        🟢 Готов
      </span>
    );
  }
  if (status === "maybe") {
    return (
      <span className="player-home-premium__status player-home-premium__status--maybe">
        🟡 Возможно
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="player-home-premium__status player-home-premium__status--absent">
        🔴 Не сможет
      </span>
    );
  }
  return (
    <span className="player-home-premium__status player-home-premium__status--neutral">
      Нет статуса
    </span>
  );
}

function PremiumOvrPanel({
  rating,
  delta,
  animate,
}: {
  rating: number;
  delta: number | null;
  animate: boolean;
}) {
  const progress = getRatingProgress(rating);
  const showDelta = delta != null && delta !== 0;

  return (
    <div
      className={`player-home-premium__ovr ${animate ? "player-home-premium__ovr--animate" : ""}`}
    >
      <p className="player-home-premium__ovr-label">Рейтинг</p>
      <p className="player-home-premium__ovr-value">{formatOverallRating(rating)}</p>
      <p className="player-home-premium__ovr-tag">OVR</p>
      {showDelta ? (
        <p
          className={`player-home-premium__ovr-delta ${
            delta! > 0
              ? "player-home-premium__ovr-delta--up"
              : "player-home-premium__ovr-delta--down"
          }`}
        >
          {delta! > 0 ? "+" : "−"}
          {Math.abs(delta!)}
        </p>
      ) : null}
      <div className="player-home-premium__ovr-bar" aria-hidden>
        <div
          className={`player-home-premium__ovr-bar-fill ${
            animate ? "player-home-premium__ovr-bar-fill--animate" : ""
          }`}
          style={{ width: animate ? `${progress.pct}%` : "0%" }}
        />
      </div>
      <p className="player-home-premium__ovr-hint">
        до {progress.next} · {progress.remaining}
      </p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="player-home-premium__stat">
      <p className="player-home-premium__stat-label">
        {icon} {label}
      </p>
      <p className="player-home-premium__stat-value">{value}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="player-home-premium__info">
      <p className="player-home-premium__info-label">
        {icon} {label}
      </p>
      <p className="player-home-premium__info-value">{value}</p>
    </div>
  );
}

export default function MobileHomeDashboard({
  playerWelcome,
  formRatings,
  playedMatchesCount,
}: MobileHomeDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const firstName = getFirstName(playerWelcome.name);
  const positionStyle = getPositionStyle(playerWelcome.positionGroup);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  const averageRating = useMemo(() => {
    if (formRatings.length === 0) return null;
    const sum = formRatings.reduce((acc, point) => acc + point.rating, 0);
    return sum / formRatings.length;
  }, [formRatings]);

  const lastFiveLabel = useMemo(() => {
    if (formRatings.length === 0) return "Нет данных";
    return formRatings
      .slice(-5)
      .map((point) => formatVoteScore(point.rating))
      .join(" · ");
  }, [formRatings]);

  const ratingChangeLabel = useMemo(() => {
    const delta = playerWelcome.ratingDelta;
    if (delta == null || delta === 0) return "Нет данных";
    const abs = Math.abs(delta);
    const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
    return `${delta > 0 ? "+" : "−"}${text}`;
  }, [playerWelcome.ratingDelta]);

  const averageLabel =
    averageRating != null ? formatVoteScore(averageRating) : "Нет данных";

  return (
    <section className="md:hidden">
      <article
        className={`player-home-premium ${mounted ? "player-home-premium--mounted" : ""}`}
      >
        <div className="player-home-premium__top">
          <Link
            href={`/players/${playerWelcome.id}`}
            className="player-home-premium__photo-wrap"
          >
            <div className="player-home-premium__photo">
              {playerWelcome.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playerWelcome.photoUrl}
                  alt={playerWelcome.name}
                  className="player-home-premium__photo-img"
                />
              ) : (
                <span
                  className={`player-home-premium__photo-fallback ${positionStyle.badge}`}
                >
                  {playerWelcome.name.trim().charAt(0) || "?"}
                </span>
              )}
            </div>
            <span className="player-home-premium__club-badge" aria-hidden>
              <ClubLogo size="sm" className="!h-5 !w-5" />
            </span>
          </Link>

          <div className="player-home-premium__identity">
            <h1 className="player-home-premium__name">{firstName}</h1>
            <p className="player-home-premium__meta">
              {playerWelcome.position} • #{playerWelcome.rank}
            </p>
            <StatusBadge status={playerWelcome.status} />
          </div>

          <PremiumOvrPanel
            rating={playerWelcome.rating}
            delta={playerWelcome.ratingDelta}
            animate={mounted}
          />
        </div>

        <div className="player-home-premium__stats">
          <StatTile
            icon="🏆"
            label="Место"
            value={`${playerWelcome.rank} / ${playerWelcome.totalPlayers}`}
          />
          <StatTile icon="⚽" label="Матчи" value={String(playedMatchesCount)} />
          <StatTile icon="🥅" label="Голы" value={String(playerWelcome.goals)} />
          <StatTile
            icon="🎯"
            label="Ассисты"
            value={String(playerWelcome.assists)}
          />
        </div>

        <div className="player-home-premium__insights">
          <InfoTile icon="⭐" label="Средняя оценка" value={averageLabel} />
          <InfoTile icon="📈" label="Изменение" value={ratingChangeLabel} />
          <InfoTile icon="🔥" label="5 матчей" value={lastFiveLabel} />
          <InfoTile icon="❤️" label="Реакции" value="Нет данных" />
        </div>
      </article>
    </section>
  );
}
