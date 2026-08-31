"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

type PegawaiJenis = "asn" | "non_asn";

type PegawaiRow = {
  id?: string;
  jenis?: PegawaiJenis;
  nip: string | null;
  nik?: string | null;
  name: string;
  address?: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  tempatLahir?: string | null;
  jenisKelamin?: string | null;
  email?: string | null;
  noHp?: string | null;
  kedudukanHukum?: string | null;
  tingkatPendidikan?: string | null;
  golonganNama?: string | null;
  jenisJabatanNama?: string | null;
  jabatanNama?: string | null;
  unorNama?: string | null;
  perangkatDaerahNama?: string | null;
  alreadySaved?: boolean;
  source?: "local" | "simpeg" | "directory";
};

function genderLabel(value?: string | null) {
  if (value === "L") return "Laki-laki";
  if (value === "P") return "Perempuan";
  return value || "-";
}

export function PegawaiForm() {
  const [jenis, setJenis] = useState<PegawaiJenis>("asn");
  const [nip, setNip] = useState("");
  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<PegawaiRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searched, setSearched] = useState(false);
  const [bawahan, setBawahan] = useState<PegawaiRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const loadBawahan = useCallback(async (nextPage: number) => {
    setListLoading(true);
    const res = await fetch(
      `/api/pegawai?scope=bawahan&page=${nextPage}&pageSize=${PAGE_SIZE}`,
    );
    const data = await res.json();
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
    if (jenis !== "asn") return;
    void loadBawahan(page);
  }, [jenis, page, loadBawahan]);

  function resetForm() {
    setNip("");
    setNik("");
    setName("");
    setAddress("");
    setResult(null);
    setSearched(false);
  }

  async function searchNip(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setResult(null);

    const value = nip.trim();
    if (!value) {
      window.alert("NIP wajib diisi");
      return;
    }

    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/pegawai/lookup?nip=${encodeURIComponent(value)}`);
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      window.alert(data.error || "Pegawai tidak terdaftar di Simpeg");
      return;
    }

    setNip(data.nip);
    setName(data.name);
    setAddress(data.address || "");
    setResult(data);
  }

  async function savePegawai(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/pegawai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        jenis === "asn"
          ? { jenis, nip, name, address }
          : { jenis, nik, name, address },
      ),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Gagal menyimpan pegawai");
      return;
    }

    setMessage("Pegawai berhasil ditambahkan");
    if (jenis === "non_asn") {
      resetForm();
    } else {
      setResult({ ...data, alreadySaved: true });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left"
            aria-expanded={formOpen}
            onClick={() => setFormOpen((open) => !open)}
          >
            <CardTitle className="text-base">
              {jenis === "asn" ? "Cari Pegawai ASN" : "Tambah Pegawai Non-ASN"}
            </CardTitle>
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={jenis === "asn" ? "default" : "outline"}
              onClick={() => {
                setJenis("asn");
                resetForm();
                setMessage("");
                setPage(1);
              }}
            >
              ASN
            </Button>
            <Button
              type="button"
              variant={jenis === "non_asn" ? "default" : "outline"}
              onClick={() => {
                setJenis("non_asn");
                resetForm();
                setMessage("");
              }}
            >
              Non-ASN
            </Button>
          </div>

          {jenis === "asn" ? (
            <form onSubmit={searchNip} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="nip">Cari NIP</Label>
                <div className="flex gap-2">
                  <Input
                    id="nip"
                    value={nip}
                    onChange={(event) => {
                      setNip(event.target.value);
                      setResult(null);
                      setSearched(false);
                    }}
                    placeholder="Contoh: 199203032019012003"
                    required
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? "Mencari..." : "Cari"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={savePegawai} className="space-y-3">
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
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
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
          )}

          {message ? (
            <p className="rounded-lg bg-secondary-container px-4 py-2 text-sm text-on-secondary-container">
              {message}
            </p>
          ) : null}
        </CardContent>
        ) : null}
      </Card>

      {jenis === "asn" && formOpen && searched ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil pencarian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading ? (
              <p className="text-on-surface-variant">Mencari pegawai...</p>
            ) : result ? (
              <div className="space-y-3 rounded-lg border border-surface-container-highest bg-surface-container-low p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-on-surface">{result.name}</p>
                  <Badge variant="delegasi">ASN</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="NIP" value={result.nip} />
                  <Field label="Jabatan" value={result.jabatanNama} />
                  <Field label="Unit organisasi" value={result.unorNama} />
                  <Field label="Perangkat daerah" value={result.perangkatDaerahNama} />
                  <Field label="Golongan" value={result.golonganNama} />
                  <Field label="Jenis kelamin" value={genderLabel(result.jenisKelamin)} />
                  <Field label="Tempat lahir" value={result.tempatLahir} />
                  <Field label="Email" value={result.email} />
                  <Field label="No. HP" value={result.noHp} />
                  <Field label="Kedudukan hukum" value={result.kedudukanHukum} />
                  <Field label="Pendidikan" value={result.tingkatPendidikan} />
                </div>
                {result.alreadySaved === false ? (
                  <form onSubmit={savePegawai}>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Menyimpan..." : "Simpan pegawai"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-on-surface-variant">Data ASN ini sudah tersimpan dari Simpeg.</p>
                )}
              </div>
            ) : (
              <p className="text-on-surface-variant">Pegawai tidak ditemukan.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {jenis === "asn" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pegawai di bawah unit Anda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {listLoading && bawahan.length === 0 ? (
              <p className="text-on-surface-variant">Memuat data pegawai...</p>
            ) : bawahan.length === 0 ? (
              <p className="text-on-surface-variant">
                Tidak ada pegawai pada unit di bawah Anda.
              </p>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant">
                  Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} pegawai
                </p>
                <div className="space-y-2">
                  {bawahan.map((row) => (
                    <div
                      key={row.id || row.nip}
                      className="space-y-1 rounded-lg border border-surface-container-highest bg-surface-container-low p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-on-surface">{row.name}</p>
                        <Badge variant="delegasi" className="shrink-0">
                          {row.kedudukanHukum || "-"}
                        </Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant">NIP {row.nip || "-"}</p>
                      <p className="text-sm text-on-surface">{row.jabatanNama || "-"}</p>
                      <p className="text-xs text-on-surface-variant">{row.unorNama || "-"}</p>
                    </div>
                  ))}
                </div>
                <PageNumbers page={page} totalPages={totalPages} onChange={setPage} disabled={listLoading} />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value || "-"}</p>
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
