"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PegawaiDetailDialog } from "@/components/admin/PegawaiDetailDialog";
import { TambahPegawaiDialog } from "@/components/admin/TambahPegawaiDialog";
import { PageHeader } from "@/components/layout/PageMain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kepegawaianStatus } from "@/lib/kepegawaian-status";
import { displayJabatan } from "@/lib/jabatan-display";
import { USER_PAGE_SIZES } from "@/lib/roles";
import { formatNip } from "@/lib/utils";

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

export function SuperAdminPegawaiList() {
  const [rows, setRows] = useState<PegawaiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(USER_PAGE_SIZES[0]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [golongan, setGolongan] = useState("");
  const [status, setStatus] = useState("");
  const [perangkatDaerahId, setPerangkatDaerahId] = useState("");
  const [unorSelected, setUnorSelected] = useState<string[]>(["", "", ""]);
  const [unorOptions, setUnorOptions] = useState<UnorOption[][]>([[], [], []]);
  const [golonganOptions, setGolonganOptions] = useState<Option[]>([]);
  const [perangkatDaerah, setPerangkatDaerah] = useState<UnorOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const deepestUnor = [...unorSelected].reverse().find((id) => id) || "";

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (query) params.set("q", query);
    if (golongan) params.set("golongan", golongan);
    if (status) params.set("status", status);
    if (perangkatDaerahId) params.set("perangkatDaerahId", perangkatDaerahId);
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
  }, [page, pageSize, query, golongan, status, perangkatDaerahId, deepestUnor]);

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
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setQuery((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadUnorLevel(level: number, parentId: string, perangkatId?: string) {
    const params = new URLSearchParams();
    if (parentId) params.set("parentId", parentId);
    else if (perangkatId) params.set("perangkatDaerahId", perangkatId);
    const res = await fetch(`/api/admin/pegawai/unor?${params.toString()}`);
    const data = res.ok ? await res.json() : { items: [] };
    const items: UnorOption[] = data.items ?? [];
    setUnorOptions((current) => {
      const next = current.map((list, index) => (index === level ? items : index > level ? [] : list));
      return next;
    });
  }

  async function onPerangkatDaerahChange(value: string) {
    setPerangkatDaerahId(value);
    setUnorSelected(["", "", ""]);
    setUnorOptions([[], [], []]);
    setPage(1);
    if (value) await loadUnorLevel(0, "", value);
  }

  async function onUnorChange(level: number, value: string) {
    setUnorSelected((current) => current.map((id, index) => (index === level ? value : index > level ? "" : id)));
    setUnorOptions((current) => current.map((list, index) => (index > level ? [] : list)));
    setPage(1);
    if (value && level + 1 < MAX_UNOR_LEVELS) {
      await loadUnorLevel(level + 1, value);
    }
  }

  return (
    <>
      <PageHeader
        title="Pegawai"
        subtitle="Seluruh data pegawai. Saring berdasarkan nama, NIP/NIK, pangkat/golongan, jenis pegawai, dan unit organisasi."
        action={
          <Button type="button" className="shrink-0" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah pegawai baru
          </Button>
        }
      />
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daftar pegawai ({total})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {message ? (
          <p className="rounded-lg bg-secondary-container px-4 py-2 text-on-secondary-container">{message}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pegawai-search">Cari nama / NIP / NIK</Label>
            <Input
              id="pegawai-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Masukkan nama, NIP, atau NIK"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pegawai-golongan">Pangkat / golongan</Label>
            <select
              id="pegawai-golongan"
              className={selectClassName}
              value={golongan}
              onChange={(event) => {
                setGolongan(event.target.value);
                setPage(1);
              }}
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
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
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
              value={perangkatDaerahId}
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
          {unorOptions.map((items, index) =>
            items.length > 0 ? (
              <div key={`unor-${index}`} className="space-y-2">
                <Label htmlFor={`pegawai-unor-${index}`}>
                  {index === 0 ? "Unit organisasi" : `Unit organisasi tingkat ${index + 1}`}
                </Label>
                <select
                  id={`pegawai-unor-${index}`}
                  className={selectClassName}
                  value={unorSelected[index]}
                  onChange={(event) => void onUnorChange(index, event.target.value)}
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="pegawai-page-size" className="whitespace-nowrap">
              Tampilkan
            </Label>
            <select
              id="pegawai-page-size"
              className={`${selectClassName} h-9 w-24`}
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
            <span className="text-on-surface-variant">per halaman</span>
          </div>
          <p className="text-on-surface-variant">
            Halaman {page} dari {totalPages}
          </p>
        </div>

        {loading && rows.length === 0 ? (
          <p className="text-on-surface-variant">Memuat pegawai...</p>
        ) : rows.length === 0 ? (
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
        onChanged={(text) => {
          setMessage(text);
          loadData();
        }}
      />
      <TambahPegawaiDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(text) => {
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
