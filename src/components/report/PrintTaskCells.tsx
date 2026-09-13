import { printHasilLine, printParaf, printTempatLine } from "@/lib/laporan-print-view";
import { formatJumlahSatuan } from "@/lib/satuan";
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

export function PrintHasilParafCell({
  task,
  includePenilaian = false,
}: {
  task: Pick<ReportTask, "score" | "status" | "feedback" | "jumlahIntervensi" | "satuan">;
  includePenilaian?: boolean;
}) {
  const jumlah = formatJumlahSatuan(task.jumlahIntervensi, task.satuan);
  const hasil = printHasilLine(task);
  return (
    <div className="print-hasil-paraf">
      {includePenilaian && jumlah ? <div>{jumlah}</div> : null}
      {hasil ? <div className="print-hasil-line">{hasil}</div> : null}
      <div className="print-paraf-line">{printParaf(task)}</div>
      {includePenilaian && task.feedback?.trim() ? (
        <div className="print-paraf-line">{task.feedback.trim()}</div>
      ) : null}
    </div>
  );
}
