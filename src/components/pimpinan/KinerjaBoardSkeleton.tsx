export function KinerjaBoardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-28 animate-pulse rounded-lg bg-surface-container" />
      <div className="flex gap-2">
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-container" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-container" />
        <div className="h-8 w-16 animate-pulse rounded-lg bg-surface-container" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-28 animate-pulse rounded-lg bg-surface-container-high" />
      </div>
      <div className="h-20 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-20 animate-pulse rounded-lg bg-surface-container" />
    </div>
  );
}
