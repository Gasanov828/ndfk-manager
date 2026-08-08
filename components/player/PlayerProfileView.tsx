import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import {
  formatOverallRating,
  formatVoteScore,
  getMatchRatingColorClass,
} from "@/lib/matchRatings";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { formatFifaStat, getAttributesForPosition } from "@/lib/ratingEpisode";
import { getRatingProgress } from "@/lib/ratingProgress";
import {
  normalizeRelation,
  type PlayerMatchRatingRow,
  type PlayerMatchStatRow,
  type PlayerProfileData,
  type PlayerTrainingRatingRow,
} from "@/lib/server/playerProfile";
import { getRatingDelta } from "@/lib/trainingRatings";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";

const GROUP_LABELS: Record<string, string> = {
  НАП: "НАП",
  ЦП: "ЦП",
  ЗАЩ: "ЗАЩ",
  ВРТ: "ВРТ",
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

const HERO_ACCENT: Record<string, string> = {
  НАП: "nap",
  ЦП: "cp",
  ЗАЩ: "def",
  ВРТ: "gk",
};

const STAT_TONES = {
  amber: "player-profile-stat--amber",
  cyan: "player-profile-stat--cyan",
  emerald: "player-profile-stat--emerald",
  violet: "player-profile-stat--violet",
  rose: "player-profile-stat--rose",
  sky: "player-profile-stat--sky",
} as const;

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

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="player-profile-status player-profile-status--ready">
        🟢 Готов
      </span>
    );
  }
  if (status === "maybe") {
    return (
      <span className="player-profile-status player-profile-status--maybe">
        🟡 Возможно
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="player-profile-status player-profile-status--absent">
        🔴 Не сможет
      </span>
    );
  }
  return (
    <span className="player-profile-status player-profile-status--neutral">
      Нет статуса
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  tone = "cyan",
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <div className={`player-profile-stat ${STAT_TONES[tone]}`}>
      <p className="player-profile-stat__label">
        {icon} {label}
      </p>
      <p className="player-profile-stat__value">{value}</p>
      {hint ? <p className="player-profile-stat__hint">{hint}</p> : null}
    </div>
  );
}

function FormStrip({ ratings }: { ratings: number[] }) {
  if (ratings.length === 0) {
    return (
      <p className="player-profile-empty">Оценок за матчи пока нет</p>
    );
  }

  return (
    <div className="player-profile-form-strip">
      {ratings.map((rating, index) => (
        <span
          key={`${rating}-${index}`}
          className={`player-profile-form-chip ${getMatchRatingColorClass(rating)}`}
        >
          {formatVoteScore(rating)}
        </span>
      ))}
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
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <section className="player-profile-panel">
      <div className="player-profile-panel__head">
        <h2 className="player-profile-panel__title">⚙️ Навыки FIFA</h2>
        <p className="player-profile-panel__sub">по позиции на поле</p>
      </div>

      {skills.length === 0 ? (
        <p className="player-profile-empty">Навыки пока не рассчитаны</p>
      ) : (
        <div className="player-profile-skills">
          {skills.map((skill, index) => {
            const fifaValue = Number(formatFifaStat(skill.value));
            const isTop = index < 3;

            return (
              <div
                key={skill.key}
                className={`player-profile-skill ${isTop ? "player-profile-skill--top" : ""}`}
              >
                <div className="player-profile-skill__row">
                  <span className="player-profile-skill__name">
                    {skill.emoji} {skill.label}
                  </span>
                  <span className="player-profile-skill__value">{fifaValue}</span>
                </div>
                <div className="player-profile-skill__bar">
                  <div
                    className="player-profile-skill__fill"
                    style={{
                      width: `${Math.max(6, Math.min(100, fifaValue))}%`,
                    }}
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
  limit = 10,
}: {
  matchRatings: PlayerMatchRatingRow[];
  trainingRatings: PlayerTrainingRatingRow[];
  limit?: number;
}) {
  const rows = [
    ...matchRatings.map((row) => {
      const match = normalizeRelation(row.match);
      const voteCount = row.vote_count ?? 0;
      return {
        id: `match-${row.id}`,
        type: "Матч",
        title: match ? `vs ${match.opponent}` : "Матч",
        date: match?.date ?? "",
        rating: voteCount > 0 ? Number(row.match_rating) : 0,
        noVotes: voteCount <= 0,
        delta: row.rating_delta ?? getRatingDelta(row.rating_before, row.rating_after),
        isMvp: row.is_mvp && voteCount > 0,
        votes: voteCount,
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
        noVotes: false,
        delta: getRatingDelta(row.rating_before, row.rating_after),
        isMvp: false,
        votes: row.vote_count ?? 0,
      };
    }),
  ]
    .filter((row) => row.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  return (
    <section className="player-profile-panel">
      <div className="player-profile-panel__head">
        <h2 className="player-profile-panel__title">📈 История оценок</h2>
        <p className="player-profile-panel__sub">матчи и тренировки</p>
      </div>

      {rows.length === 0 ? (
        <p className="player-profile-empty">Оценок пока нет</p>
      ) : (
        <div className="player-profile-timeline">
          {rows.map((row) => (
            <div key={row.id} className="player-profile-timeline__row">
              <div className="player-profile-timeline__meta">
                <div className="player-profile-timeline__title-row">
                  <p className="player-profile-timeline__title">{row.title}</p>
                  {row.isMvp ? (
                    <span className="player-profile-mvp-badge">MVP</span>
                  ) : null}
                </div>
                <p className="player-profile-timeline__sub">
                  {row.type} · {formatMatchDate(row.date)}
                  {row.votes > 0 ? ` · ${row.votes} гол.` : ""}
                </p>
              </div>
              <div className="player-profile-timeline__score">
                {row.noVotes ? (
                  <span className="player-profile-timeline__novotes">
                    без оценок
                  </span>
                ) : (
                  <>
                    <span
                      className={`player-profile-timeline__rating ${getMatchRatingColorClass(row.rating)}`}
                    >
                      {formatVoteScore(row.rating)}
                    </span>
                    <RatingChangeBadge delta={row.delta} size="sm" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MatchActivity({
  stats,
  limit = 10,
}: {
  stats: PlayerMatchStatRow[];
  limit?: number;
}) {
  const rows = stats.filter(
    (row) => row.goals > 0 || row.assists > 0 || (row.saves ?? 0) > 0
  );

  return (
    <section className="player-profile-panel">
      <div className="player-profile-panel__head">
        <h2 className="player-profile-panel__title">⚽ Голевые действия</h2>
        <p className="player-profile-panel__sub">по матчам</p>
      </div>

      {rows.length === 0 ? (
        <p className="player-profile-empty">Голевых действий пока нет</p>
      ) : (
        <div className="player-profile-timeline">
          {rows.slice(0, limit).map((row) => {
            const match = normalizeRelation(row.match);
            const ndfk = match?.ndfk_goals;
            const opp = match?.opponent_goals;
            let result: string | null = null;
            if (ndfk != null && opp != null) {
              result =
                ndfk > opp ? "В" : ndfk < opp ? "П" : "Н";
            }

            return (
              <div key={row.id} className="player-profile-timeline__row">
                <div className="player-profile-timeline__meta">
                  <p className="player-profile-timeline__title">
                    {match ? `vs ${match.opponent}` : "Матч"}
                  </p>
                  {match ? (
                    <p className="player-profile-timeline__sub">
                      {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
                      {ndfk != null && opp != null
                        ? ` · ${ndfk}:${opp}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="player-profile-match-actions">
                  {result ? (
                    <span
                      className={`player-profile-result player-profile-result--${
                        result === "В"
                          ? "win"
                          : result === "П"
                            ? "loss"
                            : "draw"
                      }`}
                    >
                      {result}
                    </span>
                  ) : null}
                  {row.goals > 0 ? (
                    <span className="player-profile-action">⚽ {row.goals}</span>
                  ) : null}
                  {row.assists > 0 ? (
                    <span className="player-profile-action">🎯 {row.assists}</span>
                  ) : null}
                  {(row.saves ?? 0) > 0 ? (
                    <span className="player-profile-action">🧤 {row.saves}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompareBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "amber" | "cyan" | "emerald";
}) {
  const pct = max > 0 ? Math.max(8, Math.min(100, (value / max) * 100)) : 0;

  return (
    <div className="player-profile-compare">
      <div className="player-profile-compare__row">
        <span className="player-profile-compare__label">{label}</span>
        <span className="player-profile-compare__value">{value}</span>
      </div>
      <div className="player-profile-compare__track">
        <div
          className={`player-profile-compare__fill player-profile-compare__fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PlayerProfileView({
  data,
  compact = false,
}: {
  data: PlayerProfileData;
  compact?: boolean;
}) {
  const {
    player,
    players,
    playerAttributes,
    matchStats,
    matchRatings,
    trainingRatings,
    reputation,
    loadError,
    ratingDelta,
    totalPlayers,
    teamAvgRating,
  } = data;

  const group = getPositionGroup(player.lineup_position, player.position);
  const style = getPositionStyle(group);
  const groupLabel = GROUP_LABELS[group] ?? cleanPositionText(group);
  const positionLabel = cleanPositionText(player.position);
  const lineupLabel = cleanPositionText(player.lineup_position);
  const progress = getRatingProgress(player.rating);

  const votedMatchRatings = matchRatings.filter((row) => (row.vote_count ?? 0) > 0);
  const lastFiveRatings = votedMatchRatings
    .slice(0, 5)
    .map((row) => Number(row.match_rating))
    .reverse();

  const totalGoals = matchStats.reduce((sum, row) => sum + row.goals, 0);
  const totalAssists = matchStats.reduce((sum, row) => sum + row.assists, 0);
  const totalSaves = matchStats.reduce((sum, row) => sum + (row.saves ?? 0), 0);
  const mvpCount = votedMatchRatings.filter((row) => row.is_mvp).length;
  const matchesPlayed = new Set(matchStats.map((row) => row.match_id)).size;
  const avgMatchRating = getAverage(
    votedMatchRatings
      .map((row) => Number(row.match_rating))
      .filter((value) => value > 0)
  );
  const avgTrainingRating = getAverage(
    trainingRatings.map((row) => Number(row.training_rating)).filter(Boolean)
  );
  const bestMatchRating = votedMatchRatings.reduce(
    (best, row) => Math.max(best, Number(row.match_rating)),
    0
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
  const assistRank = getRankBy(
    players,
    player.id,
    (item) => item.id,
    (item) => item.assists
  );

  const maxGoals = Math.max(...players.map((p) => p.goals), 1);
  const maxAssists = Math.max(...players.map((p) => p.assists), 1);
  const ratingVsTeam = player.rating - teamAvgRating;
  const totalReactionCount = reputation.reduce((sum, row) => sum + row.count, 0);

  const timelineLimit = compact ? 5 : 10;
  const activityLimit = compact ? 5 : 10;

  return (
    <div className={`player-profile${compact ? " player-profile--compact" : ""}`}>
      {!compact ? (
        <div className="player-profile__nav">
          <Link href="/players" className="player-profile__back">
            ← Игроки
          </Link>
          <span className="player-profile__tag">Профиль</span>
        </div>
      ) : null}

      {loadError ? (
        <div className="player-profile-alert">{loadError}</div>
      ) : null}

      <section
        className={`player-profile-hero player-profile-hero--${HERO_ACCENT[group] ?? "default"}`}
      >
        <div className="player-profile-hero__main">
          <PlayerAvatar
            name={player.name}
            photoUrl={player.photo_url}
            size={compact ? "md" : "lg"}
            badge={groupLabel}
            badgeClassName={style.badge}
          />

          <div className="player-profile-hero__copy">
            <h1 className="player-profile-hero__name">{player.name}</h1>
            <p className="player-profile-hero__meta">
              {positionLabel}
              {lineupLabel ? ` · ${lineupLabel}` : ""}
            </p>
            <div className="player-profile-hero__badges">
              <span className={`player-profile-role ${style.badge}`}>
                {groupLabel}
              </span>
              <StatusBadge status={player.status} />
            </div>
            <p className="player-profile-hero__ranks">
              #{ratingRank} по OVR · #{goalRank} по голам · #{assistRank} по пасам
            </p>
          </div>

          <div className="player-profile-ovr">
            <p className="player-profile-ovr__label">OVR</p>
            <p className="player-profile-ovr__value ui-ovr-flash">
              {formatOverallRating(player.rating)}
            </p>
            <RatingChangeBadge delta={ratingDelta} size="sm" />
            <div className="player-profile-ovr__bar" aria-hidden>
              <div
                className="player-profile-ovr__fill"
                style={{ width: `${progress.pct || 3}%` }}
              />
            </div>
            <p className="player-profile-ovr__hint">
              до {progress.next} · {progress.remaining}
            </p>
          </div>
        </div>
      </section>

      <section className="player-profile-stats-grid">
        <StatTile icon="⚽" label="Голы" value={player.goals} tone="amber" />
        <StatTile icon="🎯" label="Пасы" value={player.assists} tone="cyan" />
        <StatTile icon="🏟" label="Матчи" value={matchesPlayed} tone="violet" />
        <StatTile icon="🏆" label="MVP" value={mvpCount} tone="rose" />
        <StatTile
          icon="⭐"
          label="Ср. матч"
          value={avgMatchRating ? formatVoteScore(avgMatchRating) : "—"}
          tone="emerald"
        />
        <StatTile
          icon="📊"
          label="Место"
          value={`${ratingRank}/${totalPlayers}`}
          hint="в команде"
          tone="sky"
        />
      </section>

      {totalSaves > 0 || avgTrainingRating != null || bestMatchRating > 0 ? (
        <section className="player-profile-stats-grid player-profile-stats-grid--secondary">
          {totalSaves > 0 ? (
            <StatTile icon="🧤" label="Сейвы" value={totalSaves} tone="violet" />
          ) : null}
          {avgTrainingRating != null ? (
            <StatTile
              icon="🏃"
              label="Тренировки"
              value={formatVoteScore(avgTrainingRating)}
              tone="cyan"
            />
          ) : null}
          {bestMatchRating > 0 ? (
            <StatTile
              icon="🔥"
              label="Лучший матч"
              value={formatVoteScore(bestMatchRating)}
              tone="amber"
            />
          ) : null}
          {totalReactionCount > 0 ? (
            <StatTile
              icon="❤️"
              label="Реакции"
              value={totalReactionCount}
              tone="rose"
            />
          ) : null}
        </section>
      ) : null}

      <section className="player-profile-panel">
        <div className="player-profile-panel__head">
          <h2 className="player-profile-panel__title">🔥 Форма</h2>
          <p className="player-profile-panel__sub">последние оценки за матчи</p>
        </div>
        <FormStrip ratings={lastFiveRatings} />
      </section>

      <div
        className={`player-profile-columns${compact ? " player-profile-columns--stack" : ""}`}
      >
        <div className="player-profile-columns__main">
          <SkillsPanel position={player.position} attrs={playerAttributes} />
          <RatingTimeline
            matchRatings={matchRatings}
            trainingRatings={trainingRatings}
            limit={timelineLimit}
          />
        </div>

        <aside className="player-profile-columns__side">
          <section className="player-profile-panel">
            <div className="player-profile-panel__head">
              <h2 className="player-profile-panel__title">📊 Сравнение</h2>
              <p className="player-profile-panel__sub">с командой</p>
            </div>
            <div className="player-profile-compare-stack">
              <CompareBar
                label="OVR"
                value={player.rating}
                max={Math.max(...players.map((p) => p.rating), player.rating)}
                tone="amber"
              />
              <CompareBar
                label="Голы"
                value={player.goals}
                max={maxGoals}
                tone="cyan"
              />
              <CompareBar
                label="Пасы"
                value={player.assists}
                max={maxAssists}
                tone="emerald"
              />
              <p className="player-profile-compare-note">
                Средний OVR команды: {formatOverallRating(teamAvgRating)}
                {ratingVsTeam !== 0 ? (
                  <span
                    className={
                      ratingVsTeam > 0
                        ? "player-profile-compare-note--up"
                        : "player-profile-compare-note--down"
                    }
                  >
                    {" "}
                    ({ratingVsTeam > 0 ? "+" : "−"}
                    {Math.abs(ratingVsTeam).toFixed(1)})
                  </span>
                ) : null}
              </p>
            </div>
          </section>

          <section className="player-profile-panel">
            <div className="player-profile-panel__head">
              <h2 className="player-profile-panel__title">❤️ Репутация</h2>
              <p className="player-profile-panel__sub">реакции команды</p>
            </div>
            {reputation.length === 0 ? (
              <p className="player-profile-empty">Пока нет реакций</p>
            ) : (
              <ul className="player-profile-reactions">
                {reputation.map((row) => (
                  <li key={row.code} className="player-profile-reaction">
                    <span className="player-profile-reaction__emoji" aria-hidden>
                      {row.emoji}
                    </span>
                    <div className="player-profile-reaction__copy">
                      <p className="player-profile-reaction__label">{row.label}</p>
                      <p className="player-profile-reaction__count">{row.count}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="player-profile-panel player-profile-panel--accent">
            <div className="player-profile-panel__head">
              <h2 className="player-profile-panel__title">📋 Сводка сезона</h2>
            </div>
            <ul className="player-profile-summary">
              <li>
                <span>Матчей со статистикой</span>
                <strong>{matchesPlayed}</strong>
              </li>
              <li>
                <span>Голы в матчах</span>
                <strong>{totalGoals}</strong>
              </li>
              <li>
                <span>Ассисты в матчах</span>
                <strong>{totalAssists}</strong>
              </li>
              <li>
                <span>Оценок за матчи</span>
                <strong>{votedMatchRatings.length}</strong>
              </li>
              <li>
                <span>Тренировок с оценкой</span>
                <strong>{trainingRatings.length}</strong>
              </li>
            </ul>
          </section>

          <MatchActivity stats={matchStats} limit={activityLimit} />
        </aside>
      </div>
    </div>
  );
}
