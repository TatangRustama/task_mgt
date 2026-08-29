import { cn } from "@/lib/utils";

export function PageMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8 print:max-w-none print:p-0", className)}>
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
    <section className="mb-6 md:mb-8">
      {title || action ? (
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-[26px] font-bold leading-8 tracking-tight text-on-surface md:text-[32px] md:leading-10">
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
