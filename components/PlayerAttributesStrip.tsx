import {
  formatFifaStat,
  getAttributesForPosition,
} from "@/lib/ratingEpisode";

type PlayerAttributesStripProps = {
  position: string;
  attrs: Record<string, number> | null | undefined;
  variant?: "full" | "compact";
  className?: string;
};

export default function PlayerAttributesStrip({
  position,
  attrs,
  variant = "full",
  className = "",
}: PlayerAttributesStripProps) {
  if (!attrs || Object.keys(attrs).length === 0) return null;

  const attributes = getAttributesForPosition(position).filter(
    (attribute) => (attrs[attribute.key] ?? 0) > 0
  );

  if (attributes.length === 0) return null;

  if (variant === "compact") {
    return (
      <div
        className={`flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-400 ${className}`}
      >
        {attributes.map((attribute) => (
          <span key={attribute.key} className="whitespace-nowrap">
            {attribute.emoji}{" "}
            <strong className="text-slate-200">
              {formatFifaStat(attrs[attribute.key] ?? 0)}
            </strong>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-x-2 gap-y-1 border-t border-white/5 pt-3 text-[11px] text-slate-400 ${className}`}
    >
      {attributes.map((attribute) => (
        <span key={attribute.key}>
          {attribute.emoji} {attribute.label}:{" "}
          <strong className="text-slate-200">
            {formatFifaStat(attrs[attribute.key] ?? 0)}
          </strong>
        </span>
      ))}
    </div>
  );
}
