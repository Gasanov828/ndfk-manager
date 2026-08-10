export default function ChampionshipMatchupTeams({
  home,
  away,
  score,
}: {
  home: string;
  away: string;
  score?: string | null;
}) {
  return (
    <div className="mt-1 min-w-0 space-y-0.5">
      <p className="break-words text-[12px] font-extrabold leading-snug text-white">
        {home}
      </p>
      {score != null ? (
        <p className="text-[13px] font-black tabular-nums text-amber-200">
          {score}
        </p>
      ) : (
        <p className="text-[10px] font-bold text-slate-500">vs</p>
      )}
      <p className="break-words text-[12px] font-extrabold leading-snug text-white">
        {away}
      </p>
    </div>
  );
}
