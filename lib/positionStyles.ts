export type PositionGroup = "НАП" | "ЦП" | "ЗАЩ" | "ВРТ";

function normalizeFromLineupSlot(lineupPosition: string): PositionGroup | null {
  const upper = lineupPosition.trim().toUpperCase();

  if (upper.startsWith("НАП")) return "НАП";
  if (upper.startsWith("ЦП")) return "ЦП";
  if (upper.startsWith("ЗАЩ") || upper.startsWith("ЗЩ")) return "ЗАЩ";
  if (upper.startsWith("ВРТ") || upper.startsWith("ВР")) return "ВРТ";

  return null;
}

function normalizeFromPositionText(position: string): PositionGroup | null {
  const raw = position.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase().replace(/\s+/g, "");

  if (upper.startsWith("НАП") || upper === "НАП") return "НАП";
  if (upper.startsWith("ЦП") || upper === "ЦП") return "ЦП";
  if (upper.startsWith("ЗАЩ") || upper.startsWith("ЗЩ") || upper === "ЗЩ") return "ЗАЩ";
  if (upper.startsWith("ВРТ") || upper.startsWith("ВР") || upper === "GK") return "ВРТ";

  const lower = raw.toLowerCase().replace(/ё/g, "е");

  if (
    /(^|\s)(н\/?а\/?п|напада|форвард|forward|fw|striker|st|cf)(\s|$)/.test(lower) ||
    lower.includes("напада")
  ) {
    return "НАП";
  }

  if (
    /(^|\s)(ц\/?п|полуза|midfield|midfielder|cm|dm|am|cdm|cam)(\s|$)/.test(lower) ||
    lower.includes("полузащ")
  ) {
    return "ЦП";
  }

  if (
    /(^|\s)(з\/?а\/?щ|зщ|защит|defender|defence|defense|cb|lb|rb|back|стоппер)(\s|$)/.test(
      lower
    ) ||
    lower.includes("защ")
  ) {
    return "ЗАЩ";
  }

  if (
    /(^|\s)(в\/?р\/?т|вратар|goalkeeper|keeper|голкипер|gk)(\s|$)/.test(lower) ||
    lower.includes("врат")
  ) {
    return "ВРТ";
  }

  return null;
}

export function getPositionGroup(
  lineupPosition: string | null,
  position: string
): PositionGroup {
  if (lineupPosition) {
    const fromLineup = normalizeFromLineupSlot(lineupPosition);
    if (fromLineup) return fromLineup;
  }

  const fromPosition = normalizeFromPositionText(position);
  if (fromPosition) return fromPosition;

  return "ЦП";
}

export function getPositionBadgeLabel(
  lineupPosition: string | null,
  position: string
): PositionGroup {
  return getPositionGroup(lineupPosition, position);
}

export const POSITION_STYLES: Record<
  PositionGroup,
  {
    badge: string;
    card: string;
    glow: string;
    text: string;
    fieldBadge: string;
    fieldCard: string;
  }
> = {
  НАП: {
    badge: "bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.5)]",
    card: "bg-gradient-to-b from-red-500/90 to-red-700/90 border-red-400/30",
    glow: "shadow-[0_0_28px_rgba(239,68,68,0.55)]",
    text: "text-red-100",
    fieldBadge: "bg-red-950/90 text-red-300 ring-1 ring-red-500/35",
    fieldCard:
      "bg-slate-950/88 border-red-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.45)]",
  },
  ЦП: {
    badge: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_12px_rgba(59,130,246,0.5)]",
    card: "bg-gradient-to-b from-blue-500/90 to-blue-800/90 border-blue-400/30",
    glow: "shadow-[0_0_28px_rgba(59,130,246,0.55)]",
    text: "text-blue-100",
    fieldBadge: "bg-blue-950/90 text-blue-300 ring-1 ring-blue-500/35",
    fieldCard:
      "bg-slate-950/88 border-blue-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.45)]",
  },
  ЗАЩ: {
    badge: "bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_12px_rgba(245,158,11,0.5)]",
    card: "bg-gradient-to-b from-amber-500/90 to-orange-700/90 border-amber-400/30",
    glow: "shadow-[0_0_28px_rgba(245,158,11,0.55)]",
    text: "text-amber-100",
    fieldBadge: "bg-amber-950/90 text-amber-300 ring-1 ring-amber-500/35",
    fieldCard:
      "bg-slate-950/88 border-amber-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.45)]",
  },
  ВРТ: {
    badge: "bg-gradient-to-br from-violet-600 to-indigo-900 shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    card: "bg-gradient-to-b from-indigo-900/95 to-violet-950/95 border-violet-400/30",
    glow: "shadow-[0_0_28px_rgba(139,92,246,0.55)]",
    text: "text-violet-100",
    fieldBadge: "bg-violet-950/90 text-violet-300 ring-1 ring-violet-500/35",
    fieldCard:
      "bg-slate-950/88 border-violet-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.45)]",
  },
};

export function getPositionStyle(group: PositionGroup | string) {
  if (group in POSITION_STYLES) {
    return POSITION_STYLES[group as PositionGroup];
  }

  return {
    badge: "bg-gradient-to-br from-slate-500 to-slate-700",
    card: "bg-gradient-to-b from-slate-600/90 to-slate-800/90 border-slate-400/30",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]",
    text: "text-slate-100",
    fieldBadge: "bg-slate-900 text-slate-300 ring-1 ring-slate-500/35",
    fieldCard:
      "bg-slate-950/88 border-slate-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.45)]",
  };
}
