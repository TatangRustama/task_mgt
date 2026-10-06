"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Pencil, Trash2 } from "lucide-react";
import { TaskFormDialog } from "@/components/task/TaskForm";
import type { PostedTaskFields } from "@/components/task/ManagePostedTaskActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { statusLabel } from "@/lib/utils";

export function TaskMonitorActions({
  task,
  listHref,
  currentStatus,
  nextStatus,
}: {
  task: PostedTaskFields;
  listHref: string;
  currentStatus: string;
  nextStatus: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal menghapus tugas");
      return;
    }
    setConfirmDelete(false);
    router.push(listHref);
    router.refresh();
  }

  async function handleDowngrade() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/tasks/${task.id}/downgrade`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal menurunkan tahapan");
      return;
    }
    setConfirmDowngrade(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!nextStatus}
          onClick={() => {
            setError("");
            setConfirmDowngrade(true);
          }}
        >
          <ArrowDown className="h-4 w-4" />
          Turun tahapan
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex-1 bg-error-container text-error hover:bg-error-container/80 hover:text-error"
          onClick={() => {
            setError("");
            setConfirmDelete(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Hapus
        </Button>
      </div>
      {!nextStatus ? (
        <p className="text-xs text-on-surface-variant">Tahapan sudah paling rendah (Open).</p>
      ) : null}

      <TaskFormDialog
        open={editing}
        onOpenChange={setEditing}
        mode="edit"
        task={task}
        description="Perbarui judul, deskripsi, tanggal, selesai, prioritas, dan jumlah."
        canEditCompletedAt
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Hapus tugas?</DialogTitle>
            <p className="text-sm text-on-surface-variant">
              Tugas &quot;{task.title}&quot; akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
          </DialogHeader>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" disabled={loading} onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" className="flex-1" disabled={loading} onClick={handleDelete}>
              {loading ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDowngrade} onOpenChange={setConfirmDowngrade}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Turunkan tahapan?</DialogTitle>
            <p className="text-sm text-on-surface-variant">
              Status berubah dari {statusLabel(currentStatus)} menjadi {statusLabel(nextStatus || "")}. Tanggal
              selesai dan penilaian atasan ikut dihapus. Bukti pekerjaan tetap tersimpan.
            </p>
          </DialogHeader>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={() => setConfirmDowngrade(false)}
            >
              Batal
            </Button>
            <Button type="button" className="flex-1" disabled={loading || !nextStatus} onClick={handleDowngrade}>
              {loading ? "Menyimpan..." : "Turunkan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
