import PageHeader from "@/components/PageHeader";
import { SkeletonBlock } from "@/components/PageSkeleton";

export default function MatchesLoading() {
  return (
    <>
      <PageHeader
        title="Матчи"
        subtitle="Расписание и история игр"
        icon="📅"
      />
      <SkeletonBlock className="mb-8 h-72 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonBlock className="h-64 rounded-2xl" />
        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
