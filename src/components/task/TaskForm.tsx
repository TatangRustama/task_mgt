"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceFields, useEvidenceCapture } from "@/components/task/EvidenceCapture";
import { formatISODate } from "@/lib/utils";

type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | string | null;
  priority: string;
};

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "mandiri" | "delegasi" | "edit";
  task?: EditableTask | null;
};

type OrgContext = {
  canUsePool: boolean;
  mustAssignNamed: boolean;
  jabatanLabel: string;
  unit: { name: string; typeLabel: string } | null;
  subordinates: Array<{
    id: string;
    name: string;
    unitName: string | null;
    jabatanLabel: string;
  }>;
};

const selectClassName =
  "flex h-9 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary";

export function TaskFormDialog({ open, onOpenChange, mode, task }: TaskFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("sedang");
  const [assignmentMode, setAssignmentMode] = useState<"ditunjuk" | "kolam">("ditunjuk");
  const [assignedToId, setAssignedToId] = useState("");
  const [org, setOrg] = useState<OrgContext | null>(null);
  const evidence = useEvidenceCapture(open && showComplete);

  useEffect(() => {
    if (!open) {
      setError("");
      setShowComplete(false);
      setAssignmentMode("ditunjuk");
      setAssignedToId("");
      evidence.reset();
      return;
    }
    setPriority("sedang");
    setDeadline(mode === "mandiri" ? formatISODate(new Date()) : "");
    if (mode === "edit" && task) {
      setPriority(task.priority || "sedang");
      setDeadline(task.deadline ? formatISODate(new Date(task.deadline)) : "");
      return;
    }
    if (mode === "delegasi") {
      fetch("/api/org/context")
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal memuat daftar bawahan");
          setOrg(data);
          setAssignmentMode(data.mustAssignNamed || !data.canUsePool ? "ditunjuk" : "ditunjuk");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat daftar bawahan"));
    }
  }, [open, mode, task, evidence.reset]);

  async function saveTask(form: HTMLFormElement) {
    const formData = new FormData(form);
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      deadline: formData.get("deadline") || null,
      priority: formData.get("priority") || "sedang",
      source: mode === "edit" ? undefined : mode,
      assignmentMode: mode === "delegasi" ? assignmentMode : "ditunjuk",
      assignedToId: mode === "delegasi" && assignmentMode === "ditunjuk" ? assignedToId : null,
    };

    if (mode === "edit" && task) {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          deadline: payload.deadline,
          priority: payload.priority,
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
      if (mode === "delegasi" && assignmentMode === "ditunjuk" && !assignedToId) {
        throw new Error("Pilih penerima tugas");
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

    const evidenceError = evidence.validate();
    if (evidenceError) {
      setError(evidenceError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const created = await saveTask(form);
      const completeRes = await fetch(`/api/tasks/${created.id}/complete`, {
        method: "POST",
        body: evidence.toFormData(),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">
            {mode === "edit" ? "Edit Tugas" : mode === "mandiri" ? "Tambah Tugas" : "Delegasi Tugas"}
          </DialogTitle>
          <p className="text-sm text-on-surface-variant">
            {mode === "edit"
              ? "Perbarui detail tugas yang Anda posting. Hanya tugas tersedia yang belum diambil yang dapat diubah."
              : mode === "mandiri"
              ? "Isi detail tugas baru yang akan dilaporkan."
              : "Tunjuk bawahan langsung, atau lempar ke board staf jika Anda kepala sub bidang."}
          </p>
        </DialogHeader>
        <form key={task?.id ?? mode} onSubmit={handleSubmit} className="space-y-6">
          {mode === "delegasi" ? (
            <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
              {org?.unit ? (
                <p className="text-xs text-on-surface-variant">
                  {org.jabatanLabel} · {org.unit.name} ({org.unit.typeLabel})
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
                  Kartu akan muncul di board sub bidang Anda. Hanya staf di bawah sub bidang ini yang
                  dapat mengambilnya.
                </p>
              )}
            </div>
          ) : null}
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Detail singkat tugas"
              defaultValue={mode === "edit" ? task?.description ?? "" : undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
            <div className="space-y-2">
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
          </div>

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
              onPhotoChange={async (event) => {
                const photoError = await evidence.handlePhotoChange(event);
                if (photoError) setError(photoError);
                else setError("");
              }}
            />
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && !showComplete ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Tugas"}
            </Button>
            {mode === "mandiri" ? (
              showComplete ? (
                <Button
                  type="button"
                  variant="success"
                  className="w-full"
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
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    setError("");
                    setShowComplete(true);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Laporkan telah selesai
                </Button>
              )
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
