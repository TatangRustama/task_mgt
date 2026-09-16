"use client";

import { Badge } from "@/components/ui/badge";
import { EvidencePhotoGrid } from "@/components/task/EvidencePhotoGrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/task/StarRating";
import type { ReportTask } from "@/lib/report-types";
import { formatStars } from "@/lib/rating";
import { formatJumlahSatuan } from "@/lib/satuan";
import { cn, formatDate, formatDateTime, priorityBarClass, statusLabel } from "@/lib/utils";
import { TaskDescription } from "@/components/task/TaskDescription";

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
}: {
  task: ReportTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const completed = Boolean(task?.completedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0">
        {task ? (
          <>
            <div className={cn("h-1.5", priorityBarClass[task.priority] ?? "bg-tertiary")} />
            <div className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
              <DialogHeader>
                <div className="flex flex-wrap gap-1 pr-6">
                  <Badge variant={task.source}>{task.source}</Badge>
                  <Badge variant={task.priority}>{task.priority}</Badge>
                  <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                </div>
                <DialogTitle>{task.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-on-surface-variant">
                {task.description ? <TaskDescription text={task.description} /> : null}
                {formatJumlahSatuan(task.jumlahIntervensi, task.satuan) ? (
                  <p>Jumlah yang diintervensi: {formatJumlahSatuan(task.jumlahIntervensi, task.satuan)}</p>
                ) : null}
                <p>Dibuat oleh: {task.createdByName}</p>
                <p>Pegawai: {task.assigneeName}</p>
                <p>Diposting: {formatDateTime(task.createdAt)}</p>
                {task.deadline ? <p>Deadline: {formatDate(task.deadline)}</p> : null}
                {task.completedAt ? <p>Selesai: {formatDateTime(task.completedAt)}</p> : null}
                {task.notes ? <p>Catatan: {task.notes}</p> : null}
                {task.address ? <p>Lokasi: {task.address}</p> : null}
                <EvidencePhotoGrid urls={task.photoUrls} />
              </div>

              {completed ? (
                <div className="rounded-lg border border-surface-container-highest bg-surface-container-low p-4">
                  <p className="text-sm font-semibold text-on-surface">Penilaian atasan</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {task.score != null
                      ? `Nilai ${formatStars(task.score)}`
                      : "Belum dinilai saat persetujuan."}
                  </p>
                  <div className="mt-3">
                    <StarRating value={task.score} readOnly />
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
