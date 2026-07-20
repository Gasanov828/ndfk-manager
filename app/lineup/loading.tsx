import PageHeader from "@/components/PageHeader";
import { SkeletonBlock, SkeletonCard } from "@/components/PageSkeleton";

export default function LineupLoading() {
  return (
    <>
      <PageHeader
        title="Состав команды"
        subtitle="Стартовый состав, замены и готовность игроков"
        icon="📋"
      />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <SkeletonBlock className="h-[520px] rounded-3xl" />
        <SkeletonBlock className="aspect-[4/5] max-h-[720px] rounded-3xl" />
      </div>
    </>
  );
}
