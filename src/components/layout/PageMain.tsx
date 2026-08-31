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
        <div className="flex items-center justify-between gap-3">
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
