import { PageMain } from "@/components/layout/PageMain";
import { KinerjaBoardSkeleton } from "@/components/pimpinan/KinerjaBoardSkeleton";

export default function PimpinanLoading() {
  return (
    <PageMain className="max-w-3xl space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-10 animate-pulse rounded-lg bg-surface-container" />
      <KinerjaBoardSkeleton />
    </PageMain>
  );
}
