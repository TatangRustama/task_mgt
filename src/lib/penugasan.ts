import type { PenugasanJenis, Prisma, UnitType } from "@prisma/client";
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
  unitType: UnitType;
};

export function activePenugasanWhere(now = new Date()): Prisma.PenugasanSementaraWhereInput {
  return {
    mulai: { lte: now },
    OR: [{ selesai: null }, { selesai: { gt: now } }],
  };
}

export function penugasanLabel(jenis: PenugasanJenis, unitName: string) {
  return `${penugasanJenisLabel[jenis]}. ${unitName}`;
}

const actingSelect = {
  id: true,
  jenis: true,
  unitId: true,
  unit: { select: { id: true, name: true, type: true } },
} as const;

function toActing(row: {
  id: string;
  jenis: PenugasanJenis;
  unitId: string;
  unit: { name: string; type: UnitType };
}): ActingAssignment {
  return {
    id: row.id,
    jenis: row.jenis,
    unitId: row.unitId,
    unitName: row.unit.name,
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
