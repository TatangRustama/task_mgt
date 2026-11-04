import { groupTasksByPrintDate, printKeterangan } from "@/lib/laporan-print-view";
import { PrintHasilParafCell, PrintUraianCell } from "@/components/report/PrintTaskCells";
import { formatJumlahSatuan } from "@/lib/satuan";
import type { ReportTask } from "@/lib/report-types";

export function MonthlyTaskDayRows({
  tasks,
  authorName,
  cellClassName = "",
  rowClassName,
}: {
  tasks: ReportTask[];
  authorName: string;
  cellClassName?: string;
  rowClassName?: string;
}) {
  const groups = groupTasksByPrintDate(tasks);

  return (
    <>
      {groups.map((group) => {
        const rowCount = group.tasks.length;
        return (
          <tbody key={group.date} className="print-day-group">
            {group.tasks.map((task, index) => (
              <tr key={task.id} className={rowClassName}>
                {index === 0 ? (
                  <>
                    <td className={`center ${cellClassName}`.trim()} rowSpan={rowCount}>
                      {group.no}
                    </td>
                    <td className={`center ${cellClassName}`.trim()} rowSpan={rowCount}>
                      {group.date}
                    </td>
                  </>
                ) : null}
                <td className={cellClassName}>
                  <PrintUraianCell task={task} extra={formatJumlahSatuan(task.jumlahIntervensi, task.satuan)} />
                </td>
                <td className={cellClassName}>
                  {printKeterangan(task, authorName, { includeFeedback: false }) || "-"}
                </td>
                <td className={`center ${cellClassName}`.trim()}>
                  <PrintHasilParafCell task={task} />
                </td>
              </tr>
            ))}
          </tbody>
        );
      })}
    </>
  );
}
