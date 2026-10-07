import {
  AssignmentMode,
  Jabatan,
  Role,
  TaskStatus,
  UnitType,
  type Task,
  type User,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compareByPangkatDesc } from "@/lib/golongan";
import { displayJabatan, jabatanRoleLabel } from "@/lib/jabatan-display";
import type { SessionUser } from "@/lib/session";
import type { AtasanTaskNotice } from "@/lib/notification-types";
import { isPrivilegedRole, isSuperAdmin } from "@/lib/roles";
import {
  activePenugasanWhere,
  listActivePenugasanForUnits,
  penugasanLabel,
  type ActingAssignment,
} from "@/lib/penugasan";
import { cache } from "react";

export { displayJabatan } from "@/lib/jabatan-display";

export const jabatanLabel: Record<Jabatan, string> = jabatanRoleLabel;

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
  penugasanSementara?: Array<{
    id: string;
    jenis: ActingAssignment["jenis"];
    unitId: string;
    unitName?: string;
    unitType?: UnitType;
    unit?: { name: string; type: UnitType } | null;
  }>;
};

const pegawaiDisplaySelect = {
  golonganNama: true,
  jabatanNama: true,
  jenis: true,
  nip: true,
} as const;

export type DirectReport = {
  id: string;
  name: string;
  jabatan: Jabatan | null;
  jabatanLabel: string;
  unitId: string | null;
  unitName: string | null;
  golonganNama: string | null;
  nip: string | null;
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

export function isDefinitiveLeader(user: OrgUser) {
  if (isSuperAdmin(user.role)) return true;
  if (user.unit?.pimpinanId && user.unit.pimpinanId === user.id) return true;
  const jabatan = effectiveJabatan(user);
  return (
    jabatan === "kepala_kantor" ||
    jabatan === "kepala_bidang" ||
    jabatan === "kepala_sub_bidang"
  );
}

export function isUnitLeader(user: OrgUser) {
  return isDefinitiveLeader(user) || (user.penugasanSementara?.length ?? 0) > 0;
}

function actingUnitType(item: NonNullable<OrgUser["penugasanSementara"]>[number]) {
  return item.unitType ?? item.unit?.type ?? null;
}

function actingUnitName(item: NonNullable<OrgUser["penugasanSementara"]>[number]) {
  return item.unitName ?? item.unit?.name ?? "Unit";
}

export function poolUnitFor(user: OrgUser): { id: string; name: string } | null {
  if (isDefinitiveLeader(user) && user.unit?.type === "sub_bidang" && user.unitId) {
    return { id: user.unitId, name: user.unit.name ?? "Sub Bidang" };
  }
  const acting = user.penugasanSementara?.find((item) => actingUnitType(item) === "sub_bidang");
  return acting ? { id: acting.unitId, name: actingUnitName(acting) } : null;
}

export function effectiveJabatan(user: Pick<OrgUser, "role" | "jabatan">): Jabatan | null {
  return user.jabatan ?? null;
}

export function roleFromJabatan(_jabatan: Jabatan | null): Role {
  return "personal";
}

export function canDelegate(user: OrgUser) {
  return isSuperAdmin(user.role) || isUnitLeader(user);
}

export function canUsePoolAssignment(user: OrgUser) {
  return poolUnitFor(user) !== null;
}

export function mustAssignNamed(user: OrgUser) {
  if (!isUnitLeader(user)) return false;
  return user.unit?.type === "kantor" || user.unit?.type === "bidang";
}

export const getDbOrgUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      unit: {
        select: { id: true, type: true, parentId: true, pimpinanId: true, name: true },
      },
      pegawai: { select: { jenis: true, jabatanNama: true, nik: true, nip: true } },
      penugasanSementara: {
        where: activePenugasanWhere(),
        select: {
          id: true,
          jenis: true,
          unitId: true,
          unit: { select: { name: true, type: true } },
        },
        orderBy: { mulai: "desc" },
      },
    },
  });
});

export const getDescendantUnitIds = cache(async (rootId: string): Promise<string[]> => {
  const ids = [rootId];
  const seen = new Set(ids);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.unit.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      ids.push(child.id);
      frontier.push(child.id);
    }
  }
  return ids;
});

export async function getOrgScope(user: Pick<SessionUser, "id" | "role" | "unitId" | "jabatan">) {
  return loadOrgScope(user.id, user.role, user.unitId ?? "", user.jabatan ?? "");
}

const loadOrgScope = cache(async (userId: string, role: SessionUser["role"], unitId: string, jabatan: string) => {
  const user = { id: userId, role, unitId: unitId || null, jabatan: (jabatan || null) as SessionUser["jabatan"] };
  const orgUser = await getDbOrgUser(user.id);
  const isLeader = Boolean(orgUser && (isSuperAdmin(user.role) || isUnitLeader(orgUser)));
  const resolvedUnitId = orgUser?.unitId || user.unitId;

  if (isSuperAdmin(user.role)) {
    const units = await prisma.unit.findMany({ select: { id: true } });
    return {
      orgUser,
      isLeader: true,
      visibleUnitIds: units.map((unit) => unit.id),
    };
  }

  const ids = new Set<string>();
  const definitive = Boolean(orgUser && isDefinitiveLeader(orgUser));
  if (resolvedUnitId) {
    const homeIds = definitive
      ? await getDescendantUnitIds(resolvedUnitId)
      : isLeader
        ? []
        : [resolvedUnitId];
    for (const id of homeIds) ids.add(id);
  }
  for (const item of orgUser?.penugasanSementara ?? []) {
    for (const id of await getDescendantUnitIds(item.unitId)) ids.add(id);
  }

  return {
    orgUser,
    isLeader,
    visibleUnitIds: [...ids],
  };
});

export async function getVisibleUnitIds(user: Pick<SessionUser, "id" | "role" | "unitId" | "jabatan">) {
  return (await getOrgScope(user)).visibleUnitIds;
}

function toDirectReport(person: {
  id: string;
  name: string;
  jabatan: Jabatan | null;
  unitId: string | null;
  nip?: string | null;
  unit?: { name: string } | null;
  pegawai?: { golonganNama: string | null; jabatanNama?: string | null; jenis?: string | null; nip?: string | null } | null;
  jabatanLabel?: string;
}): DirectReport {
  return {
    id: person.id,
    name: person.name,
    jabatan: person.jabatan,
    jabatanLabel: person.jabatanLabel || displayJabatan(person.pegawai, person.jabatan),
    unitId: person.unitId,
    unitName: person.unit?.name ?? null,
    golonganNama: person.pegawai?.golonganNama ?? null,
    nip: person.pegawai?.nip || person.nip || null,
  };
}

export async function getDirectReports(user: OrgUser): Promise<DirectReport[]> {
  if (isPrivilegedRole(user.role)) return [];
  const unitIds = new Set<string>();
  if (user.unitId && isDefinitiveLeader(user)) unitIds.add(user.unitId);
  for (const item of user.penugasanSementara ?? []) unitIds.add(item.unitId);
  if (!unitIds.size) return [];
  const lists = await Promise.all([...unitIds].map((unitId) => loadDirectReports(user.id, unitId)));
  const byId = new Map<string, DirectReport>();
  for (const person of lists.flat()) byId.set(person.id, person);
  byId.delete(user.id);
  return Array.from(byId.values()).sort(compareByPangkatDesc);
}

const loadDirectReports = cache(async (userId: string, unitId: string): Promise<DirectReport[]> => {
  const personSelect = {
    id: true,
    name: true,
    jabatan: true,
    unitId: true,
    pegawai: { select: pegawaiDisplaySelect },
  } as const;

  const [sameUnit, childUnits] = await Promise.all([
    prisma.user.findMany({
      where: {
        unitId,
        id: { not: userId },
        role: "personal",
      },
      select: {
        ...personSelect,
        unit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      where: { parentId: unitId },
      select: {
        id: true,
        name: true,
        pimpinanId: true,
        pimpinan: { select: personSelect },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const byId = new Map<string, DirectReport>();
  for (const person of sameUnit) {
    byId.set(person.id, toDirectReport(person));
  }

  const vacantChildIds = childUnits.filter((unit) => !unit.pimpinan).map((unit) => unit.id);
  const actingRows = await listActivePenugasanForUnits(vacantChildIds);
  const actingByUnit = new Map<string, (typeof actingRows)[number]>();
  for (const row of actingRows) {
    if (!actingByUnit.has(row.unitId)) actingByUnit.set(row.unitId, row);
  }

  const unitsWithoutLeader = childUnits.filter((unit) => !unit.pimpinan && !actingByUnit.has(unit.id));
  const fallbackUsers =
    unitsWithoutLeader.length === 0
      ? []
      : await prisma.user.findMany({
          where: {
            role: "personal",
            unitId: { in: unitsWithoutLeader.map((unit) => unit.id) },
          },
          select: personSelect,
        });
  const fallbackByUnit = new Map<string, typeof fallbackUsers>();
  for (const person of fallbackUsers) {
    if (!person.unitId) continue;
    const list = fallbackByUnit.get(person.unitId) ?? [];
    list.push(person);
    fallbackByUnit.set(person.unitId, list);
  }

  for (const unit of childUnits) {
    if (unit.pimpinan) {
      byId.set(unit.pimpinan.id, toDirectReport({ ...unit.pimpinan, unit: { name: unit.name } }));
      continue;
    }
    const acting = actingByUnit.get(unit.id);
    if (acting) {
      byId.set(
        acting.user.id,
        toDirectReport({
          ...acting.user,
          unit: { name: unit.name },
          jabatanLabel: penugasanLabel(acting.jenis, unit.name),
        }),
      );
      continue;
    }
    for (const person of fallbackByUnit.get(unit.id) ?? []) {
      byId.set(person.id, toDirectReport({ ...person, unit: { name: unit.name } }));
    }
  }

  byId.delete(userId);
  return Array.from(byId.values()).sort(compareByPangkatDesc);
});

export async function getAtasan(user: OrgUser): Promise<Atasan | null> {
  return loadAtasan(user.id, user.unitId ?? "");
}

const atasanPersonSelect = {
  id: true,
  name: true,
  jabatan: true,
  unitId: true,
  nip: true,
  pegawai: { select: pegawaiDisplaySelect },
} as const;

async function atasanFromPimpinan(pimpinanId: string | null, userId: string) {
  if (!pimpinanId || pimpinanId === userId) return null;
  const leader = await prisma.user.findUnique({
    where: { id: pimpinanId },
    select: {
      ...atasanPersonSelect,
      unit: { select: { name: true } },
    },
  });
  return leader ? toDirectReport(leader) : null;
}

async function atasanFromPenugasan(unitId: string, unitName: string, userId: string) {
  const [acting] = await listActivePenugasanForUnits([unitId]);
  if (!acting || acting.userId === userId) return null;
  return toDirectReport({
    ...acting.user,
    unit: { name: unitName },
    jabatanLabel: penugasanLabel(acting.jenis, unitName),
  });
}

const loadAtasan = cache(async (userId: string, unitId: string): Promise<Atasan | null> => {
  if (!unitId) return null;
  const orgUser = await getDbOrgUser(userId);
  const unit =
    orgUser?.unit ??
    (await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, parentId: true, pimpinanId: true, type: true, name: true },
    }));
  if (!unit) return null;

  const definitive = await atasanFromPimpinan(unit.pimpinanId, userId);
  if (definitive) return definitive;
  const acting = await atasanFromPenugasan(unit.id, unit.name, userId);
  if (acting) return acting;

  let parentId = unit.parentId;
  while (parentId) {
    const parent = await prisma.unit.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        parentId: true,
        pimpinanId: true,
        name: true,
        pimpinan: { select: atasanPersonSelect },
      },
    });
    if (!parent) break;
    if (parent.pimpinan && parent.pimpinan.id !== userId) {
      return toDirectReport({ ...parent.pimpinan, unit: { name: parent.name } });
    }
    const parentActing = await atasanFromPenugasan(parent.id, parent.name, userId);
    if (parentActing) return parentActing;
    parentId = parent.parentId;
  }

  return null;
});

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

export function canSeeTaskWithScope(
  user: Pick<SessionUser, "id" | "role" | "unitId">,
  task: TaskAccess,
  scope: { visibleUnitIds: string[]; isLeader: boolean },
) {
  if (isSuperAdmin(user.role)) return true;
  if (task.assignedToId === user.id || task.createdById === user.id) return true;
  if (task.assignmentMode === "kolam" && task.status === "tersedia" && task.unitId === user.unitId) {
    return true;
  }
  if (!scope.visibleUnitIds.includes(task.unitId)) return false;
  if (scope.isLeader) return true;

  return (
    task.assignmentMode === "kolam" &&
    task.status === "tersedia" &&
    task.unitId === user.unitId
  );
}

export async function canSeeTask(user: SessionUser, task: TaskAccess) {
  if (isSuperAdmin(user.role) || task.assignedToId === user.id || task.createdById === user.id) {
    return true;
  }

  const { visibleUnitIds, isLeader } = await getOrgScope(user);
  return canSeeTaskWithScope(user, task, { visibleUnitIds, isLeader });
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

export function canManagePostedTask(
  user: Pick<SessionUser, "id">,
  task: Pick<TaskAccess, "createdById" | "status">,
) {
  return task.createdById === user.id && (task.status === "tersedia" || task.status === "dikerjakan");
}

export function canManagePostedTersediaTask(
  user: Pick<SessionUser, "id">,
  task: Pick<TaskAccess, "createdById" | "status">,
) {
  return canManagePostedTask(user, task);
}

export function canDeletePostedTask(
  user: Pick<SessionUser, "id">,
  task: Pick<TaskAccess, "createdById" | "status">,
) {
  return canManagePostedTask(user, task);
}

export async function canReviewTask(user: OrgUser, assignedToId: string | null) {
  if (!assignedToId) return false;
  if (isSuperAdmin(user.role)) return true;
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

  const openStatuses: TaskStatus[] = ["tersedia", "dikerjakan", "ditolak"];
  const where = {
    createdById: atasan.id,
    assignedToId: userId,
    source: "delegasi" as const,
    status: { in: openStatuses },
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
