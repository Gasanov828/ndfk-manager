"use client";

import type { ReactNode } from "react";

type ChampionshipPitchSurfaceProps = {
  formationPicker?: ReactNode;
  children: ReactNode;
};

export default function ChampionshipPitchSurface({
  formationPicker,
  children,
}: ChampionshipPitchSurfaceProps) {
  return (
    <div className="champ-pitch-viewport">
      {formationPicker}

      <div className="champ-pitch-floor" aria-hidden>
        <div className="champ-pitch-floor__grass" />
        <div className="champ-pitch-floor__stripe champ-pitch-floor__stripe--a" />
        <div className="champ-pitch-floor__stripe champ-pitch-floor__stripe--b" />
        <div className="champ-pitch-floor__line champ-pitch-floor__line--touch-top" />
        <div className="champ-pitch-floor__line champ-pitch-floor__line--touch-bottom" />
        <div className="champ-pitch-floor__line champ-pitch-floor__line--half" />
        <div className="champ-pitch-floor__circle" />
        <div className="champ-pitch-floor__box champ-pitch-floor__box--top" />
        <div className="champ-pitch-floor__box champ-pitch-floor__box--bottom" />
      </div>

      <div className="champ-pitch-formation lineup-pitch__formation">{children}</div>
    </div>
  );
}
