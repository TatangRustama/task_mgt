import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LeaderQueueTask } from "@/lib/home";
import { formatDate, statusLabel } from "@/lib/utils";

export function LeaderTaskList({
  tasks,
  emptyText,
}: {
  tasks: LeaderQueueTask[];
  emptyText: string;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-on-surface-variant">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/tugas/${task.id}`}
            className="flex items-center gap-2 rounded-lg border border-outline bg-surface-container-lowest p-3 transition hover:border-primary"
          >
            <div className="shrink-0 rounded-md border border-outline bg-sky-100 p-1.5 text-sky-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface" title={task.title}>
                {task.title}
              </p>
              <p className="mt-1 truncate text-sm text-on-surface-variant">
                {task.assignedToName ?? "Belum diambil"}
                {task.deadline ? ` · tenggat ${formatDate(task.deadline)}` : ""}
                {` · ${task.unitName}`}
              </p>
            </div>
            <Badge variant={task.status} className="shrink-0">
              {statusLabel(task.status)}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
