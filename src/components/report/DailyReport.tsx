import { DailyDateNav } from "@/components/report/DailyDateNav";
import { ReportActionButtons } from "@/components/report/ReportActionButtons";
import { ReportStats } from "@/components/report/ReportStats";
import { TaskReportList } from "@/components/report/TaskReportList";
import type { LaporanBy, ReportSummary, ReportTask } from "@/lib/report-types";
import { formatLongDate } from "@/lib/utils";

export function DailyReport({
  by,
  date,
  month,
  year,
  summary,
  tasks,
}: {
  by: LaporanBy;
  date: string;
  month: number;
  year: number;
  summary: ReportSummary;
  tasks: ReportTask[];
}) {
  return (
    <div className="space-y-4">
      <div className="no-print space-y-3">
        <DailyDateNav date={date} month={month} year={year} />
        <ReportActionButtons by={by} view="harian" date={date} month={month} year={year} />
      </div>
      <p className="no-print text-sm font-medium text-on-surface-variant">{formatLongDate(date)}</p>
      <div className="no-print space-y-4">
        <ReportStats summary={summary} />
        <TaskReportList tasks={tasks} emptyText="Tidak ada tugas pada hari ini." />
      </div>
    </div>
  );
}
