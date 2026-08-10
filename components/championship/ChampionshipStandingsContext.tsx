import type { StandingsContext } from "@/lib/championship/standingsContext";

export default function ChampionshipStandingsContext({
  context,
}: {
  context: StandingsContext | null;
}) {
  if (!context || context.ourPlace == null) return null;

  return (
    <div className="mb-3 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] via-white/[0.03] to-cyan-500/[0.06] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/70">
        Положение в таблице
      </p>
      <p className="mt-1 text-[14px] font-extrabold text-white">
        {context.ourName} — {context.ourPlace}-е место · {context.ourPoints} очк.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
        {context.ourPlace === 1 && context.leader ? (
          <span>
            Лидер · {context.leader.points} очк.
            {context.rivalBelow ? (
              <>
                {" "}
                · до 2-го: +{context.rivalBelow.gap}
              </>
            ) : null}
          </span>
        ) : null}
        {context.ourPlace > 1 && context.leader ? (
          <span>
            До 1-го ({context.leader.name}): −{context.pointsToLeader ?? 0} очк.
          </span>
        ) : null}
        {context.rivalAbove ? (
          <span>
            Выше ({context.rivalAbove.name}): −{context.rivalAbove.gap} очк.
          </span>
        ) : null}
        {context.rivalBelow ? (
          <span>
            Ниже ({context.rivalBelow.name}): +{context.rivalBelow.gap} очк.
          </span>
        ) : null}
      </div>
    </div>
  );
}
