"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Network, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { AppLoader } from "@/components/layout/AppLoader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenugasanPanel } from "@/components/admin/PenugasanPanel";
import { formatGolonganPangkat } from "@/lib/golongan";
import { displayJabatan, isKepalaTitle, jabatanRoleLabel } from "@/lib/jabatan-display";
import { kepegawaianStatus } from "@/lib/kepegawaian-status";
import { formatDate, formatNip, cn } from "@/lib/utils";

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
  userId: string | null;
  unit?: {
    id: string;
    name: string;
    pimpinanId?: string | null;
    namaJabatan?: string | null;
    perangkatDaerahNama?: string | null;
  } | null;
  user?: {
    unitId: string | null;
    role: string;
    jabatan?: "kepala_kantor" | "kepala_bidang" | "kepala_sub_bidang" | "pelaksana" | null;
    unit?: { id: string; name: string; perangkatDaerahNama?: string | null } | null;
    ledUnits?: { id: string; name: string }[];
    assignedTasks?: {
      id: string;
      title: string;
      status: string;
      priority: string;
      deadline?: string | null;
    }[];
    _count?: {
      assignedTasks?: number;
    };
  } | null;
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
  canSync = false,
}: {
  pegawaiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (message: string) => void;
  canSync?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingNonJob, setConfirmingNonJob] = useState(false);
  const [nonJobbing, setNonJobbing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("profil");
  const [detail, setDetail] = useState<PegawaiDetail | null>(null);

  useEffect(() => {
    if (!open || !pegawaiId) {
      setDetail(null);
      setConfirmingDelete(false);
      setConfirmingNonJob(false);
      setNonJobbing(false);
      setSyncing(false);
      setTab("profil");
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setConfirmingDelete(false);
    setConfirmingNonJob(false);
    setNonJobbing(false);
    setTab("profil");
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

  async function removePegawai() {
    if (!detail) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/pegawai/${detail.id}`, { method: "DELETE", redirect: "manual" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal menghapus pegawai");
        return;
      }
      onOpenChange(false);
      onChanged(`${detail.name} dihapus dari pengelolaan tugas dan laporan.`);
    } catch {
      setError("Gagal menghapus pegawai");
    } finally {
      setDeleting(false);
    }
  }

  async function handleNonJob() {
    if (!detail) return;
    setNonJobbing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/pegawai/${detail.id}/non-job`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal me-nonjob-kan pegawai");
        return;
      }
      setConfirmingNonJob(false);
      setDetail(data.pegawai);
      onChanged(`${detail.name} berhasil dinon-job-kan menjadi pelaksana.`);
    } catch {
      setError("Gagal me-nonjob-kan pegawai");
    } finally {
      setNonJobbing(false);
    }
  }

  async function refreshFromSimpeg() {
    if (!detail) return;
    setSyncing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/pegawai/${detail.id}/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.pegawai) {
        setError(data.error || "Gagal memperbarui dari Simpeg");
        return;
      }
      setDetail(data.pegawai);
      onChanged(`${data.pegawai.name || detail.name} diperbarui dari Simpeg.`);
    } catch {
      setError("Gagal memperbarui dari Simpeg");
    } finally {
      setSyncing(false);
    }
  }

  const isPejabatDefinitif = Boolean(
    detail &&
      ((detail.user?.jabatan && detail.user.jabatan !== "pelaksana") ||
        (detail.user?.ledUnits && detail.user.ledUnits.length > 0) ||
        (detail.unit?.pimpinanId && detail.userId && detail.unit.pimpinanId === detail.userId) ||
        isKepalaTitle(detail.jabatanNama))
  );

  const showLoader = Boolean(open && (loading || (!detail && !error)));

  return (
    <>
      {showLoader ? <AppLoader label="Memuat detail" /> : null}
      {syncing ? <AppLoader label="Memperbarui dari Simpeg" /> : null}
      {showLoader ? null : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="top-20 z-[80] max-h-[calc(100dvh-11rem)] translate-y-0 overflow-y-auto pb-6 sm:max-w-lg">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle>Detail pegawai</DialogTitle>
            </DialogHeader>
            {error ? <p className="text-sm text-error">{error}</p> : null}

            {!loading && detail ? (
              <div className="space-y-4">
                <Tabs value={tab === "tugas" ? "tugas" : "profil"} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="profil">Profil</TabsTrigger>
                    <TabsTrigger value="tugas">Tugas dan Jabatan</TabsTrigger>
                  </TabsList>
                  <TabsContent value="profil">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nama" value={detail.name} />
                      <Field label="Status kepegawaian" value={kepegawaianStatus(detail.jenis, detail.kedudukanHukum)} />
                      <Field
                        label={detail.jenis === "non_asn" ? "NIK" : "NIP"}
                        value={detail.jenis === "non_asn" ? detail.nik : formatNip(detail.nip)}
                      />
                      <Field label="Kedudukan hukum" value={detail.kedudukanHukum} />
                      <Field
                        label="Tempat, tanggal lahir"
                        value={[detail.tempatLahir, formatDate(detail.tanggalLahir)]
                          .filter((item) => item && item !== "-")
                          .join(", ")}
                      />
                      <Field label="Pendidikan" value={detail.tingkatPendidikan} />
                      <Field label="Email" value={detail.email} />
                      <Field label="No. HP" value={detail.noHp} />
                      <Field label="Alamat" value={detail.address} />
                    </div>
                  </TabsContent>
                  <TabsContent value="tugas">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Jabatan"
                          value={
                            displayJabatan(detail, detail.user?.jabatan) !== "-"
                              ? displayJabatan(detail, detail.user?.jabatan)
                              : detail.unit?.namaJabatan ||
                                (detail.user?.jabatan ? jabatanRoleLabel[detail.user.jabatan] : null) ||
                                detail.jenisJabatanNama ||
                                "-"
                          }
                        />
                        <Field label="Jenis jabatan" value={detail.jenisJabatanNama} />
                        <Field label="Pangkat / golongan" value={formatGolonganPangkat(detail.golonganNama)} />
                        <Field
                          label="Unit organisasi"
                          value={detail.unorNama || detail.unit?.name || detail.user?.unit?.name || "-"}
                        />
                        <Field
                          label="Perangkat daerah"
                          value={
                            detail.perangkatDaerahNama ||
                            detail.unit?.perangkatDaerahNama ||
                            detail.user?.unit?.perangkatDaerahNama ||
                            "-"
                          }
                        />
                      </div>

                      {detail.userId ? (
                        <PenugasanPanel userId={detail.userId} />
                      ) : (
                        <p className="text-sm text-on-surface-variant">
                          Pegawai ini belum punya akun, sehingga belum dapat ditunjuk sebagai Plt atau Plh.
                        </p>
                      )}

                      <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-on-surface">Tugas Kinerja Pegawai</p>
                          <span className="text-xs text-on-surface-variant">
                            Total: {detail.user?._count?.assignedTasks ?? detail.user?.assignedTasks?.length ?? 0} tugas
                          </span>
                        </div>
                        {detail.user?.assignedTasks && detail.user.assignedTasks.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            {detail.user.assignedTasks.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between rounded-md border border-outline-variant/60 bg-surface-container-low px-2.5 py-1.5 text-xs"
                              >
                                <span className="font-medium text-on-surface line-clamp-1">{t.title}</span>
                                <span
                                  className={cn(
                                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                                    t.status === "selesai" || t.status === "disetujui"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : t.status === "berjalan"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                      : "bg-surface-container-highest text-on-surface-variant",
                                  )}
                                >
                                  {t.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant">
                            Belum ada tugas kinerja yang ditugaskan kepada pegawai ini.
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {confirmingNonJob ? (
                  <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-sm text-on-surface">
                      Non-job-kan <strong>{detail.name}</strong>? Jabatan definitif akan diubah menjadi{" "}
                      <strong>Pelaksana</strong> dan status pimpinan pada unit organisasi akan dilepas.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={nonJobbing}
                        onClick={() => setConfirmingNonJob(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                        disabled={nonJobbing}
                        onClick={handleNonJob}
                      >
                        {nonJobbing ? "Memproses..." : "Ya, non-job-kan"}
                      </Button>
                    </div>
                  </div>
                ) : confirmingDelete ? (
                  <div className="space-y-3 rounded-lg border border-error/30 bg-error/5 p-3">
                    <p className="text-sm text-on-surface">
                      Hapus {detail.name} dari pengelolaan tugas? Akun pengguna dan seluruh tugas yang berkaitan tidak
                      akan muncul lagi di aplikasi maupun laporan. Data tetap tersimpan di database.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={deleting}
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={deleting}
                        onClick={removePegawai}
                      >
                        {deleting ? "Menghapus..." : "Ya, hapus"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pb-4">
                    {canSync && detail.jenis === "asn" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-0 flex-1"
                        disabled={syncing || nonJobbing}
                        onClick={() => void refreshFromSimpeg()}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                        {syncing ? "Menyinkronkan..." : "Sinkron SIMPEG"}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="min-w-0 flex-1"
                      disabled={syncing || nonJobbing}
                      onClick={() => {
                        onOpenChange(false);
                        router.push(`/admin/pegawai/${detail.id}/unor`);
                      }}
                    >
                      <Network className="h-3.5 w-3.5" />
                      Pindah UNOR
                    </Button>
                    <div className="flex w-full gap-2">
                      {isPejabatDefinitif ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-0 flex-1 border-amber-500/50 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
                          disabled={syncing || nonJobbing}
                          onClick={() => setConfirmingNonJob(true)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Non-job pejabat
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className={cn("min-w-0", isPejabatDefinitif ? "flex-1" : "w-full")}
                        disabled={syncing || nonJobbing}
                        onClick={() => setConfirmingDelete(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus pegawai
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
