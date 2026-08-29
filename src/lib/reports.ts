import { Prisma } from "@prisma/client";
import { getDescendantUnitIds, jabatanLabel } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import {
  UNASSIGNED_PEGAWAI_ID,
  type DailyReportData,
  type DayRecap,
  type MonthlyCalendarData,
  type PegawaiReportRow,
  type ReportPegawai,
  type ReportScope,
  type ReportSummary,
  type ReportTask,
} from "@/lib/report-types";
import { formatISODate, parseISODate } from "@/lib/utils";
import { normalizeStars } from "@/lib/rating";

async function buildScopeFilter(options: ReportScope): Promise<Prisma.TaskWhereInput | null> {
  if (options.role !== "admin" && !options.unitId) {
    return null;
  }

  const scopeFilter: Prisma.TaskWhereInput = {};
  if (options.role === "admin") {
    if (options.unitId) scopeFilter.unitId = options.unitId;
  } else if (options.role === "pimpinan" && options.unitId) {
    scopeFilter.unitId = { in: await getDescendantUnitIds(options.unitId) };
  } else if (options.unitId) {
    scopeFilter.unitId = options.unitId;
  }

  if (options.role === "pegawai") {
    scopeFilter.OR = [{ assignedToId: options.userId }, { createdById: options.userId }];
  } else if (options.assigneeId) {
    scopeFilter.assignedToId = options.assigneeId;
  }

  return scopeFilter;
}

async function getUnitMeta(unitId: string | null) {
  if (unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { instansi: true, pimpinan: { select: { name: true } } },
    });
    return {
      unitName: unit?.name || "-",
      instansiName: unit?.instansi.name || "-",
      pimpinanName: unit?.pimpinan?.name || "-",
      agencyName: unit?.perangkatDaerahNama || "Badan Kepegawaian Daerah",
    };
  }

  const instansi = await prisma.instansi.findFirst();
  return {
    unitName: "Semua Unit",
    instansiName: instansi?.name || "-",
    pimpinanName: "-",
    agencyName: "Badan Kepegawaian Daerah",
  };
}

function mapTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source: string;
  priority: string;
  createdAt: Date;
  completedAt: Date | null;
  deadline: Date | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { name: string };
  evidence: { address: string; notes: string; photoUrls: string[] } | null;
  review: { score: number | null; reviewedAt: Date; feedback: string | null } | null;
  rating: { stars: number } | null;
}): ReportTask {
  return {
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
  };
}

function summarize(tasks: ReportTask[], start: Date, end: Date): ReportSummary {
  const posted = tasks.filter((task) => {
    const createdAt = new Date(task.createdAt);
    return createdAt >= start && createdAt < end;
  });
  const completed = tasks.filter((task) => {
    if (!task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return completedAt >= start && completedAt < end;
  });
  const scored = completed.filter((task) => task.score != null);
  const onTime = completed.filter((task) => {
    if (!task.deadline) return true;
    return Boolean(task.completedAt && new Date(task.completedAt) <= new Date(task.deadline));
  });

  return {
    posted: posted.length,
    completed: completed.length,
    averageScore: scored.length
      ? Math.round(
          (scored.reduce((sum, task) => sum + (task.score || 0), 0) / scored.length) * 10,
        ) / 10
      : 0,
    onTimePercent: completed.length ? Math.round((onTime.length / completed.length) * 100) : 0,
  };
}

const taskInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true, photoUrls: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

const emptySummary = (): ReportSummary => ({
  posted: 0,
  completed: 0,
  averageScore: 0,
  onTimePercent: 0,
});

function toReportPegawai(user: {
  id: string;
  name: string;
  jabatan: keyof typeof jabatanLabel | null;
  unit?: { name: string } | null;
}): ReportPegawai {
  return {
    id: user.id,
    name: user.name,
    jabatanLabel: user.jabatan ? jabatanLabel[user.jabatan] : null,
    unitName: user.unit?.name ?? null,
  };
}

export async function getReportPeople(options: ReportScope): Promise<ReportPegawai[]> {
  if (options.role === "pegawai") {
    const self = await prisma.user.findUnique({
      where: { id: options.userId },
      select: {
        id: true,
        name: true,
        jabatan: true,
        unit: { select: { name: true } },
      },
    });
    if (!self) return [];
    return [toReportPegawai(self)];
  }

  const where: Prisma.UserWhereInput = { role: { not: "admin" } };
  if (options.role === "pimpinan") {
    if (!options.unitId) return [];
    where.unitId = { in: await getDescendantUnitIds(options.unitId) };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      jabatan: true,
      unit: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return users.map(toReportPegawai);
}

export function groupTasksByPegawai(
  tasks: ReportTask[],
  people: ReportPegawai[],
  start: Date,
  end: Date,
): PegawaiReportRow[] {
  const rows = new Map<string, PegawaiReportRow>();

  for (const person of people) {
    rows.set(person.id, { ...person, tasks: [], summary: emptySummary() });
  }

  for (const task of tasks) {
    const id = task.assigneeId ?? UNASSIGNED_PEGAWAI_ID;
    if (!rows.has(id)) {
      rows.set(id, {
        id,
        name: task.assigneeId ? task.assigneeName : "Belum ditugaskan",
        jabatanLabel: task.assigneeId ? null : "Kolam tugas",
        unitName: null,
        tasks: [],
        summary: emptySummary(),
      });
    }
    rows.get(id)!.tasks.push(task);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      summary: summarize(row.tasks, start, end),
    }))
    .sort((a, b) => {
      const aActivity = a.summary.posted + a.summary.completed;
      const bActivity = b.summary.posted + b.summary.completed;
      if (aActivity !== bActivity) return bActivity - aActivity;
      if (a.id === UNASSIGNED_PEGAWAI_ID) return 1;
      if (b.id === UNASSIGNED_PEGAWAI_ID) return -1;
      return a.name.localeCompare(b.name, "id");
    });
}

export async function getPegawaiBreakdown(
  tasks: ReportTask[],
  options: ReportScope,
  start: Date,
  end: Date,
): Promise<PegawaiReportRow[]> {
  const people = await getReportPeople(options);
  return groupTasksByPegawai(tasks, people, start, end);
}

export async function getDailyReport(
  options: ReportScope & { date: string }
): Promise<DailyReportData | null> {
  const scopeFilter = await buildScopeFilter(options);
  if (!scopeFilter) return null;

  const start = parseISODate(options.date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        scopeFilter,
        {
          OR: [{ createdAt: { gte: start, lt: end } }, { completedAt: { gte: start, lt: end } }],
        },
      ],
      status: { not: "dibatalkan" },
    },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });

  const mapped = tasks.map(mapTask);
  const meta = await getUnitMeta(options.unitId);

  return {
    date: options.date,
    tasks: mapped,
    summary: summarize(mapped, start, end),
    ...meta,
  };
}

export async function getMonthlyCalendar(
  options: ReportScope & { month: number; year: number }
): Promise<MonthlyCalendarData | null> {
  const scopeFilter = await buildScopeFilter(options);
  if (!scopeFilter) return null;

  const start = new Date(options.year, options.month - 1, 1);
  const end = new Date(options.year, options.month, 1);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        scopeFilter,
        {
          OR: [{ createdAt: { gte: start, lt: end } }, { completedAt: { gte: start, lt: end } }],
        },
      ],
      status: { not: "dibatalkan" },
    },
    include: taskInclude,
    orderBy: { createdAt: "asc" },
  });

  const mapped = tasks.map(mapTask);
  const daysInMonth = new Date(options.year, options.month, 0).getDate();
  const recap = new Map(
    Array.from({ length: daysInMonth }, (_, index) => {
      const date = formatISODate(new Date(options.year, options.month - 1, index + 1));
      return [date, { date, posted: 0, completed: 0 }] as [string, DayRecap];
    })
  );

  for (const task of tasks) {
    const postedKey = formatISODate(task.createdAt);
    if (recap.has(postedKey)) {
      recap.get(postedKey)!.posted += 1;
    }
    if (task.completedAt) {
      const completedKey = formatISODate(task.completedAt);
      if (recap.has(completedKey)) {
        recap.get(completedKey)!.completed += 1;
      }
    }
  }

  const meta = await getUnitMeta(options.unitId);

  return {
    month: options.month,
    year: options.year,
    days: [...recap.values()],
    summary: summarize(mapped, start, end),
    tasks: mapped,
    ...meta,
  };
}
