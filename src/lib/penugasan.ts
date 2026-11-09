import type { PenugasanJenis, Prisma, UnitType } from "@prisma/client";
import { deriveNamaJabatan } from "@/lib/jabatan-display";
import { prisma } from "@/lib/prisma";

export const penugasanJenisLabel: Record<PenugasanJenis, string> = {
  plt: "Plt",
  plh: "Plh",
};

export type ActingAssignment = {
  id: string;
  jenis: PenugasanJenis;
  unitId: string;
  unitName: string;
  unitNamaJabatan?: string | null;
  unitType: UnitType;
};

export function activePenugasanWhere(now = new Date()): Prisma.PenugasanSementaraWhereInput {
  return {
    mulai: { lte: now },
    OR: [{ selesai: null }, { selesai: { gt: now } }],
  };
}

export function penugasanLabel(
  jenis: PenugasanJenis,
  unitName: string,
  namaJabatan?: string | null,
) {
  const title = namaJabatan?.trim() || deriveNamaJabatan(unitName) || unitName;
  return `${penugasanJenisLabel[jenis]}. ${title}`;
}

const actingSelect = {
  id: true,
  jenis: true,
  unitId: true,
  unit: { select: { id: true, name: true, namaJabatan: true, type: true } },
} as const;

function toActing(row: {
  id: string;
  jenis: PenugasanJenis;
  unitId: string;
  unit: { name: string; namaJabatan?: string | null; type: UnitType };
}): ActingAssignment {
  return {
    id: row.id,
    jenis: row.jenis,
    unitId: row.unitId,
    unitName: row.unit.name,
    unitNamaJabatan: row.unit.namaJabatan ?? null,
    unitType: row.unit.type,
  };
}

export async function listActivePenugasanForUser(userId: string) {
  const rows = await prisma.penugasanSementara.findMany({
    where: { userId, ...activePenugasanWhere() },
    select: actingSelect,
    orderBy: { mulai: "desc" },
  });
  return rows.map(toActing);
}

export async function listActivePenugasanForUnits(unitIds: string[]) {
  if (!unitIds.length) return [];
  return prisma.penugasanSementara.findMany({
    where: { unitId: { in: unitIds }, ...activePenugasanWhere() },
    select: {
      ...actingSelect,
      userId: true,
      user: { select: { id: true, name: true, jabatan: true, unitId: true, nip: true, pegawai: { select: { golonganNama: true, jabatanNama: true, jenis: true, nip: true } } } },
    },
    orderBy: { mulai: "desc" },
  });
}
