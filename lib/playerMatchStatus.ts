export type PlayerMatchStatus = "ready" | "maybe" | "absent";

export const PLAYER_MATCH_STATUSES: PlayerMatchStatus[] = [
  "ready",
  "maybe",
  "absent",
];

export type PlayerMatchStatusMeta = {
  id: PlayerMatchStatus;
  emoji: string;
  label: string;
  shortLabel: string;
  dotClass: string;
  homeClass: string;
  profileClass: string;
  meProfileClass: string;
};

const META: Record<PlayerMatchStatus, PlayerMatchStatusMeta> = {
  ready: {
    id: "ready",
    emoji: "🟢",
    label: "Готов",
    shortLabel: "Готов",
    dotClass: "bg-emerald-400",
    homeClass: "player-home-premium__status--ready",
    profileClass: "player-profile-status--ready",
    meProfileClass: "me-profile-tab__status--ready",
  },
  maybe: {
    id: "maybe",
    emoji: "🟡",
    label: "Не готов",
    shortLabel: "Не гот.",
    dotClass: "bg-amber-400",
    homeClass: "player-home-premium__status--maybe",
    profileClass: "player-profile-status--maybe",
    meProfileClass: "me-profile-tab__status--maybe",
  },
  absent: {
    id: "absent",
    emoji: "🔴",
    label: "Травма",
    shortLabel: "Трав.",
    dotClass: "bg-red-400",
    homeClass: "player-home-premium__status--absent",
    profileClass: "player-profile-status--absent",
    meProfileClass: "me-profile-tab__status--absent",
  },
};

export function normalizePlayerMatchStatus(
  status: string | null | undefined
): PlayerMatchStatus {
  if (status === "maybe" || status === "absent") return status;
  return "ready";
}

export function getPlayerMatchStatusMeta(
  status: string | null | undefined
): PlayerMatchStatusMeta {
  return META[normalizePlayerMatchStatus(status)];
}

export function getPlayerMatchStatusLabel(
  status: string | null | undefined,
  withEmoji = true,
  compact = false
): string {
  const meta = getPlayerMatchStatusMeta(status);
  const text = compact ? meta.shortLabel : meta.label;
  return withEmoji ? `${meta.emoji} ${text}` : text;
}
