"use client";

import { useState } from "react";
import { AlertCircle, Building2, CheckCircle2, RefreshCw, Users } from "lucide-react";
import { AppLoader } from "@/components/layout/AppLoader";
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
  const [isError, setIsError] = useState(false);

  async function sync() {
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/simpeg/sync", { method: "POST" });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "Gagal sinkronisasi Simpeg");
        return;
      }
      setUnitCount(data.unitCount ?? unitCount);
      setPegawaiCount(data.pegawaiCount ?? pegawaiCount);
      setLastSyncedAt(new Date().toISOString());
      setIsError(false);
      setMessage(
        `Bulk sinkronisasi berhasil: ${data.unitCount} unit organisasi, ${data.pegawaiCount} pegawai, dan ${data.userCount ?? 0} akun pengguna tersinkronisasi.`,
      );
    } catch {
      setLoading(false);
      setIsError(true);
      setMessage("Terjadi kesalahan jaringan saat sinkronisasi SIMPEG.");
    }
  }

  return (
    <Card className="border-outline-variant/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Bulk Sinkronisasi SIMPEG
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Super Admin
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-on-surface-variant leading-relaxed">
          Fitur ini menarik seluruh data unit organisasi dan pegawai ASN dari SIMPEG PB secara menyeluruh (bulk sync). 
          Setiap pegawai ASN secara otomatis dipetakan akun login-nya dan hierarki atasan/bawahannya diperbarui.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Unit Organisasi</p>
              <p className="text-xl font-bold text-on-surface">{unitCount.toLocaleString("id-ID")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Pegawai ASN</p>
              <p className="text-xl font-bold text-on-surface">{pegawaiCount.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3.5 py-2.5 text-xs text-on-surface-variant">
          <span>Terakhir disinkronkan secara massal:</span>
          <span className="font-medium text-on-surface">
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "medium" }) : "Belum pernah"}
          </span>
        </div>

        <div className="pt-1">
          {isAdmin ? (
            <Button
              type="button"
              onClick={sync}
              disabled={loading}
              className="gap-2 font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Menyinkronkan SIMPEG massal..." : "Mulai Bulk Sinkronisasi"}
            </Button>
          ) : (
            <p className="text-xs text-error font-medium">Hanya super admin yang memiliki wewenang menjalankan bulk sync.</p>
          )}
        </div>

        {loading ? (
          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low">
            <AppLoader label="Sedang menyinkronkan data SIMPEG (unit, pegawai, akun)... Mohon tunggu hingga selesai." />
          </div>
        ) : null}

        {message ? (
          <div
            className={`flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed ${
              isError
                ? "bg-error-container/40 text-on-error-container border border-error/20"
                : "bg-secondary-container/50 text-on-secondary-container border border-secondary/20"
            }`}
          >
            {isError ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-error mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            )}
            <span>{message}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
