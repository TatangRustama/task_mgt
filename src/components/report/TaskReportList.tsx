"use client";

import { useState } from "react";
import { Ban, Check, Clock3, Inbox, Play, X, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskDetailModal } from "@/components/report/TaskDetailModal";
import { StarRating } from "@/components/task/StarRating";
import type { ReportTask } from "@/lib/report-types";
import { formatJumlahSatuan } from "@/lib/satuan";
import { cn, formatDate, formatDateTime, isMultiDayDeadline, statusLabel } from "@/lib/utils";

const STATUS_ICON: Record<string, LucideIcon> = {
  tersedia: Inbox,
  dikerjakan: Play,
  menunggu_approval: Clock3,
  disetujui: Check,
  ditolak: X,
  dibatalkan: Ban,
};

const STATUS_ICON_CLASS: Record<string, string> = {
  tersedia: "text-secondary",
  dikerjakan: "text-primary",
  menunggu_approval: "text-accent",
  disetujui: "text-emerald-600",
  ditolak: "text-error",
  dibatalkan: "text-tertiary",
};

function TaskStatusMark({ status }: { status: string }) {
  const Icon = STATUS_ICON[status] ?? Inbox;
  return (
    <Icon
      aria-hidden
      className={cn("mt-0.5 h-6 w-6 shrink-0", STATUS_ICON_CLASS[status] ?? "text-on-surface-variant")}
      strokeWidth={2.25}
    />
  );
}

function taskMeta(task: ReportTask, showAssignee: boolean) {
  return [
    showAssignee ? task.assigneeName : null,
    task.completedAt ? `selesai ${formatDateTime(task.completedAt)}` : null,
    formatJumlahSatuan(task.jumlahIntervensi, task.satuan),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function TaskReportList({
  tasks,
  emptyText = "Tidak ada tugas pada periode ini.",
  showAssignee = true,
}: {
  tasks: ReportTask[];
  emptyText?: string;
  showAssignee?: boolean;
}) {
  const [selected, setSelected] = useState<ReportTask | null>(null);

  return (
    <>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-on-surface-variant">
              {emptyText}
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const meta = taskMeta(task, showAssignee);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelected(task)}
                className="flex w-full items-start gap-4 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-left card-shadow transition hover:shadow-md"
              >
                <TaskStatusMark status={task.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-on-surface">{task.title}</p>
                  {isMultiDayDeadline(task.assignedAt, task.createdAt, task.deadline) ? (
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      Target penyelesaian: {formatDate(task.deadline)}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <Badge variant={task.source}>{task.source}</Badge>
                      <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                    </div>
                    {task.score != null ? (
                      <div className="ml-auto shrink-0">
                        <StarRating value={task.score} readOnly size="sm" />
                      </div>
                    ) : null}
                  </div>
                  {meta ? <p className="mt-1 text-xs text-on-surface-variant">{meta}</p> : null}
                </div>
              </button>
            );
          })
        )}
      </div>

      <TaskDetailModal
        task={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
