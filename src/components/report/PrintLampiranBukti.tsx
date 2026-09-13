import { evidenceRows, printPhotoSrc } from "@/lib/laporan-print-view";
import type { ReportTask } from "@/lib/report-types";

export function PrintLampiranBukti({ tasks }: { tasks: ReportTask[] }) {
  const rows = evidenceRows(tasks);
  if (rows.length === 0) return null;

  return (
    <section className="print-lampiran">
      <h2 className="print-subtitle">Lampiran</h2>
      <p className="print-lampiran-caption">Bukti Dokumen</p>
      <table className="print-table print-table-bukti">
        <thead>
          <tr>
            <th className="col-no">No.</th>
            <th className="col-date">Hari/Tgl</th>
            <th>Bukti Visual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.date}-${index}`}>
              <td className="center">{index + 1}</td>
              <td className="center">{row.date}</td>
              <td>
                <p className="print-bukti-title">{row.title}</p>
                <div className="print-photos print-photos-lampiran">
                  {row.photos.map((url) => (
                    <img
                      key={url}
                      src={printPhotoSrc(url)}
                      alt={row.title}
                      className="print-bukti-img"
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
