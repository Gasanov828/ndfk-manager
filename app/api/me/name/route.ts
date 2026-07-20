import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function formatNameError(message: string): string {
  if (message.includes("name_too_short")) {
    return "Имя слишком короткое (минимум 2 символа).";
  }
  if (message.includes("name_too_long")) {
    return "Имя слишком длинное (максимум 40 символов).";
  }
  if (message.includes("forbidden_fields") || message.includes("name_self_only")) {
    return "Можно изменить только своё имя.";
  }
  return message;
}

export async function POST(request: Request) {
  let body: { name?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json(
      { error: "Имя должно быть от 2 до 40 символов." },
      { status: 400 }
    );
  }

  const { user, profile } = await getAuthSession();

  if (!user || !profile?.player_id || profile.role === "admin") {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ name })
    .eq("id", profile.player_id);

  if (error) {
    return NextResponse.json(
      { error: formatNameError(error.message) },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, name });
}
