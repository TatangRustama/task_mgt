"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Network, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGolonganPangkat } from "@/lib/golongan";
import { kepegawaianStatus } from "@/lib/kepegawaian-status";
import { formatDate, formatNip } from "@/lib/utils";

type PegawaiDetail = {
  id: string;
  jenis: "asn" | "non_asn";
  nip: string | null;
  nik: string | null;
  name: string;
  address: string;
  gelarDepan: string | null;
  gelarBelakang: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string | null;
  email: string | null;
  noHp: string | null;
  kedudukanHukum: string | null;
  tingkatPendidikan: string | null;
  golonganNama: string | null;
  jenisJabatanNama: string | null;
  jabatanNama: string | null;
  unorId: string | null;
  unorNama: string | null;
  perangkatDaerahNama: string | null;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value || "-"}</p>
    </div>
  );
}

export function PegawaiDetailDialog({
  pegawaiId,
  open,
  onOpenChange,
  onChanged,
}: {
  pegawaiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (message: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<PegawaiDetail | null>(null);
  const [name, setName] = useState("");
  const [jabatanNama, setJabatanNama] = useState("");
  const [email, setEmail] = useState("");
  const [noHp, setNoHp] = useState("");
  const [address, setAddress] = useState("");
  const [gelarDepan, setGelarDepan] = useState("");
  const [gelarBelakang, setGelarBelakang] = useState("");

  useEffect(() => {
    if (!open || !pegawaiId) {
      setDetail(null);
      setEditing(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setEditing(false);
    fetch(`/api/admin/pegawai/${pegawaiId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Gagal memuat detail pegawai");
          setDetail(null);
          return;
        }
        setDetail(data.pegawai);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat detail pegawai");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, pegawaiId]);

  function startEdit() {
    if (!detail) return;
    setName(detail.name);
    setJabatanNama(detail.jabatanNama || "");
    setEmail(detail.email || "");
    setNoHp(detail.noHp || "");
    setAddress(detail.address || "");
    setGelarDepan(detail.gelarDepan || "");
    setGelarBelakang(detail.gelarBelakang || "");
    setError("");
    setEditing(true);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/pegawai/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        jabatanNama,
        email,
        noHp,
        address,
        gelarDepan,
        gelarBelakang,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan perubahan");
      return;
    }
    setDetail(data.pegawai);
    setEditing(false);
    onChanged("Data pegawai berhasil diperbarui");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-24 z-[80] max-h-[calc(100dvh-8rem)] translate-y-0 overflow-y-auto pb-6 sm:max-w-lg md:bottom-24">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{editing ? "Edit pegawai" : "Detail pegawai"}</DialogTitle>
        </DialogHeader>
        {loading ? <p className="text-sm text-on-surface-variant">Memuat detail...</p> : null}
        {error ? <p className="text-sm text-error">{error}</p> : null}

        {!loading && detail && !editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama" value={detail.name} />
              <Field label="Status kepegawaian" value={kepegawaianStatus(detail.jenis, detail.kedudukanHukum)} />
              <Field label={detail.jenis === "non_asn" ? "NIK" : "NIP"} value={detail.jenis === "non_asn" ? detail.nik : formatNip(detail.nip)} />
              <Field label="Kedudukan hukum" value={detail.kedudukanHukum} />
              <Field label="Jabatan" value={detail.jabatanNama} />
              <Field label="Jenis jabatan" value={detail.jenisJabatanNama} />
              <Field label="Pangkat / golongan" value={formatGolonganPangkat(detail.golonganNama)} />
              <Field label="Unit organisasi" value={detail.unorNama} />
              <Field label="Perangkat daerah" value={detail.perangkatDaerahNama} />
              <Field label="Email" value={detail.email} />
              <Field label="No. HP" value={detail.noHp} />
              <Field label="Tempat, tanggal lahir" value={[detail.tempatLahir, formatDate(detail.tanggalLahir)].filter((item) => item && item !== "-").join(", ")} />
              <Field label="Pendidikan" value={detail.tingkatPendidikan} />
              <Field label="Alamat" value={detail.address} />
            </div>
            <div className="flex flex-wrap gap-2 pb-4">
              <Button type="button" variant="outline" className="flex-1" onClick={startEdit}>
                <Pencil className="h-4 w-4" />
                Edit pegawai
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/admin/pegawai/${detail.id}/unor`);
                }}
              >
                <Network className="h-4 w-4" />
                Pindah UNOR
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && detail && editing ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pegawai-name">Nama lengkap</Label>
                <Input id="pegawai-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pegawai-gelar-depan">Gelar depan</Label>
                <Input id="pegawai-gelar-depan" value={gelarDepan} onChange={(event) => setGelarDepan(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pegawai-gelar-belakang">Gelar belakang</Label>
                <Input id="pegawai-gelar-belakang" value={gelarBelakang} onChange={(event) => setGelarBelakang(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pegawai-jabatan">Jabatan</Label>
                <Input id="pegawai-jabatan" value={jabatanNama} onChange={(event) => setJabatanNama(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pegawai-email">Email</Label>
                <Input id="pegawai-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pegawai-hp">No. HP</Label>
                <Input id="pegawai-hp" value={noHp} onChange={(event) => setNoHp(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pegawai-address">Alamat</Label>
                <Input id="pegawai-address" value={address} onChange={(event) => setAddress(event.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pb-4">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setEditing(false)}>
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
