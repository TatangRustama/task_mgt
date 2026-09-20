"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EvidencePhotoGrid } from "@/components/task/EvidencePhotoGrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/task/StarRating";
import { formatStars, normalizeStars } from "@/lib/rating";
import type { ReportTask } from "@/lib/report-types";
import { formatJumlahSatuan } from "@/lib/satuan";
import { cn, formatDate, formatDateTime, priorityBarClass, statusLabel } from "@/lib/utils";
import { TaskDescription } from "@/components/task/TaskDescription";

function iso(value: string | Date | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function reportTaskFromApi(raw: Record<string, unknown>, fallback: ReportTask): ReportTask {
  const evidence = (raw.evidence ?? null) as {
    address?: string;
    notes?: string;
    photoUrls?: string[];
  } | null;
  const review = (raw.review ?? null) as {
    score?: number | null;
    reviewedAt?: string | Date;
    feedback?: string | null;
  } | null;
  const rating = (raw.rating ?? null) as { stars?: number } | null;
  const assignedTo = (raw.assignedTo ?? null) as { id?: string; name?: string } | null;
  const createdBy = (raw.createdBy ?? null) as { name?: string } | null;

  return {
    id: String(raw.id ?? fallback.id),
    title: String(raw.title ?? fallback.title),
    description: (raw.description as string | null) ?? fallback.description,
    status: String(raw.status ?? fallback.status),
    source: String(raw.source ?? fallback.source),
    priority: String(raw.priority ?? fallback.priority),
    createdAt: iso(raw.createdAt as string | Date) || fallback.createdAt,
    assignedAt: iso(raw.assignedAt as string | Date) || iso(raw.createdAt as string | Date) || fallback.assignedAt,
    completedAt: iso(raw.completedAt as string | Date | null),
    deadline: iso(raw.deadline as string | Date | null),
    reviewedAt: iso(review?.reviewedAt),
    score: rating?.stars ?? normalizeStars(review?.score),
    address: evidence?.address || null,
    notes: evidence?.notes || null,
    feedback: review?.feedback || null,
    photoUrls: evidence?.photoUrls || [],
    assigneeId: assignedTo?.id ?? null,
    assigneeName: assignedTo?.name || fallback.assigneeName,
    createdByName: createdBy?.name || fallback.createdByName,
    jumlahIntervensi: (raw.jumlahIntervensi as number | null) ?? fallback.jumlahIntervensi,
    satuan: (raw.satuan as string | null) ?? fallback.satuan,
  };
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
}: {
  task: ReportTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ReportTask | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !task) {
      setDetail(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setDetail(null);
    setLoading(true);

    fetch(`/api/tasks/${task.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat detail tugas");
        return data as Record<string, unknown>;
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(reportTaskFromApi(data, task));
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(task);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, task]);

  const view = detail;
  const completed = Boolean(view?.completedAt);
  const showPenilaian =
    completed ||
    view?.status === "disetujui" ||
    view?.status === "ditolak" ||
    view?.score != null ||
    Boolean(view?.feedback?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0">
        {loading || !view ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8">
            <DialogHeader className="sr-only">
              <DialogTitle>Memuat detail tugas</DialogTitle>
            </DialogHeader>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Memuat detail tugas...</p>
          </div>
        ) : (
          <>
            <div className={cn("h-1.5", priorityBarClass[view.priority] ?? "bg-tertiary")} />
            <div className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
              <DialogHeader>
                <div className="flex flex-wrap gap-1 pr-6">
                  <Badge variant={view.source}>{view.source}</Badge>
                  <Badge variant={view.priority}>{view.priority}</Badge>
                  <Badge variant={view.status}>{statusLabel(view.status)}</Badge>
                </div>
                <DialogTitle>{view.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-on-surface-variant">
                {view.description ? <TaskDescription text={view.description} /> : null}
                {formatJumlahSatuan(view.jumlahIntervensi, view.satuan) ? (
                  <p>Jumlah yang diintervensi: {formatJumlahSatuan(view.jumlahIntervensi, view.satuan)}</p>
                ) : null}
                <p>Dibuat oleh: {view.createdByName}</p>
                <p>Pegawai: {view.assigneeName}</p>
                <p>Diposting: {formatDateTime(view.createdAt)}</p>
                {view.deadline ? <p>Deadline: {formatDate(view.deadline)}</p> : null}
                {view.completedAt ? <p>Selesai: {formatDateTime(view.completedAt)}</p> : null}
                {view.notes ? <p>Catatan: {view.notes}</p> : null}
                {view.address ? <p>Lokasi: {view.address}</p> : null}
                <EvidencePhotoGrid urls={view.photoUrls} />
              </div>

              {showPenilaian ? (
                <div className="rounded-lg border border-surface-container-highest bg-surface-container-low p-4">
                  <p className="text-sm font-semibold text-on-surface">Penilaian atasan</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {view.score != null
                      ? `Nilai ${formatStars(view.score)}`
                      : "Belum dinilai saat persetujuan."}
                  </p>
                  <div className="mt-3">
                    <StarRating value={view.score} readOnly />
                  </div>
                  {view.feedback?.trim() ? (
                    <p className="mt-3 text-sm text-on-surface-variant">
                      Feedback: {view.feedback.trim()}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
