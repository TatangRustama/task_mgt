import { starLabel } from "@/lib/rating";
import type { ReportTask } from "@/lib/report-types";
import { formatNip, statusLabel } from "@/lib/utils";
import { formatJumlahSatuan } from "@/lib/satuan";

export const PRINT_TASK_STATUSES = ["menunggu_approval", "disetujui"] as const;

export type PrintPerson = {
  name: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
};

export type PrintUnitReviewRow = {
  name: string;
  identity: string;
  kedudukanHukum: string;
  role: string;
  insight: string;
  completed: number;
  rejected: number;
  averageScore: number;
  onTimePercent: number;
};

export type LaporanPrintContext = {
  author: PrintPerson;
  atasan: PrintPerson | null;
  kopGovernment: string;
  kopAgency: string;
  kopAddress: string;
  kopWebsite: string;
  reportId: string;
  validationUrl: string;
  qrDataUrl: string;
};

export type DailyLaporanPrintContext = {
  author: PrintPerson;
  atasan: PrintPerson | null;
  kopGovernment: string;
  kopAgency: string;
  kopAddress: string;
  kopWebsite: string;
};

export function isPrintableTask(status: string) {
  return PRINT_TASK_STATUSES.includes(status as (typeof PRINT_TASK_STATUSES)[number]);
}

export function printableTasks<T extends { status: string }>(tasks: T[]): T[] {
  return tasks.filter((task) => isPrintableTask(task.status));
}

export function taskWfhUraian(task: Pick<ReportTask, "title" | "description">) {
  const parts = [task.title.trim()];
  if (task.description?.trim()) parts.push(task.description.trim());
  return parts.join(" — ");
}

export function taskWfhHasil(
  task: Pick<ReportTask, "notes" | "feedback" | "jumlahIntervensi" | "satuan">,
) {
  const parts = [formatJumlahSatuan(task.jumlahIntervensi, task.satuan), task.notes, task.feedback].filter(
    Boolean,
  ) as string[];
  return parts.join(" — ") || "-";
}

export function taskWfhTempat(task: Pick<ReportTask, "address">) {
  return task.address?.trim() || "Rumah";
}

export function groupTasksForWfhPrint(tasks: ReportTask[]) {
  const groups = new Map<string, ReportTask[]>();
  for (const task of tasks) {
    const tempat = taskWfhTempat(task);
    const bucket = groups.get(tempat) ?? [];
    bucket.push(task);
    groups.set(tempat, bucket);
  }

  return Array.from(groups.entries()).map(([tempat, items], index) => ({
    no: index + 1,
    tempat,
    tasks: items,
    photoUrls: items.flatMap((task) => task.photoUrls),
  }));
}

export function formatPrintDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function printHasil(task: Pick<ReportTask, "score" | "jumlahIntervensi" | "satuan">) {
  const parts = [formatJumlahSatuan(task.jumlahIntervensi, task.satuan), starLabel(task.score)].filter(
    Boolean,
  ) as string[];
  return parts.join(" — ");
}

export function printParaf(task: Pick<ReportTask, "status">) {
  if (task.status === "disetujui") return "Approved";
  if (task.status === "menunggu_approval") return "Menunggu approved";
  return statusLabel(task.status);
}

export function printHasilLine(task: Pick<ReportTask, "score">) {
  return starLabel(task.score);
}

export function printTempatLine(task: Pick<ReportTask, "address">) {
  const place = task.address?.trim();
  return place ? `- ${place}` : null;
}

export function printKeterangan(
  task: Pick<ReportTask, "notes" | "feedback" | "assigneeName">,
  authorName?: string,
  options?: { includeFeedback?: boolean },
) {
  const includeFeedback = options?.includeFeedback !== false;
  const parts = [task.notes, includeFeedback ? task.feedback : null].filter(Boolean) as string[];
  if (authorName && task.assigneeName && task.assigneeName !== authorName && task.assigneeName !== "-") {
    parts.push(`Pegawai: ${task.assigneeName}`);
  }
  return parts.join(" — ");
}

export function printAtasanPenilaian(task: Pick<ReportTask, "score" | "feedback" | "status">) {
  const parts = [starLabel(task.score), printParaf(task), task.feedback].filter(Boolean) as string[];
  return parts.join(" — ") || "-";
}

export function printPhotoSrc(url: string) {
  return `/api/reports/evidence-image?url=${encodeURIComponent(url)}`;
}

export function printTaskDate(task: Pick<ReportTask, "assignedAt" | "completedAt" | "createdAt">) {
  return formatPrintDate(task.assignedAt || task.completedAt || task.createdAt);
}

export function groupTasksByPrintDate(tasks: ReportTask[]) {
  const sorted = [...tasks].sort((a, b) => {
    const aTime = new Date(a.assignedAt || a.completedAt || a.createdAt).getTime();
    const bTime = new Date(b.assignedAt || b.completedAt || b.createdAt).getTime();
    return aTime - bTime;
  });

  const groups: Array<{ no: number; date: string; tasks: ReportTask[] }> = [];
  for (const task of sorted) {
    const date = printTaskDate(task);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.tasks.push(task);
    } else {
      groups.push({ no: groups.length + 1, date, tasks: [task] });
    }
  }
  return groups;
}

export function evidenceRows(tasks: ReportTask[]) {
  return tasks
    .filter((task) => task.photoUrls.length > 0)
    .map((task) => ({
      date: printTaskDate(task),
      photos: task.photoUrls,
      title: task.title,
    }));
}
