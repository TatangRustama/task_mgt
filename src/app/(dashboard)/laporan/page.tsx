import { DailyReport } from "@/components/report/DailyReport";
import { MonthlyCalendar } from "@/components/report/MonthlyCalendar";
import { PegawaiReport } from "@/components/report/PegawaiReport";
import { ReportBySelect } from "@/components/report/ReportBySelect";
import { ReportFilters } from "@/components/report/ReportFilters";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { getDailyReport, getMonthlyCalendar, getPegawaiBreakdown } from "@/lib/reports";
import { getLaporanPrintContext, printableTasks } from "@/lib/laporan-print";
import type { LaporanBy, LaporanView } from "@/lib/report-types";
import { requireUser } from "@/lib/session";
import { addDays, formatISODate, isISODate, parseISODate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{
    by?: string;
    view?: string;
    date?: string;
    month?: string;
    year?: string;
    assigneeId?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const by: LaporanBy = params.by === "pegawai" ? "pegawai" : "tugas";
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
    by === "tugas" && view === "bulanan" && monthly
      ? await getLaporanPrintContext({
          userId: user.id,
          month,
          year,
          instansiName: monthly.instansiName,
          agencyName: monthly.agencyName,
          taskIds: printTasks.map((task) => task.id),
        })
      : null;

  const start = view === "harian" ? parseISODate(date) : new Date(year, month - 1, 1);
  const end = view === "harian" ? addDays(start, 1) : new Date(year, month, 1);
  const people =
    by === "pegawai" && (daily || monthly)
      ? await getPegawaiBreakdown((daily ?? monthly)!.tasks, scope, start, end)
      : [];

  const subtitle =
    by === "pegawai"
      ? view === "harian"
        ? "Pantau kinerja pegawai harian"
        : "Pantau kinerja pegawai bulanan"
      : view === "harian"
        ? "Rekap tugas harian"
        : "Kalender rekap tugas bulanan";

  return (
    <PageMain className="max-w-3xl space-y-6 print:max-w-none">
      <div className="no-print">
        <PageHeader
          title="Laporan"
          subtitle={subtitle}
          action={<ReportBySelect by={by} view={view} date={date} month={month} year={year} />}
        />
      </div>
      <ReportFilters by={by} view={view} date={date} month={month} year={year} />
      {!hasUnit ? (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Unit belum tersedia untuk laporan.
        </p>
      ) : by === "pegawai" ? (
        <PegawaiReport
          by={by}
          view={view}
          date={date}
          month={month}
          year={year}
          summary={(daily ?? monthly)!.summary}
          people={people}
          days={monthly?.days ?? []}
          unitName={(daily ?? monthly)!.unitName}
          instansiName={(daily ?? monthly)!.instansiName}
          pimpinanName={monthly?.pimpinanName}
        />
      ) : view === "harian" && daily ? (
        <DailyReport
          by={by}
          date={daily.date}
          month={month}
          year={year}
          summary={daily.summary}
          tasks={daily.tasks}
        />
      ) : monthly && print ? (
        <MonthlyCalendar
          by={by}
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
