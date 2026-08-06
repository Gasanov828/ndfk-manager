import LiveMatchConsole from "@/components/live/LiveMatchConsole";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LiveMatchPage() {
  const { profile } = await getAuthSession();

  if (profile?.role !== "admin") {
    redirect("/");
  }
  return (
    <main className="-mt-1 sm:-mt-2">
      <LiveMatchConsole />
    </main>
  );
}
