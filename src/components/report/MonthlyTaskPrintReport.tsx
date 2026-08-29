import {
  evidenceRows,
  printHasil,
  printKeterangan,
  printParaf,
  printTaskDate,
  type LaporanPrintContext,
} from "@/lib/laporan-print";
import type { ReportTask } from "@/lib/report-types";
import { getMonthYearLabel } from "@/lib/utils";

export function MonthlyTaskPrintReport({
  month,
  year,
  tasks,
  print,
}: {
  month: number;
  year: number;
  tasks: ReportTask[];
  print: LaporanPrintContext;
}) {
  const rows = [...tasks].sort((a, b) => {
    const aTime = new Date(a.completedAt || a.createdAt).getTime();
    const bTime = new Date(b.completedAt || b.createdAt).getTime();
    return aTime - bTime;
  });
  const bukti = evidenceRows(rows);
  const period = getMonthYearLabel(month, year).toUpperCase();

  return (
    <div className="print-kinerja hidden print:block">
      <header className="print-kop">
        <img src="/branding/papua-barat.png" alt="Lambang Papua Barat" className="print-kop-logo" />
        <div className="print-kop-text">
          <p className="print-kop-gov">{print.kopGovernment}</p>
          <p className="print-kop-agency">{print.kopAgency}</p>
          <p className="print-kop-meta">{print.kopAddress}</p>
          <p className="print-kop-meta">Laman {print.kopWebsite}</p>
        </div>
      </header>

      <h1 className="print-title">LAPORAN PELAKSANAAN KINERJA BULANAN {period}</h1>

      <IdentityTable person={print.author} />

      <p className="print-section-label">Atasan langsung / Pemberi Tugas</p>
      {print.atasan ? (
        <IdentityTable person={print.atasan} />
      ) : (
        <p className="print-empty">Tidak ada atasan langsung.</p>
      )}

      <table className="print-table print-table-tasks">
        <thead>
          <tr>
            <th className="col-no">No.</th>
            <th className="col-date">Hari/Tgl</th>
            <th>Uraian Tugas</th>
            <th className="col-place">Tempat</th>
            <th className="col-hasil">Hasil</th>
            <th>Keterangan</th>
            <th className="col-paraf">Paraf</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="print-empty-cell">
                Tidak ada tugas pada periode ini.
              </td>
            </tr>
          ) : (
            rows.map((task, index) => (
              <tr key={task.id}>
                <td className="center">{index + 1}</td>
                <td className="center">{printTaskDate(task)}</td>
                <td>{task.title}</td>
                <td>{task.address || "-"}</td>
                <td>{printHasil(task)}</td>
                <td>{printKeterangan(task, print.author.name)}</td>
                <td className="center">{printParaf(task)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="print-subtitle">BUKTI DOKUMEN</h2>
      <table className="print-table print-table-bukti">
        <thead>
          <tr>
            <th className="col-no">No.</th>
            <th className="col-date">Hari/Tgl</th>
            <th>Bukti Visual</th>
          </tr>
        </thead>
        <tbody>
          {bukti.length === 0 ? (
            <tr>
              <td colSpan={3} className="print-empty-cell">
                Tidak ada bukti visual pada periode ini.
              </td>
            </tr>
          ) : (
            bukti.map((row, index) => (
              <tr key={`${row.date}-${index}`}>
                <td className="center">{index + 1}</td>
                <td className="center">{row.date}</td>
                <td>
                  <div className="print-photos">
                    {row.photos.map((url) => (
                      <img key={url} src={url} alt={row.title} />
                    ))}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="print-sign">
        <div>
          <p>Mengetahui atasan langsung,</p>
          <p className="print-sign-jabatan">{print.atasan?.jabatan || "Atasan langsung"}</p>
          <div className="print-sign-space">
            {print.qrDataUrl ? (
              <img src={print.qrDataUrl} alt={`QR validasi laporan ${print.reportId}`} className="print-qr" />
            ) : null}
          </div>
          <p className="print-sign-name">{print.atasan?.name || "_________________________"}</p>
          <p>NIP. {print.atasan?.nip || "-"}</p>
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
