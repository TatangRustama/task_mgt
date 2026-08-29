"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  isAdmin: boolean;
  initialUnitCount: number;
  initialPegawaiCount: number;
  initialLastSyncedAt: string | null;
};

export function SimpegSyncCard({
  isAdmin,
  initialUnitCount,
  initialPegawaiCount,
  initialLastSyncedAt,
}: Props) {
  const [unitCount, setUnitCount] = useState(initialUnitCount);
  const [pegawaiCount, setPegawaiCount] = useState(initialPegawaiCount);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialLastSyncedAt);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/simpeg/sync", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Gagal sinkronisasi Simpeg");
      return;
    }
    setUnitCount(data.unitCount ?? unitCount);
    setPegawaiCount(data.pegawaiCount ?? pegawaiCount);
    setLastSyncedAt(new Date().toISOString());
    setMessage(
      `Sinkronisasi selesai: ${data.unitCount} unit, ${data.pegawaiCount} pegawai, ${data.userCount ?? 0} akun.`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sinkronisasi Simpeg</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-on-surface-variant">
          Data unit dan pegawai diambil dari Simpeg. Setiap pegawai ASN mendapat akun login
          dengan NIP sebagai username dan password, plus atasan/bawahan dari hierarki unor.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs text-on-surface-variant">Unit organisasi</p>
            <p className="text-lg font-semibold">{unitCount}</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs text-on-surface-variant">Pegawai ASN</p>
            <p className="text-lg font-semibold">{pegawaiCount}</p>
          </div>
        </div>
        <p className="text-on-surface-variant">
          Terakhir sinkron:{" "}
          {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("id-ID") : "belum pernah"}
        </p>
        {isAdmin ? (
          <Button type="button" onClick={sync} disabled={loading}>
            {loading ? "Menyinkronkan..." : "Sinkronkan sekarang"}
          </Button>
        ) : (
          <p className="text-on-surface-variant">Hanya admin yang dapat menjalankan sinkronisasi.</p>
        )}
        {loading ? (
          <p className="text-on-surface-variant">Proses ini dapat memakan beberapa menit.</p>
        ) : null}
        {message ? (
          <p className="rounded-xl bg-secondary-container px-4 py-2 text-on-secondary-container">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
