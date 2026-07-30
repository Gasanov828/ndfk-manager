import { redirect } from "next/navigation";

export default function TournamentScorersRedirect() {
  redirect("/championship/leaders");
}
