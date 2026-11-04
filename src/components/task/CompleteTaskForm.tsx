"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceFields, useEvidenceCapture } from "@/components/task/EvidenceCapture";
import { InterventionFields } from "@/components/task/InterventionFields";
import { useNavigationLoader } from "@/components/layout/NavigationLoader";
import { parseJumlahSatuan } from "@/lib/satuan";
import { formatISODate } from "@/lib/utils";

export function CompleteTaskForm({
  taskId,
  isRevision = false,
  jumlahIntervensi = null,
  satuan = null,
}: {
  taskId: string;
  isRevision?: boolean;
  jumlahIntervensi?: number | null;
  satuan?: string | null;
}) {
  const router = useRouter();
  const { start } = useNavigationLoader();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jumlah, setJumlah] = useState(jumlahIntervensi != null ? String(jumlahIntervensi) : "");
  const [satuanValue, setSatuanValue] = useState(satuan ?? "");
  const evidence = useEvidenceCapture(true);
  const [tanggalKinerja, setTanggalKinerja] = useState(formatISODate(new Date()));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedJumlah = parseJumlahSatuan(jumlah, satuanValue, true);
    if (!parsedJumlah.ok) {
      setError(parsedJumlah.error);
      return;
    }

    const evidenceError = evidence.validate();
    if (evidenceError) {
      setError(evidenceError);
      return;
    }

    setLoading(true);
    setError("");

    const body = evidence.toFormData();
    body.append("jumlahIntervensi", jumlah);
    body.append("satuan", satuanValue);
    body.append("tanggalKinerja", tanggalKinerja);
    const res = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      body,
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyelesaikan tugas");
      return;
    }

    start();
    router.push("/board");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-on-surface-variant">
          Tanggal Kinerja
        </label>
        <input
          type="date"
          value={tanggalKinerja}
          onChange={(e) => setTanggalKinerja(e.target.value)}
          className="box-border flex h-9 w-full min-w-0 rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
          required
        />
        <p className="text-[11px] text-on-surface-variant/80">
          Sesuai tanggal pelaksanaan tugas di wilayah kerja Anda.
        </p>
      </div>
      <InterventionFields
        jumlah={jumlah}
        satuan={satuanValue}
        onJumlahChange={setJumlah}
        onSatuanChange={setSatuanValue}
        required
      />
      <EvidenceFields
        notes={evidence.notes}
        setNotes={evidence.setNotes}
        address={evidence.address}
        setAddress={evidence.setAddress}
        latitude={evidence.latitude}
        longitude={evidence.longitude}
        photos={evidence.photos}
        geoError={evidence.geoError}
        geoLoading={evidence.geoLoading}
        onTagLocation={evidence.requestLocation}
        onPhotoChange={async (event) => {
          const photoError = await evidence.handlePhotoChange(event);
          if (photoError) setError(photoError);
          else setError("");
        }}
        onRemovePhoto={evidence.removePhoto}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" variant="success" className="w-full" disabled={loading}>
        {loading ? "Mengunggah..." : isRevision ? "Kirim ulang revisi" : "Telah Selesai"}
      </Button>
    </form>
  );
}
