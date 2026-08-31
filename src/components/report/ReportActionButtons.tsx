import { ExportReportButton } from "@/components/report/ExportReportButton";
import { PrintReportButton } from "@/components/report/PrintReportButton";
import type { LaporanBy, LaporanView } from "@/lib/report-types";

export function ReportActionButtons({
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
    <div className="grid grid-cols-2 gap-2">
      <PrintReportButton />
      <ExportReportButton by={by} view={view} date={date} month={month} year={year} />
    </div>
  );
}
