"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityCalendar } from "@/components/report/ActivityCalendar";
import { TaskReportList } from "@/components/report/TaskReportList";
import {
  lastActiveTaskDate,
  recapDaysForPersonTasks,
  taskReportDate,
} from "@/lib/laporan-task-date";
import type { ReportTask } from "@/lib/report-types";
import { cn, formatDate } from "@/lib/utils";

export function PersonMonthTasks({
  tasks,
  month,
  year,
  resetKey,
  emptyText = "Tidak ada kerja dinilai bulan ini.",
}: {
  tasks: ReportTask[];
  month: number;
  year: number;
  resetKey: string;
  emptyText?: string;
}) {
  const days = useMemo(() => recapDaysForPersonTasks(tasks, month, year), [tasks, month, year]);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => lastActiveTaskDate(tasks));

  useEffect(() => {
    setSelectedDate(lastActiveTaskDate(tasks));
    // Reset only when switching person or month, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey captures person/month/year
  }, [resetKey]);

  const visibleTasks = selectedDate
    ? tasks.filter((task) => taskReportDate(task) === selectedDate)
    : tasks;
  const showingAll = selectedDate == null;

  return (
    <div className="space-y-3">
      {tasks.length > 0 ? (
        <>
          <ActivityCalendar
            month={month}
            year={year}
            days={days}
            compact
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 text-xs text-on-surface-variant">
              {showingAll
                ? `${tasks.length} tugas bulan ini`
                : `${visibleTasks.length} tugas · ${formatDate(selectedDate)}`}
            </p>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium transition",
                showingAll
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
              )}
              aria-pressed={showingAll}
            >
              Semua
            </button>
          </div>
        </>
      ) : null}
      <div className={cn(showingAll && tasks.length > 6 && "max-h-[36rem] overflow-y-auto pr-0.5")}>
        <TaskReportList
          tasks={visibleTasks}
          showAssignee={false}
          emptyText={
            showingAll ? emptyText : "Tidak ada kerja dinilai pada tanggal ini."
          }
        />
      </div>
    </div>
  );
}
