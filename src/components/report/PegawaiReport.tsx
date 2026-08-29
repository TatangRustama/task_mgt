"use client";

import { PegawaiDailyReport } from "@/components/report/PegawaiDailyReport";
import { PegawaiMonthlyReport } from "@/components/report/PegawaiMonthlyReport";
import type { DayRecap, LaporanBy, PegawaiReportRow, ReportSummary } from "@/lib/report-types";

export function PegawaiReport({
  by,
  view,
  date,
  month,
  year,
  summary,
  people,
  days = [],
  unitName,
  instansiName,
  pimpinanName,
}: {
  by: LaporanBy;
  view: "harian" | "bulanan";
  date: string;
  month: number;
  year: number;
  summary: ReportSummary;
  people: PegawaiReportRow[];
  days?: DayRecap[];
  unitName: string;
  instansiName: string;
  pimpinanName?: string;
}) {
  if (view === "harian") {
    return <PegawaiDailyReport by={by} date={date} month={month} year={year} people={people} />;
  }

  return (
    <PegawaiMonthlyReport
      by={by}
      date={date}
      month={month}
      year={year}
      people={people}
      days={days}
      summary={summary}
      unitName={unitName}
      instansiName={instansiName}
      pimpinanName={pimpinanName}
    />
  );
}
