"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UnorSearchSelect, type UnorOption } from "@/components/admin/UnorSearchSelect";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNip } from "@/lib/utils";

type PegawaiJenis = "asn" | "non_asn";

type LookupResult = {
  id?: string;
  nip: string;
  name: string;
  address?: string;
  jabatanNama?: string | null;
  unorId?: string | null;
  unorNama?: string | null;
  alreadySaved?: boolean;
};

export function TambahPegawaiDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (message: string) => void;
}) {
  const [jenis, setJenis] = useState<PegawaiJenis>("asn");
  const [nip, setNip] = useState("");
  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [unorId, setUnorId] = useState("");
  const [unorOptions, setUnorOptions] = useState<UnorOption[]>([]);
  const [unorLoading, setUnorLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setUnorLoading(true);
    fetch("/api/admin/pegawai/tree")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const units: UnorOption[] = (data.units ?? []).map((unit: UnorOption) => ({
          id: unit.id,
          name: unit.name,
          perangkatDaerahNama: unit.perangkatDaerahNama,
        }));
        setUnorOptions(units);
      })
      .catch(() => {
        if (!cancelled) setUnorOptions([]);
      })
      .finally(() => {
        if (!cancelled) setUnorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function reset() {
    setJenis("asn");
    setNip("");
    setNik("");
    setName("");
    setAddress("");
    setUnorId("");
    setResult(null);
    setError("");
  }

  async function searchNip(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    const value = nip.trim();
    if (!value) {
      setError("NIP wajib diisi");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/pegawai/lookup?nip=${encodeURIComponent(value)}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Pegawai tidak terdaftar di Simpeg");
      return;
    }
    setNip(data.nip || value);
    setName(data.name || "");
    setAddress(data.address || "");
    setUnorId(typeof data.unorId === "string" ? data.unorId : "");
    setResult(data);
  }

  async function saveAsn() {
    if (!result) return;
    if (!unorId) {
      setError("Unit organisasi wajib dipilih");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/pegawai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jenis: "asn",
        nip: result.nip,
        name: result.name,
        address: result.address || "",
        unorId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan pegawai");
      return;
    }
    onCreated("Pegawai ASN berhasil ditambahkan");
    onOpenChange(false);
    reset();
  }

  async function saveNonAsn(event: FormEvent) {
    event.preventDefault();
    if (!unorId) {
      setError("Unit organisasi wajib dipilih");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/pegawai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jenis: "non_asn", nik, name, address, unorId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan pegawai");
      return;
    }
    onCreated("Pegawai Non-ASN berhasil ditambahkan");
    onOpenChange(false);
    reset();
  }

  const unorField = (
    <UnorSearchSelect value={unorId} options={unorOptions} loading={unorLoading} onChange={setUnorId} />
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="top-auto bottom-24 z-[80] max-h-[calc(100dvh-8rem)] translate-y-0 overflow-y-auto pb-6 sm:max-w-lg">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Tambah pegawai baru</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={jenis === "asn" ? "default" : "outline"}
            onClick={() => {
              setJenis("asn");
              setResult(null);
              setUnorId("");
              setError("");
            }}
          >
            ASN
          </Button>
          <Button
            type="button"
            variant={jenis === "non_asn" ? "default" : "outline"}
            onClick={() => {
              setJenis("non_asn");
              setResult(null);
              setUnorId("");
              setError("");
            }}
          >
            Non-ASN
          </Button>
        </div>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        {jenis === "asn" ? (
          <div className="space-y-3">
            <form onSubmit={searchNip} className="space-y-2">
              <Label htmlFor="tambah-nip">NIP</Label>
              <div className="flex gap-2">
                <Input
                  id="tambah-nip"
                  value={nip}
                  onChange={(event) => {
                    setNip(event.target.value);
                    setResult(null);
                  }}
                  placeholder="Contoh: 199203032019012003"
                  required
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Mencari..." : "Cari"}
                </Button>
              </div>
            </form>
            {result ? (
              <div className="space-y-3 rounded-lg border border-surface-container-highest bg-surface-container-low p-3 text-sm">
                <p className="font-medium text-on-surface">{result.name}</p>
                <p className="text-on-surface-variant">NIP {formatNip(result.nip)}</p>
                <p className="text-on-surface">{result.jabatanNama || "-"}</p>
                <p className="text-xs text-on-surface-variant">{result.unorNama || "-"}</p>
                {result.alreadySaved ? (
                  <p className="text-on-surface-variant">Pegawai ini sudah tersimpan.</p>
                ) : (
                  <>
                    {unorField}
                    <Button type="button" className="w-full" disabled={loading} onClick={() => void saveAsn()}>
                      {loading ? "Menyimpan..." : "Simpan pegawai"}
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={saveNonAsn} className="space-y-3 pb-4">
            <div className="space-y-2">
              <Label htmlFor="tambah-nik">NIK</Label>
              <Input id="tambah-nik" value={nik} onChange={(event) => setNik(event.target.value)} placeholder="16 digit NIK" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tambah-name">Nama lengkap</Label>
              <Input id="tambah-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tambah-address">Alamat</Label>
              <Input id="tambah-address" value={address} onChange={(event) => setAddress(event.target.value)} required />
            </div>
            {unorField}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan pegawai"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
