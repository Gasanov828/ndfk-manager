"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getRatingProgress } from "@/lib/ratingProgress";
import {
  formatOverallRating,
  formatVoteScore,
} from "@/lib/matchRatings";
import {
  buildFormSparklinePoints,
  getFormBadge,
  getFormStreak,
  type FormRatingPoint,
} from "@/lib/playerHomeDashboard";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  playedMatchesCount: number;
};

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mobile-home-card ${className}`}>{children}</div>;
}

function OvrRing({
  rating,
  delta,
}: {
  rating: number;
  delta: number | null;
}) {
  const progress = getRatingProgress(rating);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress.pct / 100) * circumference;

  return (
    <div className="mobile-home-ovr-ring mobile-home-ovr-ring--compact">
      <svg viewBox="0 0 64 64" className="mobile-home-ovr-ring__svg" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.14)"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="url(#mobileHomeOvrGradientCompact)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 32 32)"
        />
        <defs>
          <linearGradient id="mobileHomeOvrGradientCompact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="mobile-home-ovr-ring__center">
        <p className="mobile-home-ovr-ring__label">OVR</p>
        <p className="mobile-home-ovr-ring__value">{formatOverallRating(rating)}</p>
        {delta != null && delta !== 0 ? (
          <p
            className={`mobile-home-ovr-ring__delta ${
              delta > 0
                ? "mobile-home-ovr-ring__delta--up"
                : "mobile-home-ovr-ring__delta--down"
            }`}
          >
            {delta > 0 ? "+" : "−"}
            {Math.abs(delta)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TrendLine({ positive }: { positive: boolean }) {
  return (
    <svg viewBox="0 0 36 18" className="mobile-home-trend" aria-hidden>
      <polyline
        points={positive ? "2,14 12,10 22,8 34,2" : "2,4 12,8 22,10 34,16"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function FormChart({ ratings }: { ratings: FormRatingPoint[] }) {
  const points = buildFormSparklinePoints(ratings, 200, 42, 6);

  if (ratings.length === 0) {
    return (
      <div className="mobile-home-form-empty mobile-home-form-empty--compact">
        <p className="text-[10px] text-slate-500">Оценок после матчей пока нет</p>
      </div>
    );
  }

  return (
    <div className="mobile-home-form-chart mobile-home-form-chart--compact">
      <svg viewBox="0 0 200 42" className="mobile-home-form-chart__svg" aria-hidden>
        <defs>
          <linearGradient id="mobileHomeFormFillCompact" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.24)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </linearGradient>
        </defs>
        {points ? (
          <>
            <polyline
              points={`${points} 194,42 6,42`}
              fill="url(#mobileHomeFormFillCompact)"
              stroke="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#a78bfa"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </>
        ) : null}
        {ratings.map((point, index) => {
          const x =
            ratings.length === 1
              ? 100
              : 6 + (index / (ratings.length - 1)) * 188;
          const normalized = (Math.max(4, Math.min(10, point.rating)) - 4) / 6;
          const y = 36 - normalized * 28;
          return (
            <g key={point.matchId}>
              <circle cx={x} cy={y} r="3.5" fill="#c4b5fd" />
              <text
                x={x}
                y={y - 6}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="7"
                fontWeight="700"
              >
                {formatVoteScore(point.rating)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mobile-home-form-chart__labels">
        {ratings.map((point) => (
          <span key={point.matchId}>{point.shortLabel}</span>
        ))}
      </div>
    </div>
  );
}

export default function MobileHomeDashboard({
  playerWelcome,
  formRatings,
  playedMatchesCount,
}: MobileHomeDashboardProps) {
  const firstName = getFirstName(playerWelcome.name);
  const positionStyle = getPositionStyle(playerWelcome.positionGroup);
  const formBadge = getFormBadge(playerWelcome.status);
  const formStreak = getFormStreak(formRatings);
  const delta = playerWelcome.ratingDelta;
  const showTrend = delta != null && delta !== 0;

  return (
    <section className="md:hidden">
      <div className="mobile-home-shell mobile-home-shell--compact space-y-2 pb-2 pt-0.5 text-white">
        <Card className="mobile-home-header mobile-home-header--compact p-2">
          <div className="flex items-start gap-2">
            <Link
              href={`/players/${playerWelcome.id}`}
              className="mobile-home-photo-link"
            >
              <div className="mobile-home-photo-ring mobile-home-photo-ring--compact">
                {playerWelcome.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={playerWelcome.photoUrl}
                    alt={playerWelcome.name}
                    className="mobile-home-photo"
                  />
                ) : (
                  <div
                    className={`mobile-home-photo mobile-home-photo--fallback ${positionStyle.badge}`}
                  >
                    {playerWelcome.name.trim().charAt(0) || "?"}
                  </div>
                )}
              </div>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <h1 className="mobile-home-name mobile-home-name--compact">{firstName}</h1>
                  <p className="mobile-home-meta mobile-home-meta--compact">
                    {playerWelcome.position} · #{playerWelcome.rank}
                  </p>
                </div>
                <OvrRing rating={playerWelcome.rating} delta={delta} />
              </div>

              <div className="mt-1 flex flex-wrap gap-1">
                <span className={`mobile-home-badge mobile-home-badge--compact mobile-home-badge--${formBadge.tone}`}>
                  🟢 {formBadge.label}
                </span>
                {formStreak >= 2 ? (
                  <span className="mobile-home-badge mobile-home-badge--compact mobile-home-badge--streak">
                    🔥 {formStreak}
                  </span>
                ) : null}
                {showTrend ? (
                  <span
                    className={`mobile-home-badge mobile-home-badge--compact ${
                      delta! > 0
                        ? "mobile-home-badge--up"
                        : "mobile-home-badge--down"
                    }`}
                  >
                    <TrendLine positive={delta! > 0} />
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mobile-home-header-stats mobile-home-header-stats--compact">
            <div>
              <p className="mobile-home-stat-label">Место</p>
              <p className="mobile-home-stat-value">
                {playerWelcome.rank}/{playerWelcome.totalPlayers}
              </p>
            </div>
            <div>
              <p className="mobile-home-stat-label">Матчей</p>
              <p className="mobile-home-stat-value">{playedMatchesCount}</p>
            </div>
            <div>
              <p className="mobile-home-stat-label">Голы</p>
              <p className="mobile-home-stat-value">{playerWelcome.goals}</p>
            </div>
            <div>
              <p className="mobile-home-stat-label">Пасы</p>
              <p className="mobile-home-stat-value">{playerWelcome.assists}</p>
            </div>
          </div>

          <div className="mobile-home-form-inline">
            <p className="mobile-home-form-inline__title">Моя форма</p>
            <FormChart ratings={formRatings} />
          </div>
        </Card>
      </div>
    </section>
  );
}
