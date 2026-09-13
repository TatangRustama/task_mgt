import Link from "next/link";
import type { ReactNode } from "react";
import { kinerjaHref, reportHref, type ReportBasePath } from "@/lib/laporan-url";
import type { KinerjaView, LaporanView } from "@/lib/report-types";
import { cn } from "@/lib/utils";

function Segment({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 text-center text-sm font-medium",
        active ? "bg-primary text-white shadow-sm" : "text-secondary"
      )}
    >
      {children}
    </Link>
  );
}

export function ReportFilters({
  basePath,
  view,
  date,
  month,
  year,
  unit,
}: {
  basePath: ReportBasePath;
  view: LaporanView;
  date: string;
  month: number;
  year: number;
  unit?: string | null;
}) {
  return (
    <div className="no-print grid grid-cols-2 rounded-lg bg-surface-container p-1">
      <Segment
        href={reportHref(basePath, { view: "harian", date, month, year, unit })}
        active={view === "harian"}
      >
        Harian
      </Segment>
      <Segment
        href={reportHref(basePath, { view: "bulanan", date, month, year, unit })}
        active={view === "bulanan"}
      >
        Bulanan
      </Segment>
    </div>
  );
}

export function KinerjaViewTabs({
  view,
  date,
  month,
  year,
  showPantau,
}: {
  view: KinerjaView;
  date: string;
  month: number;
  year: number;
  showPantau: boolean;
}) {
  if (!showPantau) {
    return (
      <ReportFilters basePath="/pimpinan" view={view === "pantau" ? "bulanan" : view} date={date} month={month} year={year} />
    );
  }

  return (
    <div className="no-print grid grid-cols-3 rounded-lg bg-surface-container p-1">
      <Segment href={kinerjaHref({ view: "pantau", date, month, year })} active={view === "pantau"}>
        Pantau
      </Segment>
      <Segment href={kinerjaHref({ view: "harian", date, month, year })} active={view === "harian"}>
        Harian
      </Segment>
      <Segment href={kinerjaHref({ view: "bulanan", date, month, year })} active={view === "bulanan"}>
        Bulanan
      </Segment>
    </div>
  );
}
