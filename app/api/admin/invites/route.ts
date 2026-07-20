import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_my_profile");
  const role = rows?.[0]?.role as string | undefined;

  if (role !== "admin") {
    return { supabase, error: NextResponse.json({ error: "not_admin" }, { status: 403 }) };
  }

  return { supabase, error: null as NextResponse | null };
}

export async function GET(request: Request) {
  const playerId = Number(new URL(request.url).searchParams.get("playerId"));

  if (!Number.isFinite(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "invalid_player_id" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { supabase } = auth;

  const { data: statusRows, error: statusError } = await supabase.rpc(
    "get_player_account_status",
    { p_player_id: playerId }
  );

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  const status = statusRows?.[0] as
    | { is_linked: boolean; has_active_invite: boolean }
    | undefined;

  if (status?.is_linked) {
    return NextResponse.json({ isLinked: true, token: null, expiresAt: null });
  }

  const { data: inviteRows, error: inviteError } = await supabase.rpc(
    "get_active_player_invite",
    { p_player_id: playerId }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  const invite = inviteRows?.[0] as
    | { token: string; expires_at: string | null }
    | undefined;

  return NextResponse.json({
    isLinked: false,
    token: invite?.token ?? null,
    expiresAt: invite?.expires_at ?? null,
  });
}

type InviteBody = {
  action?: string;
  playerId?: number;
};

export async function POST(request: Request) {
  let body: InviteBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const playerId = Number(body.playerId);
  const action = body.action;

  if (!Number.isFinite(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "invalid_player_id" }, { status: 400 });
  }

  if (action !== "create" && action !== "revoke") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { supabase } = auth;

  if (action === "create") {
    const { data, error } = await supabase.rpc("create_player_invite", {
      p_player_id: playerId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = data?.[0] as { token: string } | undefined;

    const { data: inviteRows } = await supabase.rpc("get_active_player_invite", {
      p_player_id: playerId,
    });

    const invite = inviteRows?.[0] as
      | { token: string; expires_at: string | null }
      | undefined;

    return NextResponse.json({
      token: invite?.token ?? row?.token ?? null,
      expiresAt: invite?.expires_at ?? null,
    });
  }

  const { error } = await supabase.rpc("revoke_player_invites", {
    p_player_id: playerId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
