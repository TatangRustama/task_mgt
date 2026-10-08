import {
  AlarmClock,
  ArrowRightLeft,
  BarChart3,
  CircleCheck,
  ClipboardList,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Network,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageBackLink } from "@/components/layout/PageBackLink";
import { cn } from "@/lib/utils";

const PAGE_TITLE_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Pegawai: Users,
  "Manajemen pengguna": UserPlus,
  Laporan: BarChart3,
  "Active Tasks": ClipboardList,
  Kinerja: Gauge,
  Kolam: Inbox,
  Terlambat: AlarmClock,
  "Detail tugas": FileText,
  "Detail Tugas": FileText,
  "Monitoring tugas": ListChecks,
  Persetujuan: CircleCheck,
  "Pindah UNOR": ArrowRightLeft,
  Setting: Settings,
  Struktur: Network,
  "Struktur organisasi": Network,
};

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
      <PageBackLink />
      {title || action ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h2 className="flex items-center gap-2 text-xl font-bold leading-7 tracking-tight text-on-surface md:text-2xl md:leading-8">
              <PageTitleIcon title={title} />
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

function PageTitleIcon({ title }: { title: string }) {
  const Icon = PAGE_TITLE_ICONS[title];
  if (!Icon) return null;
  return <Icon className="h-6 w-6 shrink-0 text-primary md:h-7 md:w-7" strokeWidth={2} aria-hidden />;
}
