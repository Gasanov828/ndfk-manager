"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS, isAdminNavActive } from "@/lib/adminNav";

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-2 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1"
      aria-label={"\u0410\u0434\u043c\u0438\u043d\u043a\u0430"}
    >
      {ADMIN_NAV_ITEMS.map(({ href, label, icon }) => {
        const isActive = isAdminNavActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
              isActive
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="mr-1" aria-hidden>
              {icon}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
