import { AssignmentMode, TaskPriority, TaskSource, TaskStatus } from "@prisma/client";
import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { ManagePostedTaskActions } from "@/components/task/ManagePostedTaskActions";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, isOverdue, priorityBarClass } from "@/lib/utils";
import { formatJumlahSatuan } from "@/lib/satuan";
import { descriptionPreview } from "@/lib/task-description";

export type TaskCardData = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  source: TaskSource;
  priority: TaskPriority;
  deadline: Date | string | null;
  assignmentMode?: AssignmentMode;
  assignedTo?: { name: string } | null;
  createdById?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  completedAt?: Date | string | null;
  jumlahIntervensi?: number | null;
  satuan?: string | null;
};

export function TaskCard({
  task,
  currentUserId,
}: {
  task: TaskCardData;
  currentUserId?: string;
}) {
  const overdue = task.status === "tersedia" && isOverdue(task.deadline);
  const canManage =
    Boolean(currentUserId) &&
    task.status === "tersedia" &&
    task.createdById === currentUserId;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-outline bg-surface-container-lowest transition hover:border-primary">
      <div className={cn("absolute inset-y-0 left-0 w-2", priorityBarClass[task.priority] ?? "bg-tertiary")} />
      <Link href={`/tugas/${task.id}`} className="flex flex-1 flex-col gap-1 p-3 pl-5">
        <div className="mb-0.5 flex flex-wrap gap-1">
          <Badge variant={task.source}>{task.source}</Badge>
          {task.assignmentMode === "kolam" ? <Badge variant="kolam">kolam</Badge> : null}
          {task.assignmentMode === "ditunjuk" && task.source === "delegasi" ? (
            <Badge variant="ditunjuk">ditunjuk</Badge>
          ) : null}
          <Badge variant={task.priority}>{task.priority}</Badge>
          {overdue ? <Badge variant="warning">terlambat</Badge> : null}
        </div>
        <h3 className="truncate text-lg font-semibold leading-tight text-on-surface" title={task.title}>
          {task.title}
        </h3>
        {task.description ? (
          <p className="truncate text-sm leading-tight text-on-surface-variant" title={task.description}>
            {descriptionPreview(task.description) || task.description}
          </p>
        ) : null}
        {formatJumlahSatuan(task.jumlahIntervensi, task.satuan) ? (
          <p className="text-xs text-secondary">
            {formatJumlahSatuan(task.jumlahIntervensi, task.satuan)}
          </p>
        ) : null}
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={cn("inline-flex items-center gap-1", overdue ? "text-primary-container" : "text-tertiary")}>
            <Calendar className="h-3.5 w-3.5" />
            {task.deadline ? formatDate(task.deadline) : "Tanpa deadline"}
          </span>
          {task.assignedTo ? (
            <span className="inline-flex items-center gap-1 text-secondary">
              <User className="h-3.5 w-3.5" />
              {task.assignedTo.name}
            </span>
          ) : null}
        </div>
      </Link>
      {canManage ? (
        <ManagePostedTaskActions task={task} className="border-t border-outline-variant px-3 py-2 pl-5" />
      ) : null}
    </div>
  );
}
