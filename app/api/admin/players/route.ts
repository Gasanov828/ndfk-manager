import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPlayerWithAttributes } from "@/lib/championship/squad";
import {
  CREATE_POSITION_OPTIONS,
  areCreateAttrsComplete,
  computeCreateOverall,
  type AddPlayerAttributesPayload,
} from "@/lib/playerCreateRating";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_my_profile");
  const role = rows?.[0]?.role as string | undefined;

  if (role !== "admin") {
    return {
      supabase,
      error: NextResponse.json({ error: "Только админ" }, { status: 403 }),
    };
  }

  return { supabase, error: null as NextResponse | null };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = (await request.json()) as Partial<AddPlayerAttributesPayload> & {
    enrollChampionship?: {
      championshipId?: number;
      teamId?: number;
    } | null;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const position = body.position;
  const attrs = body.attrs;

  const validPosition = CREATE_POSITION_OPTIONS.some(
    (option) => option.group === position
  );

  if (!name || !position || !validPosition || !attrs || typeof attrs !== "object") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  if (!areCreateAttrsComplete(attrs, position)) {
    return NextResponse.json(
      { error: "Заполните все характеристики (1–10)" },
      { status: 400 }
    );
  }

  const rating = computeCreateOverall(attrs, position);
  const db = createAdminClient() ?? auth.supabase;

  try {
    const { id } = await createPlayerWithAttributes(db, {
      name,
      position,
      rating,
      attrs,
    });

    const enroll = body.enrollChampionship;
    if (
      enroll?.championshipId &&
      enroll?.teamId &&
      Number.isFinite(enroll.championshipId) &&
      Number.isFinite(enroll.teamId)
    ) {
      const { enrollChampionshipPlayer } = await import(
        "@/lib/championship/squad"
      );
      await enrollChampionshipPlayer(db, {
        championshipId: Number(enroll.championshipId),
        teamId: Number(enroll.teamId),
        playerId: id,
      });
    }

    return NextResponse.json({ ok: true, id, rating });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось добавить игрока",
      },
      { status: 500 }
    );
  }
}
