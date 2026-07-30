"use client";

import type { ReactNode } from "react";
import AppBottomSheet from "@/components/ui/AppBottomSheet";

type LiveBottomSheetProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  /** Выше bottom nav и остального UI */
  zClassName?: string;
};

/**
 * LIVE bottom sheet — поверх всего приложения, включая MobileBottomNav.
 */
export default function LiveBottomSheet({
  open,
  onClose,
  children,
  zClassName = "z-[300]",
}: LiveBottomSheetProps) {
  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      variant="plain"
      showHandle={Boolean(onClose)}
      zClassName={zClassName}
      panelClassName="max-w-md"
    >
      {children}
    </AppBottomSheet>
  );
}
