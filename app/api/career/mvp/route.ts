import { getConfirmedMvpRecords } from "@/lib/server/careerMvp";
import { NextResponse } from "next/server";

export async function GET() {
  const records = await getConfirmedMvpRecords();
  return NextResponse.json({ records });
}
