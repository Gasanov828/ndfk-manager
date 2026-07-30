import LiveMatchConsole from "@/components/live/LiveMatchConsole";

export const dynamic = "force-dynamic";

export default function LiveMatchPage() {
  return (
    <main className="-mt-1 sm:-mt-2">
      <LiveMatchConsole />
    </main>
  );
}
