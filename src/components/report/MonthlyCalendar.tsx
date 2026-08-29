import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PrintReportButton } from "@/components/report/PrintReportButton";
import { MonthlyTaskPrintReport } from "@/components/report/MonthlyTaskPrintReport";
import { ReportMonthNav } from "@/components/report/ReportMonthNav";
import { laporanHref } from "@/lib/laporan-url";
import type { LaporanPrintContext } from "@/lib/laporan-print";
import type { DayRecap, LaporanBy, ReportTask } from "@/lib/report-types";
import { cn, formatISODate, statusLabel } from "@/lib/utils";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function MonthlyCalendar({
  by,
  month,
  year,
  date,
  days,
  tasks,
  printTasks,
  print,
}: {
  by: LaporanBy;
  month: number;
  year: number;
  date: string;
  days: DayRecap[];
  tasks: ReportTask[];
  printTasks: ReportTask[];
  print: LaporanPrintContext;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const today = formatISODate(new Date());

  const cells: Array<DayRecap | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...days,
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="space-y-4">
      <div className="no-print space-y-3">
        <ReportMonthNav by={by} month={month} year={year} date={date} />
        <PrintReportButton />

        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-secondary">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-16 rounded-lg" />;
                }

                const posted = day.posted;
                const completed = day.completed;
                const isToday = day.date === today;

                return (
                  <Link
                    key={day.date}
                    href={laporanHref({ by, view: "harian", date: day.date, month, year })}
                    className={cn(
                      "relative flex min-h-14 flex-col items-center justify-center rounded-full p-1.5 text-center transition",
                      isToday
                        ? "bg-secondary text-on-secondary shadow-md"
                        : "text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    <span className="text-sm font-medium">
                      {Number(day.date.slice(-2))}
                    </span>
                    {posted > 0 || completed > 0 ? (
                      <span
                        className={cn(
                          "absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary-container",
                          isToday && "bg-primary-container"
                        )}
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="no-print flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-secondary">Laporan bulan ini</h3>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant card-shadow">
            Tidak ada tugas pada periode ini.
          </p>
        ) : (
          tasks.slice(0, 8).map((task) => (
            <Link
              key={task.id}
              href={`/tugas/${task.id}`}
              className="flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 card-shadow"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <span className="text-sm font-bold">{task.title.slice(0, 1)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-on-surface">{task.title}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                  {task.assigneeName} · {statusLabel(task.status)}
                  {task.description ? ` — ${task.description}` : ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>

      <MonthlyTaskPrintReport month={month} year={year} tasks={printTasks} print={print} />
    </div>
  );
}
