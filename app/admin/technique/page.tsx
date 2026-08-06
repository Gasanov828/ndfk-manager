import AdminTechniqueBoard from "@/components/admin/AdminTechniqueBoard";
import { getAdminTechniquePageData } from "@/lib/server/adminTechnique";

export default async function AdminTechniquePage() {
  const data = await getAdminTechniquePageData();

  return <AdminTechniqueBoard {...data} />;
}
