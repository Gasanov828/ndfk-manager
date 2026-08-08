import PageHeader from "@/components/PageHeader";
import PlayersBoard from "@/components/PlayersBoard";
import { getRatingDeltas, getTeamPageData } from "@/lib/server/teamData";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const { players, playersError, ratingSummaryMap } = await getTeamPageData();

  if (playersError) {
    return <main className="p-8 text-red-400">Ошибка загрузки игроков</main>;
  }

  return (
    <>
      <PageHeader
        title="Игроки"
        subtitle="Состав по ролям · сравнение ★"
        icon="👥"
      />

      <PlayersBoard
        players={players}
        ratingDeltas={getRatingDeltas(ratingSummaryMap)}
      />
    </>
  );
}
