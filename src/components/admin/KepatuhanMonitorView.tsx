"use client";

import { useMemo, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Loader2,
  SlidersHorizontal,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { AppLoader } from "@/components/layout/AppLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  KepatuhanFilters,
  KepatuhanPeriodMode,
  KepatuhanRow,
  KepatuhanStatusFilter,
  KepatuhanSummary,
} from "@/lib/kepatuhan-monitor";
import type { UnorChoice } from "@/lib/task-monitor-shared";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

const UNOR_LABELS = ["Unor", "Unor tingkat 2", "Unor tingkat 3"];
type UnorLevels = [UnorChoice[], UnorChoice[], UnorChoice[]];

function buildHref(filters: KepatuhanFilters) {
  const params = new URLSearchParams();
  params.set("mode", filters.mode);
  if (filters.mode === "bulanan") params.set("month", filters.month);
  else params.set("date", filters.date);
  if (filters.pd) params.set("pd", filters.pd);
  filters.unor.forEach((id, index) => {
    if (id) params.set(`u${index + 1}`, id);
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  return `/admin/kepatuhan?${params.toString()}`;
}

function statusNote(row: KepatuhanRow) {
  if (row.isCompliant) return `Sudah input (${row.validCount} tugas)`;
  if (row.reason === "ditolak") return `Ditolak pimpinan (${row.rejectedCount} tugas)`;
  return "Belum input (0 tugas)";
}

function formatSupervisorMessage(
  template: string,
  atasanName: string,
  periodLabel: string,
  items: KepatuhanRow[],
) {
  const lines = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} (${item.idLabel}) — ${item.unitName} [${statusNote(item)}]`,
    )
    .join("\n");

  return template
    .replaceAll("{{atasan}}", atasanName)
    .replaceAll("{{periode}}", periodLabel)
    .replaceAll("{{daftar_pegawai}}", lines);
}

function csvEscape(value: string | number) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function renderStatusBadge(row: KepatuhanRow) {
  const compact = "shrink-0 px-1.5 py-0 text-[10px] leading-4 font-medium";
  if (row.isCompliant) {
    return (
      <Badge
        variant="disetujui"
        className={`${compact} border border-emerald-200 bg-emerald-50 text-emerald-700`}
      >
        Sudah ({row.validCount})
      </Badge>
    );
  }
  if (row.reason === "ditolak") {
    return (
      <Badge
        variant="ditolak"
        className={`${compact} border border-amber-200 bg-amber-50 text-amber-700`}
      >
        Ditolak ({row.rejectedCount})
      </Badge>
    );
  }
  return (
    <Badge
      variant="ditolak"
      className={`${compact} border border-rose-200 bg-rose-50 text-rose-700`}
    >
      Belum Input
    </Badge>
  );
}

export function KepatuhanMonitorView({
  rows,
  summary,
  perangkatDaerah,
  unorOptions,
  filters,
  periodLabel,
  perangkatLocked,
  queried,
  messageTemplate,
}: {
  rows: KepatuhanRow[];
  summary: KepatuhanSummary;
  perangkatDaerah: UnorChoice[];
  unorOptions: UnorLevels;
  filters: KepatuhanFilters;
  periodLabel: string;
  perangkatLocked: boolean;
  queried: boolean;
  messageTemplate: string;
}) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mode, setMode] = useState<KepatuhanPeriodMode>(filters.mode);
  const [date, setDate] = useState(filters.date);
  const [month, setMonth] = useState(filters.month);
  const [pd, setPd] = useState(filters.pd);
  const [selected, setSelected] = useState<[string, string, string]>(filters.unor);
  const [options, setOptions] = useState<UnorLevels>(unorOptions);
  const [q, setQ] = useState(filters.q);
  const [loading, setLoading] = useState(false);
  const [viewBy, setViewBy] = useState<"pegawai" | "atasan">("pegawai");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function openFilterModal() {
    setMode(filters.mode);
    setDate(filters.date);
    setMonth(filters.month);
    setPd(filters.pd);
    setSelected(filters.unor);
    setOptions(unorOptions);
    setQ(filters.q);
    setFilterOpen(true);
  }

  function navigateWith(next: KepatuhanFilters) {
    const href = buildHref(next);
    const current = `${window.location.pathname}${window.location.search}`;
    if (href === current) {
      setFilterOpen(false);
      return;
    }
    flushSync(() => setLoading(true));
    setFilterOpen(false);
    router.push(href);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateWith({
      mode,
      date,
      month,
      pd,
      unor: selected,
      q: q.trim(),
      status: filters.status,
    });
  }

  function onStatusChange(status: KepatuhanStatusFilter) {
    navigateWith({ ...filters, status });
  }

  async function loadLevel(level: number, parentId: string, perangkatId?: string) {
    const params = new URLSearchParams();
    if (parentId) params.set("parentId", parentId);
    else if (perangkatId) params.set("perangkatDaerahId", perangkatId);
    const res = await fetch(`/api/admin/pegawai/unor?${params.toString()}`);
    const data = res.ok ? await res.json() : { items: [] };
    const items: UnorChoice[] = data.items ?? [];
    setOptions((current) => {
      const next: UnorLevels = [[], [], []];
      for (let index = 0; index < 3; index += 1) {
        if (index < level) next[index] = current[index];
        else if (index === level) next[index] = items;
      }
      return next;
    });
  }

  async function onPerangkatChange(value: string) {
    setPd(value);
    setSelected(["", "", ""]);
    setOptions([[], [], []]);
    if (value) await loadLevel(0, "", value);
  }

  async function onUnorChange(level: number, value: string) {
    setSelected((current) => {
      const next: [string, string, string] = [current[0], current[1], current[2]];
      next[level] = value;
      for (let index = level + 1; index < 3; index += 1) next[index] = "";
      return next;
    });
    setOptions((current) => {
      const next: UnorLevels = [[], [], []];
      for (let index = 0; index < 3; index += 1) {
        next[index] = index > level ? [] : current[index];
      }
      return next;
    });
    if (value && level + 1 < 3) await loadLevel(level + 1, value);
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  const groupedBySupervisor = useMemo(() => {
    const map = new Map<
      string,
      { key: string; atasanName: string; atasanIdLabel: string; items: KepatuhanRow[] }
    >();
    for (const row of rows) {
      const key = row.atasanId ?? `none:${row.atasanName}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(row);
      } else {
        map.set(key, {
          key,
          atasanName: row.atasanName,
          atasanIdLabel: row.atasanIdLabel,
          items: [row],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [rows]);

  function onCopyAllNonCompliant() {
    const nonCompliant = rows.filter((r) => !r.isCompliant);
    if (nonCompliant.length === 0) return;
    const bySup = new Map<string, { atasanName: string; items: KepatuhanRow[] }>();
    for (const item of nonCompliant) {
      const key = item.atasanId ?? item.atasanName;
      const group = bySup.get(key);
      if (group) group.items.push(item);
      else bySup.set(key, { atasanName: item.atasanName, items: [item] });
    }
    const text = Array.from(bySup.values())
      .map((g) => formatSupervisorMessage(messageTemplate, g.atasanName, periodLabel, g.items))
      .join("\n\n---\n\n");
    void copyText("all", text);
  }

  function onExportCsv() {
    const header = [
      "Nama Pegawai",
      "Identitas",
      "Unit Kerja",
      "Atasan Langsung",
      "Status Kepatuhan",
      "Tugas Valid",
      "Tugas Ditolak",
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.idLabel,
        r.unitName,
        r.atasanName,
        statusNote(r),
        r.validCount,
        r.rejectedCount,
      ]
        .map(csvEscape)
        .join(","),
    );
    const bom = "\uFEFF";
    const blob = new Blob([bom + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kepatuhan-kinerja-${filters.mode === "bulanan" ? filters.month : filters.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const activePdName = perangkatDaerah.find((item) => item.id === filters.pd)?.name;

  return (
    <div className="space-y-4">
      {loading ? <AppLoader label="Memuat data..." /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant">
          <span>
            Periode: <strong className="text-on-surface">{periodLabel}</strong>
          </span>
          {activePdName ? (
            <span>
              OPD: <strong className="text-on-surface">{activePdName}</strong>
            </span>
          ) : null}
          {filters.q ? (
            <span>
              Cari: <strong className="text-on-surface">{filters.q}</strong>
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openFilterModal}
          className="h-9 gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter Kepatuhan Input Kinerja</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Periode</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1">
                <button
                  type="button"
                  onClick={() => setMode("harian")}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition",
                    mode === "harian"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  Harian
                </button>
                <button
                  type="button"
                  onClick={() => setMode("bulanan")}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition",
                    mode === "bulanan"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  Bulanan
                </button>
              </div>
            </div>

            {mode === "harian" ? (
              <div className="space-y-1">
                <Label htmlFor="kepatuhan-date">Tanggal</Label>
                <Input
                  id="kepatuhan-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="kepatuhan-month">Bulan</Label>
                <Input
                  id="kepatuhan-month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            )}

            {!perangkatLocked ? (
              <div className="space-y-1">
                <Label htmlFor="kepatuhan-pd">Perangkat Daerah</Label>
                <select
                  id="kepatuhan-pd"
                  className={selectClassName}
                  value={pd}
                  onChange={(e) => void onPerangkatChange(e.target.value)}
                >
                  <option value="">Pilih perangkat daerah</option>
                  {perangkatDaerah.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Perangkat Daerah</Label>
                <div className="flex h-10 items-center rounded-lg border border-outline-variant bg-surface-container-low px-3 text-xs text-on-surface">
                  <span className="truncate">{perangkatDaerah[0]?.name ?? "OPD"}</span>
                </div>
              </div>
            )}

            {pd ? (
              <div className="space-y-2">
                {UNOR_LABELS.map((label, level) =>
                  options[level].length > 0 ? (
                    <div key={label} className="space-y-1">
                      <Label htmlFor={`kepatuhan-u${level + 1}`}>{label}</Label>
                      <select
                        id={`kepatuhan-u${level + 1}`}
                        className={selectClassName}
                        value={selected[level]}
                        onChange={(e) => void onUnorChange(level, e.target.value)}
                      >
                        <option value="">Semua {label.toLowerCase()}</option>
                        {options[level].map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="kepatuhan-q">Cari Nama / NIP</Label>
              <Input
                id="kepatuhan-q"
                placeholder="Nama atau NIP..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Terapkan Filter
              </Button>
              <Link
                href="/admin/kepatuhan"
                onClick={() => {
                  setFilterOpen(false);
                  if (window.location.search) setLoading(true);
                }}
                className="inline-flex h-10 items-center rounded-lg border border-outline-variant px-4 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low"
              >
                Reset
              </Link>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {!queried ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-on-surface-variant">
            Klik tombol <strong>Filter</strong> lalu pilih <strong>Perangkat Daerah</strong> atau
            cari <strong>Nama / NIP</strong> untuk menampilkan data kepatuhan.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onStatusChange("semua")}
              className={cn(
                "rounded-xl border bg-surface-container-lowest p-4 text-left transition hover:border-primary",
                filters.status === "semua" ? "border-primary ring-1 ring-primary" : "border-outline-variant",
              )}
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Total Pegawai</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1 text-2xl font-bold text-on-surface">{summary.totalPegawai}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">Klik untuk lihat semua</p>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange("sudah")}
              className={cn(
                "rounded-xl border bg-surface-container-lowest p-4 text-left transition hover:border-emerald-500",
                filters.status === "sudah" ? "border-emerald-600 ring-1 ring-emerald-600" : "border-outline-variant",
              )}
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Sudah Input</span>
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {summary.sudahInput}{" "}
                <span className="text-sm font-medium text-on-surface-variant">
                  ({summary.persentaseSudah}%)
                </span>
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">Minimal 1 tugas valid</p>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange("belum")}
              className={cn(
                "rounded-xl border bg-surface-container-lowest p-4 text-left transition hover:border-rose-500",
                filters.status === "belum" ? "border-rose-600 ring-1 ring-rose-600" : "border-outline-variant",
              )}
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Belum Input</span>
                <UserX className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-1 text-2xl font-bold text-rose-700">{summary.belumInput}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {summary.ditolakOnly > 0
                  ? `Termasuk ${summary.ditolakOnly} ditolak pimpinan`
                  : "0 tugas / ditolak pimpinan"}
              </p>
            </button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: "belum", label: `Belum Input (${summary.belumInput})` },
                      { key: "sudah", label: `Sudah Input (${summary.sudahInput})` },
                      { key: "semua", label: `Semua (${summary.totalPegawai})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => onStatusChange(tab.key)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                        filters.status === tab.key
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border border-outline-variant bg-surface-container-low p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewBy("pegawai")}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition",
                        viewBy === "pegawai"
                          ? "bg-surface-container-lowest text-on-surface shadow-sm"
                          : "text-on-surface-variant",
                      )}
                    >
                      Per Pegawai
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewBy("atasan")}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition",
                        viewBy === "atasan"
                          ? "bg-surface-container-lowest text-on-surface shadow-sm"
                          : "text-on-surface-variant",
                      )}
                    >
                      Per Atasan
                    </button>
                  </div>

                  {rows.some((r) => !r.isCompliant) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onCopyAllNonCompliant}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {copiedKey === "all" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      )}
                      {copiedKey === "all" ? "Tersalin" : "Salin Pesan Atasan"}
                    </Button>
                  ) : null}

                  {rows.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onExportCsv}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </Button>
                  ) : null}
                </div>
              </div>
              <CardTitle className="sr-only">Daftar Kepatuhan Pegawai</CardTitle>
            </CardHeader>

            <CardContent>
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-on-surface-variant">
                  <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-600" />
                  <p>
                    {filters.status === "belum"
                      ? "Semua pegawai pada filter ini sudah menginput kinerja."
                      : "Tidak ada data pegawai yang cocok dengan filter ini."}
                  </p>
                </div>
              ) : viewBy === "pegawai" ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant text-xs text-on-surface-variant">
                        <th className="py-2.5 pr-3 font-medium">Pegawai</th>
                        <th className="py-2.5 px-3 font-medium">Atasan Langsung</th>
                        <th className="py-2.5 pl-3 font-medium">Unit Kerja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {rows.map((row) => {
                        const rowCopyKey = `row-${row.userId}`;
                        return (
                          <tr key={row.userId} className="hover:bg-surface-container-low/50">
                            <td className="py-2.5 pr-3 align-top">
                              <div className="flex max-w-[260px] items-center gap-1.5">
                                <p
                                  title={row.name}
                                  className="min-w-0 truncate font-medium text-on-surface"
                                >
                                  {row.name}
                                </p>
                                {renderStatusBadge(row)}
                              </div>
                              <p className="mt-0.5 text-xs text-on-surface-variant">{row.idLabel}</p>
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <div className="flex items-stretch gap-2.5">
                                {!row.isCompliant ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void copyText(
                                        rowCopyKey,
                                        formatSupervisorMessage(
                                          messageTemplate,
                                          row.atasanName,
                                          periodLabel,
                                          [row],
                                        ),
                                      )
                                    }
                                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                                  >
                                    {copiedKey === rowCopyKey ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                        Tersalin
                                      </>
                                    ) : (
                                      <>
                                        <ClipboardCopy className="h-3.5 w-3.5" />
                                        Salin Info
                                      </>
                                    )}
                                  </button>
                                ) : null}
                                <div className="min-w-0 max-w-[220px]">
                                  <p
                                    title={row.atasanName}
                                    className="truncate text-xs font-medium text-on-surface"
                                  >
                                    {row.atasanName}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                                    {row.atasanIdLabel}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 pl-3 align-top">
                              <p className="text-xs text-on-surface">{row.unitName}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedBySupervisor.map((group) => {
                    const nonCompliantItems = group.items.filter((i) => !i.isCompliant);
                    const groupCopyKey = `group-${group.key}`;
                    return (
                      <div
                        key={group.key}
                        className="rounded-xl border border-outline-variant bg-surface-container-low p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 pb-2">
                          <div>
                            <p className="text-sm font-semibold text-on-surface">
                              {group.atasanName}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {group.atasanIdLabel} · {group.items.length} pegawai
                            </p>
                          </div>
                          {nonCompliantItems.length > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void copyText(
                                  groupCopyKey,
                                  formatSupervisorMessage(
                                    messageTemplate,
                                    group.atasanName,
                                    periodLabel,
                                    nonCompliantItems,
                                  ),
                                )
                              }
                              className="h-8 gap-1.5 border-emerald-200 bg-emerald-50 text-xs text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                            >
                              {copiedKey === groupCopyKey ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <ClipboardCopy className="h-3.5 w-3.5" />
                              )}
                              {copiedKey === groupCopyKey
                                ? "Tersalin"
                                : `Salin Info (${nonCompliantItems.length})`}
                            </Button>
                          ) : null}
                        </div>
                        <ul className="mt-2 divide-y divide-outline-variant/50">
                          {group.items.map((item) => (
                            <li
                              key={item.userId}
                              className="flex items-center justify-between gap-2 py-2 text-xs"
                            >
                              <div>
                                <span className="font-medium text-on-surface">{item.name}</span>
                                <span className="ml-2 text-on-surface-variant">
                                  ({item.idLabel}) · {item.unitName}
                                </span>
                              </div>
                              {renderStatusBadge(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
