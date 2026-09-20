import { PageMain } from "@/components/layout/PageMain";

export default function BoardLoading() {
  return (
    <PageMain>
      <div className="space-y-3" aria-hidden="true">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-container" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-surface-container" />
        <div className="flex justify-between pt-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-container" />
          <div className="h-9 w-40 animate-pulse rounded-lg bg-surface-container" />
        </div>
        <div className="h-10 animate-pulse rounded-lg bg-surface-container" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 animate-pulse rounded-lg bg-surface-container-high" />
          <div className="h-32 animate-pulse rounded-lg bg-surface-container-high" />
          <div className="h-32 animate-pulse rounded-lg bg-surface-container" />
        </div>
      </div>
    </PageMain>
  );
}
