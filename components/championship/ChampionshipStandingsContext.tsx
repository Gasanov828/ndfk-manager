import type { StandingsContext } from "@/lib/championship/standingsContext";

export default function ChampionshipStandingsContext({
  context,
}: {
  context: StandingsContext | null;
}) {
  if (!context || context.ourPlace == null) return null;

  return (
    <div className="mb-3 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] via-white/[0.03] to-cyan-500/[0.06] px-3 py-2.5">
      <p className="text-[14px] font-extrabold text-white">
        {context.ourName} — {context.ourPlace}-е место · {context.ourPoints} очк.
      </p>
    </div>
  );
}
