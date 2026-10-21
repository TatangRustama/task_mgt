import { Jabatan, Role } from "@prisma/client";
import { cache } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultHomePath, hasAllowedRole, isSuperAdmin, coerceRole } from "@/lib/roles";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  opdAdmin: boolean;
  superAdmin: boolean;
  jabatan: Jabatan | null;
  unitId: string | null;
  nip: string;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user) return null;
  const sessionUser = session.user as SessionUser;
  const row = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { deletedAt: true, role: true, opdAdmin: true, superAdmin: true, unitId: true, jabatan: true },
  });
  if (!row || row.deletedAt) return null;
  return {
    ...sessionUser,
    role: coerceRole(row.role),
    opdAdmin: row.opdAdmin,
    superAdmin: row.superAdmin,
    unitId: row.unitId,
    jabatan: row.jabatan,
  };
});

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !hasAllowedRole(user.role, roles, user.opdAdmin, user.superAdmin)) {
    redirect(defaultHomePath(user.role));
  }
  return user;
}

export function canManageUnit(user: SessionUser, unitId: string) {
  return (
    isSuperAdmin(user.role) ||
    (user.role === "personal" && user.unitId === unitId && user.jabatan !== "pelaksana")
  );
}

export function isLeader(user: SessionUser) {
  return isSuperAdmin(user.role) || (user.role === "personal" && user.jabatan !== "pelaksana");
}
