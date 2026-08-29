"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskDetailModal } from "@/components/report/TaskDetailModal";
import { StarRating } from "@/components/task/StarRating";
import type { ReportTask } from "@/lib/report-types";
import { cn, formatDateTime, statusBarClass, statusLabel } from "@/lib/utils";

export function TaskReportList({
  tasks,
  emptyText = "Tidak ada tugas pada periode ini.",
}: {
  tasks: ReportTask[];
  emptyText?: string;
}) {
  const [items, setItems] = useState(tasks);
  const [selected, setSelected] = useState<ReportTask | null>(null);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  return (
    <>
      <div className="space-y-2">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-on-surface-variant">
              {emptyText}
            </CardContent>
          </Card>
        ) : (
          items.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelected(task)}
              className="flex w-full items-start gap-4 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left card-shadow transition hover:shadow-md"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  statusBarClass[task.status] ?? "bg-surface-container",
                )}
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-on-surface">{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge variant={task.source}>{task.source}</Badge>
                  <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {task.assigneeName}
                  {task.completedAt ? ` · selesai ${formatDateTime(task.completedAt)}` : ""}
                </p>
                {task.score != null ? (
                  <div className="mt-1">
                    <StarRating value={task.score} readOnly size="sm" />
                  </div>
                ) : null}
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-outline" />
            </button>
          ))
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
