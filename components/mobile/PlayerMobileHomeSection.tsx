"use client";

import MobileHomeDashboard, {
  type MobileHomeDashboardProps,
} from "@/components/mobile/MobileHomeDashboard";

export type { MobileHomeDashboardProps };

export default function PlayerMobileHomeSection(props: MobileHomeDashboardProps) {
  return <MobileHomeDashboard {...props} />;
}
