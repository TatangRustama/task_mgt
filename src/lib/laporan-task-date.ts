import type { DayRecap, ReportTask } from "@/lib/report-types";

export function taskReportDate(task: Pick<ReportTask, "reviewedAt" | "completedAt" | "createdAt">) {
  return (task.reviewedAt || task.completedAt || task.createdAt).slice(0, 10);
}

export function lastActiveTaskDate(tasks: ReportTask[]) {
  const dates = tasks.map(taskReportDate).sort();
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
    const day = byDate.get(taskReportDate(task));
    if (!day) continue;
    if (task.status === "disetujui") day.completed += 1;
    else day.posted += 1;
  }
  return recap;
}
