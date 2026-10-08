import { Prisma, TaskSource, TaskStatus } from "@prisma/client";
import { listPerangkatDaerah, listUnorChildren, listUnorRootsForPerangkatDaerah } from "@/lib/admin-pegawai";
import { prisma } from "@/lib/prisma";
import {
  TASK_STAGE_OPTIONS,
  taskMonitorDetailHref,
  taskMonitorHref,
  type TaskMonitorFilterValues,
  type TaskStage,
  type UnorChoice,
} from "@/lib/task-monitor-shared";
import { formatNip } from "@/lib/utils";

export { TASK_STAGE_OPTIONS, taskMonitorDetailHref, taskMonitorHref };
export type { UnorChoice };

export const TASK_MONITOR_PAGE_SIZE = 15;

const STAGE_STATUSES: Record<TaskStage, TaskStatus[]> = {
  open: ["tersedia"],
  dikerjakan: ["dikerjakan", "ditolak"],
  selesai: ["menunggu_approval", "disetujui"],
};

export type TaskMonitorFilters = TaskMonitorFilterValues;

export type TaskMonitorRow = {
  id: string;
  title: string;
  source: TaskSource;
  status: TaskStatus;
  assignedAt: string;
  completedAt: string | null;
  assigneeName: string;
  assigneeIdLabel: string;
  perangkatDaerahNama: string;
  unitName: string;
};

function parseStage(raw: string | undefined): TaskStage | "" {
  if (raw === "open" || raw === "dikerjakan" || raw === "selesai") return raw;
  return "";
}

function parseSource(raw: string | undefined): TaskSource | "" {
  if (raw === "delegasi" || raw === "mandiri") return raw;
  return "";
}

function parseDay(raw: string | undefined) {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  if (
    Number.isNaN(start.getTime()) ||
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day
  ) {
    return null;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, iso: raw };
}

function parseUnorId(raw: string | undefined) {
  return raw?.trim() || "";
}

export function parseTaskMonitorFilters(raw: {
  pd?: string;
  u1?: string;
  u2?: string;
  u3?: string;
  q?: string;
  date?: string;
  sumber?: string;
  tahap?: string;
  page?: string;
}): TaskMonitorFilters {
  const page = Math.max(1, Number(raw.page || 1) || 1);
  const day = parseDay(raw.date?.trim());
  return {
    pd: raw.pd?.trim() || "",
    unor: [parseUnorId(raw.u1), parseUnorId(raw.u2), parseUnorId(raw.u3)],
    q: raw.q?.replace(/\D/g, "") || "",
    date: day?.iso || "",
    sumber: parseSource(raw.sumber),
    tahap: parseStage(raw.tahap),
    page,
  };
}

export function hasTaskMonitorFilter(filters: Pick<TaskMonitorFilters, "pd" | "q" | "date" | "sumber" | "tahap">) {
  return Boolean(filters.pd || filters.q || filters.date || filters.sumber || filters.tahap);
}

export function downgradedTaskStatus(status: TaskStatus): TaskStatus | null {
  if (status === "disetujui" || status === "menunggu_approval") return "dikerjakan";
  if (status === "dikerjakan" || status === "ditolak") return "tersedia";
  return null;
}

export async function downgradeTaskStage(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true },
  });
  if (!task) return { error: "Tugas tidak ditemukan", httpStatus: 404 as const };
  const next = downgradedTaskStatus(task.status);
  if (!next) return { error: "Tahapan sudah paling rendah", httpStatus: 400 as const };

  await prisma.$transaction(async (tx) => {
    await tx.taskReview.deleteMany({ where: { taskId } });
    await tx.taskRating.deleteMany({ where: { taskId } });
    await tx.task.update({
      where: { id: taskId },
      data: { status: next, completedAt: null },
    });
  });

  return { status: next };
}

const emptyUnor = {
  selected: ["", "", ""] as [string, string, string],
  options: [[], [], []] as [UnorChoice[], UnorChoice[], UnorChoice[]],
};

async function resolveUnorChain(pd: string, raw: [string, string, string]) {
  if (!pd) return { ...emptyUnor, unitId: "" };

  const options: [UnorChoice[], UnorChoice[], UnorChoice[]] = [[], [], []];
  const selected: [string, string, string] = ["", "", ""];
  options[0] = await listUnorRootsForPerangkatDaerah(pd);
  if (!options[0].some((item) => item.id === raw[0])) {
    return { selected, options, unitId: "" };
  }

  selected[0] = raw[0];
  options[1] = await listUnorChildren(selected[0]);
  if (!options[1].some((item) => item.id === raw[1])) {
    return { selected, options, unitId: selected[0] };
  }

  selected[1] = raw[1];
  options[2] = await listUnorChildren(selected[1]);
  if (options[2].some((item) => item.id === raw[2])) selected[2] = raw[2];
  return { selected, options, unitId: selected[2] || selected[1] };
}

async function descendantUnitIds(rootId: string) {
  const ids = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.unit.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const child of children) {
      if (ids.has(child.id)) continue;
      ids.add(child.id);
      frontier.push(child.id);
    }
  }
  return [...ids];
}

function identityLabel(pegawai: { jenis: string; nip: string | null; nik: string | null } | null, nip: string) {
  if (pegawai?.jenis === "non_asn") return `NIK ${pegawai.nik || "-"}`;
  return `NIP ${formatNip(pegawai?.nip || nip)}`;
}

export async function getTaskMonitor(filters: TaskMonitorFilters) {
  const perangkatDaerah = await listPerangkatDaerah();
  const pd = perangkatDaerah.some((item) => item.id === filters.pd) ? filters.pd : "";
  const active = { ...filters, pd };
  if (!hasTaskMonitorFilter(active)) {
    return {
      rows: [] as TaskMonitorRow[],
      total: 0,
      page: 1,
      totalPages: 1,
      perangkatDaerah,
      unor: emptyUnor,
      filters: { ...active, unor: emptyUnor.selected, page: 1 },
      queried: false,
    };
  }

  const unor = await resolveUnorChain(pd, filters.unor);
  const day = parseDay(filters.date);
  const and: Prisma.TaskWhereInput[] = [{ status: { not: "dibatalkan" } }];

  if (filters.tahap) {
    and.push({ status: { in: STAGE_STATUSES[filters.tahap] } });
  }
  if (filters.sumber) {
    and.push({ source: filters.sumber });
  }
  if (unor.unitId) {
    const unitIds = await descendantUnitIds(unor.unitId);
    and.push({
      OR: [
        { unitId: { in: unitIds } },
        { assignedTo: { unitId: { in: unitIds } } },
        { assignedTo: { pegawai: { unitId: { in: unitIds } } } },
        { assignedTo: { pegawai: { unorId: { in: unitIds } } } },
      ],
    });
  } else if (pd) {
    and.push({
      OR: [
        { unit: { perangkatDaerahId: pd } },
        { assignedTo: { unit: { perangkatDaerahId: pd } } },
        { assignedTo: { pegawai: { perangkatDaerahId: pd } } },
      ],
    });
  }
  if (filters.q) {
    and.push({
      assignedTo: {
        OR: [
          { nip: { contains: filters.q } },
          { pegawai: { nip: { contains: filters.q } } },
          { pegawai: { nik: { contains: filters.q } } },
        ],
      },
    });
  }
  if (day) {
    and.push({
      OR: [
        { assignedAt: { gte: day.start, lt: day.end } },
        { completedAt: { gte: day.start, lt: day.end } },
        { createdAt: { gte: day.start, lt: day.end } },
      ],
    });
  }

  const where: Prisma.TaskWhereInput = { AND: and };
  const total = await prisma.task.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / TASK_MONITOR_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * TASK_MONITOR_PAGE_SIZE,
    take: TASK_MONITOR_PAGE_SIZE,
    select: {
      id: true,
      title: true,
      source: true,
      status: true,
      assignedAt: true,
      completedAt: true,
      unit: { select: { name: true, perangkatDaerahNama: true } },
      assignedTo: {
        select: {
          name: true,
          nip: true,
          pegawai: {
            select: {
              jenis: true,
              nip: true,
              nik: true,
              perangkatDaerahNama: true,
            },
          },
        },
      },
    },
  });

  const rows: TaskMonitorRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    source: task.source,
    status: task.status,
    assignedAt: task.assignedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
    assigneeName: task.assignedTo?.name || "Belum ditugaskan",
    assigneeIdLabel: task.assignedTo
      ? identityLabel(task.assignedTo.pegawai, task.assignedTo.nip)
      : "-",
    perangkatDaerahNama:
      task.unit.perangkatDaerahNama ||
      task.assignedTo?.pegawai?.perangkatDaerahNama ||
      "Perangkat daerah belum diisi",
    unitName: task.unit.name,
  }));

  return {
    rows,
    total,
    page,
    totalPages,
    perangkatDaerah,
    unor,
    filters: { ...filters, pd, unor: unor.selected, page },
    queried: true,
  };
}
