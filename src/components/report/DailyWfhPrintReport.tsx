import {
  groupTasksForWfhPrint,
  taskWfhHasil,
  type DailyLaporanPrintContext,
} from "@/lib/laporan-print-view";
import { PrintLampiranBukti } from "@/components/report/PrintLampiranBukti";
import { PrintTaskTable } from "@/components/report/MonthlyTaskPrintReport";
import { PrintHasilParafCell, PrintUraianCell } from "@/components/report/PrintTaskCells";
import type { ReportTask } from "@/lib/report-types";
import { formatPrintedOnDate, formatWfhReportDate, formatWfhSignDate } from "@/lib/utils";

export function DailyWfhPrintReport({
  date,
  tasks,
  print,
  isLeader = false,
  leaderTasks = [],
  lampiranTasks = [],
}: {
  date: string;
  tasks: ReportTask[];
  print: DailyLaporanPrintContext;
  isLeader?: boolean;
  leaderTasks?: ReportTask[];
  lampiranTasks?: ReportTask[];
}) {
  const dateLabel = formatWfhReportDate(date);
  const groups = groupTasksForWfhPrint(tasks);

  return (
    <div className="print-wfh print-root" aria-hidden="true">
      <h1 className="print-title">LAPORAN KINERJA</h1>
      <p className="print-wfh-date">{dateLabel}</p>

      <IdentityTable person={print.author} />

      <p className="print-section-label">Atasan langsung / Pemberi Tugas</p>
      {print.atasan ? (
        <IdentityTable person={print.atasan} />
      ) : (
        <p className="print-empty">Tidak ada atasan langsung.</p>
      )}

      {isLeader ? (
        <>
          <p className="print-section-label">Rincian Tugas Mandiri</p>
          <PrintTaskTable
            tasks={leaderTasks}
            authorName={print.author.name}
            empty="Tidak ada tugas mandiri pada tanggal ini."
            mergedHasilParaf
          />
        </>
      ) : null}

      {isLeader ? <p className="print-section-label">Rincian Tugas Unit</p> : null}
      <table className="print-table print-table-wfh">
        <thead>
          <tr>
            <th className="col-no">NO</th>
            <th className="col-date">HARI/TANGGAL</th>
            <th>URAIAN KEGIATAN</th>
            <th className="col-hasil">HASIL/ PARAF</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td className="center">1</td>
              <td className="center">{dateLabel}</td>
              <td>-</td>
              <td>-</td>
            </tr>
          ) : (
            groups.flatMap((group) => {
              const rowCount = group.tasks.length;
              return group.tasks.map((task, index) => (
                <tr key={task.id}>
                  {index === 0 ? (
                    <>
                      <td className="center" rowSpan={rowCount}>
                        {group.no}
                      </td>
                      <td className="center" rowSpan={rowCount}>
                        {dateLabel}
                      </td>
                    </>
                  ) : null}
                  <td>
                    <PrintUraianCell task={task} />
                  </td>
                  <td className="center">
                    {task.status !== "dikerjakan" && taskWfhHasil(task) !== "-" ? (
                      <div className="print-wfh-output">{taskWfhHasil(task)}</div>
                    ) : null}
                    <PrintHasilParafCell task={task} includePenilaian={isLeader} />
                  </td>
                </tr>
              ));
            })
          )}
        </tbody>
      </table>

      <div className="print-wfh-sign">
        <p className="print-printed-on">dicetak pada : {formatPrintedOnDate()}</p>
        <p>Manokwari, {formatWfhSignDate(date)}</p>
        <div className="print-sign-space print-wfh-sign-space">
          <span>ttd</span>
        </div>
        <p className="print-sign-name">{print.author.name}</p>
        <p className="print-sign-nip">NIP {print.author.nip.replace(/\s+/g, "")}</p>
      </div>

      <PrintLampiranBukti tasks={lampiranTasks} />
    </div>
  );
}

function IdentityTable({
  person,
}: {
  person: { name: string; nip: string; pangkatGolongan: string; jabatan: string };
}) {
  return (
    <table className="print-id">
      <tbody>
        <IdRow label="Nama" value={person.name} />
        <IdRow label="NIP" value={person.nip} />
        <IdRow label="Pangkat" value={person.pangkatGolongan} />
        <IdRow label="Jabatan" value={person.jabatan} />
      </tbody>
    </table>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="print-id-label">{label}</td>
      <td className="print-id-colon">:</td>
      <td>{value}</td>
    </tr>
  );
}
