import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseGlobalOptions } from "./fetch";

export function getPublicSupabaseEnv(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function createPublicSupabaseClient(): SupabaseClient | null {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  return createClient(env.url, env.anonKey, supabaseGlobalOptions);
}
