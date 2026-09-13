import { groupTasksByPrintDate, printKeterangan } from "@/lib/laporan-print-view";
import { PrintHasilParafCell, PrintUraianCell } from "@/components/report/PrintTaskCells";
import type { ReportTask } from "@/lib/report-types";

export function MonthlyTaskDayRows({
  tasks,
  authorName,
  cellClassName = "",
  rowClassName,
  mergedHasilParaf = false,
}: {
  tasks: ReportTask[];
  authorName: string;
  cellClassName?: string;
  rowClassName?: string;
  mergedHasilParaf?: boolean;
}) {
  const groups = groupTasksByPrintDate(tasks);

  return groups.flatMap((group) => {
    const rowCount = group.tasks.length;
    return group.tasks.map((task, index) => (
      <tr key={task.id} className={rowClassName}>
        {index === 0 ? (
          <>
            <td className={`center align-middle ${cellClassName}`.trim()} rowSpan={rowCount}>
              {group.no}
            </td>
            <td className={`center align-middle ${cellClassName}`.trim()} rowSpan={rowCount}>
              {group.date}
            </td>
          </>
        ) : null}
        <td className={cellClassName}>
          <PrintUraianCell task={task} />
        </td>
        <td className={cellClassName}>
          {printKeterangan(task, authorName, { includeFeedback: !mergedHasilParaf }) || "-"}
        </td>
        <td className={`center ${cellClassName}`.trim()}>
          <PrintHasilParafCell task={task} includePenilaian={mergedHasilParaf} />
        </td>
      </tr>
    ));
  });
}
