import { Jabatan, Role } from "@prisma/client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jabatan: Jabatan | null;
  unitId: string | null;
  nip: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const sessionUser = session.user as SessionUser;
  return {
    ...sessionUser,
    jabatan: sessionUser.jabatan ?? null,
  };
}

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) {
    redirect("/board");
  }
  return user;
}

export function canManageUnit(user: SessionUser, unitId: string) {
  return user.role === "admin" || (user.role === "pimpinan" && user.unitId === unitId);
}

export function isLeader(user: SessionUser) {
  return user.role === "pimpinan" || user.role === "admin";
}
