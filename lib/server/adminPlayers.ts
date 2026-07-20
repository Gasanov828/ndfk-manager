import { createClient } from "@/lib/supabase/server";

export type AdminPlayer = {
  id: number;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  status: string;
  lineup_position: string | null;
  photo_url?: string | null;
};

export type PlayerAccountStatus = {
  is_linked: boolean;
  has_active_invite: boolean;
};

export type PlayerInviteInfo = {
  token: string;
  expires_at: string | null;
};

export type AdminPlayersPageData = {
  players: AdminPlayer[];
  accountStatus: Record<number, PlayerAccountStatus>;
  invites: Record<number, PlayerInviteInfo>;
  loadError: string | null;
};

const PLAYER_COLUMNS =
  "id, name, position, rating, goals, assists, status, lineup_position, photo_url";

export async function getAdminPlayersPageData(): Promise<AdminPlayersPageData> {
  const supabase = await createClient();

  const [playersResult, statusResult, invitesResult] = await Promise.all([
    supabase.from("players").select(PLAYER_COLUMNS).order("rating", { ascending: false }),
    supabase.rpc("list_players_account_status"),
    supabase
      .from("player_invites")
      .select("player_id, token, expires_at, created_at")
      .is("used_at", null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false }),
  ]);

  const loadError =
    playersResult.error?.message ??
    statusResult.error?.message ??
    invitesResult.error?.message ??
    null;

  const accountStatus: Record<number, PlayerAccountStatus> = {};
  for (const row of (statusResult.data ?? []) as {
    player_id: number;
    is_linked: boolean;
    has_active_invite: boolean;
  }[]) {
    accountStatus[row.player_id] = {
      is_linked: row.is_linked,
      has_active_invite: row.has_active_invite,
    };
  }

  const invites: Record<number, PlayerInviteInfo> = {};
  for (const row of invitesResult.data ?? []) {
    if (!invites[row.player_id]) {
      invites[row.player_id] = {
        token: row.token,
        expires_at: row.expires_at,
      };
    }
  }

  return {
    players: (playersResult.data ?? []) as AdminPlayer[],
    accountStatus,
    invites,
    loadError,
  };
}
