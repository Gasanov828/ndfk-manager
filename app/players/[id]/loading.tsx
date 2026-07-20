import { SkeletonBlock } from "@/components/PageSkeleton";

export default function PlayerProfileLoading() {
  return (
    <div className="-mt-1 space-y-2 sm:-mt-2 sm:space-y-3">
      <SkeletonBlock className="h-4 w-24 rounded-md" />
      <SkeletonBlock className="h-[7.5rem] rounded-xl" />
      <div className="grid grid-cols-3 gap-1.5">
        <SkeletonBlock className="h-14 rounded-xl" />
        <SkeletonBlock className="h-14 rounded-xl" />
        <SkeletonBlock className="h-14 rounded-xl" />
      </div>
      <SkeletonBlock className="h-40 rounded-xl" />
      <SkeletonBlock className="h-52 rounded-xl" />
    </div>
  );
}
