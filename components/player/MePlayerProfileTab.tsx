import MeProfilePhoto from "@/components/player/MeProfilePhoto";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import {
  formatOverallRating,
  formatVoteScore,
  getMatchRatingColorClass,
} from "@/lib/matchRatings";
import { formatMatchDate } from "@/lib/matches";
import {
  buildFormSparklinePoints,
  type FormRatingPoint,
} from "@/lib/playerHomeDashboard";
import { getFirstName } from "@/lib/playerStats";
import { getRatingProgress } from "@/lib/ratingProgress";
import {
  formatFifaStat,
  getAttributesForPosition,
  type RatingAttribute,
} from "@/lib/ratingEpisode";
import {
  LINEUP_SLOT_LABELS,
  type LineupPosition,
} from "@/lib/lineup";
import {
  normalizeRelation,
  type PlayerProfileData,
} from "@/lib/server/playerProfile";
import { getPositionGroup } from "@/lib/positionStyles";

const GROUP_LABELS: Record<string, string> = {
  НАП: "НАП",
  ЦП: "ЦП",
  ЗАЩ: "ЗАЩ",
  ВРТ: "ВРТ",
};

const GROUP_ROLE_LABELS: Record<string, string> = {
  НАП: "НАПАДАЮЩИЙ",
  ЦП: "ПОЛУЗАЩИТНИК",
  ЗАЩ: "ЗАЩИТНИК",
  ВРТ: "ВРАТАРЬ",
};

const PHYS_ROWS = ["Возраст", "Рост", "Вес", "Ведущая нога"] as const;

const FIELD_SLOTS: Record<
  LineupPosition,
  { x: number; y: number }
> = {
  НАП1: { x: 32, y: 18 },
  НАП2: { x: 68, y: 18 },
  ЦП1: { x: 35, y: 42 },
  ЦП2: { x: 65, y: 42 },
  ЗАЩ1: { x: 18, y: 68 },
  ЗАЩ2: { x: 50, y: 72 },
  ЗАЩ3: { x: 82, y: 68 },
  ВРТ: { x: 50, y: 90 },
};

function cleanPositionText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replaceAll("РќРђРџ", "НАП")
    .replaceAll("Р¦Рџ", "ЦП")
    .replaceAll("Р—РђР©", "ЗАЩ")
    .replaceAll("Р’Р Рў", "ВРТ");
}

function getRankBy(
  items: { id: number; rating: number }[],
  currentId: number
): number {
  const sorted = [...items].sort((a, b) => b.rating - a.rating);
  const index = sorted.findIndex((item) => item.id === currentId);
  return index >= 0 ? index + 1 : sorted.length;
}

function getBarTone(value: number): "green" | "yellow" | "blue" | "gray" {
  if (value >= 80) return "green";
  if (value >= 72) return "yellow";
  if (value >= 65) return "blue";
  return "gray";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="me-profile-tab__status me-profile-tab__status--ready">
        🟢 Готов
      </span>
    );
  }
  if (status === "maybe") {
    return (
      <span className="me-profile-tab__status me-profile-tab__status--maybe">
        🟡 Возможно
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="me-profile-tab__status me-profile-tab__status--absent">
        🔴 Не сможет
      </span>
    );
  }
  return null;
}

function QuickStat({
  icon,
  value,
  hint,
}: {
  icon: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="me-profile-tab__quick-stat">
      <span className="me-profile-tab__quick-icon" aria-hidden>
        {icon}
      </span>
      <p className="me-profile-tab__quick-value">{value}</p>
      <p className="me-profile-tab__quick-hint">{hint}</p>
    </div>
  );
}

function FormPanel({ ratings }: { ratings: number[] }) {
  const slots = Array.from({ length: 5 }, (_, index) => ratings[index] ?? null);

  return (
    <section className="me-profile-tab__panel me-profile-tab__panel--form">
      <h2 className="me-profile-tab__panel-title">Форма</h2>
      <p className="me-profile-tab__panel-sub">последние 5 матчей</p>
      <div className="me-profile-tab__form-row">
        {slots.map((rating, index) =>
          rating != null && rating > 0 ? (
            <span
              key={`form-${index}`}
              className={`me-profile-tab__form-chip ${getMatchRatingColorClass(rating)}`}
            >
              {formatVoteScore(rating)}
            </span>
          ) : (
            <span key={`form-empty-${index}`} className="me-profile-tab__form-chip me-profile-tab__form-chip--empty">
              —
            </span>
          )
        )}
      </div>
    </section>
  );
}

function TrendPanel({ points }: { points: FormRatingPoint[] }) {
  const lastFive = points.slice(-5);
  const width = 140;
  const height = 58;
  const padding = 6;
  const polyline = buildFormSparklinePoints(lastFive, width, height, padding);

  const dotPoints = lastFive.map((point, index) => {
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const minRating = 4;
    const maxRating = 10;
    const x =
      padding +
      (lastFive.length === 1 ? innerW / 2 : (index / (lastFive.length - 1)) * innerW);
    const normalized =
      (Math.max(minRating, Math.min(maxRating, point.rating)) - minRating) /
      (maxRating - minRating);
    const y = padding + innerH - normalized * innerH;
    return { ...point, x, y };
  });

  return (
    <section className="me-profile-tab__panel me-profile-tab__panel--trend">
      <h2 className="me-profile-tab__panel-title">Тренд рейтинга</h2>
      {lastFive.length === 0 ? (
        <p className="me-profile-tab__empty">Нет данных</p>
      ) : (
        <div className="me-profile-tab__trend">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="me-profile-tab__trend-chart"
            aria-hidden
          >
            {polyline ? (
              <>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.55)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {dotPoints.map((point) => (
                  <circle
                    key={point.matchId}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill="#7dd3fc"
                  />
                ))}
              </>
            ) : null}
          </svg>
          <div className="me-profile-tab__trend-labels">
            {lastFive.map((point) => (
              <span key={point.matchId} className="me-profile-tab__trend-label">
                {formatVoteScore(point.rating)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AttributeBars({
  attributes,
}: {
  attributes: Array<RatingAttribute & { value: number }>;
}) {
  if (attributes.length === 0) {
    return <p className="me-profile-tab__empty">Характеристики пока не рассчитаны</p>;
  }

  return (
    <div className="me-profile-tab__attrs-grid">
      {attributes.map((attr) => {
        const fifaValue = Number(formatFifaStat(attr.value));
        const tone = getBarTone(fifaValue);

        return (
          <div key={attr.key} className="me-profile-tab__attr">
            <div className="me-profile-tab__attr-row">
              <span className="me-profile-tab__attr-label">{attr.label}</span>
              <span className="me-profile-tab__attr-value">{fifaValue}</span>
            </div>
            <div className="me-profile-tab__attr-track">
              <div
                className={`me-profile-tab__attr-fill me-profile-tab__attr-fill--${tone}`}
                style={{ width: `${Math.max(6, Math.min(100, fifaValue))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniPitch({
  lineupPosition,
  positionLabel,
  group,
}: {
  lineupPosition: string | null;
  positionLabel: string;
  group: string;
}) {
  const slot = lineupPosition as LineupPosition | null;
  const marker = slot && slot in FIELD_SLOTS ? FIELD_SLOTS[slot] : null;
  const slotLabel =
    slot && slot in LINEUP_SLOT_LABELS
      ? LINEUP_SLOT_LABELS[slot]
      : positionLabel;

  return (
    <section className="me-profile-tab__panel me-profile-tab__panel--pitch">
      <h2 className="me-profile-tab__panel-title">Позиция</h2>
      <div className="me-profile-tab__pitch-wrap">
        <svg viewBox="0 0 100 100" className="me-profile-tab__pitch" aria-hidden>
          <rect x="4" y="4" width="92" height="92" rx="6" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(52, 211, 153, 0.22)" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(52, 211, 153, 0.18)" />
          <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(52, 211, 153, 0.18)" />
          <rect x="28" y="4" width="44" height="16" fill="none" stroke="rgba(52, 211, 153, 0.18)" />
          <rect x="28" y="80" width="44" height="16" fill="none" stroke="rgba(52, 211, 153, 0.18)" />
          {marker ? (
            <>
              <circle cx={marker.x} cy={marker.y} r="9" fill="rgba(56, 189, 248, 0.18)" />
              <circle cx={marker.x} cy={marker.y} r="4.5" fill="#38bdf8" />
            </>
          ) : null}
        </svg>
      </div>
      <p className="me-profile-tab__pitch-main">
        Основная: <strong>{slotLabel || positionLabel}</strong>
      </p>
      <p className="me-profile-tab__pitch-sub">{GROUP_ROLE_LABELS[group] ?? group}</p>
    </section>
  );
}

export default function MePlayerProfileTab({ data }: { data: PlayerProfileData }) {
  const {
    player,
    players,
    playerAttributes,
    matchStats,
    matchRatings,
    ratingDelta,
    totalPlayers,
  } = data;

  const group = getPositionGroup(player.lineup_position, player.position);
  const groupLabel = GROUP_LABELS[group] ?? cleanPositionText(group);
  const positionLabel = cleanPositionText(player.position);
  const lineupLabel = player.lineup_position
    ? LINEUP_SLOT_LABELS[player.lineup_position as LineupPosition] ??
      cleanPositionText(player.lineup_position)
    : null;
  const progress = getRatingProgress(player.rating);
  const firstName = getFirstName(player.name);
  const ratingRank = getRankBy(players, player.id);

  const votedMatchRatings = matchRatings.filter((row) => (row.vote_count ?? 0) > 0);
  const lastFiveRatings = votedMatchRatings
    .slice(0, 5)
    .map((row) => Number(row.match_rating))
    .reverse();

  const formPoints: FormRatingPoint[] = votedMatchRatings
    .slice(0, 5)
    .reverse()
    .map((row) => {
      const match = normalizeRelation(row.match);
      return {
        matchId: row.match_id,
        rating: Number(row.match_rating),
        opponent: match?.opponent ?? "Матч",
        date: match?.date ?? "",
        shortLabel: match?.date?.slice(5) ?? "—",
      };
    });

  const matchesPlayed = new Set(matchStats.map((row) => row.match_id)).size;
  const avgMatchRating =
    votedMatchRatings.length > 0
      ? votedMatchRatings.reduce((sum, row) => sum + Number(row.match_rating), 0) /
        votedMatchRatings.length
      : null;

  const attributes = playerAttributes
    ? getAttributesForPosition(player.position)
        .map((attribute) => ({
          ...attribute,
          value: playerAttributes[attribute.key] ?? 0,
        }))
        .filter((attribute) => attribute.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];

  const cleanSheets = matchStats.reduce((count, row) => {
    const match = normalizeRelation(row.match);
    if (match?.opponent_goals === 0) return count + 1;
    return count;
  }, 0);

  const seasonMinutes = matchesPlayed * 90;

  const lastMatches = votedMatchRatings.slice(0, 3).map((row) => {
    const match = normalizeRelation(row.match);
    const ndfk = match?.ndfk_goals;
    const opp = match?.opponent_goals;
    let resultTone: "win" | "draw" | "loss" | null = null;
    if (ndfk != null && opp != null) {
      resultTone = ndfk > opp ? "win" : ndfk < opp ? "loss" : "draw";
    }

    return {
      id: row.id,
      opponent: match?.opponent ?? "Матч",
      score: ndfk != null && opp != null ? `${ndfk}:${opp}` : null,
      rating: Number(row.match_rating),
      date: match?.date ?? "",
      resultTone,
    };
  });

  return (
    <div className="me-profile-tab">
      <section className="me-profile-tab__hero">
        <MeProfilePhoto
          name={player.name}
          photoUrl={player.photo_url ?? null}
          positionGroup={group}
          rank={ratingRank}
          groupLabel={groupLabel}
        />

        <div className="me-profile-tab__identity">
          <h1 className="me-profile-tab__name">{firstName}</h1>
          <p className="me-profile-tab__meta">
            {positionLabel}
            {lineupLabel ? ` · ${lineupLabel}` : ""} · #{ratingRank}
          </p>
          <StatusBadge status={player.status} />
          <ul className="me-profile-tab__phys">
            {PHYS_ROWS.map((label) => (
              <li key={label}>
                <span>{label}</span>
                <span className="me-profile-tab__phys-value" />
              </li>
            ))}
          </ul>
        </div>

        <div className="player-home-premium__ovr me-profile-tab__ovr">
          <p className="player-home-premium__ovr-label">Рейтинг</p>
          <p className="player-home-premium__ovr-value ui-ovr-flash">
            {formatOverallRating(player.rating)}
          </p>
          <RatingChangeBadge delta={ratingDelta} size="sm" />
          <div className="player-home-premium__ovr-bar" aria-hidden>
            <div
              className="player-home-premium__ovr-bar-fill"
              style={{ width: `${progress.pct || 3}%` }}
            />
          </div>
          <p className="player-home-premium__ovr-hint">
            до {progress.next}
            {ratingDelta != null && ratingDelta !== 0 ? (
              <span
                className={
                  ratingDelta > 0
                    ? "me-profile-tab__ovr-delta me-profile-tab__ovr-delta--up"
                    : "me-profile-tab__ovr-delta me-profile-tab__ovr-delta--down"
                }
              >
                {" "}
                {ratingDelta > 0 ? "+" : "−"}
                {Math.abs(ratingDelta)}
              </span>
            ) : null}
          </p>
        </div>
      </section>

      <section className="me-profile-tab__quick">
        <QuickStat
          icon="🏆"
          value={`${ratingRank}/${totalPlayers}`}
          hint="в команде"
        />
        <QuickStat icon="⚽" value={String(matchesPlayed)} hint="сыграно" />
        <QuickStat icon="🥅" value={String(player.goals)} hint="в сезоне" />
        <QuickStat icon="🎯" value={String(player.assists)} hint="в сезоне" />
        <QuickStat
          icon="⭐"
          value={avgMatchRating ? formatVoteScore(avgMatchRating) : "—"}
          hint="рейтинг"
        />
      </section>

      <div className="me-profile-tab__duo me-profile-tab__duo--performance">
        <FormPanel ratings={lastFiveRatings} />
        <TrendPanel points={formPoints} />
      </div>

      <section className="me-profile-tab__section">
        <div className="me-profile-tab__section-head">
          <h2 className="me-profile-tab__section-title">Ключевые характеристики</h2>
        </div>
        <AttributeBars attributes={attributes} />
      </section>

      <section className="me-profile-tab__section">
        <div className="me-profile-tab__section-head">
          <h2 className="me-profile-tab__section-title">Статистика в сезоне</h2>
        </div>
        <div className="me-profile-tab__season-grid">
          <div><span>Матчи</span><strong>{matchesPlayed}</strong></div>
          <div><span>Минуты</span><strong>{seasonMinutes}</strong></div>
          <div><span>Голы</span><strong>{player.goals}</strong></div>
          <div><span>Ассисты</span><strong>{player.assists}</strong></div>
          <div><span>Сухие</span><strong>{cleanSheets}</strong></div>
          <div><span>Жёлтые</span><strong>0</strong></div>
          <div><span>Красные</span><strong>0</strong></div>
          <div>
            <span>OVR сезона</span>
            <strong className="me-profile-tab__season-ovr">
              {formatOverallRating(player.rating)}
            </strong>
          </div>
        </div>
      </section>

      <div className="me-profile-tab__duo me-profile-tab__duo--bottom">
        <section className="me-profile-tab__panel me-profile-tab__panel--matches">
          <h2 className="me-profile-tab__panel-title">Последние матчи</h2>
          {lastMatches.length === 0 ? (
            <p className="me-profile-tab__empty">Матчей пока нет</p>
          ) : (
            <ul className="me-profile-tab__matches">
              {lastMatches.map((row) => (
                <li key={row.id} className="me-profile-tab__match">
                  <div className="me-profile-tab__match-main">
                    <p className="me-profile-tab__match-opponent">vs {row.opponent}</p>
                    <p className="me-profile-tab__match-date">
                      {row.date ? formatMatchDate(row.date) : "—"} · 90&apos;
                    </p>
                  </div>
                  <div className="me-profile-tab__match-side">
                    {row.score && row.resultTone ? (
                      <span
                        className={`me-profile-tab__match-score me-profile-tab__match-score--${row.resultTone}`}
                      >
                        {row.score}
                      </span>
                    ) : null}
                    <span
                      className={`me-profile-tab__match-rating ${getMatchRatingColorClass(row.rating)}`}
                    >
                      {formatVoteScore(row.rating)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <MiniPitch
          lineupPosition={player.lineup_position}
          positionLabel={positionLabel}
          group={group}
        />
      </div>
    </div>
  );
}
