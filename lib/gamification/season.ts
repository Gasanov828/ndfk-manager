import type { RatedMatchEntry, SeasonStat } from "@/lib/gamification/types";

/**
 * Football seasons span roughly August–May, so matches from July onward count
 * towards the season that starts that calendar year.
 */
export const SEASON_START_MONTH = 6; // July (0-indexed)

export function getSeasonForDate(date: string | null | undefined): number {
  const parsed = date ? new Date(date) : new Date();
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = base.getFullYear();
  return base.getMonth() >= SEASON_START_MONTH ? year : year - 1;
}

export function formatSeasonLabel(season: number): string {
  const next = String((season + 1) % 100).padStart(2, "0");
  return `${season}/${next}`;
}

export function getCurrentSeason(): number {
  return getSeasonForDate(new Date().toISOString());
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Group rated matches into per-season averages. */
export function computeSeasonStats(matches: RatedMatchEntry[]): SeasonStat[] {
  const bySeason = new Map<number, { sum: number; count: number }>();

  for (const match of matches) {
    if (match.voteCount <= 0) continue;
    const bucket = bySeason.get(match.season) ?? { sum: 0, count: 0 };
    bucket.sum += match.matchRating;
    bucket.count += 1;
    bySeason.set(match.season, bucket);
  }

  return [...bySeason.entries()]
    .map(([season, { sum, count }]) => ({
      season,
      matchesRated: count,
      sumRating: round2(sum),
      avgRating: count > 0 ? round2(sum / count) : 0,
    }))
    .sort((a, b) => b.season - a.season);
}
