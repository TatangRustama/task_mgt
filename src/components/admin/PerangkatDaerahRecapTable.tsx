import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_STATUSES, type PerangkatDaerahRecapRow } from "@/lib/admin-dashboard";
import { taskMonitorHref } from "@/lib/task-monitor";
import { cn } from "@/lib/utils";

const COLUMNS: { status: (typeof DASHBOARD_STATUSES)[number]; label: string }[] = [
  { status: "disetujui", label: "Disetujui" },
  { status: "menunggu_approval", label: "Menunggu" },
  { status: "dikerjakan", label: "Dikerjakan" },
  { status: "tersedia", label: "Tersedia" },
  { status: "ditolak", label: "Ditolak" },
  { status: "dibatalkan", label: "Batal" },
];

function totals(rows: PerangkatDaerahRecapRow[]) {
  return rows.reduce(
    (sum, row) => {
      sum.total += row.total;
      for (const status of DASHBOARD_STATUSES) sum.counts[status] += row.counts[status];
      return sum;
    },
    {
      total: 0,
      counts: {
        disetujui: 0,
        menunggu_approval: 0,
        dikerjakan: 0,
        tersedia: 0,
        ditolak: 0,
        dibatalkan: 0,
      },
    },
  );
}

export function PerangkatDaerahRecapTable({ rows }: { rows: PerangkatDaerahRecapRow[] }) {
  const footer = totals(rows);
  const listed = rows.filter((row) => row.listed);
  const active = listed.filter((row) => row.total > 0).length;

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Rekap per perangkat daerah</CardTitle>
        <p className="text-sm text-on-surface-variant">
          {active} aktif melaporkan · {listed.length - active} belum aktif
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-on-surface-variant">Tidak ada tugas pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-y border-outline-variant text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="sticky left-0 bg-surface-container-lowest px-3 py-2 font-medium">Perangkat daerah</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {COLUMNS.map((column) => (
                    <th key={column.status} className="px-3 py-2 text-right font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id || row.name} className="border-b border-outline-variant">
                    <td className="sticky left-0 max-w-56 bg-surface-container-lowest px-3 py-2 font-medium text-on-surface">
                      {row.id ? (
                        <Link href={taskMonitorHref({ pd: row.id, unor: ["", "", ""], q: "", date: "", sumber: "", tahap: "", page: 1 })} className="hover:underline">
                          {row.name}
                        </Link>
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                          row.total > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-surface-container text-on-surface-variant",
                        )}
                      >
                        {row.total > 0 ? "Aktif" : "Belum aktif"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.total}</td>
                    {COLUMNS.map((column) => (
                      <td key={column.status} className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                        {row.counts[column.status]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-on-surface">
                  <td className="sticky left-0 bg-surface-container-low px-3 py-2 font-semibold">Jumlah</td>
                  <td className="bg-surface-container-low px-3 py-2" />
                  <td className="bg-surface-container-low px-3 py-2 text-right font-semibold tabular-nums">{footer.total}</td>
                  {COLUMNS.map((column) => (
                    <td
                      key={column.status}
                      className="bg-surface-container-low px-3 py-2 text-right font-semibold tabular-nums"
                    >
                      {footer.counts[column.status]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
