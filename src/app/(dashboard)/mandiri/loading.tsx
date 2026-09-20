import { PageMain } from "@/components/layout/PageMain";

export default function MandiriLoading() {
  return (
    <PageMain>
      <div className="space-y-3" aria-hidden="true">
        <div className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
        <div className="h-24 animate-pulse rounded-xl bg-primary/80" />
        <div className="h-40 animate-pulse rounded-xl border border-outline bg-surface-container-lowest" />
      </div>
    </PageMain>
  );
}
