import { DailyDateNav } from "@/components/report/DailyDateNav";
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
      <DailyDateNav by={by} date={date} month={month} year={year} />
      <p className="text-sm font-medium text-on-surface-variant">{formatLongDate(date)}</p>
      <ReportStats summary={summary} />
      <TaskReportList tasks={tasks} emptyText="Tidak ada tugas pada hari ini." />
    </div>
  );
}
