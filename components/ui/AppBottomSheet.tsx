"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { useMobileOverlayLock } from "@/hooks/useMobileOverlay";

/** Above MobileBottomNav (z-80) and all in-app UI */
export const APP_BOTTOM_SHEET_Z = 300;

type AppBottomSheetProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  /** Sticky footer — always visible, below scrollable body */
  footer?: ReactNode;
  /** Sheet header title row */
  title?: ReactNode;
  showCloseButton?: boolean;
  /** Backdrop / swipe / Escape close. Default true when onClose is set. */
  dismissible?: boolean;
  showHandle?: boolean;
  /**
   * Children are a flex column that manages its own scroll
   * (header + scroll body + sticky footer inside).
   */
  flush?: boolean;
  /**
   * `sheet` — solid panel chrome.
   * `plain` — only overlay + safe-area shell (child brings its own card).
   */
  variant?: "sheet" | "plain";
  panelClassName?: string;
  zClassName?: string;
  /** Desktop: center card instead of bottom sheet */
  centerOnDesktop?: boolean;
  /** Hide on md+ (use when desktop has its own dropdown/panel) */
  mobileOnly?: boolean;
};

const SWIPE_CLOSE_PX = 72;
/** Swipe-to-dismiss only starts from the top strip (avoids fighting scroll). */
const SWIPE_ZONE_PX = 56;

/**
 * Bottom sheet / modal portal above Bottom Navigation.
 * Safe-area padding keeps actions visible on iPhone / Android.
 */
export default function AppBottomSheet({
  open,
  onClose,
  children,
  footer,
  title,
  showCloseButton = false,
  dismissible,
  showHandle = true,
  flush = false,
  variant = "sheet",
  panelClassName = "",
  zClassName = "z-[300]",
  centerOnDesktop = true,
  mobileOnly = false,
}: AppBottomSheetProps) {
  const [ready, setReady] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const dragYRef = useRef(0);
  const activeDragRef = useRef(false);

  const canDismiss = dismissible ?? Boolean(onClose);
  const isPlain = variant === "plain";

  useMobileOverlayLock(open);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
      dragYRef.current = 0;
      activeDragRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !canDismiss) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, canDismiss, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !ready) return null;

  const onTouchStart = (event: TouchEvent) => {
    if (!canDismiss) return;
    const touch = event.touches[0];
    const panel = panelRef.current;
    if (!touch || !panel) return;
    const top = panel.getBoundingClientRect().top;
    if (touch.clientY - top > SWIPE_ZONE_PX) return;
    startYRef.current = touch.clientY;
    activeDragRef.current = true;
    setDragging(true);
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!canDismiss || !activeDragRef.current) return;
    const y = event.touches[0]?.clientY ?? 0;
    const delta = Math.max(0, y - startYRef.current);
    dragYRef.current = delta;
    setDragY(delta);
  };

  const onTouchEnd = () => {
    if (!canDismiss || !activeDragRef.current) return;
    activeDragRef.current = false;
    setDragging(false);
    if (dragYRef.current >= SWIPE_CLOSE_PX) {
      onClose?.();
    } else {
      setDragY(0);
      dragYRef.current = 0;
    }
  };

  const panelStyle: CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: dragging
      ? "none"
      : "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
  };

  const hasChrome =
    !isPlain && (Boolean(title) || showCloseButton || showHandle);

  return createPortal(
    <div
      className={`fixed inset-0 ${zClassName} flex items-end justify-center px-0 ${
        centerOnDesktop && !mobileOnly ? "sm:items-center sm:px-4" : ""
      } ${isPlain ? "px-3" : ""} ${mobileOnly ? "md:hidden" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          if (canDismiss) onClose?.();
        }}
      />

      <div
        ref={panelRef}
        className={`app-bottom-sheet relative z-10 flex w-full max-w-lg flex-col overflow-hidden ${
          isPlain
            ? "border-0 bg-transparent shadow-none"
            : "rounded-t-[22px] border border-white/12 bg-[#0b1224] shadow-[0_-16px_64px_rgba(0,0,0,0.55)]"
        } ${
          centerOnDesktop && !isPlain
            ? "sm:max-h-[min(88dvh,720px)] sm:rounded-[22px]"
            : ""
        } max-h-[min(92dvh,920px)] ${panelClassName}`}
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {hasChrome ? (
          <div className="shrink-0 border-b border-white/10 px-3 pb-2 pt-1.5">
            {showHandle ? (
              <div
                className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-white/25 sm:hidden"
                aria-hidden
              />
            ) : null}
            {(title || showCloseButton) && (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 pt-0.5">{title}</div>
                {showCloseButton && canDismiss ? (
                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base font-bold text-white transition hover:bg-white/20 active:scale-95"
                    aria-label="Закрыть"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : !isPlain && showHandle ? (
          <div className="shrink-0 px-3 pt-2 sm:hidden" aria-hidden>
            <div className="mx-auto h-1 w-10 rounded-full bg-white/25" />
          </div>
        ) : null}

        <div
          className={
            flush || isPlain
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
          }
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-white/10 bg-[#0b1224] px-3 pt-2.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
