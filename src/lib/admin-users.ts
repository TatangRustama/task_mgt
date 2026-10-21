import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaffLoginIdentifier, privilegedEmail, privilegedUsername } from "@/lib/roles";

export const MANAGED_ROLES: Role[] = ["super_admin", "admin", "personal"];

export const userDetailSelect = {
  id: true,
  name: true,
  email: true,
  nip: true,
  role: true,
  opdAdmin: true,
  superAdmin: true,
  opdUnitId: true,
  jabatan: true,
  createdAt: true,
  updatedAt: true,
  unit: { select: { id: true, name: true } },
  opdUnit: { select: { id: true, name: true } },
  pegawai: {
    select: {
      id: true,
      jenis: true,
      nip: true,
      nik: true,
      jabatanNama: true,
      unorId: true,
      unorNama: true,
      perangkatDaerahId: true,
      perangkatDaerahNama: true,
    },
  },
} satisfies Prisma.UserSelect;

export type OpdScopeChoice = {
  perangkatDaerah: { id: string; name: string };
  chain: string[];
};

async function chainWithinPerangkatDaerah(unitId: string, perangkatDaerahId: string) {
  if (!unitId || unitId === perangkatDaerahId) return [perangkatDaerahId];
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: string | null = unitId;
  let belongs = false;
  while (current && current !== perangkatDaerahId && !seen.has(current)) {
    seen.add(current);
    const unit: { parentId: string | null; perangkatDaerahId: string | null } | null = await prisma.unit.findUnique({
      where: { id: current },
      select: { parentId: true, perangkatDaerahId: true },
    });
    if (!unit || (unit.perangkatDaerahId && unit.perangkatDaerahId !== perangkatDaerahId)) break;
    if (unit.perangkatDaerahId === perangkatDaerahId) belongs = true;
    chain.unshift(current);
    current = unit.parentId;
  }
  if (current === perangkatDaerahId || belongs) return chain;
  return [perangkatDaerahId];
}

export async function buildOpdScope(userId: string, preferredUnitId?: string | null): Promise<OpdScopeChoice | null> {
  const pegawai = await prisma.pegawai.findFirst({
    where: { userId },
    select: { perangkatDaerahId: true, perangkatDaerahNama: true, unorId: true },
  });
  const perangkatDaerahId = pegawai?.perangkatDaerahId?.trim() || "";
  if (!perangkatDaerahId) return null;
  const unit = await prisma.unit.findUnique({
    where: { id: perangkatDaerahId },
    select: { id: true, name: true },
  });
  const target = preferredUnitId || pegawai?.unorId || perangkatDaerahId;
  return {
    perangkatDaerah: {
      id: perangkatDaerahId,
      name: unit?.name || pegawai?.perangkatDaerahNama?.trim() || "Perangkat daerah",
    },
    chain: await chainWithinPerangkatDaerah(target, perangkatDaerahId),
  };
}

export async function validateOpdUnit(userId: string, opdUnitId: string) {
  const scope = await buildOpdScope(userId, opdUnitId);
  if (!scope) {
    return { ok: false as const, error: "Perangkat daerah pegawai belum tersedia" };
  }
  if (!opdUnitId.trim()) {
    return { ok: false as const, error: "Pilih unit organisasi yang dikelola" };
  }
  if (!scope.chain.includes(opdUnitId) && opdUnitId !== scope.perangkatDaerah.id) {
    return { ok: false as const, error: "Unit harus berada di perangkat daerah pegawai" };
  }
  const unit = await prisma.unit.findUnique({ where: { id: opdUnitId }, select: { id: true } });
  if (!unit) return { ok: false as const, error: "Unit organisasi tidak ditemukan" };
  return { ok: true as const, opdUnitId: unit.id };
}

export function credentialsForRole(role: Role, loginId: string) {
  const trimmed = loginId.trim();
  if (!MANAGED_ROLES.includes(role)) {
    return { ok: false as const, error: "Role tidak valid" };
  }
  if (!trimmed) {
    return {
      ok: false as const,
      error: role === "personal" ? "NIP/NIK wajib diisi" : "Username wajib diisi",
    };
  }
  if (role === "personal") {
    if (!isStaffLoginIdentifier(trimmed)) {
      return {
        ok: false as const,
        error: "Pegawai personal harus login dengan NIP atau NIK (angka)",
      };
    }
    const nip = trimmed.replace(/\D/g, "");
    return { ok: true as const, nip, email: `${nip}@simpeg.local` };
  }
  if (isStaffLoginIdentifier(trimmed)) {
    return {
      ok: false as const,
      error: "Username super admin/admin tidak boleh berupa NIP atau NIK",
    };
  }
  return {
    ok: true as const,
    nip: privilegedUsername(trimmed),
    email: privilegedEmail(trimmed),
  };
}
