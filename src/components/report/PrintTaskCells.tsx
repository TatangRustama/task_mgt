import {
  printDailyHasilParafParts,
  printTargetLine,
  printTempatLine,
} from "@/lib/laporan-print-view";
import { parseTaskDescription } from "@/lib/task-description";
import type { ReportTask } from "@/lib/report-types";

function PrintDescription({ text }: { text: string }) {
  const blocks = parseTaskDescription(text);
  if (blocks.length === 0) return null;

  return (
    <div className="print-uraian-desc">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <div key={index} className="print-desc-p">
              {block.text}
            </div>
          );
        }

        return (
          <div key={index} className="print-desc-list">
            {block.items.map((item, itemIndex) => (
              <div key={itemIndex} className="print-desc-item">
                {block.type === "ol" ? `${itemIndex + 1}. ${item}` : `• ${item}`}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function PrintUraianCell({
  task,
  extra,
}: {
  task: Pick<ReportTask, "title" | "description" | "address" | "assignedAt" | "createdAt" | "deadline">;
  extra?: string | null;
}) {
  const place = printTempatLine(task);
  const target = printTargetLine(task);
  const description = task.description?.trim();
  return (
    <>
      <strong className="print-uraian-title">{task.title.trim() || "-"}</strong>
      {description ? (
        <>
          <br />
          <PrintDescription text={description} />
        </>
      ) : null}
      {extra ? (
        <>
          <br />
          <span className="print-uraian-extra">{extra}</span>
        </>
      ) : null}
      {target ? (
        <>
          <br />
          <span className="print-place-line">{target}</span>
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
}: {
  task: Pick<ReportTask, "feedback" | "score" | "status" | "reviewedAt">;
}) {
  const { feedback, penilaian, status, reviewedAt } = printDailyHasilParafParts(task);
  return (
    <div className="print-hasil-paraf">
      <div>{feedback}</div>
      <div className="print-hasil-line">{penilaian}</div>
      <div className="print-paraf-line">{status}</div>
      <div className="print-paraf-line">{reviewedAt}</div>
    </div>
  );
}

export function PrintDailyKeteranganCell({ task }: { task: Pick<ReportTask, "notes"> }) {
  const notes = task.notes?.trim() || "-";
  return <div className="print-daily-keterangan-value">{notes}</div>;
}

export function PrintDailyHasilParafCell({
  task,
}: {
  task: Pick<ReportTask, "feedback" | "score" | "status" | "reviewedAt">;
}) {
  const { feedback, penilaian, status, reviewedAt } = printDailyHasilParafParts(task);
  return (
    <div className="print-hasil-paraf print-daily-hasil">
      <div className="print-daily-feedback">
        <strong>Feedback : </strong>
        <div className="print-daily-feedback-value">{feedback}</div>
      </div>
      <div className="print-hasil-line">{penilaian}</div>
      <div className="print-paraf-line">{status}</div>
      <div className="print-paraf-line">{reviewedAt}</div>
    </div>
  );
}
