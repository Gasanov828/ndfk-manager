import AdminPlayersBoard from "@/components/admin/AdminPlayersBoard";
import { getAdminPlayersPageData } from "@/lib/server/adminPlayers";

export default async function AdminPlayersPage() {
  const data = await getAdminPlayersPageData();

  return <AdminPlayersBoard {...data} />;
}
