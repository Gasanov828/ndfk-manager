"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import ClubLogo from "@/components/ClubLogo";
import PlayerOvrPanel from "@/components/PlayerOvrPanel";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { formatVoteScore } from "@/lib/matchRatings";
import {
  getFirstName,
  type PlayerWelcomeData,
} from "@/lib/playerStats";

const GROUP_LABELS: Record<string, string> = {
  НАП: "Нападающий",
  ЦП: "Полузащитник",
  ЗАЩ: "Защитник",
  ВРТ: "Вратарь",
};

function ClubWelcomeMark() {
  return (
    <Link href="/" className="player-header-card flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
      <ClubLogo size="lg" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[12px] font-medium text-[#9AA6C8]">
          Добро пожаловать
        </p>
        <p className="mt-0.5 truncate text-[15px] font-extrabold tracking-tight text-[#FFFFFF]">
          <span className="mr-1 font-bold text-[#9AA6C8]">ФК</span>
          Нижний Дженгутай
        </p>
      </div>
    </Link>
  );
}

function GlassChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "warm";
}) {
  const toneClass =
    tone === "good"
      ? "player-header-chip--good"
      : tone === "warm"
        ? "player-header-chip--warm"
        : "";

  return (
    <span className={`player-header-chip ${toneClass}`}>{children}</span>
  );
}

function MetaRow({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="mt-0.5 text-[11px] text-[#77719A]" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-semibold leading-tight text-[#FFFFFF]">
          {title}
        </p>
        <p className="truncate text-[9px] leading-tight text-[#9AA6C8]">{value}</p>
      </div>
    </div>
  );
}

function getFormChip(status: string): { label: string; tone: "good" | "warm" | "default" } {
  if (status === "ready") return { label: "Форма: Хорошая", tone: "good" };
  if (status === "maybe") return { label: "Форма: Средняя", tone: "warm" };
  if (status === "absent") return { label: "Форма: Слабая", tone: "default" };
  return { label: "Форма: —", tone: "default" };
}

export default function NavbarWelcome() {
  const { user, profile, loading } = useAuthProfile();
  const [welcome, setWelcome] = useState<PlayerWelcomeData | null>(null);

  const canLoadPlayer =
    !!user && !!profile?.player_id && profile.role !== "admin";

  useEffect(() => {
    if (loading || !canLoadPlayer) {
      setWelcome(null);
      return;
    }

    let cancelled = false;

    fetch("/api/me/welcome", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { welcome: PlayerWelcomeData | null }) => {
        if (!cancelled) setWelcome(data.welcome);
      })
      .catch(() => {
        if (!cancelled) setWelcome(null);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, canLoadPlayer, user, profile]);

  const name = welcome?.name ?? profile?.player_name ?? null;
  const firstName = name ? getFirstName(name) : null;

  if (canLoadPlayer && (welcome || firstName)) {
    const groupLabel = welcome
      ? GROUP_LABELS[welcome.positionGroup] ?? welcome.position
      : "Игрок";
    const slot = welcome?.lineupLabel;
    const positionLine = slot
      ? `${groupLabel} · ${slot}`
      : groupLabel;

    if (!welcome) {
      return (
        <Link href="/me" className="player-header-card flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
          <ClubLogo size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-extrabold text-white">
              {firstName}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9AA6C8]">{positionLine}</p>
          </div>
        </Link>
      );
    }

    const form = getFormChip(welcome.status);
    const voteChip =
      welcome.matchVoteScore != null
        ? `Оценка: ${formatVoteScore(welcome.matchVoteScore)}`
        : null;

    return (
      <Link href="/me" className="player-header-card block min-w-0 flex-1 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <ClubLogo size="md" className="sm:hidden" />
          <ClubLogo size="lg" className="hidden sm:block" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-extrabold leading-none tracking-tight text-[#FFFFFF] sm:text-[20px]">
              {firstName}
            </p>
            <p className="mt-1 truncate text-[11px] font-medium text-[#9AA6C8]">
              {positionLine}
            </p>

            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
              <GlassChip tone={form.tone}>{form.label}</GlassChip>
              {voteChip ? (
                <GlassChip>{voteChip}</GlassChip>
              ) : (
                <GlassChip>
                  ⚽ {welcome.goals} · ◆ {welcome.assists}
                </GlassChip>
              )}
            </div>
          </div>

          <PlayerOvrPanel
            rating={welcome.rating}
            delta={welcome.ratingDelta}
            size="compact"
          />

          <div className="hidden min-w-[5.5rem] shrink-0 flex-col gap-1.5 border-l border-white/[0.06] pl-2.5 sm:flex">
            <MetaRow
              icon="★"
              title={`${welcome.rank} место из ${welcome.totalPlayers}`}
              value="в команде"
            />
            <div className="h-px bg-white/[0.06]" />
            <MetaRow icon="⚽" title="Голы" value={String(welcome.goals)} />
            <div className="h-px bg-white/[0.06]" />
            <MetaRow icon="◆" title="Пасы" value={String(welcome.assists)} />
          </div>
        </div>
      </Link>
    );
  }

  return <ClubWelcomeMark />;
}
