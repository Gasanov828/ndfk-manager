import { MAX_VOTE_SCORE, normalizeVoteScore } from "@/lib/matchRatings";

export { MAX_VOTE_SCORE };

const GUEST_TOKEN_STORAGE_KEY = "ndfk_guest_token";
const GUEST_NAME_STORAGE_KEY = "ndfk_guest_name";

export type GuestRatingVoteRow = {
  match_id: number;
  guest_token: string;
  guest_name: string | null;
  rated_player_id: number;
  stars: number;
};

/** Стабильный анонимный ID зрителя, привязанный к его браузеру. */
export function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY);
    if (existing && existing.length >= 16) return existing;

    const token = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, token);
    return token;
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — используем одноразовый ID на сессию
    return crypto.randomUUID().replace(/-/g, "");
  }
}

export function getSavedGuestName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GUEST_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveGuestName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, name.trim());
  } catch {
    // ignore — не критично
  }
}

export type GuestRatingAverage = {
  playerId: number;
  avgStars: number;
  voteCount: number;
};

/** Средняя оценка зрителей по игроку — считаем на лету, без отдельной summary-таблицы. */
export function aggregateGuestRatings(
  votes: GuestRatingVoteRow[]
): Record<number, GuestRatingAverage> {
  const byPlayer = new Map<number, number[]>();

  for (const vote of votes) {
    const score = normalizeVoteScore(vote.stars);
    if (score <= 0) continue;
    const list = byPlayer.get(vote.rated_player_id) ?? [];
    list.push(score);
    byPlayer.set(vote.rated_player_id, list);
  }

  const result: Record<number, GuestRatingAverage> = {};
  for (const [playerId, scores] of byPlayer.entries()) {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    result[playerId] = {
      playerId,
      avgStars: Math.round(avg * 10) / 10,
      voteCount: scores.length,
    };
  }
  return result;
}

export function buildGuestVotePath(matchId: number): string {
  return `/guest-vote/${matchId}`;
}

export function buildGuestVoteAbsoluteUrl(
  matchId: number,
  origin?: string | null
): string {
  const path = buildGuestVotePath(matchId);
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function buildGuestVoteUrl(matchId: number): string {
  if (typeof window !== "undefined") {
    return buildGuestVoteAbsoluteUrl(matchId, window.location.origin);
  }
  return buildGuestVotePath(matchId);
}

export function buildGuestVoteWhatsAppText(params: {
  matchLabel: string;
  voteUrl: string;
}): string {
  return [
    "🗣 Оцени игроков НДФК!",
    params.matchLabel,
    "Без регистрации, займёт минуту:",
    params.voteUrl,
  ].join("\n");
}

export function buildGuestVoteWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
