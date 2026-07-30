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
      <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-violet-300/90 sm:mb-2 sm:text-xs">
        {title}
      </p>
      <ul className="space-y-1">
        {players.map((player, index) => {
          const style = RANK_STYLES[index] ?? RANK_STYLES[2];

          return (
            <li
              key={player.id}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] sm:px-3 sm:text-sm ${style.row}`}
            >
              <span className="text-sm">{style.medal}</span>
              <span className={`min-w-0 truncate font-bold ${style.name}`}>
                {player.name}
              </span>
              <span
                className={`ml-auto font-extrabold tabular-nums ${style.value}`}
              >
                {getValue(player)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type HomeTeamLeadersProps = {
  players: PlayerLeader[];
};

export default function HomeTeamLeaders({ players }: HomeTeamLeadersProps) {
  const scorers = [...players]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 3);

  const assisters = [...players]
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, 3);

  const showLeaders =
    scorers.some((player) => player.goals > 0) ||
    assisters.some((player) => player.assists > 0);

  if (!showLeaders) return null;

  return (
    <section className="premium-card mb-2 overflow-hidden rounded-[20px] p-2 sm:mb-5 sm:p-4">
      <div className="mb-1.5 flex items-end justify-between gap-2 sm:mb-3">
        <div>
          <h2 className="text-sm font-bold text-white sm:text-lg">Команда</h2>
          <p className="text-[10px] text-slate-500 sm:text-xs">
            Топ по голам и передачам
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
        <LeaderList
          title="Бомбардиры"
          players={scorers}
          getValue={(player) => player.goals}
        />
        <LeaderList
          title="Ассисты"
          players={assisters}
          getValue={(player) => player.assists}
        />
      </div>
    </section>
  );
}
