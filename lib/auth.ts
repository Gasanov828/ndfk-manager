import { createClient } from "@/lib/supabase/server";

import type { User } from "@supabase/supabase-js";



export type UserProfile = {

  id: string;

  player_id: number | null;

  role: "admin" | "player";

  player_name?: string | null;

  username?: string | null;

};



type ProfileRow = {

  id: string;

  player_id: number | null;

  role: string;

  player_name: string | null;

  username?: string | null;

};



function mapProfile(row: ProfileRow): UserProfile {

  return {

    id: row.id,

    player_id: row.player_id,

    role: row.role as "admin" | "player",

    player_name: row.player_name,

    username: row.username ?? null,

  };

}



async function fetchProfileForUser(

  supabase: Awaited<ReturnType<typeof createClient>>,

  userId: string

): Promise<UserProfile | null> {

  const { data: rpcRows, error: rpcError } = await supabase.rpc("get_my_profile");



  if (!rpcError && rpcRows?.[0]) {

    return mapProfile(rpcRows[0] as ProfileRow);

  }



  const { data: profile, error } = await supabase

    .from("profiles")

    .select("id, player_id, role, username")

    .eq("id", userId)

    .maybeSingle();



  if (error || !profile) return null;



  let playerName: string | null = null;

  if (profile.player_id) {

    const { data: player } = await supabase

      .from("players")

      .select("name")

      .eq("id", profile.player_id)

      .maybeSingle();

    playerName = player?.name ?? null;

  }



  return {

    id: profile.id,

    player_id: profile.player_id,

    role: profile.role as "admin" | "player",

    player_name: playerName,

    username: profile.username ?? null,

  };

}



export async function getAuthSession(): Promise<{

  user: User | null;

  profile: UserProfile | null;

}> {

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return { user: null, profile: null };

  }



  const profile = await fetchProfileForUser(supabase, user.id);

  return { user, profile };

}



export async function getSessionUser() {

  const { user } = await getAuthSession();

  return user;

}



export async function getUserProfile(): Promise<UserProfile | null> {

  const { profile } = await getAuthSession();

  return profile;

}



export async function ensureUserProfile(): Promise<UserProfile | null> {

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) return null;



  const { data: rows, error } = await supabase.rpc("ensure_my_profile");



  if (error || !rows?.[0]) {

    return getUserProfile();

  }



  return mapProfile(rows[0] as ProfileRow);

}



export async function isAdmin(): Promise<boolean> {

  const profile = await getUserProfile();

  return profile?.role === "admin";

}



export async function isPlayer(): Promise<boolean> {

  const profile = await getUserProfile();

  return profile?.role === "player" && profile.player_id != null;

}


