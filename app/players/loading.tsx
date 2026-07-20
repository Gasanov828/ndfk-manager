import PageHeader from "@/components/PageHeader";
import { SkeletonBlock, SkeletonCard } from "@/components/PageSkeleton";

export default function PlayersLoading() {
  return (
    <>
      <PageHeader
        title="Игроки команды"
        subtitle="Список, статистика и готовность к матчу"
        icon="👥"
      />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="mb-6 h-24 rounded-2xl bg-white/5" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </>
  );
}
