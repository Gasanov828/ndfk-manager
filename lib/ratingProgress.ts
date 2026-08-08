export function getRatingProgress(rating: number) {
  const whole = Math.floor(rating);
  const frac = Math.max(0, Math.min(0.999, rating - whole));
  const next = whole + 1;
  const remaining = Math.round((1 - frac) * 10) / 10 || 1;
  const pct = frac === 0 ? 0 : Math.max(3, Math.round(frac * 100));
  return { currentFloor: whole, next, remaining, pct, frac };
}
