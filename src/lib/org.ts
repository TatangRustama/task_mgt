import {
  AssignmentMode,
  Jabatan,
  Role,
  UnitType,
  type Task,
  type User,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import type { AtasanTaskNotice } from "@/lib/notification-types";

export const jabatanLabel: Record<Jabatan, string> = {
  kepala_kantor: "Kepala Kantor",
  kepala_bidang: "Kepala Bidang",
  kepala_sub_bidang: "Kepala Sub Bidang",
  pelaksana: "Staf Pelaksana",
};

export const unitTypeLabel: Record<UnitType, string> = {
  kantor: "Kantor",
  bidang: "Bidang",
  sub_bidang: "Sub Bidang",
};

export type OrgUser = Pick<User, "id" | "role" | "jabatan" | "unitId"> & {
  unit?: {
    id: string;
    type: UnitType;
    parentId: string | null;
    pimpinanId: string | null;
    name?: string;
  } | null;
};

export type DirectReport = {
  id: string;
  name: string;
  jabatan: Jabatan | null;
  unitId: string | null;
  unitName: string | null;
};

export type Atasan = DirectReport;

export function isKepalaTitle(jabatanNama: string | null | undefined) {
  const title = (jabatanNama || "").toLowerCase();
  if (!title) return false;
  return (
    title.startsWith("kepala") ||
    title.startsWith("sekretaris") ||
    title.startsWith("inspektur") ||
    title.includes("kepala dinas") ||
    title.includes("kepala badan") ||
    title.includes("kepala biro")
  );
}

export function mapPegawaiJabatan(
  jabatanNama: string | null | undefined,
  unitType: UnitType | null | undefined,
): Jabatan {
  if (!isKepalaTitle(jabatanNama)) return "pelaksana";
  if (unitType === "kantor") return "kepala_kantor";
  if (unitType === "bidang") return "kepala_bidang";
  if (unitType === "sub_bidang") return "kepala_sub_bidang";
  return "kepala_bidang";
}

export function isUnitLeader(user: OrgUser) {
  if (user.role === "admin") return true;
  if (user.unit?.pimpinanId && user.unit.pimpinanId === user.id) return true;
  const jabatan = effectiveJabatan(user);
  return (
    jabatan === "kepala_kantor" ||
    jabatan === "kepala_bidang" ||
    jabatan === "kepala_sub_bidang"
  );
}

export function effectiveJabatan(user: Pick<OrgUser, "role" | "jabatan">): Jabatan | null {
  if (user.jabatan) return user.jabatan;
  if (user.role === "pimpinan") return "kepala_bidang";
  if (user.role === "pegawai") return "pelaksana";
  return null;
}

export function roleFromJabatan(jabatan: Jabatan | null): Role {
  if (!jabatan) return "admin";
  if (jabatan === "pelaksana") return "pegawai";
  return "pimpinan";
}

export function canDelegate(user: OrgUser) {
  return user.role === "admin" || isUnitLeader(user);
}

export function canUsePoolAssignment(user: OrgUser) {
  return isUnitLeader(user) && user.unit?.type === "sub_bidang";
}

export function mustAssignNamed(user: OrgUser) {
  if (!isUnitLeader(user)) return false;
  return user.unit?.type === "kantor" || user.unit?.type === "bidang";
}

export async function getDbOrgUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      unit: {
        select: { id: true, type: true, parentId: true, pimpinanId: true, name: true },
      },
    },
  });
}

export async function getDescendantUnitIds(rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await prisma.unit.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id).filter((id) => !ids.includes(id));
    ids.push(...frontier);
  }

  return ids;
}

export async function getVisibleUnitIds(user: Pick<SessionUser, "id" | "role" | "unitId">) {
  if (user.role === "admin") {
    const units = await prisma.unit.findMany({ select: { id: true } });
    return units.map((unit) => unit.id);
  }

  if (!user.unitId) return [];

  if (user.role === "pimpinan") {
    return getDescendantUnitIds(user.unitId);
  }

  return [user.unitId];
}

function toDirectReport(person: {
  id: string;
  name: string;
  jabatan: Jabatan | null;
  unitId: string | null;
  unit?: { name: string } | null;
}): DirectReport {
  return {
    id: person.id,
    name: person.name,
    jabatan: person.jabatan,
    unitId: person.unitId,
    unitName: person.unit?.name ?? null,
  };
}

export async function getDirectReports(user: OrgUser): Promise<DirectReport[]> {
  if (user.role === "admin") return [];
  if (!user.unitId || !isUnitLeader(user)) return [];

  const [sameUnit, childUnits] = await Promise.all([
    prisma.user.findMany({
      where: {
        unitId: user.unitId,
        id: { not: user.id },
        role: { not: "admin" },
      },
      select: {
        id: true,
        name: true,
        jabatan: true,
        unitId: true,
        unit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      where: { parentId: user.unitId },
      select: {
        id: true,
        name: true,
        pimpinanId: true,
        pimpinan: {
          select: {
            id: true,
            name: true,
            jabatan: true,
            unitId: true,
          },
        },
        users: {
          where: { role: { not: "admin" } },
          select: {
            id: true,
            name: true,
            jabatan: true,
            unitId: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const byId = new Map<string, DirectReport>();
  for (const person of sameUnit) {
    byId.set(person.id, toDirectReport(person));
  }

  for (const unit of childUnits) {
    if (unit.pimpinan) {
      byId.set(
        unit.pimpinan.id,
        toDirectReport({ ...unit.pimpinan, unit: { name: unit.name } }),
      );
      continue;
    }
    for (const person of unit.users) {
      byId.set(person.id, toDirectReport({ ...person, unit: { name: unit.name } }));
    }
  }

  byId.delete(user.id);
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function getAtasan(user: OrgUser): Promise<Atasan | null> {
  if (!user.unitId) return null;

  const unit =
    user.unit ??
    (await prisma.unit.findUnique({
      where: { id: user.unitId },
      select: { id: true, parentId: true, pimpinanId: true, type: true, name: true },
    }));
  if (!unit) return null;

  if (unit.pimpinanId && unit.pimpinanId !== user.id) {
    const leader = await prisma.user.findUnique({
      where: { id: unit.pimpinanId },
      select: {
        id: true,
        name: true,
        jabatan: true,
        unitId: true,
        unit: { select: { name: true } },
      },
    });
    if (leader) return toDirectReport(leader);
  }

  let parentId = unit.parentId;
  while (parentId) {
    const parent = await prisma.unit.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        parentId: true,
        pimpinanId: true,
        name: true,
        pimpinan: {
          select: {
            id: true,
            name: true,
            jabatan: true,
            unitId: true,
          },
        },
      },
    });
    if (!parent) break;
    if (parent.pimpinan && parent.pimpinan.id !== user.id) {
      return toDirectReport({ ...parent.pimpinan, unit: { name: parent.name } });
    }
    parentId = parent.parentId;
  }

  return null;
}

export async function getDirectReportIds(user: OrgUser) {
  const reports = await getDirectReports(user);
  return reports.map((person) => person.id);
}

export function expectedUnitTypeForJabatan(jabatan: Jabatan): UnitType | null {
  if (jabatan === "kepala_kantor") return "kantor";
  if (jabatan === "kepala_bidang") return "bidang";
  if (jabatan === "kepala_sub_bidang" || jabatan === "pelaksana") return "sub_bidang";
  return null;
}

export function expectedParentType(type: UnitType): UnitType | null {
  if (type === "bidang") return "kantor";
  if (type === "sub_bidang") return "bidang";
  return null;
}

type TaskAccess = Pick<
  Task,
  "unitId" | "assignedToId" | "createdById" | "assignmentMode" | "status" | "source"
>;

export async function canSeeTask(user: SessionUser, task: TaskAccess) {
  if (user.role === "admin") return true;
  if (task.assignedToId === user.id || task.createdById === user.id) return true;

  const visibleUnitIds = await getVisibleUnitIds(user);
  if (!visibleUnitIds.includes(task.unitId)) return false;

  if (user.role === "pimpinan") return true;

  return (
    task.assignmentMode === "kolam" &&
    task.status === "tersedia" &&
    task.unitId === user.unitId
  );
}

export function canPickupPoolTask(user: SessionUser, task: TaskAccess) {
  return (
    effectiveJabatan(user) === "pelaksana" &&
    task.source === "delegasi" &&
    task.assignmentMode === "kolam" &&
    task.status === "tersedia" &&
    task.unitId === user.unitId
  );
}

export async function canReviewTask(user: OrgUser, assignedToId: string | null) {
  if (!assignedToId) return false;
  if (user.role === "admin") return true;
  const reportIds = await getDirectReportIds(user);
  return reportIds.includes(assignedToId);
}

export function assignmentModeLabel(mode: AssignmentMode) {
  return mode === "kolam" ? "Kolam subbid" : "Ditunjuk";
}

export async function getNewTasksFromAtasan(userId: string): Promise<{
  count: number;
  items: AtasanTaskNotice[];
}> {
  const orgUser = await getDbOrgUser(userId);
  if (!orgUser) return { count: 0, items: [] };

  const atasan = await getAtasan(orgUser);
  if (!atasan) return { count: 0, items: [] };

  const where = {
    createdById: atasan.id,
    assignedToId: userId,
    source: "delegasi" as const,
    status: { in: ["tersedia", "dikerjakan", "ditolak"] as const },
  };

  const [count, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    count,
    items: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      createdAt: task.createdAt.toISOString(),
      createdByName: task.createdBy.name,
    })),
  };
}
