/**
 * Формула прогресса чемпионата — менять только здесь.
 * XP опирается на итоговую оценку матча, не на голы.
 */

/** XP, нужный чтобы уйти с текущего уровня на следующий */
export function xpNeededForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  // Ур.1→2: 100, 2→3: 150, 3→4: 200 …
  return 100 + (safe - 1) * 50;
}

export function deriveLevelFromTotalXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
} {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  let need = xpNeededForLevel(level);

  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = xpNeededForLevel(level);
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNext: need,
  };
}

/**
 * Основной источник XP — оценка матча (1–10).
 * Бонус за MVP опционален и тоже легко правится.
 */
export function calcMatchXp(params: {
  matchRating: number | null | undefined;
  isMvp?: boolean;
  /** Бонус вратарю за сухой матч */
  cleanSheetBonus?: boolean;
}): number {
  const rating = Number(params.matchRating);
  if (!Number.isFinite(rating) || rating <= 0) {
    // сухой матч без оценки всё равно даёт небольшой XP вратарю
    if (params.cleanSheetBonus) return 35;
    return 0;
  }

  const BASE = 20;
  const PER_POINT = 10;
  let xp = Math.round(BASE + rating * PER_POINT);

  if (params.isMvp) {
    xp += 25;
  }
  if (params.cleanSheetBonus) {
    xp += 40;
  }

  return Math.max(0, xp);
}

export function progressBarPercent(xpIntoLevel: number, xpForNext: number): number {
  if (xpForNext <= 0) return 0;
  return Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100));
}
