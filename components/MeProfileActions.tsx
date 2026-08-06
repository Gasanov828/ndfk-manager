"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutViaApi } from "@/lib/playerAuth";

function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logoutViaApi();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleLogout}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
    >
      {loading ? "..." : "Выйти"}
    </button>
  );
}

export default function MeProfileActions() {
  return (
    <div className="space-y-1.5">
      <Link
        href="/lineup"
        className="btn-neon-primary flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold text-slate-50"
      >
        <span aria-hidden>📋</span>
        Мой состав
      </Link>
      <Link
        href="/career"
        className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-[13px] font-semibold text-amber-100 transition hover:bg-amber-500/15"
      >
        <span aria-hidden>🏆</span>
        Карьера и достижения
        <span className="ml-auto text-amber-200/50">›</span>
      </Link>
      <LogoutButton />
    </div>
  );
}
