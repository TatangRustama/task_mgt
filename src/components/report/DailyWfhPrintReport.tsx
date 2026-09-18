import { groupTasksForWfhPrint, type DailyLaporanPrintContext } from "@/lib/laporan-print-view";
import { PrintLampiranBukti } from "@/components/report/PrintLampiranBukti";
import {
  PrintDailyHasilParafCell,
  PrintDailyKeteranganCell,
  PrintUraianCell,
} from "@/components/report/PrintTaskCells";
import type { ReportTask } from "@/lib/report-types";
import { formatPrintedOnDate, formatWfhReportDate } from "@/lib/utils";

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
          <p className="print-section-label">Rincian Tugas Individu</p>
          <DailyIndividuTaskTable
            tasks={leaderTasks}
            empty="Tidak ada tugas individu pada tanggal ini."
          />
        </>
      ) : null}

      {isLeader ? <p className="print-section-label">Rincian Tugas Unit</p> : null}
      <DailyUnitTaskTable tasks={tasks} />

      <div className="print-wfh-sign">
        <p className="print-printed-on">dicetak pada : {formatPrintedOnDate()}</p>
        <p className="print-sign-jabatan">{print.author.jabatan}</p>
        <div className="print-sign-space print-wfh-sign-space">
          <span>ttd</span>
        </div>
        <p className="print-sign-name">{print.author.name}</p>
        <p className="print-sign-nip">NIP {print.author.nip.replace(/\s+/g, "")}</p>
      </div>

      <PrintLampiranBukti tasks={lampiranTasks} showDate={false} />
    </div>
  );
}

function DailyIndividuTaskTable({ tasks, empty }: { tasks: ReportTask[]; empty: string }) {
  return (
    <table className="print-table print-table-tasks print-table-daily">
      <thead>
        <tr>
          <th className="col-no">No.</th>
          <th>Uraian Tugas</th>
          <th className="col-keterangan">Keterangan</th>
          <th className="col-hasil">Hasil/ Paraf</th>
        </tr>
      </thead>
      <tbody>
        {tasks.length === 0 ? (
          <tr>
            <td colSpan={4} className="print-empty-cell">
              {empty}
            </td>
          </tr>
        ) : (
          tasks.map((task, index) => (
            <tr key={task.id}>
              <td className="center">{index + 1}</td>
              <td>
                <PrintUraianCell task={task} />
              </td>
              <td>
                <PrintDailyKeteranganCell task={task} />
              </td>
              <td className="center">
                <PrintDailyHasilParafCell task={task} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function DailyUnitTaskTable({ tasks }: { tasks: ReportTask[] }) {
  const groups = groupTasksForWfhPrint(tasks);

  return (
    <table className="print-table print-table-wfh print-table-daily">
      <thead>
        <tr>
          <th className="col-no">NO</th>
          <th>URAIAN KEGIATAN</th>
          <th className="col-keterangan">KETERANGAN</th>
          <th className="col-hasil">HASIL/ PARAF</th>
        </tr>
      </thead>
      <tbody>
        {groups.length === 0 ? (
          <tr>
            <td className="center">1</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
          </tr>
        ) : (
          groups.flatMap((group) => {
            const rowCount = group.tasks.length;
            return group.tasks.map((task, index) => (
              <tr key={task.id}>
                {index === 0 ? (
                  <td className="center" rowSpan={rowCount}>
                    {group.no}
                  </td>
                ) : null}
                <td>
                  <PrintUraianCell task={task} />
                </td>
                <td>
                  <PrintDailyKeteranganCell task={task} />
                </td>
                <td className="center">
                  <PrintDailyHasilParafCell task={task} />
                </td>
              </tr>
            ));
          })
        )}
      </tbody>
    </table>
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
