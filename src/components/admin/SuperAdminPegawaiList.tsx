"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { PegawaiDetailDialog } from "@/components/admin/PegawaiDetailDialog";
import { TambahPegawaiDialog } from "@/components/admin/TambahPegawaiDialog";
import { AppLoader } from "@/components/layout/AppLoader";
import { PageHeader } from "@/components/layout/PageMain";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kepegawaianStatus } from "@/lib/kepegawaian-status";
import { displayJabatan } from "@/lib/jabatan-display";
import { USER_PAGE_SIZES } from "@/lib/roles";
import { cn, formatNip } from "@/lib/utils";

const PEGAWAI_STATUS_OPTIONS = [
  { value: "cpns", label: "CPNS" },
  { value: "pns", label: "PNS" },
  { value: "pppk", label: "PPPK" },
  { value: "non_asn", label: "Non-ASN" },
] as const;

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

const MAX_UNOR_LEVELS = 3;

type PegawaiRow = {
  id: string;
  name: string;
  jenis: "asn" | "non_asn";
  nip: string | null;
  nik: string | null;
  jabatanNama: string | null;
  golonganNama: string | null;
  kedudukanHukum: string | null;
  unorNama: string | null;
  perangkatDaerahNama: string | null;
};

type Option = { id?: string; value?: string; name?: string; label?: string };
type UnorOption = { id: string; name: string };
type UnorSelection = [string, string, string];

type PegawaiFilters = {
  query: string;
  golongan: string;
  status: string;
  perangkatDaerahId: string;
  unor: UnorSelection;
};

function emptyFilters(): PegawaiFilters {
  return { query: "", golongan: "", status: "", perangkatDaerahId: "", unor: ["", "", ""] };
}

function copyFilters(filters: PegawaiFilters): PegawaiFilters {
  return { ...filters, unor: [filters.unor[0], filters.unor[1], filters.unor[2]] };
}

function activeFilterCount(filters: PegawaiFilters) {
  return [filters.query, filters.golongan, filters.status, filters.perangkatDaerahId, ...filters.unor].filter(Boolean)
    .length;
}

export function SuperAdminPegawaiList({
  subtitle = "Seluruh data pegawai. Saring berdasarkan nama, NIP/NIK, pangkat/golongan, jenis pegawai, dan unit organisasi.",
  allowAsn = true,
}: {
  subtitle?: string;
  allowAsn?: boolean;
}) {
  const [rows, setRows] = useState<PegawaiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(USER_PAGE_SIZES[0]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<PegawaiFilters>(emptyFilters);
  const [applied, setApplied] = useState<PegawaiFilters>(emptyFilters);
  const [unorOptions, setUnorOptions] = useState<UnorOption[][]>([[], [], []]);
  const unorRequest = useRef(0);
  const [golonganOptions, setGolonganOptions] = useState<Option[]>([]);
  const [perangkatDaerah, setPerangkatDaerah] = useState<UnorOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const appliedCount = activeFilterCount(applied);
  const deepestUnor = [...applied.unor].reverse().find((id) => id) || "";

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (applied.query) params.set("q", applied.query);
    if (applied.golongan) params.set("golongan", applied.golongan);
    if (applied.status) params.set("status", applied.status);
    if (applied.perangkatDaerahId) params.set("perangkatDaerahId", applied.perangkatDaerahId);
    if (deepestUnor) params.set("unorId", deepestUnor);
    const res = await fetch(`/api/admin/pegawai?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (typeof data.page === "number" && data.page !== page) setPage(data.page);
      if (typeof data.pageSize === "number" && data.pageSize !== pageSize) setPageSize(data.pageSize);
    }
    setLoading(false);
  }, [page, pageSize, applied.query, applied.golongan, applied.status, applied.perangkatDaerahId, deepestUnor]);

  async function pullFromSimpeg() {
    setSyncing(true);
    setMessageError(false);
    setMessage("");
    const res = await fetch("/api/admin/pegawai/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setMessageError(true);
      setMessage(data.error || "Gagal menarik data dari Simpeg PB");
      return;
    }
    setMessage(
      `Berhasil menarik ${data.pegawaiCount ?? 0} pegawai dan ${data.userCount ?? 0} akun dari Simpeg PB.`,
    );
    loadData();
  }

  useEffect(() => {
    fetch("/api/admin/pegawai/options")
      .then((res) => res.json())
      .then((data) => {
        setGolonganOptions(data.golongan ?? []);
        setPerangkatDaerah(data.perangkatDaerah ?? []);
      })
      .catch(() => {
        setGolonganOptions([]);
        setPerangkatDaerah([]);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function fetchUnor(parentId: string, perangkatId?: string) {
    const params = new URLSearchParams();
    if (parentId) params.set("parentId", parentId);
    else if (perangkatId) params.set("perangkatDaerahId", perangkatId);
    const res = await fetch(`/api/admin/pegawai/unor?${params.toString()}`);
    const data = res.ok ? await res.json() : { items: [] };
    return (data.items ?? []) as UnorOption[];
  }

  async function loadUnorLevel(level: number, parentId: string, perangkatId?: string) {
    const request = ++unorRequest.current;
    const items = await fetchUnor(parentId, perangkatId);
    if (request !== unorRequest.current) return;
    setUnorOptions((current) => current.map((list, index) => (index === level ? items : index > level ? [] : list)));
  }

  async function restoreUnorOptions(perangkatId: string, selected: UnorSelection) {
    const request = ++unorRequest.current;
    if (!perangkatId) {
      setUnorOptions([[], [], []]);
      return;
    }
    const levels: UnorOption[][] = [[], [], []];
    for (let level = 0; level < MAX_UNOR_LEVELS; level += 1) {
      const parentId = level === 0 ? "" : selected[level - 1];
      if (level > 0 && !parentId) break;
      levels[level] = await fetchUnor(parentId, level === 0 ? perangkatId : undefined);
      if (request !== unorRequest.current) return;
      if (!selected[level]) break;
    }
    if (request !== unorRequest.current) return;
    setUnorOptions(levels);
  }

  function openFilter() {
    const next = copyFilters(applied);
    setDraft(next);
    setFilterOpen(true);
    void restoreUnorOptions(next.perangkatDaerahId, next.unor);
  }

  function applyFilters() {
    setApplied({ ...draft, query: draft.query.trim(), unor: [draft.unor[0], draft.unor[1], draft.unor[2]] });
    setPage(1);
    setFilterOpen(false);
  }

  function clearFilters() {
    const next = emptyFilters();
    unorRequest.current += 1;
    setDraft(next);
    setApplied(next);
    setUnorOptions([[], [], []]);
    setPage(1);
    setFilterOpen(false);
  }

  function onPerangkatDaerahChange(value: string) {
    setDraft((current) => ({ ...current, perangkatDaerahId: value, unor: ["", "", ""] }));
    setUnorOptions([[], [], []]);
    if (value) void loadUnorLevel(0, "", value);
  }

  function onUnorChange(level: number, value: string) {
    setDraft((current) => {
      const unor: UnorSelection = [current.unor[0], current.unor[1], current.unor[2]];
      unor[level] = value;
      for (let index = level + 1; index < MAX_UNOR_LEVELS; index += 1) unor[index] = "";
      return { ...current, unor };
    });
    setUnorOptions((current) => current.map((list, index) => (index > level ? [] : list)));
    if (value && level + 1 < MAX_UNOR_LEVELS) void loadUnorLevel(level + 1, value);
  }

  return (
    <>
      <PageHeader
        title="Pegawai"
        subtitle={subtitle}
        action={
          <div className="flex w-full basis-full flex-nowrap items-center gap-2 md:w-auto md:basis-auto">
            {allowAsn ? (
              <Button
                type="button"
                variant="secondary"
                className="min-w-0 flex-1 md:flex-none md:shrink-0"
                onClick={() => void pullFromSimpeg()}
                disabled={syncing}
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                {syncing ? "Menyinkronkan..." : "Sinkron SIASN"}
              </Button>
            ) : null}
            <Button
              type="button"
              className="min-w-0 flex-1 md:flex-none md:shrink-0"
              onClick={() => setAddOpen(true)}
              disabled={syncing}
            >
              <Plus className="h-4 w-4" />
              Tambah baru
            </Button>
          </div>
        }
      />
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daftar pegawai ({total})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {message ? (
          <p
            className={cn(
              "rounded-lg px-4 py-2",
              messageError
                ? "bg-error-container text-error"
                : "bg-secondary-container text-on-secondary-container",
            )}
          >
            {message}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={openFilter}>
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {appliedCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                {appliedCount}
              </span>
            ) : null}
          </Button>
          <select
            id="pegawai-page-size"
            aria-label="Jumlah baris per halaman"
            className={cn(selectClassName, "h-9 w-20 shrink-0")}
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            {USER_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <p className="text-on-surface-variant">
          Halaman {page} dari {totalPages}
        </p>

        {loading ? <AppLoader label="Memuat pegawai" /> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-on-surface-variant">Tidak ada pegawai yang cocok.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className="w-full rounded-lg border border-surface-container-highest bg-surface-container-low p-3 text-left transition hover:border-primary-container hover:bg-surface-container"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-on-surface">{row.name}</p>
                <p className="shrink-0 text-xs font-medium text-on-surface-variant">
                  {kepegawaianStatus(row.jenis, row.kedudukanHukum)}
                </p>
              </div>
              <p className="text-on-surface-variant">
                {row.jenis === "non_asn" ? `NIK ${row.nik || "-"}` : `NIP ${formatNip(row.nip)}`}
              </p>
              <p className="text-sm text-on-surface">{displayJabatan(row)}</p>
            </button>
          ))
        )}

        <PageNumbers page={page} totalPages={totalPages} onChange={setPage} disabled={loading} />
      </CardContent>
    </Card>
      <PegawaiDetailDialog
        pegawaiId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        canSync={allowAsn}
        onChanged={(text) => {
          setMessageError(false);
          setMessage(text);
          loadData();
        }}
      />
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>Filter pegawai</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pegawai-search">Cari nama / NIP / NIK</Label>
              <Input
                id="pegawai-search"
                value={draft.query}
                onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
                placeholder="Masukkan nama, NIP, atau NIK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pegawai-golongan">Pangkat / golongan</Label>
              <select
                id="pegawai-golongan"
                className={selectClassName}
                value={draft.golongan}
                onChange={(event) => setDraft((current) => ({ ...current, golongan: event.target.value }))}
              >
                <option value="">Semua pangkat/golongan</option>
                {golonganOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pegawai-status">Jenis pegawai</Label>
              <select
                id="pegawai-status"
                className={selectClassName}
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">Semua jenis</option>
                {PEGAWAI_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pegawai-pd">Perangkat daerah</Label>
              <select
                id="pegawai-pd"
                className={selectClassName}
                value={draft.perangkatDaerahId}
                onChange={(event) => onPerangkatDaerahChange(event.target.value)}
              >
                <option value="">Semua perangkat daerah</option>
                {perangkatDaerah.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            {unorOptions.map((items, index) =>
              items.length > 0 ? (
                <div key={`unor-${index}`} className="space-y-2">
                  <Label htmlFor={`pegawai-unor-${index}`}>
                    {index === 0 ? "Unit organisasi" : `Unit organisasi tingkat ${index + 1}`}
                  </Label>
                  <select
                    id={`pegawai-unor-${index}`}
                      className={selectClassName}
                    value={draft.unor[index]}
                    onChange={(event) => onUnorChange(index, event.target.value)}
                  >
                    <option value="">Semua unit tingkat ini</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null,
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={clearFilters}>
                Bersihkan filter
              </Button>
              <Button type="submit">Cari</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <TambahPegawaiDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        allowAsn={allowAsn}
        onCreated={(text) => {
          setMessageError(false);
          setMessage(text);
          setPage(1);
          loadData();
        }}
      />
    </>
  );
}

function visiblePages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const marks = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    marks.add(2);
    marks.add(3);
    marks.add(4);
  }
  if (current >= total - 2) {
    marks.add(total - 1);
    marks.add(total - 2);
    marks.add(total - 3);
  }

  const nums = [...marks].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (let i = 0; i < nums.length; i += 1) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("ellipsis");
    out.push(nums[i]);
  }
  return out;
}

function PageNumbers({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex flex-nowrap items-center justify-center gap-1 overflow-x-auto" aria-label="Halaman pegawai">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {visiblePages(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span key={`e-${index}`} className="shrink-0 px-1 text-on-surface-variant">
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={item === page ? "default" : "outline"}
            className="h-8 min-w-8 shrink-0 px-2"
            disabled={disabled}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Berikutnya"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
