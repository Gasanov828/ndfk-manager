import type { RatedMatchEntry } from "@/lib/gamification/types";

/**
 * Career XP model. XP is a pure function of a player's rated-match history so
 * recalculating (which happens on every vote) always produces the same total.
 *
 * A solid 8.4/10 match awards ~25 XP (8.4 * 3), matching the product example.
 */
export const XP_RATING_MULTIPLIER = 3;
export const XP_MVP_BONUS = 10;
export const XP_GREAT_MATCH_BONUS = 5; // rating >= 9

export type CareerLevelInfo = {
  level: number;
  xp: number;
  title: string;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP span of the current level. */
  xpForNext: number;
  /** 0–1 progress towards the next level. */
  progress: number;
};

export const CAREER_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: "Новичок" },
  { minLevel: 3, title: "Талант" },
  { minLevel: 6, title: "Мастер" },
  { minLevel: 10, title: "Звезда" },
  { minLevel: 15, title: "Чемпион" },
  { minLevel: 25, title: "Легенда" },
];

export function getTitleForLevel(level: number): string {
  let title = CAREER_TITLES[0].title;
  for (const tier of CAREER_TITLES) {
    if (level >= tier.minLevel) title = tier.title;
  }
  return title;
}

/** Cumulative XP required to reach a given level (level 1 = 0). */
export function levelStartXp(level: number): number {
  const l = Math.max(1, level);
  return 25 * (l - 1) * l;
}

export function xpForMatch(
  entry: Pick<RatedMatchEntry, "matchRating" | "isMvp" | "voteCount">
): number {
  if (entry.voteCount <= 0) return 0;
  let xp = Math.round(entry.matchRating * XP_RATING_MULTIPLIER);
  if (entry.isMvp) xp += XP_MVP_BONUS;
  if (entry.matchRating >= 9) xp += XP_GREAT_MATCH_BONUS;
  return Math.max(0, xp);
}

export function computeCareerXp(matches: RatedMatchEntry[]): number {
  return matches.reduce((sum, match) => sum + xpForMatch(match), 0);
}

export function getLevelForXp(xp: number): CareerLevelInfo {
  const safeXp = Math.max(0, Math.round(xp));
  let level = 1;
  while (safeXp >= levelStartXp(level + 1)) {
    level += 1;
  }

  const currentStart = levelStartXp(level);
  const nextStart = levelStartXp(level + 1);
  const xpIntoLevel = safeXp - currentStart;
  const xpForNext = nextStart - currentStart;

  return {
    level,
    xp: safeXp,
    title: getTitleForLevel(level),
    xpIntoLevel,
    xpForNext,
    progress: xpForNext > 0 ? Math.min(1, xpIntoLevel / xpForNext) : 1,
  };
}

export function formatXpDelta(delta: number): string {
  if (delta <= 0) return "0 XP";
  return `+${delta} XP`;
}
