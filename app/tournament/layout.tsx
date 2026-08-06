import { redirect } from "next/navigation";

export default function TournamentLayoutRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keep children for nested redirects; layout itself just passes through
  return children;
}
