import HistoryBoard from "@/components/HistoryBoard";
import MatchesSchedule from "@/components/MatchesSchedule";
import { loadMatchHistory } from "@/lib/loadMatchHistory";
import { buildMatchesPageModel } from "@/lib/server/matchesPageData";
import { getTeamPageData } from "@/lib/server/teamData";

export const revalidate = 30;

export default async function MatchesPage() {
  const [{ players, matches }, { history, error: historyError }] =
    await Promise.all([getTeamPageData(), loadMatchHistory()]);

  const model = buildMatchesPageModel(matches, players);

  return (
    <div className="-mt-1 space-y-3 sm:-mt-2">
      <MatchesSchedule
        liveMatch={model.liveMatch}
        upcomingMatch={model.upcomingMatch}
        upcomingMatches={model.upcomingMatches}
        readiness={model.readiness}
      />

      <section id="history" className="scroll-mt-20">
        <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {"\u0418\u0441\u0442\u043e\u0440\u0438\u044f"}
          </h2>
          {!historyError && (
            <span className="text-[10px] text-slate-500">{history.length}</span>
          )}
        </div>

        {historyError && (
          <div className="mb-2 rounded-xl border border-red-400/30 px-3 py-2 text-sm text-red-300">
            {historyError}
          </div>
        )}

        {!historyError && <HistoryBoard history={history} />}
      </section>
    </div>
  );
}
