import { PageMain } from "@/components/layout/PageMain";

export default function LaporanLoading() {
  return (
    <PageMain className="max-w-3xl space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-10 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-28 animate-pulse rounded-lg bg-surface-container" />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-28 animate-pulse rounded-lg bg-surface-container-high" />
      </div>
      <div className="h-20 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-20 animate-pulse rounded-lg bg-surface-container" />
    </PageMain>
  );
}
