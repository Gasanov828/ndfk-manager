"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/matches#history");
  }, [router]);

  return (
    <main className="flex min-h-[40vh] items-center justify-center p-8">
      <p className="text-sm text-slate-400">Переход к матчам…</p>
    </main>
  );
}
