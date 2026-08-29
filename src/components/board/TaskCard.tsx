import { AssignmentMode, TaskPriority, TaskSource, TaskStatus } from "@prisma/client";
import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, isOverdue, priorityBarClass } from "@/lib/utils";

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
};

export function TaskCard({ task }: { task: TaskCardData }) {
  const overdue = task.status === "tersedia" && isOverdue(task.deadline);

  return (
    <Link
      href={`/tugas/${task.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest card-shadow transition hover:shadow-md"
    >
      <div className={cn("absolute inset-y-0 left-0 w-2", priorityBarClass[task.priority] ?? "bg-tertiary")} />
      <div className="flex flex-1 flex-col gap-1 p-3 pl-5">
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
            {task.description}
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
      </div>
    </Link>
  );
}
