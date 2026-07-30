import type { CommonAchievement } from "@/lib/careerMock";

export type CareerMvpRecord = {
  matchId: number;
  playerId: number;
  playerName: string;
  opponent: string;
  matchDate: string;
  matchRating: number;
};

export function withRealMvpAchievement(
  achievements: CommonAchievement[],
  playerId: number | null | undefined,
  records: CareerMvpRecord[]
): CommonAchievement[] {
  const myWins = playerId
    ? records.filter((row) => row.playerId === playerId)
    : [];
  const myCount = myWins.length;

  return achievements.map((item) => {
    if (item.id !== "common-mvp-match") return item;

    return {
      ...item,
      current: myCount,
      target: Math.max(1, myCount),
      status: myCount > 0 ? "earned" : "progress",
      description:
        myCount > 0
          ? `Ты стал MVP матча · ${myCount}×`
          : "Стать лучшим игроком матча по итогам голосования",
    };
  });
}
