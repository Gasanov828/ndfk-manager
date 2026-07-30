import Link from "next/link";
import type { ReactNode } from "react";
import MatchMvpRichCard from "@/components/MatchMvpRichCard";
import MatchScoreboard from "@/components/MatchScoreboard";
import PlayerAvatar from "@/components/PlayerAvatar";
import {
  formatMatchDate,
  type Match,
} from "@/lib/matches";
import {
  formatOverallRating,
  formatVoteScore,
  type MatchMvpInfo,
} from "@/lib/matchRatings";
import {
  buildFormBadge,
  buildRecentAchievements,
  buildStreakBadge,
  buildTeamLeaders,
  buildUpcomingCalendar,
  getAverageForm,
  type PlayerFormPoint,
  type PlayerHomeAchievement,
  type PlayerHomeBadge,
  type PlayerHomeCalendarMatch,
  type PlayerHomeLeaders,
} from "@/lib/playerHomeDashboard";
import type { PlayerWelcomeData } from "@/lib/playerStats";
import { getRankLabel } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData;
  players: {
    id: number;
    name: string;
    rating: number;
    goals: number;
    assists: number;
    photo_url?: string | null;
  }[];
  matches: Match[];
  latestPlayed: Match | null;
  matchMvp: MatchMvpInfo | null;
  isPersonalMvp: boolean;
  formSeries: PlayerFormPoint[];
  matchesPlayed: number;
  latestMatchRating: number | null;
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

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300/90">
      {children}
    </p>
  );
}

function BadgePill({ badge }: { badge: PlayerHomeBadge }) {
  const toneClass = {
    lime: "border-lime-400/30 bg-lime-500/15 text-lime-200",
    violet: "border-violet-400/30 bg-violet-500/15 text-violet-100",
    amber: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    slate: "border-white/10 bg-white/5 text-slate-300",
    rose: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  }[badge.tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClass}`}
    >
      {badge.label}
    </span>
  );
}

function OvrRing({
  rating,
  delta,
}: {
  rating: number;
  delta: number | null;
}) {
  const pct = Math.max(0.08, Math.min(1, (rating - 40) / 60));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - pct);
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;

  return (
    <div className="mobile-home-ovr relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(148,163,184,0.16)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#mobileHomeOvrGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
        <defs>
          <linearGradient id="mobileHomeOvrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="55%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          OVR
        </p>
        <p className="text-[1.65rem] font-black leading-none tabular-nums text-white">
          {formatOverallRating(rating)}
        </p>
        {delta != null && delta !== 0 ? (
          <p
            className={`mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-extrabold tabular-nums ${
              up ? "text-[#a3e635]" : down ? "text-rose-300" : "text-slate-400"
            }`}
          >
            {up ? (
              <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
                <polyline
                  points="1,8 6,3 9,5 15,1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            {down ? (
              <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
                <polyline
                  points="1,2 6,7 9,5 15,9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            {delta > 0 ? "+" : ""}
            {formatOverallRating(delta)}
          </p>
        ) : (
          <p className="mt-0.5 text-[10px] text-slate-500">сезон</p>
        )}
      </div>
    </div>
  );
}

function FormChart({ points }: { points: PlayerFormPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="py-4 text-center text-[12px] text-slate-500">
        Пока нет закрытых оценок матчей
      </p>
    );
  }

  const width = 280;
  const height = 72;
  const padX = 14;
  const padY = 12;
  const minY = 1;
  const maxY = 10;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padX + ((width - padX * 2) * index) / (points.length - 1);
    const y =
      height -
      padY -
      ((point.rating - minY) / (maxY - minY)) * (height - padY * 2);
    return { x, y, point };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const avg = getAverageForm(points);

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          Последние {points.length} матч.
        </p>
        {avg != null ? (
          <p className="text-[12px] font-extrabold text-violet-200">
            ср. {formatVoteScore(avg)}
          </p>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mobile-home-form-chart h-20 w-full"
        role="img"
        aria-label="Форма по оценкам матчей"
      >
        <line
          x1={padX}
          y1={height / 2}
          x2={width - padX}
          y2={height / 2}
          stroke="rgba(148,163,184,0.12)"
          strokeDasharray="4 4"
        />
        <polyline
          points={line}
          fill="none"
          stroke="url(#formLineGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="formLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>
        {coords.map(({ x, y, point }) => (
          <g key={point.matchId}>
            <circle
              cx={x}
              cy={y}
              r="4.5"
              fill={point.isMvp ? "#fbbf24" : "#c4b5fd"}
              stroke="#0b1224"
              strokeWidth="2"
            />
            <text
              x={x}
              y={Math.max(10, y - 8)}
              textAnchor="middle"
              fill="rgba(226,232,240,0.9)"
              fontSize="9"
              fontWeight="800"
            >
              {formatVoteScore(point.rating)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function AchievementRow({ item }: { item: PlayerHomeAchievement }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
      <span className="text-lg" aria-hidden>
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-white">
          {item.title}
        </p>
        <p className="truncate text-[11px] text-slate-400">{item.detail}</p>
      </div>
    </div>
  );
}

function LeaderTile({
  label,
  leader,
}: {
  label: string;
  leader: PlayerHomeLeaders["scorer"];
}) {
  if (!leader) {
    return (
      <div className="rounded-xl border border-white/8 bg-slate-950/50 px-2.5 py-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[12px] text-slate-500">—</p>
      </div>
    );
  }

  return (
    <Link
      href={`/players/${leader.id}`}
      className="rounded-xl border border-violet-400/15 bg-slate-950/55 px-2.5 py-2.5 transition active:scale-[0.98]"
    >
      <p className="text-[9px] font-bold uppercase tracking-wide text-violet-300/80">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <PlayerAvatar
          name={leader.name}
          photoUrl={leader.photoUrl ?? null}
          size="sm"
          className="rounded-full"
        />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold text-white">
            {leader.name}
          </p>
          <p className="text-[11px] font-bold tabular-nums text-lime-300/90">
            {leader.valueLabel}
          </p>
        </div>
      </div>
    </Link>
  );
}

function CalendarRow({ match }: { match: PlayerHomeCalendarMatch }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
      <div className="w-12 shrink-0 text-center">
        <p className="text-[10px] font-bold uppercase text-slate-500">
          {match.isHome ? "Дом" : "Выезд"}
        </p>
        <p className="text-[13px] font-black tabular-nums text-white">
          {match.timeLabel}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-white">
          vs {match.opponent}
        </p>
        <p className="truncate text-[11px] text-slate-400">{match.dateLabel}</p>
      </div>
    </div>
  );
}

export default function MobileHomeDashboard({
  playerWelcome,
  players,
  matches,
  latestPlayed,
  matchMvp,
  isPersonalMvp,
  formSeries,
  matchesPlayed,
  latestMatchRating,
}: MobileHomeDashboardProps) {
  const positionStyle = getPositionStyle(playerWelcome.positionGroup);
  const formBadge = buildFormBadge(formSeries);
  const streakBadge = buildStreakBadge(formSeries);
  const achievements = buildRecentAchievements({
    welcome: playerWelcome,
    form: formSeries,
    latestMatchRating,
    isPersonalMvp,
    matchMvp,
  });
  const leaders = buildTeamLeaders(players);
  const calendar = buildUpcomingCalendar(matches, 4);
  const rankLabel = getRankLabel(
    playerWelcome.rank,
    playerWelcome.totalPlayers
  );

  return (
    <section className="md:hidden">
      <div className="mobile-home-shell -mx-3 -mt-1 min-h-[calc(100dvh-4.5rem)] space-y-3 px-3 pb-5 pt-1 text-white">
        {/* 1. Шапка */}
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400">Добро пожаловать</p>
              <Link
                href={`/players/${playerWelcome.id}`}
                className="mt-0.5 block truncate text-[1.45rem] font-black leading-tight text-white"
              >
                {playerWelcome.firstName}
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white ${positionStyle.badge}`}
                >
                  {playerWelcome.lineupLabel ?? playerWelcome.positionGroup}
                </span>
                {formBadge ? <BadgePill badge={formBadge} /> : null}
                {streakBadge ? <BadgePill badge={streakBadge} /> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-white/8 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Ранг
                  </p>
                  <p className="mt-0.5 font-extrabold text-violet-100">
                    {playerWelcome.rank}/{playerWelcome.totalPlayers}
                  </p>
                  <p className="truncate text-[10px] text-slate-500" title={rankLabel}>
                    в команде
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Матчи
                  </p>
                  <p className="mt-0.5 text-lg font-black tabular-nums text-white">
                    {matchesPlayed}
                  </p>
                  <p className="text-[10px] text-slate-500">сыграно</p>
                </div>
              </div>
            </div>
            <OvrRing
              rating={playerWelcome.rating}
              delta={playerWelcome.ratingDelta}
            />
          </div>
        </Card>

        {/* 2. Моя форма */}
        <Card className="p-3">
          <SectionTitle>Моя форма</SectionTitle>
          <div className="mt-2">
            <FormChart points={formSeries} />
          </div>
        </Card>

        {/* 3. MVP матча */}
        {matchMvp ? (
          <Card className="mobile-home-mvp overflow-hidden p-2.5">
            <SectionTitle>MVP матча</SectionTitle>
            <div className="mt-2">
              <MatchMvpRichCard mvp={matchMvp} personal={isPersonalMvp} />
            </div>
          </Card>
        ) : null}

        {/* 4. Последние достижения */}
        {achievements.length > 0 ? (
          <Card className="p-3">
            <SectionTitle>Последние достижения</SectionTitle>
            <div className="mt-2 space-y-1.5">
              {achievements.map((item) => (
                <AchievementRow key={item.id} item={item} />
              ))}
            </div>
          </Card>
        ) : null}

        {/* 5. Последний матч */}
        {latestPlayed &&
        latestPlayed.ndfk_goals != null &&
        latestPlayed.opponent_goals != null ? (
          <Card className="p-3">
            <div className="mb-2 flex items-end justify-between gap-2">
              <SectionTitle>Последний матч</SectionTitle>
              {latestMatchRating != null ? (
                <p className="text-[12px] font-extrabold text-amber-200">
                  Моя оценка {formatVoteScore(latestMatchRating)}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">Нет оценки</p>
              )}
            </div>
            <MatchScoreboard
              match={{
                opponent: latestPlayed.opponent,
                ndfk_goals: latestPlayed.ndfk_goals,
                opponent_goals: latestPlayed.opponent_goals,
                date: latestPlayed.date,
                time: latestPlayed.time,
                is_played: true,
              }}
              density="compact"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              {formatMatchDate(latestPlayed.date)}
              {latestPlayed.location ? ` · ${latestPlayed.location}` : ""}
            </p>
          </Card>
        ) : null}

        {/* 6. Лидеры команды */}
        <Card className="p-3">
          <SectionTitle>Лидеры команды</SectionTitle>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <LeaderTile label="Голы" leader={leaders.scorer} />
            <LeaderTile label="Пасы" leader={leaders.assister} />
            <LeaderTile label="OVR" leader={leaders.rating} />
          </div>
        </Card>

        {/* 7. Календарь */}
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <SectionTitle>Календарь</SectionTitle>
            <Link
              href="/matches"
              className="text-[11px] font-semibold text-cyan-300/90"
            >
              Все матчи →
            </Link>
          </div>
          {calendar.length > 0 ? (
            <div className="space-y-1.5">
              {calendar.map((match) => (
                <CalendarRow key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <p className="py-3 text-center text-[12px] text-slate-500">
              Ближайших матчей пока нет
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
