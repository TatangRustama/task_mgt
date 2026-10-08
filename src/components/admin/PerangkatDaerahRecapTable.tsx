"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DASHBOARD_STATUSES,
  type PerangkatDaerahPegawaiRow,
  type PerangkatDaerahRecapRow,
} from "@/lib/admin-dashboard-shared";
import { taskMonitorHref } from "@/lib/task-monitor-shared";
import { cn } from "@/lib/utils";

const COLUMNS: { status: (typeof DASHBOARD_STATUSES)[number]; label: string }[] = [
  { status: "disetujui", label: "Disetujui" },
  { status: "menunggu_approval", label: "Menunggu" },
  { status: "dikerjakan", label: "Dikerjakan" },
  { status: "tersedia", label: "Tersedia" },
  { status: "ditolak", label: "Ditolak" },
  { status: "dibatalkan", label: "Batal" },
];

function taskTotals(rows: PerangkatDaerahRecapRow[]) {
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

function belumMelapor(row: PerangkatDaerahPegawaiRow) {
  return Math.max(0, row.pegawai - row.melapor);
}

function reportPercent(melapor: number, pegawai: number) {
  if (pegawai <= 0) return melapor > 0 ? "100%" : "-";
  return `${Math.round((melapor / pegawai) * 100)}%`;
}

function perangkatName(row: { id: string; name: string }) {
  if (!row.id) return row.name;
  return (
    <Link
      href={taskMonitorHref({ pd: row.id, unor: ["", "", ""], q: "", date: "", sumber: "", tahap: "", page: 1 })}
      className="hover:underline"
    >
      {row.name}
    </Link>
  );
}

export function PerangkatDaerahRecapTable({
  tasks,
  pegawai,
}: {
  tasks: PerangkatDaerahRecapRow[];
  pegawai: PerangkatDaerahPegawaiRow[];
}) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Rekap per perangkat daerah</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Tabs defaultValue="tugas">
          <div className="px-3">
            <TabsList>
              <TabsTrigger value="tugas" className="px-1 text-xs sm:text-sm">
                Tugas
              </TabsTrigger>
              <TabsTrigger value="pegawai" className="px-1 text-xs sm:text-sm">
                Pegawai
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tugas">
            <TaskRecap tasks={tasks} />
          </TabsContent>
          <TabsContent value="pegawai">
            <PegawaiRecap rows={pegawai} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TaskRecap({ tasks }: { tasks: PerangkatDaerahRecapRow[] }) {
  const footer = taskTotals(tasks);
  const listed = tasks.filter((row) => row.listed);
  const active = listed.filter((row) => row.total > 0).length;

  return (
    <>
      <p className="px-3 pb-3 text-sm text-on-surface-variant">
        {active} aktif melaporkan · {listed.length - active} belum aktif
      </p>
      {tasks.length === 0 ? (
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
              {tasks.map((row) => (
                <tr key={row.id || row.name} className="border-b border-outline-variant">
                  <td className="sticky left-0 max-w-56 bg-surface-container-lowest px-3 py-2 font-medium text-on-surface">
                    {perangkatName(row)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge active={row.total > 0} activeLabel="Aktif" idleLabel="Belum aktif" />
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
    </>
  );
}

function PegawaiRecap({ rows }: { rows: PerangkatDaerahPegawaiRow[] }) {
  const listed = rows.filter((row) => row.listed);
  const reporting = listed.filter((row) => row.melapor > 0).length;
  const footer = rows.reduce(
    (sum, row) => {
      sum.pegawai += row.pegawai;
      sum.melapor += row.melapor;
      sum.belum += belumMelapor(row);
      return sum;
    },
    { pegawai: 0, melapor: 0, belum: 0 },
  );

  return (
    <>
      <p className="px-3 pb-3 text-sm text-on-surface-variant">
        {reporting} perangkat daerah ada pegawai melapor · {listed.length - reporting} belum ada laporan
      </p>
      {rows.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-on-surface-variant">Tidak ada pegawai pada periode ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-y border-outline-variant text-[11px] uppercase tracking-wide text-on-surface-variant">
                <th className="sticky left-0 bg-surface-container-lowest px-3 py-2 font-medium">Perangkat daerah</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Pegawai</th>
                <th className="px-3 py-2 text-right font-medium">Melapor</th>
                <th className="px-3 py-2 text-right font-medium">Belum</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || row.name} className="border-b border-outline-variant">
                  <td className="sticky left-0 max-w-56 bg-surface-container-lowest px-3 py-2 font-medium text-on-surface">
                    {perangkatName(row)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge active={row.melapor > 0} activeLabel="Aktif" idleLabel="Belum" />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{row.pegawai}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.melapor}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{belumMelapor(row)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                    {reportPercent(row.melapor, row.pegawai)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-on-surface">
                <td className="sticky left-0 bg-surface-container-low px-3 py-2 font-semibold">Jumlah</td>
                <td className="bg-surface-container-low px-3 py-2" />
                <td className="bg-surface-container-low px-3 py-2 text-right font-semibold tabular-nums">{footer.pegawai}</td>
                <td className="bg-surface-container-low px-3 py-2 text-right font-semibold tabular-nums">{footer.melapor}</td>
                <td className="bg-surface-container-low px-3 py-2 text-right font-semibold tabular-nums">{footer.belum}</td>
                <td className="bg-surface-container-low px-3 py-2 text-right font-semibold tabular-nums">
                  {reportPercent(footer.melapor, footer.pegawai)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

function StatusBadge({
  active,
  activeLabel,
  idleLabel,
}: {
  active: boolean;
  activeLabel: string;
  idleLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        active ? "bg-emerald-50 text-emerald-700" : "bg-surface-container text-on-surface-variant",
      )}
    >
      {active ? activeLabel : idleLabel}
    </span>
  );
}
