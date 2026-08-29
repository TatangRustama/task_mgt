import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { laporanHref } from "@/lib/laporan-url";
import type { LaporanBy } from "@/lib/report-types";
import { getMonthYearLabel } from "@/lib/utils";

export function ReportMonthNav({
  by,
  month,
  year,
  date,
}: {
  by: LaporanBy;
  month: number;
  year: number;
  date?: string;
}) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="icon" asChild>
        <Link
          href={laporanHref({ by, view: "bulanan", date, month: prevMonth, year: prevYear })}
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>
      <p className="text-sm font-semibold capitalize text-on-surface">{getMonthYearLabel(month, year)}</p>
      <Button variant="outline" size="icon" asChild>
        <Link
          href={laporanHref({ by, view: "bulanan", date, month: nextMonth, year: nextYear })}
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
