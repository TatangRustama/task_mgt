import { cn } from "@/lib/utils";

export function PageMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-7xl px-3 py-3 md:px-6 md:py-5 print:max-w-none print:p-0", className)}>
      {children}
    </main>
  );
}

export function PageLoadingSkeleton() {
  return (
    <PageMain>
      <div className="space-y-3" aria-hidden="true">
        <div className="h-7 w-40 animate-pulse rounded-md bg-surface-container-high" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-surface-container" />
        <div className="mt-2 h-28 animate-pulse rounded-xl bg-surface-container-high" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-20 animate-pulse rounded-xl bg-surface-container" />
          <div className="h-20 animate-pulse rounded-xl bg-surface-container" />
          <div className="h-20 animate-pulse rounded-xl bg-surface-container" />
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-surface-container-lowest border border-outline" />
      </div>
      <span className="sr-only">Memuat halaman</span>
    </PageMain>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  if (!title && !subtitle && !action) return null;

  return (
    <section className="mb-3 md:mb-4">
      {title || action ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h2 className="text-xl font-bold leading-7 tracking-tight text-on-surface md:text-2xl md:leading-8">
              {title}
            </h2>
          ) : null}
          {action}
        </div>
      ) : null}
      {subtitle ? (
        <p className={cn(title || action ? "mt-1" : null, "text-sm text-on-surface-variant md:text-base")}>
          {subtitle}
        </p>
      ) : null}
    </section>
  );
}
