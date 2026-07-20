import RatingEpisodeVote from "@/components/RatingEpisodeVote";
import { normalizeEpisodeToken } from "@/lib/ratingEpisode";

type RatePageProps = {
  params: Promise<{ token: string }>;
};

export default async function RatePage({ params }: RatePageProps) {
  const { token } = await params;

  return <RatingEpisodeVote token={normalizeEpisodeToken(token)} />;
}
