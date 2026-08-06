"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import MatchMvpRichCard from "@/components/MatchMvpRichCard";
import MatchScoreboard from "@/components/MatchScoreboard";
import VotingDeadlineBanner from "@/components/VotingDeadlineBanner";
import { getRatingProgress } from "@/lib/ratingProgress";
import {
  formatMatchDate,
  type Match,
} from "@/lib/matches";
import {
  formatOverallRating,
  formatVoteScore,
  getMatchRatingColorClass,
  type MatchMvpInfo,
  type RatingVotingMatch,
} from "@/lib/matchRatings";
import type { MatchPlayerStat } from "@/lib/matchHistory";
import {
  buildFormSparklinePoints,
  formatCalendarRow,
  getFormBadge,
  getFormStreak,
  getMatchVenueLabel,
  type FormRatingPoint,
  type PlayerHomeAchievement,
} from "@/lib/playerHomeDashboard";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  playedMatchesCount: number;
  achievements: PlayerHomeAchievement[];
  latestMatchRating: number | null;
  matchMvp: MatchMvpInfo | null;
  personalMvp: MatchMvpInfo | null;
  votingMatch: RatingVotingMatch | null;
  latestPlayed: Match | null;
  latestMatchStats: MatchPlayerStat[];
  upcomingMatches: Match[];
  players: {
    id: number;
    name: string;
    rating: number;
    goals: number;
    assists: number;
    photo_url?: string | null;
  }[];
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

function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mobile-home-section-head">
      <h2 className="mobile-home-section-title">{children}</h2>
      {action}
    </div>
  );
}

function OvrRing({
  rating,
  delta,
}: {
  rating: number;
  delta: number | null;
}) {
  const progress = getRatingProgress(rating);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress.pct / 100) * circumference;

  return (
    <div className="mobile-home-ovr-ring">
      <svg viewBox="0 0 88 88" className="mobile-home-ovr-ring__svg" aria-hidden>
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.14)"
          strokeWidth="6"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="url(#mobileHomeOvrGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 44 44)"
        />
        <defs>
          <linearGradient id="mobileHomeOvrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
  const points = buildFormSparklinePoints(ratings);

  if (ratings.length === 0) {
    return (
      <div className="mobile-home-form-empty">
        <p className="text-[11px] text-slate-500">Оценок после матчей пока нет</p>
      </div>
    );
  }

  return (
    <div className="mobile-home-form-chart">
      <svg viewBox="0 0 220 56" className="mobile-home-form-chart__svg" aria-hidden>
        <defs>
          <linearGradient id="mobileHomeFormFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.28)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </linearGradient>
        </defs>
        {points ? (
          <>
            <polyline
              points={`${points} 212,56 8,56`}
              fill="url(#mobileHomeFormFill)"
              stroke="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#a78bfa"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </>
        ) : null}
        {ratings.map((point, index) => {
          const x =
            ratings.length === 1
              ? 110
              : 8 + (index / (ratings.length - 1)) * 204;
          const normalized = (Math.max(4, Math.min(10, point.rating)) - 4) / 6;
          const y = 48 - normalized * 40;
          return (
            <g key={point.matchId}>
              <circle cx={x} cy={y} r="4.5" fill="#c4b5fd" />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="8"
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

function LeaderChip({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string | number;
}) {
  return (
    <div className="mobile-home-leader">
      <p className="mobile-home-leader__label">{label}</p>
      <p className="mobile-home-leader__name">{name}</p>
      <p className="mobile-home-leader__value">{value}</p>
    </div>
  );
}

export default function MobileHomeDashboard({
  playerWelcome,
  formRatings,
  playedMatchesCount,
  achievements,
  latestMatchRating,
  matchMvp,
  personalMvp,
  votingMatch,
  latestPlayed,
  upcomingMatches,
  players,
}: MobileHomeDashboardProps) {
  const firstName = getFirstName(playerWelcome.name);
  const positionStyle = getPositionStyle(playerWelcome.positionGroup);
  const formBadge = getFormBadge(playerWelcome.status);
  const formStreak = getFormStreak(formRatings);
  const delta = playerWelcome.ratingDelta;
  const showTrend = delta != null && delta !== 0;

  const topScorer = [...players].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists
  )[0];
  const topAssister = [...players].sort(
    (a, b) => b.assists - a.assists || b.goals - a.goals
  )[0];
  const topRated = [...players].sort((a, b) => b.rating - a.rating)[0];

  const mvpCard = personalMvp?.isConfirmedMvp ? personalMvp : matchMvp;
  const mvpPlayer = mvpCard
    ? players.find((player) => player.id === mvpCard.playerId)
    : null;

  const latestRatingClass =
    latestMatchRating != null
      ? getMatchRatingColorClass(latestMatchRating)
      : "text-white";

  return (
    <section className="md:hidden">
      <div className="mobile-home-shell space-y-3 pb-5 pt-1 text-white">
        {/* 1. Шапка */}
        <Card className="mobile-home-header p-3">
          <div className="flex items-start gap-3">
            <Link
              href={`/players/${playerWelcome.id}`}
              className="mobile-home-photo-link"
            >
              <div className="mobile-home-photo-ring">
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
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="mobile-home-kicker">Мой профиль</p>
                  <h1 className="mobile-home-name">{firstName}</h1>
                  <p className="mobile-home-meta">
                    {playerWelcome.position} · {playerWelcome.positionGroup}
                  </p>
                </div>
                <OvrRing rating={playerWelcome.rating} delta={delta} />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`mobile-home-badge mobile-home-badge--${formBadge.tone}`}>
                  🟢 {formBadge.label}
                </span>
                {formStreak >= 2 ? (
                  <span className="mobile-home-badge mobile-home-badge--streak">
                    🔥 Серия {formStreak}
                  </span>
                ) : null}
                {showTrend ? (
                  <span
                    className={`mobile-home-badge ${
                      delta! > 0
                        ? "mobile-home-badge--up"
                        : "mobile-home-badge--down"
                    }`}
                  >
                    <TrendLine positive={delta! > 0} />
                    {delta! > 0 ? "Рост" : "Спад"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mobile-home-header-stats">
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
        </Card>

        {/* 2. Моя форма */}
        <Card className="p-3">
          <SectionTitle>Моя форма</SectionTitle>
          <FormChart ratings={formRatings} />
        </Card>

        {/* 3. MVP матча */}
        {mvpCard ? (
          <Card className="mobile-home-mvp p-3">
            <SectionTitle>MVP матча</SectionTitle>
            <MatchMvpRichCard
              mvp={mvpCard}
              photoUrl={mvpPlayer?.photo_url ?? mvpCard.photoUrl ?? null}
              matchGoals={mvpCard.matchGoals ?? null}
              matchAssists={mvpCard.matchAssists ?? null}
              personal={Boolean(personalMvp?.isConfirmedMvp)}
            />
            {votingMatch ? (
              <div className="mt-2 border-t border-violet-400/15 pt-2">
                <VotingDeadlineBanner match={votingMatch} embedded />
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* 4. Последние достижения */}
        {achievements.length > 0 ? (
          <Card className="p-3">
            <SectionTitle>Последние достижения</SectionTitle>
            <div className="mobile-home-achievements">
              {achievements.map((item) => (
                <div key={item.id} className="mobile-home-achievement">
                  <span className="mobile-home-achievement__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="mobile-home-achievement__title">{item.title}</p>
                    <p className="mobile-home-achievement__detail">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* 5. Последний матч */}
        {latestPlayed &&
        latestPlayed.ndfk_goals != null &&
        latestPlayed.opponent_goals != null ? (
          <Card className="p-3">
            <SectionTitle
              action={
                latestMatchRating != null ? (
                  <span className={`mobile-home-last-rating ${latestRatingClass}`}>
                    {formatVoteScore(latestMatchRating)}
                  </span>
                ) : null
              }
            >
              Последний матч
            </SectionTitle>
            <MatchScoreboard
              match={{
                opponent: latestPlayed.opponent,
                ndfk_goals: latestPlayed.ndfk_goals,
                opponent_goals: latestPlayed.opponent_goals,
                date: latestPlayed.date,
                time: latestPlayed.time,
                is_played: true,
              }}
              density="roomy"
            />
            {playerWelcome.lastMatchLabel ? (
              <p className="mt-2 text-[11px] text-slate-500">
                {playerWelcome.lastMatchLabel}
              </p>
            ) : null}
          </Card>
        ) : null}

        {/* 6. Лидеры команды */}
        <Card className="p-3">
          <SectionTitle>Лидеры команды</SectionTitle>
          <div className="mobile-home-leaders">
            {topScorer ? (
              <LeaderChip
                label="Бомбардир"
                name={getFirstName(topScorer.name)}
                value={topScorer.goals}
              />
            ) : null}
            {topAssister ? (
              <LeaderChip
                label="Ассистент"
                name={getFirstName(topAssister.name)}
                value={topAssister.assists}
              />
            ) : null}
            {topRated ? (
              <LeaderChip
                label="Топ OVR"
                name={getFirstName(topRated.name)}
                value={formatOverallRating(topRated.rating)}
              />
            ) : null}
          </div>
        </Card>

        {/* 7. Календарь */}
        {upcomingMatches.length > 0 ? (
          <Card className="p-3">
            <SectionTitle
              action={
                <Link href="/matches" className="mobile-home-link">
                  Все →
                </Link>
              }
            >
              Ближайшие матчи
            </SectionTitle>
            <div className="mobile-home-calendar">
              {upcomingMatches.map((match) => (
                <div key={match.id} className="mobile-home-calendar-row">
                  <div className="min-w-0">
                    <p className="mobile-home-calendar-opponent">vs {match.opponent}</p>
                    <p className="mobile-home-calendar-meta">
                      {formatCalendarRow(match)}
                    </p>
                  </div>
                  <span className="mobile-home-calendar-venue">
                    {getMatchVenueLabel(match.location ?? "")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Link href="/lineup" className="mobile-home-gradient-btn py-3 text-center text-sm font-black">
            Мой состав
          </Link>
          <Link
            href={`/players/${playerWelcome.id}`}
            className="mobile-home-secondary-btn py-3 text-center text-sm font-bold"
          >
            Моя карточка
          </Link>
        </div>
      </div>
    </section>
  );
}
