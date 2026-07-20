import Link from "next/link";
import type { ReactNode } from "react";
import ClubLogo from "@/components/ClubLogo";
import MatchScoreboard from "@/components/MatchScoreboard";
import PlayerAvatar from "@/components/PlayerAvatar";
import VotingDeadlineBanner from "@/components/VotingDeadlineBanner";
import MobileVotingTimer from "@/components/mobile/MobileVotingTimer";
import {
  BallStatIcon,
  BootStatIcon,
  EditPencilIcon,
  LineupButtonIcon,
  UsersButtonIcon,
} from "@/components/mobile/MobileHomeIcons";
import {
  formatMatchDate,
  formatMatchTime,
  getUpcomingMatch,
  type Match,
} from "@/lib/matches";
import {
  getMatchAssisters,
  getMatchGoalScorers,
  type MatchPlayerStat,
} from "@/lib/matchHistory";
import {
  formatVoteCount,
  formatVoteScore,
  type MatchMvpInfo,
  type RatingVotingMatch,
} from "@/lib/matchRatings";
import type { PlayerWelcomeData } from "@/lib/playerStats";
import { getFirstName } from "@/lib/playerStats";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData | null;
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
  latestMatchStats: MatchPlayerStat[];
  matchMvp: MatchMvpInfo | null;
  votingMatch: RatingVotingMatch | null;
  averageLineupRating: string;
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

function TeamShield() {
  return <ClubLogo size="lg" />;
}

function RatingGraph() {
  return (
    <svg viewBox="0 0 86 42" className="h-11 w-24 text-[#a3e635]" aria-hidden>
      <polyline
        points="2,35 17,20 31,25 45,9 59,18 78,4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M63 4h15v15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  );
}

const RADAR_LABELS = ["АТАКА", "ПАС", "ЗАЩИТА", "ФИЗИКА", "ДРИБЛИНГ"] as const;

function Radar({ value }: { value: number }) {
  const scale = Math.max(0.38, Math.min(1, value / 10));
  const points = [
    [50, 12 + (1 - scale) * 18],
    [82 - (1 - scale) * 22, 38],
    [68 - (1 - scale) * 12, 76 - (1 - scale) * 18],
    [32 + (1 - scale) * 12, 76 - (1 - scale) * 18],
    [18 + (1 - scale) * 22, 38],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  const labelPositions = [
    { x: 50, y: 8, anchor: "middle" as const },
    { x: 88, y: 36, anchor: "start" as const },
    { x: 73, y: 80, anchor: "middle" as const },
    { x: 27, y: 80, anchor: "middle" as const },
    { x: 12, y: 36, anchor: "end" as const },
  ];

  return (
    <svg viewBox="0 0 100 90" className="h-24 w-24 text-violet-400">
      {RADAR_LABELS.map((label, index) => {
        const pos = labelPositions[index];
        return (
          <text
            key={label}
            x={pos.x}
            y={pos.y}
            textAnchor={pos.anchor}
            fill="rgba(148,163,184,0.8)"
            fontSize="5"
            fontWeight="700"
          >
            {label}
          </text>
        );
      })}
      <polygon
        points="50,8 88,36 73,80 27,80 12,36"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
      />
      <polygon
        points="50,22 74,40 65,68 35,68 26,40"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
      <polygon
        points={points}
        fill="rgba(123,66,245,0.35)"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function Pitch() {
  const dots = [
    "left-[46%] top-[12%] bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.9)]",
    "left-[17%] top-[33%] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.85)]",
    "left-[68%] top-[34%] bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.9)]",
    "left-[34%] top-[51%] bg-violet-600 shadow-[0_0_12px_rgba(124,58,237,0.85)]",
    "left-[55%] top-[56%] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.85)]",
    "left-[18%] top-[70%] bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.9)]",
    "left-[41%] top-[73%] bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.85)]",
    "left-[64%] top-[74%] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.85)]",
    "left-[48%] top-[86%] bg-violet-600 shadow-[0_0_12px_rgba(124,58,237,0.95)]",
  ];

  return (
    <div className="relative h-[12.7rem] w-[8.1rem] shrink-0 overflow-hidden rounded-xl border border-lime-400/20 bg-[linear-gradient(0deg,rgba(10,58,28,0.9),rgba(22,101,52,0.78)),repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_18px)]">
      <div className="absolute inset-2 rounded-lg border border-white/20" />
      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute left-1/2 top-0 h-8 w-14 -translate-x-1/2 border-x border-b border-white/20" />
      <div className="absolute bottom-0 left-1/2 h-8 w-14 -translate-x-1/2 border-x border-t border-white/20" />
      {dots.map((className, index) => (
        <span
          key={index}
          className={`absolute h-4 w-4 rounded-full border border-white/25 ${className}`}
        />
      ))}
      <p className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-white/65">
        4-2-3-1
      </p>
    </div>
  );
}

function formatPlayerStatLine(stat: MatchPlayerStat) {
  const name = stat.player?.name ? getFirstName(stat.player.name) : "Игрок";
  const count = stat.goals > 0 ? stat.goals : stat.assists;
  const suffix = stat.goals > 0 ? "гол" : "пас";
  return `${name} · ${count} ${suffix}`;
}

export default function MobileHomeDashboard({
  playerWelcome,
  players,
  matches,
  latestPlayed,
  latestMatchStats,
  matchMvp,
  votingMatch,
  averageLineupRating,
}: MobileHomeDashboardProps) {
  const upcomingMatch = getUpcomingMatch(matches);
  const focusMatch = upcomingMatch ?? latestPlayed;
  const mvpPlayer = matchMvp
    ? players.find((player) => player.id === matchMvp.playerId)
    : null;
  const initial = (playerWelcome?.firstName ?? playerWelcome?.name ?? "A")
    .trim()
    .charAt(0)
    .toUpperCase();
  const rating = Math.round(Number(averageLineupRating) || 0);
  const positionBadge = playerWelcome?.positionGroup ?? "ИГР";
  const goalScorers = getMatchGoalScorers(latestMatchStats);
  const assisters = getMatchAssisters(latestMatchStats);

  return (
    <section className="md:hidden">
      <div className="mobile-home-shell -mx-3 -mt-2 min-h-[calc(100dvh-4rem)] space-y-3 px-3 pb-4 pt-2 text-white">
        {/* Шапка */}
        <Card className="p-2.5">
          <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.22fr)_2.7rem] items-start gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <TeamShield />
              <div className="min-w-0">
                <p className="text-sm font-black leading-tight">ФК Нижний Дженгутай</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  Amateur Team
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/72 p-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/75">
                {focusMatch?.is_played ? "Последний матч" : "Выездной матч"}
              </p>
              <p className="mt-1 truncate text-base font-black">
                vs {focusMatch?.opponent ?? "соперник"}
              </p>
              {focusMatch && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {formatMatchDate(focusMatch.date)} ·{" "}
                  {formatMatchTime(focusMatch.time)}
                </p>
              )}

              {votingMatch ? (
                <div className="mt-2 rounded-xl border border-violet-400/12 bg-violet-500/10 px-2 py-1.5">
                  <MobileVotingTimer match={votingMatch} />
                  {matchMvp && (
                    <div className="mt-1.5 flex items-center justify-end">
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-black shadow-[0_0_14px_rgba(124,58,237,0.75)]">
                        {matchMvp.voteCount}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/5 px-2 py-1.5">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Оценки после матча
                  </span>
                  {matchMvp && (
                    <span className="rounded-full bg-violet-600/80 px-2 py-0.5 text-[10px] font-black">
                      {matchMvp.voteCount}
                    </span>
                  )}
                </div>
              )}
            </div>

            <Link
              href={playerWelcome ? `/players/${playerWelcome.id}` : "/players"}
              className="mobile-home-glow-purple flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-violet-400/25 bg-slate-950"
            >
              {playerWelcome?.photoUrl ? (
                <img
                  src={playerWelcome.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-base font-black">
                  {initial}
                </span>
              )}
            </Link>
          </div>
        </Card>

        {/* Профиль */}
        <Card className="p-2.5">
          <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2.5">
            <div className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center">
              <div className="mobile-home-glow-purple absolute inset-0 rounded-full bg-violet-600/20" />
              <div className="relative rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-blue-600 p-[3px]">
                <div className="h-[3.8rem] w-[3.8rem] overflow-hidden rounded-full bg-slate-900">
                  {playerWelcome?.photoUrl ? (
                    <img
                      src={playerWelcome.photoUrl}
                      alt={playerWelcome?.name ?? "Игрок"}
                      className="h-full w-full object-cover object-[center_18%]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-blue-700 text-2xl font-black text-white">
                      {initial}
                    </div>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-0.5 right-0 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                {positionBadge}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">Добро пожаловать,</p>
                  <p className="truncate text-xl font-black leading-tight">
                    {playerWelcome?.firstName ?? "Игрок"}!
                  </p>
                </div>
                <Link
                  href={playerWelcome ? `/players/${playerWelcome.id}` : "/players"}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400"
                  aria-label="Профиль"
                >
                  <EditPencilIcon />
                </Link>
              </div>

              <div className="mt-2 rounded-2xl border border-cyan-400/12 bg-slate-950/68 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Рейтинг команды
                    </p>
                    <p className="text-3xl font-black leading-none text-[#a3e635]">
                      {rating || "—"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {playerWelcome
                        ? `${playerWelcome.rank}-е место из ${playerWelcome.totalPlayers}`
                        : "состав команды"}
                    </p>
                  </div>
                  <div className="-mr-2 -mt-1 scale-90">
                    <RatingGraph />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 divide-x divide-white/8 rounded-2xl border border-white/10 bg-slate-950/64">
            <div className="flex flex-col items-center p-2.5 text-center">
              <BallStatIcon className="h-8 w-8" />
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Голы
              </p>
              <p className="text-2xl font-black">{playerWelcome?.goals ?? 0}</p>
            </div>
            <div className="flex flex-col items-center p-2.5 text-center">
              <BootStatIcon className="h-8 w-8" />
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Передачи
              </p>
              <p className="text-2xl font-black">{playerWelcome?.assists ?? 0}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-2.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                После матча
              </p>
              <p className="mt-0.5 text-2xl font-black">
                {playerWelcome?.ratingDelta != null
                  ? `${playerWelcome.ratingDelta > 0 ? "+" : ""}${playerWelcome.ratingDelta}`
                  : "—"}
              </p>
              {playerWelcome?.lastMatchLabel && (
                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {playerWelcome.lastMatchLabel}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href="/lineup"
              className="mobile-home-gradient-btn flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-black text-white"
            >
              <LineupButtonIcon />
              Мой состав
            </Link>
            <Link
              href="/players"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-bold text-slate-300"
            >
              <UsersButtonIcon />
              Все игроки
            </Link>
          </div>
        </Card>

        {/* Оценки матча */}
        <Card className="overflow-hidden">
          <div className="p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">
              ★ Оценки матча
            </p>
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className="mobile-home-glow-purple rounded-full">
                <PlayerAvatar
                  name={matchMvp?.playerName ?? "Игрок матча"}
                  photoUrl={mvpPlayer?.photo_url ?? null}
                  size="lg"
                  className="rounded-full"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-black">
                  {matchMvp?.playerName ?? "Оценки открыты"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {matchMvp
                    ? `${formatVoteCount(matchMvp.voteCount)} · vs ${matchMvp.opponent}`
                    : "оцените игроков после матча"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {matchMvp ? formatMatchDate(matchMvp.matchDate) : "после игры"}
                </p>
              </div>
              <div className="text-right">
                <Radar value={matchMvp?.avgScore ?? 8.6} />
                <p className="-mt-1 text-4xl font-black text-violet-400">
                  {matchMvp ? formatVoteScore(matchMvp.avgScore) : "—"}
                  <span className="text-xs text-slate-400">/10</span>
                </p>
              </div>
            </div>
          </div>

          {votingMatch && (
            <div className="border-t border-violet-400/15 bg-slate-950/72 px-3 pb-3">
              <VotingDeadlineBanner match={votingMatch} embedded />
            </div>
          )}
        </Card>

        {/* Последний матч */}
        <Card className="p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_8.1rem] gap-3">
            <div className="min-w-0">
              {latestPlayed &&
              latestPlayed.ndfk_goals != null &&
              latestPlayed.opponent_goals != null ? (
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
              ) : (
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300/80">
                  Последний матч
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div>
                  <p className="font-black uppercase tracking-[0.12em] text-slate-500">
                    Голы
                  </p>
                  <div className="mt-2 space-y-1 text-slate-300">
                    {goalScorers.length > 0 ? (
                      goalScorers.slice(0, 3).map((stat) => (
                        <p key={stat.id}>{formatPlayerStatLine(stat)}</p>
                      ))
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-black uppercase tracking-[0.12em] text-slate-500">
                    Ассисты
                  </p>
                  <div className="mt-2 space-y-1 text-slate-300">
                    {assisters.length > 0 ? (
                      assisters.slice(0, 3).map((stat) => (
                        <p key={stat.id}>{formatPlayerStatLine(stat)}</p>
                      ))
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Pitch />
          </div>
        </Card>
      </div>
    </section>
  );
}
