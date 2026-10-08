"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLoader } from "@/components/layout/AppLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescriptionField } from "@/components/task/DescriptionField";
import { EvidenceFields, useEvidenceCapture } from "@/components/task/EvidenceCapture";
import { InterventionFields } from "@/components/task/InterventionFields";
import { parseJumlahSatuan } from "@/lib/satuan";
import { cn, formatDateTimeLocal, formatISODate } from "@/lib/utils";

type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | string | null;
  assignedAt?: Date | string | null;
  completedAt?: Date | string | null;
  priority: string;
  jumlahIntervensi?: number | null;
  satuan?: string | null;
};

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "mandiri" | "delegasi" | "edit";
  task?: EditableTask | null;
  description?: string;
  canEditCompletedAt?: boolean;
};

type OrgContext = {
  canUsePool: boolean;
  mustAssignNamed: boolean;
  jabatanLabel: string;
  poolUnitName: string | null;
  penugasan: Array<{ jenis: string; label: string }>;
  unit: { name: string; typeLabel: string } | null;
  subordinates: Array<{
    id: string;
    name: string;
    unitName: string | null;
    jabatanLabel: string;
  }>;
};

const selectClassName =
  "box-border flex h-9 w-full min-w-0 max-w-full rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary";

export function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  task,
  description,
  canEditCompletedAt = false,
}: TaskFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [assignedAt, setAssignedAt] = useState(formatISODate(new Date()));
  const [completedAt, setCompletedAt] = useState("");
  const [priority, setPriority] = useState("sedang");
  const [assignmentMode, setAssignmentMode] = useState<"ditunjuk" | "kolam">("ditunjuk");
  const [assignedToId, setAssignedToId] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("");
  const [org, setOrg] = useState<OrgContext | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const evidence = useEvidenceCapture(open && showComplete);

  useEffect(() => {
    if (!open) {
      setError("");
      setShowComplete(false);
      setAssignmentMode("ditunjuk");
      setAssignedToId("");
      setJumlah("");
      setSatuan("");
      setCompletedAt("");
      setOrg(null);
      setOrgLoading(false);
      evidence.reset();
      return;
    }
    setPriority("sedang");
    setAssignedAt(formatISODate(new Date()));
    setDeadline(mode === "mandiri" ? formatISODate(new Date()) : "");
    setJumlah("");
    setSatuan("");
    if (mode === "edit" && task) {
      setPriority(task.priority || "sedang");
      setAssignedAt(task.assignedAt ? formatISODate(new Date(task.assignedAt)) : formatISODate(new Date()));
      setDeadline(task.deadline ? formatISODate(new Date(task.deadline)) : "");
      setCompletedAt(canEditCompletedAt ? formatDateTimeLocal(task.completedAt) : "");
      setJumlah(task.jumlahIntervensi != null ? String(task.jumlahIntervensi) : "");
      setSatuan(task.satuan ?? "");
      return;
    }
    if (mode !== "delegasi") return;

    let cancelled = false;
    setOrg(null);
    setOrgLoading(true);
    fetch("/api/org/context")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat daftar bawahan");
        if (cancelled) return;
        setOrg(data);
        setAssignmentMode(data.mustAssignNamed || !data.canUsePool ? "ditunjuk" : "ditunjuk");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat daftar bawahan");
      })
      .finally(() => {
        if (!cancelled) setOrgLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, task, canEditCompletedAt, evidence.reset]);

  async function saveTask(form: HTMLFormElement) {
    const formData = new FormData(form);
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      deadline: formData.get("deadline") || null,
      assignedAt: formData.get("assignedAt") || formatISODate(new Date()),
      priority: formData.get("priority") || "sedang",
      source: mode === "edit" ? undefined : mode,
      assignmentMode: mode === "delegasi" ? assignmentMode : "ditunjuk",
      assignedToId: mode === "delegasi" && assignmentMode === "ditunjuk" ? assignedToId : null,
      jumlahIntervensi: jumlah,
      satuan,
    };

    if (mode === "edit" && task) {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          deadline: payload.deadline,
          assignedAt: payload.assignedAt,
          priority: payload.priority,
          jumlahIntervensi: payload.jumlahIntervensi,
          satuan: payload.satuan,
          ...(canEditCompletedAt ? { completedAt: completedAt || null } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui tugas");
      }
      return data as { id: string };
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Gagal membuat tugas");
    }
    return data as { id: string };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const title = String(new FormData(event.currentTarget).get("title") || "").trim();
      if (!title) {
        throw new Error("Judul wajib diisi");
      }
      if (mode === "delegasi" && assignmentMode === "ditunjuk" && !assignedToId) {
        throw new Error("Pilih penerima tugas");
      }
      const parsedJumlah = parseJumlahSatuan(jumlah, satuan, false);
      if (!parsedJumlah.ok) {
        throw new Error(parsedJumlah.error);
      }
      await saveTask(event.currentTarget);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tugas");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!form) return;

    const title = String(new FormData(form).get("title") || "").trim();
    if (!title) {
      setError("Judul wajib diisi");
      return;
    }

    const parsedJumlah = parseJumlahSatuan(jumlah, satuan, true);
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

    try {
      const created = await saveTask(form);
      const completeBody = evidence.toFormData();
      completeBody.append("jumlahIntervensi", jumlah);
      completeBody.append("satuan", satuan);
      const completeRes = await fetch(`/api/tasks/${created.id}/complete`, {
        method: "POST",
        body: completeBody,
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || "Tugas tersimpan, tetapi laporan selesai gagal");
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melaporkan tugas selesai");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "box-border content-start min-w-0 gap-2 overflow-x-hidden overflow-y-auto",
          "left-[max(0.5rem,env(safe-area-inset-left))] right-[max(0.5rem,env(safe-area-inset-right))] top-18 bottom-[max(0.5rem,env(safe-area-inset-bottom))] h-auto w-auto max-h-none max-w-none translate-x-0 translate-y-0",
          "sm:left-1/2 sm:right-auto sm:top-20 sm:bottom-auto sm:max-h-[calc(100vh-6rem)] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:translate-y-0",
        )}
      >
        <DialogHeader className="min-w-0 pr-8 text-left">
          <DialogTitle className="text-2xl font-bold">
            {mode === "edit" ? "Edit Tugas" : mode === "mandiri" ? "Tambah Tugas" : "Delegasi Tugas"}
          </DialogTitle>
          <p className="text-sm text-on-surface-variant">
            {description
              ? description
              : mode === "edit"
              ? "Perbarui detail tugas yang Anda posting. Hanya tugas tersedia atau dikerjakan yang dapat diubah."
              : mode === "mandiri"
              ? "Isi detail tugas baru yang akan dilaporkan."
              : "Tunjuk bawahan langsung, atau lempar ke board staf jika Anda kepala sub bidang."}
          </p>
        </DialogHeader>
        {mode === "delegasi" && orgLoading ? <AppLoader label="Memuat form delegasi" /> : (
        <form key={task?.id ?? mode} onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-6">
          {mode === "delegasi" ? (
            <div className="min-w-0 space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
              {org?.unit ? (
                <p className="text-xs text-on-surface-variant">
                  {org.jabatanLabel} · {org.unit.name} ({org.unit.typeLabel})
                </p>
              ) : null}
              {org?.penugasan?.length ? (
                <p className="text-xs text-on-surface-variant">
                  {org.penugasan.map((item) => item.label).join(" · ")}
                </p>
              ) : null}
              {org?.canUsePool ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={assignmentMode === "ditunjuk" ? "default" : "outline"}
                    onClick={() => setAssignmentMode("ditunjuk")}
                  >
                    Tunjuk staf
                  </Button>
                  <Button
                    type="button"
                    variant={assignmentMode === "kolam" ? "default" : "outline"}
                    onClick={() => setAssignmentMode("kolam")}
                  >
                    Kolam board
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-on-surface">Penerima wajib ditunjuk secara bernama.</p>
              )}
              {assignmentMode === "ditunjuk" ? (
                <div className="space-y-2">
                  <Label htmlFor="assignedToId">Penerima</Label>
                  <select
                    id="assignedToId"
                    className={selectClassName}
                    value={assignedToId}
                    onChange={(event) => setAssignedToId(event.target.value)}
                    required
                  >
                    <option value="">Pilih bawahan langsung</option>
                    {(org?.subordinates || []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                        {person.unitName ? ` · ${person.unitName}` : ""}
                        {person.jabatanLabel ? ` (${person.jabatanLabel})` : ""}
                      </option>
                    ))}
                  </select>
                  {!org?.subordinates.length ? (
                    <p className="text-xs text-on-surface-variant">
                      Belum ada bawahan langsung. Lengkapi struktur organisasi di Admin.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  Kartu akan muncul di board {org?.poolUnitName || "sub bidang"}. Hanya staf di bawah
                  sub bidang ini yang dapat mengambilnya.
                </p>
              )}
            </div>
          ) : null}
          <div className="min-w-0 space-y-2">
            <Label htmlFor="title">Judul Tugas</Label>
            <Input
              id="title"
              name="title"
              maxLength={60}
              required
              placeholder="Contoh: Verifikasi berkas..."
              defaultValue={mode === "edit" ? task?.title ?? "" : undefined}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <DescriptionField
              key={`${mode}-${task?.id ?? "new"}-${open}`}
              defaultValue={mode === "edit" ? task?.description ?? "" : ""}
            />
          </div>
          <div className="grid min-w-0 grid-cols-2 items-end gap-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="assignedAt">Tanggal ditugaskan</Label>
              <Input
                id="assignedAt"
                name="assignedAt"
                type="date"
                required
                className="min-w-0 max-w-full"
                value={assignedAt}
                onChange={(event) => setAssignedAt(event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                className="min-w-0 max-w-full"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
          </div>
          {mode === "edit" && canEditCompletedAt ? (
            <div className="min-w-0 space-y-2">
              <Label htmlFor="completedAt">Selesai</Label>
              <Input
                id="completedAt"
                name="completedAt"
                type="datetime-local"
                className="min-w-0 max-w-full"
                value={completedAt}
                onChange={(event) => setCompletedAt(event.target.value)}
              />
            </div>
          ) : null}
          <div className="min-w-0 space-y-2">
            <Label htmlFor="priority">Prioritas</Label>
            <select
              id="priority"
              name="priority"
              className={selectClassName}
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="rendah">Rendah</option>
              <option value="sedang">Sedang</option>
              <option value="tinggi">Tinggi</option>
            </select>
          </div>

          <InterventionFields
            jumlah={jumlah}
            satuan={satuan}
            onJumlahChange={setJumlah}
            onSatuanChange={setSatuan}
            required={mode === "mandiri" && showComplete}
          />

          {mode === "mandiri" && showComplete ? (
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
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className={mode === "mandiri" ? "flex gap-2" : undefined}>
            <Button
              type="submit"
              className={mode === "mandiri" ? "min-w-0 flex-1" : "w-full"}
              disabled={loading}
              formNoValidate
            >
              <Save className="h-4 w-4" />
              {loading && !showComplete ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Tugas"}
            </Button>
            {mode === "mandiri" ? (
              showComplete ? (
                <Button
                  type="button"
                  variant="success"
                  className="min-w-0 flex-1"
                  disabled={loading}
                  onClick={handleComplete}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? "Mengunggah..." : "Kirim laporan selesai"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="success"
                  className="min-w-0 flex-1"
                  disabled={loading}
                  onClick={() => {
                    setError("");
                    setShowComplete(true);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Laporkan Selesai
                </Button>
              )
            ) : null}
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
