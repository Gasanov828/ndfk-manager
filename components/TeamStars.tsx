import {
  getCurrentMonthLabel,
  type PlayerAward,
} from "@/lib/playerAwards";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";

type TeamStarsProps = {
  topScorer: PlayerAward | null;
  topAssister: PlayerAward | null;
  playerOfMonth: PlayerAward | null;
  topRated?: PlayerAward | null;
  totalGoals?: number;
  totalAssists?: number;
  averageRating?: string;
  playedCount?: number;
};

function StarCard({
  title,
  award,
  icon,
  accent,
  valueLabel,
  secondaryLabel,
}: {
  title: string;
  award: PlayerAward | null;
  icon: string;
  accent: "violet" | "cyan" | "amber" | "lime";
  valueLabel: string;
  secondaryLabel?: string;
}) {
  const group = award ? getPositionGroup(null, award.player.position) : "—";
  const style = getPositionStyle(group);

  const accents = {
    violet: {
      shell: "border-violet-400/25 bg-gradient-to-br from-violet-500/18 via-purple-600/8 to-transparent",
      value: "text-violet-200",
      label: "text-violet-300/70",
    },
    cyan: {
      shell: "border-cyan-400/25 bg-gradient-to-br from-cyan-500/16 via-blue-600/8 to-transparent",
      value: "text-cyan-200",
      label: "text-cyan-300/70",
    },
    amber: {
      shell: "border-amber-400/30 bg-gradient-to-br from-amber-500/18 via-orange-600/8 to-transparent",
      value: "text-amber-200",
      label: "text-amber-300/70",
    },
    lime: {
      shell: "border-lime-400/25 bg-gradient-to-br from-lime-500/14 via-emerald-600/8 to-transparent",
      value: "text-lime-300",
      label: "text-lime-300/70",
    },
  }[accent];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-2.5 sm:p-4 ${accents.shell}`}
    >
      <div className="absolute -right-2 -top-1 text-3xl opacity-10 sm:text-5xl">
        {icon}
      </div>

      <div className="relative z-[1]">
        <p className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${accents.label}`}>
          {title}
        </p>

        {award ? (
          <>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`flex h-6 min-w-[28px] items-center justify-center rounded-md px-1 text-[9px] font-bold text-white ${style.badge}`}
              >
                {group}
              </span>
              <p className="min-w-0 truncate text-[13px] font-extrabold text-slate-100 sm:text-base">
                {award.player.name}
              </p>
            </div>

            <div className="mt-1.5 flex items-end gap-2">
              <p className={`text-2xl font-black leading-none sm:text-3xl ${accents.value}`}>
                {award.primaryValue}
              </p>
              <div className="pb-0.5">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">
                  {valueLabel}
                </p>
                {secondaryLabel && award.secondaryValue !== undefined && (
                  <p className="text-[10px] font-semibold text-slate-400">
                    {award.secondaryValue} {secondaryLabel}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-3 text-[11px] text-slate-500">Пока нет данных</p>
        )}
      </div>
    </div>
  );
}

function MiniChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-sm font-extrabold text-slate-100">{value}</p>
    </div>
  );
}

export default function TeamStars({
  topScorer,
  topAssister,
  playerOfMonth,
  topRated = null,
  totalGoals = 0,
  totalAssists = 0,
  averageRating = "—",
  playedCount = 0,
}: TeamStarsProps) {
  const monthLabel = getCurrentMonthLabel();

  return (
    <section className="mb-5 sm:mb-8">
      <div className="mb-2 flex items-end justify-between gap-3 sm:mb-3">
        <div>
          <h2 className="text-base font-bold text-white sm:text-xl">
            ⭐ Звёзды команды
          </h2>
          <p className="text-[11px] text-slate-500 sm:text-sm">
            Лидеры сезона · {monthLabel}
          </p>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-4 gap-1.5 sm:mb-3 sm:gap-2">
        <MiniChip label="Голы" value={totalGoals} />
        <MiniChip label="Пасы" value={totalAssists} />
        <MiniChip label="Сред. ★" value={averageRating} />
        <MiniChip label="Матчи" value={playedCount} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-4">
        <StarCard
          title="Бомбардир"
          award={topScorer}
          icon="⚽"
          accent="violet"
          valueLabel="голов"
          secondaryLabel="пас"
        />
        <StarCard
          title="Ассистент"
          award={topAssister}
          icon="🎯"
          accent="cyan"
          valueLabel="пасов"
          secondaryLabel="гол"
        />
        <StarCard
          title="Рейтинг"
          award={topRated}
          icon="★"
          accent="lime"
          valueLabel="★"
          secondaryLabel="Г+П"
        />
        <StarCard
          title="Игрок месяца"
          award={playerOfMonth}
          icon="🏆"
          accent="amber"
          valueLabel="голов"
          secondaryLabel="пас"
        />
      </div>
    </section>
  );
}
