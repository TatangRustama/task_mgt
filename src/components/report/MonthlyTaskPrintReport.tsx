import { groupTasksByPrintDate, type LaporanPrintContext, type PrintUnitReviewRow } from "@/lib/laporan-print-view";
import { PrintLampiranBukti } from "@/components/report/PrintLampiranBukti";
import { MonthlyTaskDayRows } from "@/components/report/MonthlyTaskDayRows";
import type { ReportTask } from "@/lib/report-types";
import { getMonthYearLabel, formatPrintedOnDate } from "@/lib/utils";

export function MonthlyTaskPrintReport({
  month,
  year,
  tasks,
  print,
  isLeader = false,
  rows = [],
  leaderTasks = [],
}: {
  month: number;
  year: number;
  tasks: ReportTask[];
  print: LaporanPrintContext;
  isLeader?: boolean;
  rows?: PrintUnitReviewRow[];
  leaderTasks?: ReportTask[];
}) {
  const groupedRows = groupTasksByPrintDate(tasks).flatMap((group) => group.tasks);
  const mandiriRows = groupTasksByPrintDate(leaderTasks).flatMap((group) => group.tasks);
  const period = getMonthYearLabel(month, year).toUpperCase();
  const lampiranTasks = [...mandiriRows, ...groupedRows];

  return (
    <div className="print-kinerja hidden print:block">
      {!isLeader ? (
        <header className="print-kop">
          <img src="/branding/papua-barat.png" alt="Lambang Papua Barat" className="print-kop-logo" />
          <div className="print-kop-text">
            <p className="print-kop-gov">{print.kopGovernment}</p>
            <p className="print-kop-agency">{print.kopAgency}</p>
            <p className="print-kop-meta">{print.kopAddress}</p>
            <p className="print-kop-meta">Laman {print.kopWebsite}</p>
          </div>
        </header>
      ) : null}

      <h1 className="print-title">
        {isLeader ? "LAPORAN PENILAIAN KINERJA BULANAN" : "LAPORAN PELAKSANAAN KINERJA BULANAN"} {period}
      </h1>

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
          <TaskTable
            tasks={mandiriRows}
            authorName={print.author.name}
            empty="Tidak ada tugas mandiri pada periode ini."
            showAtasanPenilaian
          />

          <p className="print-section-label">Review Tugas Unit</p>
          <table className="print-table">
            <thead>
              <tr>
                <th>Nama / unit</th>
                <th>Predikat</th>
                <th>Disetujui</th>
                <th>Ditolak</th>
                <th>Nilai</th>
                <th>Tepat waktu</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="print-empty-cell">
                    Tidak ada bawahan yang dinilai pada periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.name + row.role + row.identity}>
                    <td>
                      <strong>{row.name}</strong>
                      <br />
                      {row.identity}
                      <br />
                      {row.kedudukanHukum}
                      <br />
                      {row.role}
                    </td>
                    <td>{row.insight}</td>
                    <td>{row.completed}</td>
                    <td>{row.rejected}</td>
                    <td>{row.averageScore ? `${row.averageScore}/3` : "-"}</td>
                    <td>{row.completed ? `${row.onTimePercent}%` : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      ) : null}

      <p className="print-section-label">{isLeader ? "Rincian Tugas Unit" : "Uraian tugas"}</p>
      <TaskTable
        tasks={groupedRows}
        authorName={print.author.name}
        empty="Tidak ada tugas pada periode ini."
      />

      <p className="print-printed-on">dicetak pada : {formatPrintedOnDate()}</p>
      <div className="print-sign">
        <div>
          <p>Mengetahui atasan langsung,</p>
          <p className="print-sign-jabatan">{print.atasan?.jabatan || "Atasan langsung"}</p>
          <div className="print-sign-space">
            <span>ttd</span>
          </div>
          <p className="print-sign-name">{print.atasan?.name || "_________________________"}</p>
          <p>NIP. {print.atasan?.nip || "-"}</p>
        </div>
        <div className="print-sign-qr">
          {print.qrDataUrl ? (
            <img src={print.qrDataUrl} alt={`QR validasi laporan ${print.reportId}`} className="print-qr" />
          ) : null}
          <p className="print-report-id">ID laporan: {print.reportId}</p>
        </div>
        <div>
          <p>Dibuat oleh,</p>
          <p className="print-sign-jabatan">{print.author.jabatan}</p>
          <div className="print-sign-space">
            <span>ttd</span>
          </div>
          <p className="print-sign-name">{print.author.name}</p>
          <p>NIP. {print.author.nip}</p>
        </div>
      </div>

      <PrintLampiranBukti tasks={lampiranTasks} />
    </div>
  );
}

function TaskTable({
  tasks,
  authorName,
  empty,
  showAtasanPenilaian = false,
}: {
  tasks: ReportTask[];
  authorName: string;
  empty: string;
  showAtasanPenilaian?: boolean;
}) {
  const colSpan = showAtasanPenilaian ? 6 : 5;
  return (
    <table className="print-table print-table-tasks">
      <thead>
        <tr>
          <th className="col-no">No.</th>
          <th className="col-date">Hari/Tgl</th>
          <th>Uraian Tugas</th>
          <th>Keterangan</th>
          <th className="col-hasil">Hasil</th>
          {showAtasanPenilaian ? <th>Penilaian Atasan</th> : null}
        </tr>
      </thead>
      <tbody>
        {tasks.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className="print-empty-cell">
              {empty}
            </td>
          </tr>
        ) : (
          <MonthlyTaskDayRows
            tasks={tasks}
            authorName={authorName}
            showAtasanPenilaian={showAtasanPenilaian}
          />
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
        <IdRow label="Pangkat/Golongan" value={person.pangkatGolongan} />
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
