import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { formatOverallRating, formatVoteScore } from "@/lib/matchRatings";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { formatFifaStat, getAttributesForPosition } from "@/lib/ratingEpisode";
import {
  getPlayerProfileData,
  normalizeRelation,
  type PlayerMatchRatingRow,
  type PlayerMatchStatRow,
  type PlayerTrainingRatingRow,
} from "@/lib/server/playerProfile";
import { getRatingDelta } from "@/lib/trainingRatings";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";

export const revalidate = 30;

type PlayerProfilePageProps = {
  params: Promise<{ id: string }>;
};

const GROUP_LABELS: Record<string, string> = {
  "НАП": "НАП",
  "ЦП": "ЦП",
  "ЗАЩ": "ЗАЩ",
  "ВРТ": "ВРТ",
  "РќРђРџ": "НАП",
  "Р¦Рџ": "ЦП",
  "Р—РђР©": "ЗАЩ",
  "РВРТ": "ВРТ",
  "Р’Р Рў": "ВРТ",
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  pace: "Скорость",
  shooting: "Удар",
  dribbling: "Дриблинг",
  passing: "Пас",
  physical: "Физика",
  defending: "Отбор",
  heading: "Головой",
  reflexes: "Реакция",
  handling: "Руки",
  positioning: "Позиция",
  kicking: "Ногами",
};

function cleanPositionText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replaceAll("РќРђРџ", "НАП")
    .replaceAll("Р¦Рџ", "ЦП")
    .replaceAll("Р—РђР©", "ЗАЩ")
    .replaceAll("Р’Р Рў", "ВРТ");
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRankBy<T>(
  items: T[],
  currentId: number,
  getId: (item: T) => number,
  getValue: (item: T) => number
): number {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  const index = sorted.findIndex((item) => getId(item) === currentId);
  return index >= 0 ? index + 1 : sorted.length;
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-extrabold tabular-nums text-white sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function SkillsPanel({
  position,
  attrs,
}: {
  position: string;
  attrs: Record<string, number> | null;
}) {
  const skills = attrs
    ? getAttributesForPosition(position)
        .map((attribute) => ({
          ...attribute,
          label: ATTRIBUTE_LABELS[attribute.key] ?? attribute.label,
          value: attrs[attribute.key] ?? 0,
        }))
        .filter((attribute) => attribute.value > 0)
    : [];

  return (
    <section className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
      <div className="border-b border-white/8 px-3 py-2">
        <h2 className="text-[13px] font-bold text-white">Навыки</h2>
      </div>

      {skills.length === 0 ? (
        <p className="px-3 py-4 text-center text-[12px] text-slate-500">
          Навыки пока не рассчитаны
        </p>
      ) : (
        <div className="grid gap-1.5 p-2 sm:grid-cols-2">
          {skills.map((skill) => {
            const fifaValue = Number(formatFifaStat(skill.value));

            return (
              <div
                key={skill.key}
                className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-slate-200">
                    {skill.emoji} {skill.label}
                  </span>
                  <span className="rating-gold text-[13px] font-extrabold tabular-nums">
                    {fifaValue}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-amber-300"
                    style={{ width: `${Math.max(6, Math.min(100, fifaValue))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RatingTimeline({
  matchRatings,
  trainingRatings,
}: {
  matchRatings: PlayerMatchRatingRow[];
  trainingRatings: PlayerTrainingRatingRow[];
}) {
  const rows = [
    ...matchRatings.map((row) => {
      const match = normalizeRelation(row.match);
      return {
        id: `match-${row.id}`,
        type: "Матч",
        title: match ? `vs ${match.opponent}` : "Матч",
        date: match?.date ?? "",
        rating: Number(row.match_rating),
        delta: row.rating_delta ?? getRatingDelta(row.rating_before, row.rating_after),
        isMvp: row.is_mvp,
      };
    }),
    ...trainingRatings.map((row) => {
      const training = normalizeRelation(row.training);
      return {
        id: `training-${row.id}`,
        type: "Трен.",
        title: training?.title ?? "Тренировка",
        date: training?.date ?? "",
        rating: Number(row.training_rating),
        delta: getRatingDelta(row.rating_before, row.rating_after),
        isMvp: false,
      };
    }),
  ]
    .filter((row) => row.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <section className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
      <div className="border-b border-white/8 px-3 py-2">
        <h2 className="text-[13px] font-bold text-white">Форма</h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-center text-[12px] text-slate-500">
          Оценок пока нет
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2.5 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-[12px] font-semibold text-white">
                    {row.title}
                  </p>
                  {row.isMvp && (
                    <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">
                      MVP
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {row.type} · {formatMatchDate(row.date)}
                </p>
              </div>
              <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/5 sm:block">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${Math.max(8, Math.min(100, row.rating * 10))}%` }}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rating-gold text-[13px] font-bold tabular-nums">
                  {formatVoteScore(row.rating)}
                </span>
                <RatingChangeBadge delta={row.delta} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MatchActivity({ stats }: { stats: PlayerMatchStatRow[] }) {
  const activeRows = stats.filter(
    (row) => row.goals > 0 || row.assists > 0 || (row.saves ?? 0) > 0
  );

  return (
    <section className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
      <div className="border-b border-white/8 px-3 py-2">
        <h2 className="text-[13px] font-bold text-white">Вклад в матчи</h2>
      </div>

      {activeRows.length === 0 ? (
        <p className="px-3 py-4 text-center text-[12px] text-slate-500">
          Голевых действий пока нет
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {activeRows.slice(0, 8).map((row) => {
            const match = normalizeRelation(row.match);

            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">
                    {match ? `vs ${match.opponent}` : "Матч"}
                  </p>
                  {match && (
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1 text-[11px] font-semibold text-slate-200">
                  {row.goals > 0 && (
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5">
                      ⚽ {row.goals}
                    </span>
                  )}
                  {row.assists > 0 && (
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5">
                      🎯 {row.assists}
                    </span>
                  )}
                  {(row.saves ?? 0) > 0 && (
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5">
                      🧤 {row.saves}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function PlayerProfilePage({
  params,
}: PlayerProfilePageProps) {
  const { id } = await params;
  const playerId = Number(id);

  if (!Number.isInteger(playerId)) notFound();

  const data = await getPlayerProfileData(playerId);
  if (!data) notFound();

  const {
    player,
    players,
    playerAttributes,
    matchStats,
    matchRatings,
    trainingRatings,
    loadError,
  } = data;

  const group = getPositionGroup(player.lineup_position, player.position);
  const style = getPositionStyle(group);
  const groupLabel = GROUP_LABELS[group] ?? cleanPositionText(group);
  const positionLabel = cleanPositionText(player.position);
  const lineupLabel = cleanPositionText(player.lineup_position);

  const totalGoals = matchStats.reduce((sum, row) => sum + row.goals, 0);
  const totalAssists = matchStats.reduce((sum, row) => sum + row.assists, 0);
  const totalSaves = matchStats.reduce((sum, row) => sum + (row.saves ?? 0), 0);
  const mvpCount = matchRatings.filter((row) => row.is_mvp).length;
  const avgMatchRating = getAverage(
    matchRatings.map((row) => Number(row.match_rating)).filter(Boolean)
  );
  const avgTrainingRating = getAverage(
    trainingRatings.map((row) => Number(row.training_rating)).filter(Boolean)
  );
  const ratingRank = getRankBy(
    players,
    player.id,
    (item) => item.id,
    (item) => item.rating
  );
  const goalRank = getRankBy(
    players,
    player.id,
    (item) => item.id,
    (item) => item.goals
  );

  return (
    <div className="-mt-1 space-y-2 sm:-mt-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <Link
          href="/players"
          className="text-[12px] font-semibold text-slate-400 transition hover:text-cyan-300"
        >
          ← Игроки
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Профиль
        </span>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          Часть статистики не загрузилась: {loadError}
        </div>
      )}

      {/* Header card */}
      <section className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:gap-3.5 sm:px-4 sm:py-3">
          <PlayerAvatar
            name={player.name}
            photoUrl={player.photo_url}
            size="md"
            badge={groupLabel}
            badgeClassName={style.badge}
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
              {player.name}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {positionLabel}
              {lineupLabel ? ` · в составе: ${lineupLabel}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white ${style.badge}`}
              >
                {groupLabel}
              </span>
              <span className="text-[10px] text-slate-500">
                #{ratingRank} по рейтингу · #{goalRank} по голам
              </span>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-right sm:px-3 sm:py-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
              Рейтинг
            </p>
            <p className="rating-gold text-2xl font-black leading-none sm:text-3xl">
              {formatOverallRating(player.rating)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 border-t border-white/8 p-2 sm:gap-2 sm:p-2.5">
          <MiniStat label="Голы" value={player.goals} />
          <MiniStat label="Пасы" value={player.assists} />
          <MiniStat label="MVP" value={mvpCount} />
          <MiniStat
            label="Ср. оценка"
            value={avgMatchRating ? formatVoteScore(avgMatchRating) : "—"}
          />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <MiniStat label="Голы (матчи)" value={totalGoals} />
        <MiniStat label="Ассисты" value={totalAssists} />
        <MiniStat
          label={totalSaves > 0 ? "Сейвы" : "Тренировки"}
          value={
            totalSaves > 0
              ? totalSaves
              : avgTrainingRating
                ? formatVoteScore(avgTrainingRating)
                : "—"
          }
        />
      </div>

      <SkillsPanel position={player.position} attrs={playerAttributes} />

      <div className="grid gap-2 xl:grid-cols-[1.2fr_0.8fr] xl:gap-3">
        <RatingTimeline
          matchRatings={matchRatings}
          trainingRatings={trainingRatings}
        />
        <MatchActivity stats={matchStats} />
      </div>
    </div>
  );
}
