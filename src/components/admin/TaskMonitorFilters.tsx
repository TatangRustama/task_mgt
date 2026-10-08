"use client";

import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { AppLoader } from "@/components/layout/AppLoader";
import { Button } from "@/components/ui/button";
import { Collapse } from "@/components/ui/collapse";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TASK_STAGE_OPTIONS, type TaskMonitorFilterValues, type UnorChoice } from "@/lib/task-monitor-shared";
import { cn, formatDate, parseISODate } from "@/lib/utils";

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

const UNOR_LABELS = ["Unor", "Unor tingkat 2", "Unor tingkat 3"];

type UnorLevels = [UnorChoice[], UnorChoice[], UnorChoice[]];

export function TaskMonitorFilters({
  perangkatDaerah,
  filters,
  unorOptions,
  showReset,
}: {
  perangkatDaerah: UnorChoice[];
  filters: TaskMonitorFilterValues;
  unorOptions: UnorLevels;
  showReset: boolean;
}) {
  const router = useRouter();
  const [pd, setPd] = useState(filters.pd);
  const [selected, setSelected] = useState<[string, string, string]>(filters.unor);
  const [options, setOptions] = useState<UnorLevels>(unorOptions);
  const [open, setOpen] = useState(!showReset);
  const [loading, setLoading] = useState(false);

  function onApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    const href = query ? `/admin/monitoring?${query}` : "/admin/monitoring";
    const current = `${window.location.pathname}${window.location.search}`;
    if (href === current) return;
    flushSync(() => setLoading(true));
    router.push(href);
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

  async function onPerangkatDaerahChange(value: string) {
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

  const summary = filterSummary(filters, perangkatDaerah, unorOptions);

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
        aria-expanded={open}
        aria-controls="monitor-filters"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-on-surface">Filter</span>
          <span className="mt-0.5 block truncate text-xs text-on-surface-variant">{summary}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-outline transition-transform duration-300 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <Collapse open={open}>
        <form id="monitor-filters" method="get" className="grid gap-3 border-t border-outline-variant p-3 sm:grid-cols-2" onSubmit={onApply}>
      <div className="space-y-2">
        <Label htmlFor="monitor-pd">Perangkat daerah</Label>
        <select
          id="monitor-pd"
          name="pd"
          className={selectClassName}
          value={pd}
          onChange={(event) => void onPerangkatDaerahChange(event.target.value)}
        >
          <option value="">Semua perangkat daerah</option>
          {perangkatDaerah.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {options.map((items, index) =>
        items.length > 0 ? (
          <div key={UNOR_LABELS[index]} className="space-y-2">
            <Label htmlFor={`monitor-unor-${index}`}>{UNOR_LABELS[index]}</Label>
            <select
              id={`monitor-unor-${index}`}
              name={`u${index + 1}`}
              className={selectClassName}
              value={selected[index]}
              onChange={(event) => void onUnorChange(index, event.target.value)}
            >
              <option value="">Semua {UNOR_LABELS[index].toLowerCase()}</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null,
      )}
      <div className="space-y-2">
        <Label htmlFor="monitor-q">NIP / NIK</Label>
        <Input
          id="monitor-q"
          name="q"
          defaultValue={filters.q}
          inputMode="numeric"
          placeholder="Nomor pegawai yang mengerjakan"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monitor-date">Tanggal</Label>
        <Input id="monitor-date" name="date" type="date" defaultValue={filters.date} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monitor-sumber">Delegasi / mandiri</Label>
        <select id="monitor-sumber" name="sumber" className={selectClassName} defaultValue={filters.sumber}>
          <option value="">Semua sumber</option>
          <option value="delegasi">Delegasi</option>
          <option value="mandiri">Mandiri</option>
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="monitor-tahap">Tahapan tugas</Label>
        <select id="monitor-tahap" name="tahap" className={selectClassName} defaultValue={filters.tahap}>
          <option value="">Semua tahapan</option>
          {TASK_STAGE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-on-surface-variant">
          Open adalah tugas tersedia. Dikerjakan mencakup tugas yang sedang dikerjakan atau ditolak. Telah selesai
          mencakup tugas yang menunggu approval dan yang sudah disetujui.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={loading}>
          Terapkan filter
        </Button>
        {showReset ? (
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/monitoring">Reset</Link>
          </Button>
        ) : null}
      </div>
        </form>
      </Collapse>
      {loading ? <AppLoader label="Memuat data tugas" /> : null}
    </div>
  );
}

function filterSummary(
  filters: TaskMonitorFilterValues,
  perangkatDaerah: UnorChoice[],
  unorOptions: UnorLevels,
) {
  const parts: string[] = [];
  const pdName = perangkatDaerah.find((item) => item.id === filters.pd)?.name;
  if (pdName) parts.push(pdName);
  filters.unor.forEach((id, index) => {
    const name = unorOptions[index]?.find((item) => item.id === id)?.name;
    if (name) parts.push(name);
  });
  if (filters.q) parts.push(filters.q);
  if (filters.date) parts.push(formatDate(parseISODate(filters.date)));
  if (filters.sumber === "delegasi") parts.push("Delegasi");
  if (filters.sumber === "mandiri") parts.push("Mandiri");
  const stage = TASK_STAGE_OPTIONS.find((item) => item.value === filters.tahap);
  if (stage) parts.push(stage.label);
  return parts.length > 0 ? parts.join(" · ") : "Belum ada filter";
}
