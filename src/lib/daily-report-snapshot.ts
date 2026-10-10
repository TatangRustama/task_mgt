import { isPrintableTask, toMonthlyPrintTasks } from "@/lib/laporan-print-view";
import type { ReportTask } from "@/lib/report-types";
import { reportDayRange } from "@/lib/utils";

/**
 * Task ids stored on the one daily validation record.
 * A unit drill-down must not replace that record with the child unit's tasks.
 */
export function dailyValidationTaskIds(options: {
  drilledIn: boolean;
  focusedTaskIds: readonly string[];
  rootTaskIds: readonly string[];
}) {
  const source = options.drilledIn ? options.rootTaskIds : options.focusedTaskIds;
  return [...new Set(source)];
}

/** Public daily QR validation shows the stored snapshot, not a live re-query of the author. */
export function dailySnapshotTasks<T extends ReportTask>(
  taskIds: readonly string[],
  tasks: T[],
  date: string,
): T[] {
  const allowed = new Set(taskIds);
  const inSnapshot = tasks.filter((task) => allowed.has(task.id));
  const { start, end } = reportDayRange(date);
  const classified = toMonthlyPrintTasks(inSnapshot, start, end);
  const classifiedIds = new Set(classified.map((task) => task.id));
  const byId = new Map<string, T>();
  for (const task of inSnapshot) {
    if (!classifiedIds.has(task.id) && isPrintableTask(task) && task.completedAt) {
      byId.set(task.id, task);
    }
  }
  for (const task of classified) {
    if (task.printRole !== "dikerjakan") byId.set(task.id, task);
  }
  return taskIds.flatMap((id) => {
    const task = byId.get(id);
    return task ? [task] : [];
  });
}
