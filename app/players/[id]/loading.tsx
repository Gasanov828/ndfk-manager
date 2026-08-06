import { SkeletonBlock } from "@/components/PageSkeleton";

export default function PlayerProfileLoading() {
  return (
    <div className="player-profile">
      <SkeletonBlock className="h-4 w-24 rounded-md" />
      <SkeletonBlock className="h-[8.5rem] rounded-xl" />
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
      </div>
      <SkeletonBlock className="h-20 rounded-xl" />
      <div className="grid gap-2 lg:grid-cols-[1.15fr_0.85fr]">
        <SkeletonBlock className="h-56 rounded-xl" />
        <SkeletonBlock className="h-56 rounded-xl" />
      </div>
    </div>
  );
}
