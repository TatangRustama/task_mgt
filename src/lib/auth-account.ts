import type { Jabatan, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coerceRole } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

export type ActiveAccount = {
  name: string;
  email: string;
  role: Role;
  jabatan: Jabatan | null;
  unitId: string | null;
  nip: string;
};

type AccountClaims = {
  name?: string | null;
  email?: string | null;
  role?: Role;
  jabatan?: Jabatan | null;
  unitId?: string | null;
  nip?: string;
};

export function applyActiveAccount<T extends AccountClaims>(token: T, account: ActiveAccount): T {
  token.name = account.name;
  token.email = account.email;
  token.role = account.role;
  token.jabatan = account.jabatan;
  token.unitId = account.unitId;
  token.nip = account.nip;
  return token;
}

export function sessionFromAccount(userId: string, account: ActiveAccount): SessionUser {
  return {
    id: userId,
    name: account.name,
    email: account.email,
    role: coerceRole(account.role),
    jabatan: account.jabatan,
    unitId: account.unitId,
    nip: account.nip,
  };
}

export async function loadActiveAccount(userId: string): Promise<ActiveAccount | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      role: true,
      jabatan: true,
      unitId: true,
      nip: true,
      deletedAt: true,
    },
  });
  if (!row || row.deletedAt) return null;
  return {
    name: row.name,
    email: row.email,
    role: row.role,
    jabatan: row.jabatan,
    unitId: row.unitId,
    nip: row.nip,
  };
}
