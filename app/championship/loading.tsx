import { SkeletonBlock } from "@/components/PageSkeleton";

export default function ChampionshipLoading() {
  return (
    <section className="space-y-2">
      <SkeletonBlock className="h-36 rounded-xl" />
      <div className="mt-2 grid grid-cols-2 gap-1.5 xl:grid-cols-3">
        <div className="col-span-2 grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-[58px] rounded-xl" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-[86px] rounded-xl" />
        ))}
        <SkeletonBlock className="col-span-2 h-32 rounded-xl xl:col-span-3" />
      </div>
    </section>
  );
}