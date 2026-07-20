"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileOverlayContextValue = {
  overlayCount: number;
  registerOverlay: () => () => void;
  hasOverlay: boolean;
};

const MobileOverlayContext = createContext<MobileOverlayContextValue | null>(null);

export function MobileOverlayProvider({ children }: { children: ReactNode }) {
  const [overlayCount, setOverlayCount] = useState(0);

  const registerOverlay = useCallback(() => {
    setOverlayCount((count) => count + 1);
    return () => setOverlayCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({
      overlayCount,
      registerOverlay,
      hasOverlay: overlayCount > 0,
    }),
    [overlayCount, registerOverlay]
  );

  return (
    <MobileOverlayContext.Provider value={value}>
      {children}
    </MobileOverlayContext.Provider>
  );
}

export function useMobileOverlay() {
  const context = useContext(MobileOverlayContext);
  if (!context) {
    throw new Error("useMobileOverlay must be used within MobileOverlayProvider");
  }
  return context;
}

export function useMobileOverlayLock(active: boolean) {
  const { registerOverlay } = useMobileOverlay();

  useEffect(() => {
    if (!active) return;
    return registerOverlay();
  }, [active, registerOverlay]);
}
