import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MonthlyTaskDayRows } from "@/components/report/MonthlyTaskDayRows";
import { evidenceRows, getValidasiLaporan } from "@/lib/laporan-print";
import { getMonthYearLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ValidasiLaporanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getValidasiLaporan(id);

  if (!data) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-lg font-semibold text-on-surface">Laporan tidak ditemukan</p>
            <p className="text-sm text-on-surface-variant">
              ID laporan tidak valid atau dokumen ini belum tercatat.
            </p>
            <p className="text-xs text-tertiary">ID: {id}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { report, author, atasan, tasks } = data;
  const period = getMonthYearLabel(report.month, report.year);
  const bukti = evidenceRows(tasks);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
      <header className="mb-6 flex items-center gap-4 border-b-2 border-primary-container pb-4">
        <img src="/branding/papua-barat.png" alt="Lambang Papua Barat" className="h-20 w-16 object-contain" />
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-secondary">PEMERINTAH PROVINSI PAPUA BARAT</p>
          <p className="text-lg font-bold text-on-surface">Validasi Laporan Tugas</p>
          <p className="text-sm text-on-surface-variant">Laporan Pelaksanaan Kinerja Bulanan {period}</p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="disetujui">Terverifikasi</Badge>
        <p className="text-xs text-tertiary">ID laporan: {report.id}</p>
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-4 py-4 text-sm">
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">Pembuat laporan</p>
            <Identity person={author} />
          </section>
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
              Atasan langsung / pemberi tugas
            </p>
            {atasan ? <Identity person={atasan} /> : <p className="text-on-surface-variant">Tidak ada atasan langsung.</p>}
          </section>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="overflow-x-auto py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">Tugas yang dilaporkan</p>
          {tasks.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Tidak ada tugas selesai pada laporan ini.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-on-surface-variant">
                  <th className="py-2 pr-2">No.</th>
                  <th className="py-2 pr-2">Hari/Tgl</th>
                  <th className="py-2 pr-2">Uraian Tugas</th>
                  <th className="py-2 pr-2">Keterangan</th>
                  <th className="py-2">Hasil</th>
                </tr>
              </thead>
              <tbody>
                <MonthlyTaskDayRows
                  tasks={tasks}
                  authorName={author.name}
                  cellClassName="py-2 pr-2"
                  rowClassName="border-b border-outline-variant align-top"
                />
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {bukti.length > 0 ? (
        <Card>
          <CardContent className="space-y-4 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
              Lampiran — Bukti dokumen
            </p>
            {bukti.map((row, index) => (
              <div key={`${row.date}-${index}`}>
                <p className="mb-2 text-sm font-medium text-on-surface">
                  {index + 1}. {row.date} — {row.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {row.photos.map((url) => (
                    <div key={url} className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
                      <img src={url} alt={row.title} className="max-h-80 w-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function Identity({
  person,
}: {
  person: { name: string; nip: string; pangkatGolongan: string; jabatan: string };
}) {
  return (
    <dl className="grid grid-cols-[9rem_1fr] gap-x-2 gap-y-1 text-on-surface">
      <dt className="text-on-surface-variant">Nama</dt>
      <dd>{person.name}</dd>
      <dt className="text-on-surface-variant">NIP</dt>
      <dd>{person.nip}</dd>
      <dt className="text-on-surface-variant">Pangkat/Golongan</dt>
      <dd>{person.pangkatGolongan}</dd>
      <dt className="text-on-surface-variant">Jabatan</dt>
      <dd>{person.jabatan}</dd>
    </dl>
  );
}
