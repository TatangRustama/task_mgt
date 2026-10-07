import type { TaskStatus } from "@prisma/client";
import { listPerangkatDaerah } from "@/lib/admin-pegawai";
import { prisma } from "@/lib/prisma";
import { getMonthYearLabel } from "@/lib/utils";

export const DASHBOARD_MONTHS = 3;

export const DASHBOARD_STATUSES = [
  "disetujui",
  "menunggu_approval",
  "dikerjakan",
  "tersedia",
  "ditolak",
  "dibatalkan",
] as const satisfies readonly TaskStatus[];

export type DashboardStatus = (typeof DASHBOARD_STATUSES)[number];

export type DashboardMonthPoint = {
  label: string;
  total: number;
  counts: Record<DashboardStatus, number>;
};

export type TaskConditionTrend = {
  months: DashboardMonthPoint[];
  totals: Record<DashboardStatus, number>;
  total: number;
};

function isDashboardStatus(status: TaskStatus): status is DashboardStatus {
  return (DASHBOARD_STATUSES as readonly TaskStatus[]).includes(status);
}

function emptyCounts(): Record<DashboardStatus, number> {
  return {
    disetujui: 0,
    menunggu_approval: 0,
    dikerjakan: 0,
    tersedia: 0,
    ditolak: 0,
    dibatalkan: 0,
  };
}

export type DashboardMonthChoice = {
  value: string;
  label: string;
};

export type DashboardMonthSelection = {
  year: number;
  month: number;
};

function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function listDashboardMonthChoices(now = new Date()): Promise<DashboardMonthChoice[]> {
  const oldest = await prisma.task.aggregate({ _min: { createdAt: true } });
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  const earliest = oldest._min.createdAt
    ? new Date(oldest._min.createdAt.getFullYear(), oldest._min.createdAt.getMonth(), 1)
    : current;
  const start = earliest < current ? earliest : current;
  const choices: DashboardMonthChoice[] = [];

  for (let cursor = current; cursor >= start; cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    choices.push({ value: monthValue(year, month), label: getMonthYearLabel(month, year) });
  }

  return choices;
}

export function resolveDashboardMonth(
  raw: string | undefined,
  choices: DashboardMonthChoice[],
): DashboardMonthSelection | null {
  if (!raw || !choices.some((choice) => choice.value === raw)) return null;
  return { year: Number(raw.slice(0, 4)), month: Number(raw.slice(5, 7)) };
}

export function dashboardPeriodCaption(selection: DashboardMonthSelection | null) {
  if (!selection) return `${DASHBOARD_MONTHS} bulan terakhir`;
  return getMonthYearLabel(selection.month, selection.year);
}

function dashboardRange(selection: DashboardMonthSelection | null, now = new Date()) {
  if (selection) {
    const start = new Date(selection.year, selection.month - 1, 1);
    return { start, end: new Date(selection.year, selection.month, 1), count: 1 };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - (DASHBOARD_MONTHS - 1), 1);
  return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1), count: DASHBOARD_MONTHS };
}

function monthLabel(date: Date, withYear: boolean) {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: withYear ? "2-digit" : undefined,
  }).format(date);
  return formatted.replace(".", "");
}

export async function getTaskConditionTrend(
  selection: DashboardMonthSelection | null = null,
  now = new Date(),
): Promise<TaskConditionTrend> {
  const { start, end, count } = dashboardRange(selection, now);
  const endMonth = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const withYear = count === 1 || start.getFullYear() !== endMonth.getFullYear();

  const tasks = await prisma.task.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { status: true, createdAt: true },
  });

  const months: DashboardMonthPoint[] = Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return { label: monthLabel(date, withYear), total: 0, counts: emptyCounts() };
  });

  for (const task of tasks) {
    const created = new Date(task.createdAt);
    const index =
      (created.getFullYear() - start.getFullYear()) * 12 + (created.getMonth() - start.getMonth());
    const bucket = months[index];
    if (!bucket || !isDashboardStatus(task.status)) continue;
    bucket.counts[task.status] += 1;
    bucket.total += 1;
  }

  const totals = emptyCounts();
  for (const month of months) {
    for (const status of DASHBOARD_STATUSES) totals[status] += month.counts[status];
  }

  return {
    months,
    totals,
    total: months.reduce((sum, month) => sum + month.total, 0),
  };
}

export type PerangkatDaerahRecapRow = {
  id: string;
  name: string;
  total: number;
  listed: boolean;
  counts: Record<DashboardStatus, number>;
};

const UNMAPPED_PERANGKAT = "Belum terpetakan";

export async function getPerangkatDaerahTaskRecap(
  selection: DashboardMonthSelection | null = null,
  now = new Date(),
): Promise<PerangkatDaerahRecapRow[]> {
  const { start, end } = dashboardRange(selection, now);
  const [catalog, tasks] = await Promise.all([
    listPerangkatDaerah(),
    prisma.task.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        status: true,
        unit: { select: { perangkatDaerahId: true, perangkatDaerahNama: true } },
      },
    }),
  ]);

  const rows = new Map<string, PerangkatDaerahRecapRow>();
  for (const item of catalog) {
    rows.set(item.id, { id: item.id, name: item.name, total: 0, listed: true, counts: emptyCounts() });
  }

  for (const task of tasks) {
    if (!isDashboardStatus(task.status)) continue;
    const id = task.unit.perangkatDaerahId?.trim() || "";
    const name = id ? task.unit.perangkatDaerahNama?.trim() || id : UNMAPPED_PERANGKAT;
    const row = rows.get(id) ?? { id, name, total: 0, listed: false, counts: emptyCounts() };
    if (!row.name && name) row.name = name;
    row.counts[task.status] += 1;
    row.total += 1;
    rows.set(id, row);
  }

  return [...rows.values()].sort((a, b) => {
    if (!a.id) return 1;
    if (!b.id) return -1;
    const aActive = a.total > 0;
    const bActive = b.total > 0;
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name, "id");
  });
}
