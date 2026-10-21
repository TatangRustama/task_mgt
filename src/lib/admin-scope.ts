import { cache } from "react";
import type { Prisma, Role } from "@prisma/client";
import { getDescendantUnitIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { hasSuperAdminAccess, isAppAdmin, isSuperAdmin } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

export const ADMIN_SCOPE_MISSING =
  "Unit organisasi Admin OPD belum ditetapkan. Hubungi super admin.";

export type AdminScope = {
  unrestricted: boolean;
  rootUnitId: string | null;
  unitIds: string[];
};

type ScopeUnit = {
  unitId?: string | null;
  unorId?: string | null;
};

type ScopePegawai = ScopeUnit & {
  user?: { unitId?: string | null } | null;
};

type ScopeTask = {
  unitId: string;
  assignedTo?: (ScopeUnit & { pegawai?: ScopeUnit | null }) | null;
};

const loadAdminScope = cache(async (role: Role, unitId: string): Promise<AdminScope> => {
  if (isSuperAdmin(role)) {
    return { unrestricted: true, rootUnitId: null, unitIds: [] };
  }
  if (!isAppAdmin(role) || !unitId) {
    return { unrestricted: false, rootUnitId: null, unitIds: [] };
  }
  return {
    unrestricted: false,
    rootUnitId: unitId,
    unitIds: await getDescendantUnitIds(unitId),
  };
});

export async function getAdminScope(user: Pick<SessionUser, "id" | "role" | "unitId" | "opdAdmin" | "superAdmin">) {
  if (hasSuperAdminAccess(user)) {
    return { unrestricted: true, rootUnitId: null, unitIds: [] } satisfies AdminScope;
  }
  if (isAppAdmin(user.role)) {
    return loadAdminScope(user.role, user.unitId ?? "");
  }
  if (user.opdAdmin) {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { opdUnitId: true },
    });
    const rootUnitId = row?.opdUnitId ?? "";
    if (!rootUnitId) return { unrestricted: false, rootUnitId: null, unitIds: [] } satisfies AdminScope;
    return {
      unrestricted: false,
      rootUnitId,
      unitIds: await getDescendantUnitIds(rootUnitId),
    } satisfies AdminScope;
  }
  return loadAdminScope(user.role, user.unitId ?? "");
}

export function adminScopeNotice(scope: AdminScope) {
  if (scope.unrestricted || scope.unitIds.length > 0) return null;
  return ADMIN_SCOPE_MISSING;
}

export function unitIdInScope(scope: AdminScope, unitId: string | null | undefined) {
  if (scope.unrestricted) return true;
  if (!unitId) return false;
  return scope.unitIds.includes(unitId);
}

export function pegawaiRecordInScope(scope: AdminScope, pegawai: ScopePegawai) {
  if (scope.unrestricted) return true;
  return (
    unitIdInScope(scope, pegawai.unitId) ||
    unitIdInScope(scope, pegawai.unorId) ||
    unitIdInScope(scope, pegawai.user?.unitId)
  );
}

export function taskRecordInScope(scope: AdminScope, task: ScopeTask) {
  if (scope.unrestricted) return true;
  if (scope.unitIds.includes(task.unitId)) return true;
  const assignee = task.assignedTo;
  if (!assignee) return false;
  return (
    unitIdInScope(scope, assignee.unitId) ||
    unitIdInScope(scope, assignee.pegawai?.unitId) ||
    unitIdInScope(scope, assignee.pegawai?.unorId)
  );
}

export function pegawaiInScopeWhere(scope: AdminScope): Prisma.PegawaiWhereInput | undefined {
  if (scope.unrestricted) return undefined;
  if (scope.unitIds.length === 0) return { id: { in: [] } };
  const ids = scope.unitIds;
  return {
    OR: [
      { unitId: { in: ids } },
      { unorId: { in: ids } },
      { user: { unitId: { in: ids } } },
    ],
  };
}

export function taskInScopeWhere(scope: AdminScope): Prisma.TaskWhereInput | undefined {
  if (scope.unrestricted) return undefined;
  if (scope.unitIds.length === 0) return { id: { in: [] } };
  const ids = scope.unitIds;
  return {
    OR: [
      { unitId: { in: ids } },
      { assignedTo: { unitId: { in: ids } } },
      { assignedTo: { pegawai: { unitId: { in: ids } } } },
      { assignedTo: { pegawai: { unorId: { in: ids } } } },
    ],
  };
}

export async function perangkatDaerahIdsForScope(scope: AdminScope) {
  if (scope.unrestricted) return null;
  const ids = new Set<string>();
  if (scope.unitIds.length === 0) return ids;
  const units = await prisma.unit.findMany({
    where: { id: { in: scope.unitIds } },
    select: { id: true, perangkatDaerahId: true },
  });
  for (const unit of units) {
    ids.add(unit.id);
    if (unit.perangkatDaerahId) ids.add(unit.perangkatDaerahId);
  }
  return ids;
}
