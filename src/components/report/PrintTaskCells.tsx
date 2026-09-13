import { printHasilLine, printParaf, printTempatLine } from "@/lib/laporan-print-view";
import type { ReportTask } from "@/lib/report-types";

export function PrintUraianCell({
  task,
  extra,
}: {
  task: Pick<ReportTask, "title" | "address">;
  extra?: string | null;
}) {
  const place = printTempatLine(task);
  return (
    <>
      {task.title.trim() || "-"}
      {extra ? (
        <>
          <br />
          <span className="print-uraian-extra">{extra}</span>
        </>
      ) : null}
      {place ? (
        <>
          <br />
          <span className="print-place-line">{place}</span>
        </>
      ) : null}
    </>
  );
}

export function PrintHasilParafCell({ task }: { task: Pick<ReportTask, "score" | "status"> }) {
  const hasil = printHasilLine(task);
  return (
    <div className="print-hasil-paraf">
      {hasil ? <div className="print-hasil-line">{hasil}</div> : null}
      <div className="print-paraf-line">{printParaf(task)}</div>
    </div>
  );
}
