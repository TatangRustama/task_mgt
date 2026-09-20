"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayJabatan } from "@/lib/jabatan-display";
import { cn, formatNip } from "@/lib/utils";

const PAGE_SIZE = 5;

type PegawaiRow = {
  id?: string;
  jenis?: "asn" | "non_asn";
  nip: string | null;
  nik?: string | null;
  name: string;
  kedudukanHukum?: string | null;
  golonganNama?: string | null;
  jabatanNama?: string | null;
  unorNama?: string | null;
};

export function PegawaiForm({ canAddNonAsn = false }: { canAddNonAsn?: boolean }) {
  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bawahan, setBawahan] = useState<PegawaiRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const loadBawahan = useCallback(async (nextPage: number) => {
    setListLoading(true);
    const res = await fetch(`/api/pegawai?scope=bawahan&page=${nextPage}&pageSize=${PAGE_SIZE}`);
    const data = await res.json().catch(() => ({}));
    setListLoading(false);
    if (!res.ok) {
      setBawahan([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    setBawahan(data.data ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? nextPage);
    setTotalPages(data.totalPages ?? 1);
  }, []);

  useEffect(() => {
    void loadBawahan(page);
  }, [page, loadBawahan]);

  async function saveNonAsn(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const res = await fetch("/api/pegawai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jenis: "non_asn", nik, name, address }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Gagal menyimpan pegawai");
      return;
    }
    setMessage("Pegawai berhasil ditambahkan");
    setNik("");
    setName("");
    setAddress("");
    await loadBawahan(1);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pegawai dalam Unit anda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {listLoading && bawahan.length === 0 ? (
            <p className="text-on-surface-variant">Memuat data pegawai...</p>
          ) : bawahan.length === 0 ? (
            <p className="text-on-surface-variant">Tidak ada pegawai dalam unit Anda.</p>
          ) : (
            <>
              <p className="text-xs text-on-surface-variant">
                Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} pegawai
              </p>
              <div className="space-y-2">
                {bawahan.map((row) => (
                  <div
                    key={row.id || row.nip || row.nik}
                    className="space-y-1 rounded-lg border border-surface-container-highest bg-surface-container-low p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-on-surface">{row.name}</p>
                      <Badge variant="delegasi" className="shrink-0">
                        {row.kedudukanHukum || (row.jenis === "non_asn" ? "Non-ASN" : "-")}
                      </Badge>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {row.jenis === "non_asn" ? `NIK ${row.nik || "-"}` : `NIP ${formatNip(row.nip)}`}
                    </p>
                    <p className="text-sm text-on-surface">{displayJabatan(row)}</p>
                    <p className="text-xs text-on-surface-variant">{row.unorNama || "-"}</p>
                  </div>
                ))}
              </div>
              <PageNumbers page={page} totalPages={totalPages} onChange={setPage} disabled={listLoading} />
            </>
          )}
        </CardContent>
      </Card>

      {canAddNonAsn ? (
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left"
              aria-expanded={formOpen}
              onClick={() => setFormOpen((open) => !open)}
            >
              <CardTitle className="text-base">Tambah Pegawai Non-ASN</CardTitle>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-on-surface-variant transition-transform",
                  formOpen && "rotate-180",
                )}
              />
            </button>
          </CardHeader>
          {formOpen ? (
            <CardContent className="space-y-4">
              <form onSubmit={saveNonAsn} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK</Label>
                  <Input
                    id="nik"
                    value={nik}
                    onChange={(event) => setNik(event.target.value)}
                    placeholder="16 digit NIK"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama lengkap</Label>
                  <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan pegawai"}
                </Button>
              </form>
              {message ? (
                <p className="rounded-lg bg-secondary-container px-4 py-2 text-sm text-on-secondary-container">
                  {message}
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
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
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Halaman pegawai">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Sebelumnya
      </Button>
      {visiblePages(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span key={`e-${index}`} className="px-1 text-on-surface-variant">
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={item === page ? "default" : "outline"}
            className="min-w-9 px-2"
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
        size="sm"
        variant="outline"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya
      </Button>
    </nav>
  );
}
