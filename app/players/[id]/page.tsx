import { notFound } from "next/navigation";
import PlayerProfileView from "@/components/player/PlayerProfileView";
import { getPlayerProfileData } from "@/lib/server/playerProfile";

export const revalidate = 30;

type PlayerProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerProfilePage({
  params,
}: PlayerProfilePageProps) {
  const { id } = await params;
  const playerId = Number(id);

  if (!Number.isInteger(playerId)) notFound();

  const data = await getPlayerProfileData(playerId);
  if (!data) notFound();

  return <PlayerProfileView data={data} />;
}
