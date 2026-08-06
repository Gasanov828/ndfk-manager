"use client";

import { useAuthProfile } from "@/hooks/useAuthProfile";

export function useMyPlayerId() {
  const { user, profile, loading, isAdmin } = useAuthProfile();

  const playerId = profile?.player_id ?? null;
  const playerName = profile?.player_name ?? null;
  const canVote = Boolean(user && playerId && !isAdmin);

  return {
    playerId,
    playerName,
    canVote,
    isGuest: !user,
    isAdmin,
    loading,
  };
}
