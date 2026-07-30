import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentMatchRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/championship/matches/${id}`);
}
