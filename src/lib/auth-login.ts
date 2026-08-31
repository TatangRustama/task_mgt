import bcrypt from "bcryptjs";
import { Jabatan, Prisma, Role } from "@prisma/client";
import { LoginError } from "@/lib/auth-login-messages";
import { ensureUserFromPegawai } from "@/lib/simpeg-accounts";
import { lookupOrSyncPegawaiByNip } from "@/lib/simpeg-sync";
import { prisma } from "@/lib/prisma";

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
  name: true,
  email: true,
  jabatanNama: true,
  unitId: true,
} as const;

async function findUserByIdentifier(identifier: string) {
  if (identifier.includes("@")) {
    return prisma.user.findUnique({ where: { email: identifier } });
  }

  const nip = normalizeLoginIdentifier(identifier);
  if (!nip) return null;

  return prisma.user.findUnique({ where: { nip } });
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
  const normalized = identifier.includes("@") ? identifier.trim().toLowerCase() : identifier.trim();

  let user = await findUserByIdentifier(normalized);
  if (user) return user;

  if (normalized.includes("@")) return null;

  return provisionUserFromPegawai(normalized);
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
