import GuestRatingBoard from "@/components/GuestRatingBoard";

type GuestVotePageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function GuestVotePage({ params }: GuestVotePageProps) {
  const { matchId: raw } = await params;
  const matchId = Number(raw);

  if (!Number.isFinite(matchId) || matchId <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-6 text-sm text-red-100">
          Неверная ссылка голосования.
        </div>
      </div>
    );
  }

  return <GuestRatingBoard matchId={matchId} />;
}
