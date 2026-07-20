"use client";

import MatchMvpRichCard from "@/components/MatchMvpRichCard";
import UpcomingMatchPollCard from "@/components/UpcomingMatchPollCard";
import type { MatchWithLive } from "@/lib/matchStatus";
import type { MatchMvpInfo } from "@/lib/matchRatings";

type PlayerLeader = {
  id: number;
  name: string;
  goals: number;
  assists: number;
};

const RANK_STYLES = [
  {
    medal: "🥇",
    row: "border-yellow-400/30 bg-yellow-500/10",
    name: "text-yellow-100",
    value: "text-yellow-300",
  },
  {
    medal: "🥈",
    row: "border-slate-300/25 bg-slate-300/10",
    name: "text-slate-100",
    value: "text-slate-200",
  },
  {
    medal: "🥉",
    row: "border-orange-400/25 bg-orange-500/10",
    name: "text-orange-100",
    value: "text-orange-300",
  },
];

function LeaderList({
  title,
  players,
  getValue,
}: {
  title: string;
  players: PlayerLeader[];
  getValue: (player: PlayerLeader) => number;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-violet-300/90 sm:mb-3 sm:text-xs">
        {title}
      </p>
      <ul className="space-y-1 sm:space-y-2">
        {players.map((player, index) => {
          const style = RANK_STYLES[index] ?? RANK_STYLES[2];

          return (
            <li
              key={player.id}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-base ${style.row}`}
            >
              <span className="text-sm sm:text-lg">{style.medal}</span>
              <span className={`min-w-0 truncate font-bold ${style.name}`}>
                {player.name}
              </span>
              <span className={`ml-auto font-extrabold tabular-nums ${style.value}`}>
                {getValue(player)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type HomeHeroProps = {
  players: PlayerLeader[];
  matches: MatchWithLive[];
  matchMvp?: MatchMvpInfo | null;
};

export default function HomeHero({
  players,
  matches,
  matchMvp,
}: HomeHeroProps) {
  const scorers = [...players]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 3);

  const assisters = [...players]
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, 3);

  const showLeaders =
    scorers.some((player) => player.goals > 0) ||
    assisters.some((player) => player.assists > 0);

  const isGoldMvp = Boolean(matchMvp?.isConfirmedMvp);

  return (
    <div className="premium-card overflow-hidden rounded-[20px]">
      {matchMvp && (
        <div
          className={
            isGoldMvp
              ? "mvp-gold-card relative overflow-hidden rounded-none border-x-0 border-t-0 px-2.5 py-2 sm:px-4 sm:py-2.5"
              : "mvp-rating-board relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-teal-400/25 px-2.5 py-2 sm:px-4 sm:py-2.5"
          }
        >
          <MatchMvpRichCard mvp={matchMvp} />
        </div>
      )}

      <div className="border-b border-white/8 p-1.5 sm:p-4">
        <UpcomingMatchPollCard initialMatches={matches} />
      </div>

      {showLeaders && (
        <div className="grid grid-cols-2 gap-1.5 p-1.5 sm:flex sm:gap-6 sm:p-5">
          <LeaderList
            title="Бомбардиры"
            players={scorers}
            getValue={(player) => player.goals}
          />
          <div className="hidden w-px shrink-0 bg-white/10 sm:block" />
          <LeaderList
            title="Ассисты"
            players={assisters}
            getValue={(player) => player.assists}
          />
        </div>
      )}
    </div>
  );
}
