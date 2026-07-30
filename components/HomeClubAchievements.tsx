import Link from "next/link";
import type { CommonAchievement } from "@/lib/careerMock";

type HomeClubAchievementsProps = {
  items: CommonAchievement[];
};

function MiniScale({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="mt-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px]">
        <span className="font-semibold tabular-nums text-amber-100/90">
          {current}
          <span className="text-amber-200/45">/{target}</span>
        </span>
        <span className="tabular-nums text-amber-200/55">{pct}%</span>
      </div>
      <div className="career-scale h-1.5">
        <div
          className="career-scale-fill career-scale-fill--amber"
          style={{ width: `${Math.max(pct, pct > 0 ? 5 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export default function HomeClubAchievements({
  items,
}: HomeClubAchievementsProps) {
  if (items.length === 0) return null;

  return (
    <section className="premium-card mb-2 overflow-hidden rounded-[20px] p-2 sm:mb-5 sm:p-4">
      <div className="mb-1.5 flex items-end justify-between gap-2 sm:mb-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200/75 sm:text-[10px]">
            Клуб
          </p>
          <h2 className="text-sm font-bold text-white sm:text-lg">
            Следующие цели
          </h2>
          <p className="text-[10px] text-slate-500 sm:text-xs">
            Достижения команды — ближайшие рубежи
          </p>
        </div>
        <Link
          href="/career"
          className="shrink-0 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-100 transition hover:border-amber-400/35 hover:bg-amber-500/15 sm:px-2.5 sm:text-xs"
        >
          Карьера →
        </Link>
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-3 sm:gap-2">
        {items.map((item) => {
          const locked = item.status === "locked";
          return (
            <li
              key={item.id}
              className={`rounded-xl border px-2.5 py-2 ${
                locked
                  ? "border-white/8 bg-white/[0.02] opacity-75"
                  : "border-amber-400/18 bg-gradient-to-br from-amber-500/12 via-orange-500/[0.05] to-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none" aria-hidden>
                      {item.icon}
                    </span>
                    <p className="truncate text-[12px] font-extrabold text-white sm:text-[13px]">
                      {item.title}
                    </p>
                  </div>
                  {item.trackLabel && (
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200/55">
                      {item.trackLabel}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100/80 ring-1 ring-amber-400/20">
                  {locked ? "🔒" : "…"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
                {item.description}
              </p>
              {!locked && (
                <MiniScale current={item.current} target={item.target} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
