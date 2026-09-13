import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { reportHref, type ReportBasePath } from "@/lib/laporan-url";
import type { DayRecap } from "@/lib/report-types";
import { cn, formatISODate } from "@/lib/utils";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function ActivityCalendar({
  basePath = "/pimpinan",
  month,
  year,
  days,
  compact = false,
}: {
  basePath?: ReportBasePath;
  month: number;
  year: number;
  days: DayRecap[];
  compact?: boolean;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const today = formatISODate(new Date());

  const cells: Array<DayRecap | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card>
      <CardContent className={cn("p-3", compact && "p-2")}>
        <div
          className={cn(
            "grid grid-cols-7 gap-1 text-center font-medium text-secondary",
            compact ? "text-[10px]" : "text-[11px]"
          )}
        >
          {WEEKDAYS.map((day) => (
            <div key={day} className={compact ? "py-0.5" : "py-1"}>
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className={compact ? "min-h-8" : "min-h-12"} />;
            }

            const posted = day.posted;
            const completed = day.completed;
            const isToday = day.date === today;
            const hasActivity = posted > 0 || completed > 0;

            return (
              <Link
                key={day.date}
                href={reportHref(basePath, { view: "harian", date: day.date, month, year })}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg p-1 text-center transition",
                  compact ? "min-h-8 rounded-lg" : "min-h-12",
                  isToday
                    ? "bg-primary text-white shadow-md"
                    : completed > 0
                      ? "bg-emerald-50 text-on-surface hover:bg-emerald-100"
                      : posted > 0
                        ? "bg-secondary-container text-on-secondary-container hover:opacity-90"
                        : "text-on-surface hover:bg-surface-container-high"
                )}
              >
                <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
                  {Number(day.date.slice(-2))}
                </span>
                {hasActivity && !compact ? (
                  <span className="mt-0.5 flex items-center gap-0.5">
                    {posted > 0 ? (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          completed > 0 ? "bg-primary-container" : "bg-white"
                        )}
                      />
                    ) : null}
                    {completed > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> : null}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        {!compact ? (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] text-tertiary">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
              Disetujui
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-on-secondary-container" aria-hidden />
              Ditolak
            </span>
            <span>ketuk tanggal untuk recap harian</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
