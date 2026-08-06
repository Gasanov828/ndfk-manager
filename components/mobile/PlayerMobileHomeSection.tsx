"use client";

import dynamic from "next/dynamic";
import type { MobileHomeDashboardProps } from "@/components/mobile/MobileHomeDashboard";

const MobileHomeDashboard = dynamic(
  () => import("@/components/mobile/MobileHomeDashboard"),
  {
    ssr: false,
    loading: () => (
      <section className="md:hidden mb-3 animate-pulse rounded-2xl bg-white/5 p-4">
        <div className="h-24 rounded-xl bg-white/5" />
      </section>
    ),
  }
);

export default function PlayerMobileHomeSection(props: MobileHomeDashboardProps) {
  return <MobileHomeDashboard {...props} />;
}
