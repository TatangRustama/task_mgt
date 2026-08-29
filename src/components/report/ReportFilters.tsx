import Link from "next/link";
import type { ReactNode } from "react";
import { laporanHref } from "@/lib/laporan-url";
import type { LaporanBy, LaporanView } from "@/lib/report-types";
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
        active ? "bg-primary-container text-on-primary-container shadow-sm" : "text-secondary"
      )}
    >
      {children}
    </Link>
  );
}

export function ReportFilters({
  by,
  view,
  date,
  month,
  year,
}: {
  by: LaporanBy;
  view: LaporanView;
  date: string;
  month: number;
  year: number;
}) {
  return (
    <div className="no-print grid grid-cols-2 rounded-xl bg-surface-container p-1">
      <Segment href={laporanHref({ by, view: "harian", date, month, year })} active={view === "harian"}>
        Harian
      </Segment>
      <Segment href={laporanHref({ by, view: "bulanan", date, month, year })} active={view === "bulanan"}>
        Bulanan
      </Segment>
    </div>
  );
}
