import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/auth";
import {
  removePlayerPhotoForPlayer,
  uploadPlayerPhotoForPlayer,
} from "@/lib/server/playerPhoto";

export async function POST(request: Request) {
  const { user, profile } = await getAuthSession();

  if (!user || !profile?.player_id || profile.role === "admin") {
    return NextResponse.json({ error: "Недоступно" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Выберите фото" }, { status: 400 });
  }

  try {
    const photoUrl = await uploadPlayerPhotoForPlayer(profile.player_id, file);
    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath("/players");
    return NextResponse.json({ ok: true, photoUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка загрузки" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const { user, profile } = await getAuthSession();

  if (!user || !profile?.player_id || profile.role === "admin") {
    return NextResponse.json({ error: "Недоступно" }, { status: 403 });
  }

  try {
    await removePlayerPhotoForPlayer(profile.player_id);
    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath("/players");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка" },
      { status: 400 }
    );
  }
}
