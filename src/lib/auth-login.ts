import bcrypt from "bcryptjs";
import { Jabatan, Prisma, Role } from "@prisma/client";
import { LoginError } from "@/lib/auth-login-messages";
import { ensureUserFromPegawai } from "@/lib/simpeg-accounts";
import { lookupOrSyncPegawaiByNip } from "@/lib/simpeg-sync";
import { prisma } from "@/lib/prisma";
import { isStaffLoginIdentifier, privilegedEmail, privilegedUsername } from "@/lib/roles";

export { LoginError, LOGIN_ERROR_MESSAGES, type LoginErrorCode } from "@/lib/auth-login-messages";

export function normalizeLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return trimmed.replace(/\D/g, "");
}

function isDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1017"].includes(error.code);
  }
  if (error instanceof Error) {
    return /authentication failed|connect ECONNREFUSED|timeout/i.test(error.message);
  }
  return false;
}

const pegawaiSelect = {
  id: true,
  nip: true,
  nik: true,
  name: true,
  email: true,
  jabatanNama: true,
  unitId: true,
} as const;

async function findPrivilegedUser(identifier: string) {
  const key = privilegedUsername(identifier).replace(/\s+/g, "");
  if (!key) return null;
  const email = privilegedEmail(key);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ nip: key }, { email: key }, { email }],
    },
  });

  if (user && (user.role === "super_admin" || user.role === "admin")) {
    return user;
  }
  return null;
}

async function findPersonalUser(identifier: string) {
  const nipOrNik = normalizeLoginIdentifier(identifier);
  if (!nipOrNik) return null;

  const byNip = await prisma.user.findFirst({
    where: { nip: nipOrNik, role: "personal" },
  });
  if (byNip) return byNip;

  const pegawai = await prisma.pegawai.findFirst({
    where: { OR: [{ nip: nipOrNik }, { nik: nipOrNik }] },
    select: { ...pegawaiSelect, userId: true, nik: true },
  });
  if (pegawai?.userId) {
    const linked = await prisma.user.findFirst({
      where: { id: pegawai.userId, role: "personal" },
    });
    if (linked) return linked;
  }

  if (pegawai) {
    return ensureUserFromPegawai(pegawai);
  }

  return provisionUserFromPegawai(nipOrNik);
}

async function provisionUserFromPegawai(identifier: string) {
  const nip = normalizeLoginIdentifier(identifier);
  if (!nip) return null;

  let pegawai = await prisma.pegawai.findUnique({
    where: { nip },
    select: pegawaiSelect,
  });

  if (!pegawai) {
    await lookupOrSyncPegawaiByNip(nip);
    pegawai = await prisma.pegawai.findUnique({
      where: { nip },
      select: pegawaiSelect,
    });
  }

  if (!pegawai?.nip) return null;

  return ensureUserFromPegawai(pegawai);
}

export async function resolveLoginUser(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (isStaffLoginIdentifier(trimmed)) {
    return findPersonalUser(trimmed);
  }

  return findPrivilegedUser(trimmed);
}

export type AuthUserPayload = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jabatan: Jabatan | null;
  unitId: string | null;
  nip: string;
};

export async function authenticateCredentials(
  identifier: string,
  password: string,
): Promise<AuthUserPayload> {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    throw new LoginError("missing_fields");
  }

  try {
    const user = await resolveLoginUser(trimmed);
    if (!user) {
      throw new LoginError("not_found");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new LoginError("wrong_password");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      jabatan: user.jabatan,
      unitId: user.unitId,
      nip: user.nip,
    };
  } catch (error) {
    if (error instanceof LoginError) throw error;
    if (isDatabaseError(error)) throw new LoginError("database");
    console.error("[auth] authenticateCredentials failed:", error);
    throw new LoginError("database");
  }
}
