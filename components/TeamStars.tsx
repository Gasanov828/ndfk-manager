import Link from "next/link";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import {
  getCurrentMonthLabel,
  type StarAccent,
  type TeamStarCard,
} from "@/lib/teamStars";

type TeamStarsProps = {
  cards: TeamStarCard[];
  totalGoals?: number;
  totalAssists?: number;
  averageRating?: string;
  playedCount?: number;
  winsCount?: number;
};

function StarCard({ card }: { card: TeamStarCard }) {
  const { title, award, icon, accent, valueLabel, secondaryLabel, href } = card;
  const group = getPositionGroup(null, award.player.position);
  const style = getPositionStyle(group);
  const photo = award.player.photo_url;

  const accents: Record<
    StarAccent,
    { shell: string; value: string; label: string }
  > = {
    violet: {
      shell:
        "border-violet-400/25 bg-gradient-to-br from-violet-500/18 via-purple-600/8 to-transparent",
      value: "text-violet-200",
      label: "text-violet-300/70",
    },
    cyan: {
      shell:
        "border-cyan-400/25 bg-gradient-to-br from-cyan-500/16 via-blue-600/8 to-transparent",
      value: "text-cyan-200",
      label: "text-cyan-300/70",
    },
    amber: {
      shell:
        "border-amber-400/30 bg-gradient-to-br from-amber-500/18 via-orange-600/8 to-transparent",
      value: "text-amber-200",
      label: "text-amber-300/70",
    },
    lime: {
      shell:
        "border-lime-400/25 bg-gradient-to-br from-lime-500/14 via-emerald-600/8 to-transparent",
      value: "text-lime-300",
      label: "text-lime-300/70",
    },
    rose: {
      shell:
        "border-rose-400/25 bg-gradient-to-br from-rose-500/16 via-fuchsia-600/8 to-transparent",
      value: "text-rose-200",
      label: "text-rose-300/70",
    },
    sky: {
      shell:
        "border-sky-400/25 bg-gradient-to-br from-sky-500/16 via-blue-700/8 to-transparent",
      value: "text-sky-200",
      label: "text-sky-300/70",
    },
    orange: {
      shell:
        "border-orange-400/25 bg-gradient-to-br from-orange-500/16 via-amber-700/8 to-transparent",
      value: "text-orange-200",
      label: "text-orange-300/70",
    },
    emerald: {
      shell:
        "border-emerald-400/25 bg-gradient-to-br from-emerald-500/16 via-teal-700/8 to-transparent",
      value: "text-emerald-200",
      label: "text-emerald-300/70",
    },
  };

  const tone = accents[accent];

  const body = (
    <>
      <div className="absolute -right-2 -top-1 text-3xl opacity-10 sm:text-4xl">
        {icon}
      </div>

      <div className="relative z-[1]">
        <p
          className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${tone.label}`}
        >
          {title}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-7 w-7 rounded-lg object-cover ring-1 ring-white/15"
            />
          ) : (
            <span
              className={`flex h-7 min-w-[30px] items-center justify-center rounded-md px-1 text-[9px] font-bold text-white ${style.badge}`}
            >
              {group}
            </span>
          )}
          <p className="min-w-0 truncate text-[13px] font-extrabold text-slate-100 sm:text-[15px]">
            {award.player.name}
          </p>
        </div>

        <div className="mt-1.5 flex items-end gap-2">
          <p
            className={`text-2xl font-black leading-none sm:text-[1.7rem] ${tone.value}`}
          >
            {award.primaryValue}
          </p>
          <div className="pb-0.5">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">
              {valueLabel}
            </p>
            {secondaryLabel && award.secondaryValue !== undefined ? (
              <p className="text-[10px] font-semibold text-slate-400">
                {award.secondaryValue} {secondaryLabel}
              </p>
            ) : null}
          </div>
        </div>

        {href ? (
          <p className="mt-2 text-[10px] font-semibold text-amber-200/80">
            Зал славы →
          </p>
        ) : null}
      </div>
    </>
  );

  const className = `relative overflow-hidden rounded-2xl border p-2.5 sm:p-3.5 ${tone.shell}`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:brightness-110`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

function MiniChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5 sm:px-2.5">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-sm font-extrabold tabular-nums text-slate-100">
        {value}
      </p>
    </div>
  );
}

export default function TeamStars({
  cards,
  totalGoals = 0,
  totalAssists = 0,
  averageRating = "—",
  playedCount = 0,
  winsCount = 0,
}: TeamStarsProps) {
  const monthLabel = getCurrentMonthLabel();
  const uniquePlayers = new Set(cards.map((card) => card.award.player.id)).size;

  if (cards.length === 0) return null;

  return (
    <section className="premium-card mb-2 overflow-hidden rounded-[20px] p-2 sm:mb-5 sm:p-4">
      <div className="mb-2 flex items-end justify-between gap-2 sm:mb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white sm:text-lg">
            ⭐ Звёзды команды
          </h2>
          <p className="text-[10px] text-slate-500 sm:text-xs">
            {uniquePlayers} игроков · {monthLabel}
          </p>
        </div>
        <Link
          href="/players"
          className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-white sm:text-xs"
        >
          Состав →
        </Link>
      </div>

      <div className="mb-2 grid grid-cols-5 gap-1 sm:mb-3 sm:gap-1.5">
        <MiniChip label="Голы" value={totalGoals} />
        <MiniChip label="Пасы" value={totalAssists} />
        <MiniChip label="Победы" value={winsCount} />
        <MiniChip label="Матчи" value={playedCount} />
        <MiniChip label="Ср.★" value={averageRating} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
        {cards.map((card) => (
          <StarCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
