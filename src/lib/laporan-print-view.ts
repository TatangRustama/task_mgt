import { starLabel } from "@/lib/rating";
import type { ReportTask } from "@/lib/report-types";
import { isMultiDayDeadline, parseISODate, statusLabel } from "@/lib/utils";
import { formatJumlahSatuan } from "@/lib/satuan";

export const PRINT_TASK_STATUSES = ["dikerjakan", "menunggu_approval", "disetujui"] as const;

export type PrintPerson = {
  name: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
};

export type PrintUnitReviewRow = {
  name: string;
  identity: string;
  jabatanNama: string;
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

export function isMultiDayTask(
  task: Pick<ReportTask, "assignedAt" | "createdAt" | "deadline"> | {
    assignedAt?: string | Date | null;
    createdAt?: string | Date | null;
    deadline?: string | Date | null;
  },
) {
  return isMultiDayDeadline(task.assignedAt, task.createdAt, task.deadline);
}

export function printTargetLine(
  task: Pick<ReportTask, "assignedAt" | "createdAt" | "deadline"> | {
    assignedAt?: string | Date | null;
    createdAt?: string | Date | null;
    deadline?: string | Date | null;
  },
) {
  if (!isMultiDayTask(task)) return null;
  return `Target penyelesaian: ${formatPrintDate(task.deadline)}`;
}

export function isPrintableTask(task: {
  status: string;
  assignedAt?: string | Date | null;
  createdAt?: string | Date | null;
  deadline?: string | Date | null;
}) {
  if (task.status === "disetujui" || task.status === "menunggu_approval") return true;
  return task.status === "dikerjakan" && isMultiDayTask(task);
}

export function printableTasks<T extends {
  status: string;
  assignedAt?: string | Date | null;
  createdAt?: string | Date | null;
  deadline?: string | Date | null;
}>(tasks: T[]): T[] {
  return tasks.filter((task) => isPrintableTask(task));
}

export function isMonthlyPrintTask(
  task: {
    status: string;
    completedAt?: string | Date | null;
    assignedAt?: string | Date | null;
    createdAt?: string | Date | null;
    deadline?: string | Date | null;
  },
  start: Date,
  end: Date,
) {
  if (!task.completedAt || !isPrintableTask(task)) return false;
  const completed = new Date(task.completedAt);
  if (Number.isNaN(completed.getTime())) return false;
  return completed >= start && completed < end;
}

export function isCarryoverMonthlyPrintTask(
  task: {
    status: string;
    completedAt?: string | Date | null;
    assignedAt?: string | Date | null;
    createdAt?: string | Date | null;
    deadline?: string | Date | null;
  },
  start: Date,
  end: Date,
) {
  if (!task.completedAt || !isPrintableTask(task)) return false;
  const assigned = new Date(task.assignedAt || task.createdAt || "");
  const completed = new Date(task.completedAt);
  if (Number.isNaN(assigned.getTime()) || Number.isNaN(completed.getTime())) return false;
  return assigned >= start && assigned < end && completed >= end;
}

export function toMonthlyPrintTasks<T extends ReportTask>(tasks: T[], start: Date, end: Date): T[] {
  const selesai = tasks
    .filter((task) => isMonthlyPrintTask(task, start, end))
    .map((task) => ({ ...task, printRole: "selesai" as const }));
  const selesaiIds = new Set(selesai.map((task) => task.id));
  const dikerjakan = tasks
    .filter((task) => !selesaiIds.has(task.id) && isCarryoverMonthlyPrintTask(task, start, end))
    .map((task) => ({
      ...task,
      printRole: "dikerjakan" as const,
      status: "dikerjakan",
      score: null,
      reviewedAt: null,
      feedback: null,
    }));
  return [...dikerjakan, ...selesai].sort((a, b) => monthlyPrintSortTime(a) - monthlyPrintSortTime(b));
}

function monthlyPrintSortTime(task: Pick<ReportTask, "printRole" | "assignedAt" | "createdAt" | "completedAt">) {
  const value = task.printRole === "dikerjakan" ? task.assignedAt || task.createdAt : task.completedAt;
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
}

export function dailyPrintTasks<T extends ReportTask>(tasks: T[], date: string): T[] {
  const start = parseISODate(date);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return toMonthlyPrintTasks(tasks, start, end);
}

export function taskWfhUraian(task: Pick<ReportTask, "title" | "description" | "assignedAt" | "createdAt" | "deadline">) {
  const parts = [task.title.trim()];
  if (task.description?.trim()) parts.push(task.description.trim());
  const target = printTargetLine(task);
  if (target) parts.push(target);
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
  if (task.status === "dikerjakan") return "dikerjakan";
  if (task.status === "disetujui") return "Approved";
  if (task.status === "menunggu_approval") return "Menunggu approved";
  return statusLabel(task.status);
}

export function printHasilLine(task: Pick<ReportTask, "score">) {
  return starLabel(task.score);
}

export function truncatePrintText(value: string, max = 30) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

export function printTempatLine(task: Pick<ReportTask, "address">) {
  const place = task.address?.trim();
  if (!place) return null;
  return `- ${truncatePrintText(place, 30)}`;
}

export function printUraianTitle(task: Pick<ReportTask, "title">) {
  return task.title.trim() || "-";
}

export function printUraianDescription(task: Pick<ReportTask, "description">) {
  return task.description?.trim() || null;
}

export function printUraianText(
  task: Pick<
    ReportTask,
    "title" | "description" | "address" | "assignedAt" | "createdAt" | "deadline" | "jumlahIntervensi" | "satuan"
  >,
  options?: { includeJumlah?: boolean },
) {
  return [
    printUraianTitle(task),
    printUraianDescription(task),
    options?.includeJumlah ? formatJumlahSatuan(task.jumlahIntervensi, task.satuan) : null,
    printTargetLine(task),
    printTempatLine(task),
  ]
    .filter(Boolean)
    .join("\n");
}

export function printHasilParafText(
  task: Pick<ReportTask, "feedback" | "score" | "status" | "reviewedAt">,
) {
  const parts = printDailyHasilParafParts(task);
  return [parts.feedback, parts.penilaian, parts.status, parts.reviewedAt].join("\n");
}

export function printDailyKeteranganText(task: Pick<ReportTask, "notes">) {
  return task.notes?.trim() || "-";
}

export function printDailyHasilParafParts(
  task: Pick<ReportTask, "feedback" | "score" | "status" | "reviewedAt">,
) {
  const penilaian = printHasilLine(task);
  const reviewed = task.reviewedAt ? formatPrintDate(task.reviewedAt) : null;
  return {
    feedback: task.feedback?.trim() || "-",
    penilaian: penilaian || "-",
    status: printParaf(task),
    reviewedAt: reviewed && reviewed !== "-" ? reviewed : "-",
  };
}

export function printDailyHasilParafText(
  task: Pick<ReportTask, "feedback" | "score" | "status" | "reviewedAt">,
) {
  const parts = printDailyHasilParafParts(task);
  return [`Feedback :\n${parts.feedback}`, parts.penilaian, parts.status, parts.reviewedAt].join("\n");
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

export function printTaskDate(task: Pick<ReportTask, "printRole" | "assignedAt" | "createdAt" | "completedAt">) {
  if (task.printRole === "dikerjakan") return formatPrintDate(task.assignedAt || task.createdAt);
  return formatPrintDate(task.completedAt);
}

export function groupTasksByPrintDate(tasks: ReportTask[]) {
  const sorted = tasks
    .filter((task) => (task.printRole === "dikerjakan" ? task.assignedAt || task.createdAt : task.completedAt))
    .sort((a, b) => monthlyPrintSortTime(a) - monthlyPrintSortTime(b));

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
    .filter((task) => task.photoUrls.length > 0 && task.printRole !== "dikerjakan")
    .map((task) => ({
      date: printTaskDate(task),
      photos: task.photoUrls,
      title: task.title,
    }));
}
