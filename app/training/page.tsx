import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth";

export default async function TrainingPage() {
  const profile = await getUserProfile();

  if (profile?.role === "admin") {
    redirect("/admin/training");
  }

  redirect("/me");
}
