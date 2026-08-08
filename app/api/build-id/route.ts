import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      buildId:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.VERCEL_DEPLOYMENT_ID ??
        "local",
      deployedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
