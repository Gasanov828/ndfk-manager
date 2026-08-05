import { SkeletonBlock } from "@/components/PageSkeleton";

export default function LiveLoading() {
  return (
    <div className="bottom-nav-safe space-y-3 pb-4">
      <SkeletonBlock className="h-20 rounded-2xl" />
      <SkeletonBlock className="h-24 rounded-2xl" />
      <SkeletonBlock className="h-28 rounded-2xl" />
      <SkeletonBlock className="mx-auto aspect-[3/4] w-full max-w-md rounded-[22px]" />
    </div>
  );
}