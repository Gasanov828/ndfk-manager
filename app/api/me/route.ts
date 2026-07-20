import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, profile } = await getAuthSession();

  if (!user) {
    return NextResponse.json({ user: null, profile: null });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email ?? null },
    profile,
  });
}
