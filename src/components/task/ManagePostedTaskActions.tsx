"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskFormDialog } from "@/components/task/TaskForm";
import { cn } from "@/lib/utils";

export type PostedTaskFields = {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | string | null;
  assignedAt?: Date | string | null;
  priority: string;
  jumlahIntervensi?: number | null;
  satuan?: string | null;
};

export function ManagePostedTaskActions({
  task,
  afterDeleteHref,
  className,
}: {
  task: PostedTaskFields;
  afterDeleteHref?: string;
  className?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    if (afterDeleteHref) {
      router.push(afterDeleteHref);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className={cn("flex gap-2", className)}>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          className="flex-1 shadow-none"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="flex-1 bg-error-container text-error shadow-none hover:bg-error-container/80 hover:text-error"
          onClick={() => {
            setError("");
            setConfirmDelete(true);
          }}
        >
          <Trash2 className="h-3 w-3" />
          Hapus
        </Button>
      </div>

      <TaskFormDialog
        open={editing}
        onOpenChange={setEditing}
        mode="edit"
        task={task}
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
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={() => setConfirmDelete(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={loading}
              onClick={handleDelete}
            >
              {loading ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
