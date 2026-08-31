import { DailyReport } from "@/components/report/DailyReport";
import { MonthlyCalendar } from "@/components/report/MonthlyCalendar";
import { ReportFilters } from "@/components/report/ReportFilters";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { getDailyLaporanPrintContext, getLaporanPrintContext, printableTasks } from "@/lib/laporan-print";
import { getDailyReport, getMonthlyCalendar } from "@/lib/reports";
import type { LaporanView } from "@/lib/report-types";
import { requireUser } from "@/lib/session";
import { formatISODate, isISODate, parseISODate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    month?: string;
    year?: string;
    assigneeId?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const view: LaporanView = params.view === "bulanan" ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const date = isISODate(params.date) ? params.date : today;
  const selected = parseISODate(date);
  const month = Number(params.month || selected.getMonth() + 1);
  const year = Number(params.year || selected.getFullYear());

  const scope = {
    role: user.role,
    userId: user.id,
    unitId: user.unitId,
    assigneeId: params.assigneeId,
  };

  const daily = view === "harian" ? await getDailyReport({ ...scope, date }) : null;
  const monthly = view === "bulanan" ? await getMonthlyCalendar({ ...scope, month, year }) : null;
  const hasUnit = Boolean(daily || monthly);
  const printTasks = monthly ? printableTasks(monthly.tasks) : [];
  const print =
    view === "bulanan" && monthly
      ? await getLaporanPrintContext({
          userId: user.id,
          month,
          year,
          instansiName: monthly.instansiName,
          agencyName: monthly.agencyName,
          taskIds: printTasks.map((task) => task.id),
        })
      : null;
  const dailyPrint =
    view === "harian" && daily
      ? await getDailyLaporanPrintContext({
          userId: user.id,
          instansiName: daily.instansiName,
          agencyName: daily.agencyName,
        })
      : null;

  return (
    <PageMain className="max-w-3xl space-y-6 print:max-w-none">
      <div className="no-print">
        <PageHeader
          title="Laporan"
          subtitle={view === "harian" ? "Rekap tugas harian" : "Kalender rekap tugas bulanan"}
        />
      </div>
      <ReportFilters basePath="/laporan" view={view} date={date} month={month} year={year} />
      {!hasUnit ? (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Unit belum tersedia untuk laporan.
        </p>
      ) : view === "harian" && daily && dailyPrint ? (
        <DailyReport
          by="tugas"
          date={daily.date}
          month={month}
          year={year}
          summary={daily.summary}
          tasks={daily.tasks}
          print={dailyPrint}
        />
      ) : monthly && print ? (
        <MonthlyCalendar
          by="tugas"
          month={monthly.month}
          year={monthly.year}
          date={date}
          days={monthly.days}
          tasks={monthly.tasks}
          printTasks={printTasks}
          print={print}
        />
      ) : null}
    </PageMain>
  );
}
