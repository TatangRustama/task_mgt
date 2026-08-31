import QRCode from "qrcode";
import { headers } from "next/headers";
import { formatGolonganPangkat } from "@/lib/golongan";
import { getAtasan, getDbOrgUser, jabatanLabel } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { normalizeStars, starLabel } from "@/lib/rating";
import type { ReportTask } from "@/lib/report-types";
import { formatNip, statusLabel } from "@/lib/utils";

export const PRINT_TASK_STATUSES = ["menunggu_approval", "disetujui"] as const;

export type PrintPerson = {
  name: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
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

const KOP_ADDRESS =
  "Jl. Brigjen Marinir Abraham O. Atururi, Komplek Perkantoran Gubernur, Arfai-Manokwari";
const KOP_WEBSITE = "www.bkd.papuabaratprov.go.id";

export function isPrintableTask(status: string) {
  return PRINT_TASK_STATUSES.includes(status as (typeof PRINT_TASK_STATUSES)[number]);
}

export function printableTasks<T extends { status: string }>(tasks: T[]): T[] {
  return tasks.filter((task) => isPrintableTask(task.status));
}

export async function getRequestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function personFromUserId(
  userId: string,
  fallback?: { name: string; nip: string; jabatan: PrintPerson["jabatan"] },
): Promise<PrintPerson | null> {
  const [pegawai, user] = await Promise.all([
    prisma.pegawai.findUnique({
      where: { userId },
      select: { name: true, nip: true, golonganNama: true, jabatanNama: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, nip: true, jabatan: true },
    }),
  ]);

  if (!pegawai && !user && !fallback) return null;

  return {
    name: pegawai?.name || user?.name || fallback?.name || "-",
    nip: formatNip(pegawai?.nip || user?.nip || fallback?.nip || "-"),
    pangkatGolongan: formatGolonganPangkat(pegawai?.golonganNama),
    jabatan:
      pegawai?.jabatanNama ||
      (user?.jabatan ? jabatanLabel[user.jabatan] : null) ||
      fallback?.jabatan ||
      "-",
  };
}

async function personFromUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, nip: true, jabatan: true },
  });
  return personFromUserId(userId, {
    name: user?.name || "-",
    nip: user?.nip || "-",
    jabatan: user?.jabatan ? jabatanLabel[user.jabatan] : "-",
  });
}

export async function getDailyLaporanPrintContext(options: {
  userId: string;
  instansiName: string;
  agencyName: string;
}): Promise<DailyLaporanPrintContext> {
  const orgUser = await getDbOrgUser(options.userId);
  const atasanOrg = orgUser ? await getAtasan(orgUser) : null;
  const [author, atasan] = await Promise.all([
    personFromUser(options.userId),
    atasanOrg ? personFromUser(atasanOrg.id) : Promise.resolve(null),
  ]);

  return {
    author: author ?? {
      name: "-",
      nip: "-",
      pangkatGolongan: "-",
      jabatan: "-",
    },
    atasan,
    kopGovernment: (options.instansiName || "Pemerintah Provinsi Papua Barat").toUpperCase(),
    kopAgency: (options.agencyName || "Badan Kepegawaian Daerah").toUpperCase(),
    kopAddress: KOP_ADDRESS,
    kopWebsite: KOP_WEBSITE,
  };
}

export function taskWfhUraian(task: Pick<ReportTask, "title" | "description">) {
  const parts = [task.title.trim()];
  if (task.description?.trim()) parts.push(task.description.trim());
  return parts.join(" — ");
}

export function taskWfhHasil(task: Pick<ReportTask, "notes" | "feedback" | "score">) {
  const parts = [task.notes, task.feedback, starLabel(task.score)].filter(Boolean) as string[];
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

export async function getLaporanPrintContext(options: {
  userId: string;
  month: number;
  year: number;
  instansiName: string;
  agencyName: string;
  taskIds: string[];
}): Promise<LaporanPrintContext> {
  const orgUser = await getDbOrgUser(options.userId);
  const atasanOrg = orgUser ? await getAtasan(orgUser) : null;
  const [author, atasan] = await Promise.all([
    personFromUser(options.userId),
    atasanOrg ? personFromUser(atasanOrg.id) : Promise.resolve(null),
  ]);

  const report = await prisma.monthlyTaskReport.upsert({
    where: {
      userId_month_year: {
        userId: options.userId,
        month: options.month,
        year: options.year,
      },
    },
    create: {
      userId: options.userId,
      month: options.month,
      year: options.year,
      atasanId: atasanOrg?.id ?? null,
      taskIds: options.taskIds,
    },
    update: {
      atasanId: atasanOrg?.id ?? null,
      taskIds: options.taskIds,
    },
  });

  const origin = await getRequestOrigin();
  const validationUrl = `${origin}/validasi/laporan/${report.id}`;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, {
    margin: 1,
    width: 192,
    errorCorrectionLevel: "M",
  });

  return {
    author: author ?? {
      name: "-",
      nip: "-",
      pangkatGolongan: "-",
      jabatan: "-",
    },
    atasan,
    kopGovernment: (options.instansiName || "Pemerintah Provinsi Papua Barat").toUpperCase(),
    kopAgency: (options.agencyName || "Badan Kepegawaian Daerah").toUpperCase(),
    kopAddress: KOP_ADDRESS,
    kopWebsite: KOP_WEBSITE,
    reportId: report.id,
    validationUrl,
    qrDataUrl,
  };
}

export async function getValidasiLaporan(id: string) {
  const report = await prisma.monthlyTaskReport.findUnique({
    where: { id },
  });
  if (!report) return null;

  const tasks = await prisma.task.findMany({
    where: { id: { in: report.taskIds } },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      evidence: { select: { address: true, notes: true, photoUrls: true } },
      review: { select: { score: true, reviewedAt: true, feedback: true } },
      rating: { select: { stars: true } },
    },
  });

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ordered: ReportTask[] = report.taskIds
    .map((taskId) => byId.get(taskId))
    .filter((task): task is (typeof tasks)[number] => Boolean(task))
    .filter((task) => isPrintableTask(task.status))
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      source: task.source,
      priority: task.priority,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() || null,
      deadline: task.deadline?.toISOString() || null,
      reviewedAt: task.review?.reviewedAt.toISOString() || null,
      score: task.rating?.stars ?? normalizeStars(task.review?.score),
      address: task.evidence?.address || null,
      notes: task.evidence?.notes || null,
      feedback: task.review?.feedback || null,
      photoUrls: task.evidence?.photoUrls || [],
      assigneeId: task.assignedTo?.id ?? null,
      assigneeName: task.assignedTo?.name || "-",
      createdByName: task.createdBy.name,
    }));

  const [author, atasan] = await Promise.all([
    personFromUser(report.userId),
    report.atasanId ? personFromUser(report.atasanId) : Promise.resolve(null),
  ]);

  return {
    report,
    author: author ?? {
      name: "-",
      nip: "-",
      pangkatGolongan: "-",
      jabatan: "-",
    },
    atasan,
    tasks: ordered,
  };
}

export function formatPrintDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function printHasil(task: Pick<ReportTask, "score">) {
  return starLabel(task.score) ?? "";
}

export function printParaf(task: Pick<ReportTask, "status">) {
  if (task.status === "disetujui") return "Approved";
  if (task.status === "menunggu_approval") return "Menunggu approval";
  return statusLabel(task.status);
}

export function printKeterangan(
  task: Pick<ReportTask, "notes" | "feedback" | "assigneeName">,
  authorName?: string,
) {
  const parts = [task.notes, task.feedback].filter(Boolean) as string[];
  if (authorName && task.assigneeName && task.assigneeName !== authorName && task.assigneeName !== "-") {
    parts.push(`Pegawai: ${task.assigneeName}`);
  }
  return parts.join(" — ");
}

export function printTaskDate(task: Pick<ReportTask, "completedAt" | "createdAt">) {
  return formatPrintDate(task.completedAt || task.createdAt);
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
