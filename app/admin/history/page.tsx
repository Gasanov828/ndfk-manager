import { redirect } from "next/navigation";

export default function AdminHistoryRedirect() {
  redirect("/admin/matches?tab=result");
}
