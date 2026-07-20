type SkeletonProps = {
  className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-white/5 ring-1 ring-white/5 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return <SkeletonBlock className="h-24 rounded-2xl" />;
}
