import type { DayRecap, ReportTask } from "@/lib/report-types";
import { calendarDay } from "@/lib/utils";

type DatedTask = Pick<
  ReportTask,
  "status" | "completedAt" | "reviewedAt" | "assignedAt" | "createdAt"
>;

// Rejection clears completedAt, and multi-day work is still dikerjakan, so the
// monthly calendar cannot key only off the completion timestamp.
export function taskReportDate(task: DatedTask) {
  if (task.status === "ditolak") {
    return calendarDay(task.reviewedAt || task.completedAt || task.createdAt);
  }
  if (task.status === "dikerjakan") {
    return calendarDay(task.assignedAt || task.createdAt);
  }
  return calendarDay(task.completedAt);
}

export function lastActiveTaskDate(tasks: ReportTask[]) {
  const dates = tasks.map(taskReportDate).filter((date): date is string => Boolean(date)).sort();
  return dates.at(-1) ?? null;
}

export function recapDaysForPersonTasks(tasks: ReportTask[], month: number, year: number): DayRecap[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const recap = Array.from({ length: daysInMonth }, (_, index) => ({
    date: `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    posted: 0,
    completed: 0,
  }));
  const byDate = new Map(recap.map((day) => [day.date, day]));
  for (const task of tasks) {
    const reportDate = taskReportDate(task);
    if (!reportDate) continue;
    const day = byDate.get(reportDate);
    if (!day) continue;
    if (task.status === "disetujui") day.completed += 1;
    else day.posted += 1;
  }
  return recap;
}
