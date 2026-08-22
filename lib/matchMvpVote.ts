import type { Match } from "@/lib/matches";

export type MatchVotingStatus = "open" | "closed";

export type MatchVotingSession = {
  id: number;
  match_id: number;
  status: MatchVotingStatus;
  opened_at: string;
  closed_at: string | null;
};

export type MatchVoteRow = {
  id: number;
  match_id: number;
  voter_player_id: number;
  voted_player_id: number;
  created_at: string;
};

export type MatchMvpCandidate = {
  playerId: number;
  name: string;
  position: string;
  rating: number;
  photoUrl: string | null;
  goals: number;
  assists: number;
};

export type MatchMvpVoteResult = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  votes: number;
  percent: number;
  place: number;
};

export type MatchMvpVoteMatchInfo = {
  id: number;
  opponent: string;
  date: string;
  ndfkGoals: number;
  opponentGoals: number;
  ratingVotingEndsAt: string | null;
};

export function buildMatchVotePath(matchId: number): string {
  return `/vote/${matchId}`;
}

export function buildMatchVoteAbsoluteUrl(
  matchId: number,
  origin?: string | null
): string {
  const path = buildMatchVotePath(matchId);
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function buildMatchVoteWhatsAppText(params: {
  matchLabel: string;
  voteUrl: string;
  reminder?: boolean;
}): string {
  if (params.reminder) {
    return [
      "🏆 Напоминание: голосование за MVP матча ещё открыто!",
      params.matchLabel,
      "",
      "Проголосуй здесь:",
      params.voteUrl,
    ].join("\n");
  }

  return [
    "🏆 Оценка после матча — выбери MVP!",
    params.matchLabel,
    "",
    "Ссылка для голосования:",
    params.voteUrl,
  ].join("\n");
}

export function buildMatchVoteWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatMatchVoteScoreline(
  match: Pick<MatchMvpVoteMatchInfo, "ndfkGoals" | "opponentGoals" | "opponent">
): string {
  return `НДФК ${match.ndfkGoals}:${match.opponentGoals} ${match.opponent}`;
}

export function isMatchVotingDeadlinePassed(
  endsAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!endsAt) return false;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return false;
  return now.getTime() >= end.getTime();
}

export function resolveEffectiveVotingStatus(params: {
  sessionStatus: MatchVotingStatus;
  ratingVotingEndsAt?: string | null;
  now?: Date;
}): MatchVotingStatus {
  if (params.sessionStatus === "closed") return "closed";
  if (isMatchVotingDeadlinePassed(params.ratingVotingEndsAt, params.now)) {
    return "closed";
  }
  return "open";
}

export function aggregateMatchMvpResults(
  votes: Array<{ voted_player_id: number }>,
  candidates: Array<Pick<MatchMvpCandidate, "playerId" | "name" | "photoUrl">>
): MatchMvpVoteResult[] {
  const counts = new Map<number, number>();
  for (const vote of votes) {
    counts.set(
      vote.voted_player_id,
      (counts.get(vote.voted_player_id) ?? 0) + 1
    );
  }

  const total = votes.length;
  const byId = new Map(candidates.map((c) => [c.playerId, c]));

  const rows = [...counts.entries()]
    .map(([playerId, voteCount]) => {
      const candidate = byId.get(playerId);
      return {
        playerId,
        name: candidate?.name ?? `Игрок #${playerId}`,
        photoUrl: candidate?.photoUrl ?? null,
        votes: voteCount,
        percent: total > 0 ? Math.round((voteCount / total) * 100) : 0,
        place: 0,
      };
    })
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name, "ru");
    });

  rows.forEach((row, index) => {
    row.place = index + 1;
  });

  return rows;
}

export function toMatchMvpVoteMatchInfo(match: Match): MatchMvpVoteMatchInfo {
  return {
    id: match.id,
    opponent: match.opponent,
    date: match.date,
    ndfkGoals: Number(match.ndfk_goals ?? 0),
    opponentGoals: Number(match.opponent_goals ?? 0),
    ratingVotingEndsAt: match.rating_voting_ends_at ?? null,
  };
}
