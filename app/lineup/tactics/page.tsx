import LineupTacticsView from "@/components/lineup/LineupTacticsView";
import { getUserProfile } from "@/lib/auth";
import { getUpcomingMatch } from "@/lib/matches";
import { getTeamPageData } from "@/lib/server/teamData";
import {
  mapClubFieldPlayers,
  mapClubNextMatch,
} from "@/lib/tactics/lineupTactics";
import { LINEUP_FORMATION_STORAGE_KEY } from "@/lib/lineupFormations";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClubLineupTacticsPage() {
  const [{ players, playersError, matches }, profile] = await Promise.all([
    getTeamPageData(),
    getUserProfile(),
  ]);

  if (playersError) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-400">
        Ошибка загрузки состава
      </p>
    );
  }

  const nextMatch = mapClubNextMatch(getUpcomingMatch(matches));
  const fieldPlayers = mapClubFieldPlayers(players);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">⚽ Тактика</h2>
          <p className="text-[10px] text-slate-500">
            Клубный состав · установки по выбранной схеме
          </p>
        </div>
        <Link
          href="/lineup"
          className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/5"
        >
          ← Состав
        </Link>
      </div>
      <LineupTacticsView
        formationStorageKey={LINEUP_FORMATION_STORAGE_KEY}
        fieldPlayers={fieldPlayers}
        nextMatch={nextMatch}
        viewerPlayerId={profile?.player_id ?? null}
      />
    </section>
  );
}
