"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Renders the server-built home header only on `/` (mobile). */
export default function HomeMobileHeaderGate({
  header,
}: {
  header: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return header;
}
