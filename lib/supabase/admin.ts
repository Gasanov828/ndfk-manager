import { createClient } from "@supabase/supabase-js";
import { supabaseGlobalOptions } from "./fetch";

function isValidServiceRoleKey(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.startsWith("eyJ") || trimmed.startsWith("sb_secret_");
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey || !isValidServiceRoleKey(serviceRoleKey)) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    ...supabaseGlobalOptions,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
