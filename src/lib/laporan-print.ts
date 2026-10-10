import QRCode from "qrcode";
import { headers } from "next/headers";
import { formatGolonganPangkat } from "@/lib/golongan";
import { displayJabatan } from "@/lib/jabatan-display";
import { getAtasan, getDbOrgUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { dailySnapshotTasks } from "@/lib/daily-report-snapshot";
import { mapTask } from "@/lib/reports";
import { formatNip, formatWfhReportDate, getMonthYearLabel } from "@/lib/utils";
import {
  toMonthlyPrintTasks,
  type DailyLaporanPrintContext,
  type LaporanPrintContext,
  type PrintPerson,
} from "@/lib/laporan-print-view";

export {
  PRINT_TASK_STATUSES,
  dailyPrintTasks,
  evidenceRows,
  formatPrintDate,
  groupTasksByPrintDate,
  groupTasksForWfhPrint,
  isPrintableTask,
  printHasil,
  printHasilLine,
  printKeterangan,
  printParaf,
  printHasilParafText,
  printTaskDate,
  printTempatLine,
  printUraianText,
  printableTasks,
  taskWfhHasil,
  taskWfhTempat,
  taskWfhUraian,
} from "@/lib/laporan-print-view";
export type { DailyLaporanPrintContext, LaporanPrintContext, PrintPerson };

const KOP_ADDRESS =
  "Jl. Brigjen Marinir Abraham O. Atururi, Komplek Perkantoran Gubernur, Arfai-Manokwari";
const KOP_WEBSITE = "www.bkd.papuabaratprov.go.id";

export async function getRequestOrigin() {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.split(",")[0]?.trim();
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) {
    const proto =
      forwardedProto ||
      (host.includes("trycloudflare.com") || host.includes("loca.lt") ? "https" : "http");
    return `${proto}://${host}`;
  }
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function personFromUserId(
  userId: string,
  fallback?: { name: string; nip: string; jabatan: PrintPerson["jabatan"] },
): Promise<PrintPerson | null> {
  const [pegawai, user] = await Promise.all([
    prisma.pegawai.findUnique({
      where: { userId },
      select: { name: true, nip: true, golonganNama: true, jabatanNama: true, jenis: true },
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
    jabatan: displayJabatan(pegawai, user?.jabatan),
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
    jabatan: "-",
  });
}

async function validationQr(reportId: string) {
  const origin = await getRequestOrigin();
  const validationUrl = `${origin}/validasi/laporan/${reportId}`;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, {
    margin: 1,
    width: 192,
    errorCorrectionLevel: "M",
  });
  return { validationUrl, qrDataUrl };
}

export async function getDailyLaporanPrintContext(options: {
  userId: string;
  date: string;
  instansiName: string;
  agencyName: string;
  taskIds: string[];
}): Promise<DailyLaporanPrintContext> {
  const orgUser = await getDbOrgUser(options.userId);
  const atasanOrg = orgUser ? await getAtasan(orgUser) : null;
  const [author, atasan] = await Promise.all([
    personFromUser(options.userId),
    atasanOrg ? personFromUser(atasanOrg.id) : Promise.resolve(null),
  ]);

  const report = await prisma.dailyTaskReport.upsert({
    where: {
      userId_date: {
        userId: options.userId,
        date: options.date,
      },
    },
    create: {
      userId: options.userId,
      date: options.date,
      atasanId: atasanOrg?.id ?? null,
      taskIds: options.taskIds,
    },
    update: {
      atasanId: atasanOrg?.id ?? null,
      taskIds: options.taskIds,
    },
  });
  const { validationUrl, qrDataUrl } = await validationQr(report.id);

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

  const { validationUrl, qrDataUrl } = await validationQr(report.id);

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

async function loadValidatedTasks(userId: string, taskIds: string[], start: Date, end: Date) {
  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "dibatalkan" },
      AND: [
        { OR: [{ id: { in: taskIds } }, { assignedToId: userId }] },
        {
          OR: [
            { completedAt: { gte: start, lt: end } },
            { assignedAt: { gte: start, lt: end }, completedAt: { gte: end } },
          ],
        },
      ],
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      evidence: { select: { address: true, notes: true, photoUrls: true } },
      review: { select: { score: true, reviewedAt: true, feedback: true } },
      rating: { select: { stars: true } },
    },
  });
  return toMonthlyPrintTasks(tasks.map((task) => mapTask(task)), start, end);
}

const validatedTaskInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true, photoUrls: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

async function validationPeople(userId: string, atasanId: string | null) {
  const [author, atasan] = await Promise.all([
    personFromUser(userId),
    atasanId ? personFromUser(atasanId) : Promise.resolve(null),
  ]);
  return {
    author: author ?? {
      name: "-",
      nip: "-",
      pangkatGolongan: "-",
      jabatan: "-",
    },
    atasan,
  };
}

export async function getValidasiLaporan(id: string) {
  const monthly = await prisma.monthlyTaskReport.findUnique({ where: { id } });
  if (monthly) {
    const tasks = await loadValidatedTasks(
      monthly.userId,
      monthly.taskIds,
      new Date(monthly.year, monthly.month - 1, 1),
      new Date(monthly.year, monthly.month, 1),
    );
    const people = await validationPeople(monthly.userId, monthly.atasanId);
    return {
      kind: "bulanan" as const,
      reportId: monthly.id,
      periodLabel: getMonthYearLabel(monthly.month, monthly.year),
      ...people,
      tasks,
    };
  }

  const daily = await prisma.dailyTaskReport.findUnique({ where: { id } });
  if (!daily) return null;

  const rows = daily.taskIds.length
    ? await prisma.task.findMany({
        where: { id: { in: daily.taskIds } },
        include: validatedTaskInclude,
      })
    : [];
  const tasks = dailySnapshotTasks(daily.taskIds, rows.map((task) => mapTask(task)), daily.date);
  const people = await validationPeople(daily.userId, daily.atasanId);
  return {
    kind: "harian" as const,
    reportId: daily.id,
    periodLabel: formatWfhReportDate(daily.date),
    ...people,
    tasks,
  };
}
