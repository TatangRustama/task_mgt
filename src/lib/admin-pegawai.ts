import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PegawaiStatusFilter = "cpns" | "pns" | "pppk" | "non_asn";

export const PEGAWAI_STATUS_OPTIONS: { value: PegawaiStatusFilter; label: string }[] = [
  { value: "cpns", label: "CPNS" },
  { value: "pns", label: "PNS" },
  { value: "pppk", label: "PPPK" },
  { value: "non_asn", label: "Non-ASN" },
];

const unorSelect = { id: true, name: true } as const;

function isStatusFilter(value: string | null | undefined): value is PegawaiStatusFilter {
  return value === "cpns" || value === "pns" || value === "pppk" || value === "non_asn";
}

export function pegawaiStatusWhere(status: string | null | undefined): Prisma.PegawaiWhereInput | undefined {
  if (!isStatusFilter(status)) return undefined;
  if (status === "non_asn") return { jenis: "non_asn" };
  if (status === "cpns") {
    return { jenis: "asn", kedudukanHukum: { contains: "CPNS", mode: "insensitive" } };
  }
  if (status === "pppk") {
    return {
      jenis: "asn",
      OR: [
        { kedudukanHukum: { contains: "PPPK", mode: "insensitive" } },
        { kedudukanHukum: { contains: "perjanjian kerja", mode: "insensitive" } },
      ],
    };
  }
  return {
    jenis: "asn",
    OR: [
      { kedudukanHukum: null },
      {
        AND: [
          { NOT: { kedudukanHukum: { contains: "CPNS", mode: "insensitive" } } },
          { NOT: { kedudukanHukum: { contains: "PPPK", mode: "insensitive" } } },
          { NOT: { kedudukanHukum: { contains: "perjanjian kerja", mode: "insensitive" } } },
        ],
      },
    ],
  };
}

export async function listUnorChildren(parentId: string) {
  return prisma.unit.findMany({
    where: { parentId },
    select: unorSelect,
    orderBy: { name: "asc" },
  });
}

export async function listUnorRootsForPerangkatDaerah(perangkatDaerahId: string) {
  const direct = await listUnorChildren(perangkatDaerahId);
  if (direct.length > 0) return direct;

  const units = await prisma.unit.findMany({
    where: { perangkatDaerahId },
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { perangkatDaerahId: true } },
    },
    orderBy: { name: "asc" },
  });

  return units
    .filter((unit) => unit.id !== perangkatDaerahId)
    .filter((unit) => !unit.parentId || unit.parent?.perangkatDaerahId !== perangkatDaerahId)
    .map((unit) => ({ id: unit.id, name: unit.name }));
}

export async function collectDescendantUnitIds(rootId: string): Promise<string[]> {
  const children = await listUnorChildren(rootId);
  const nested = await Promise.all(children.map((child) => collectDescendantUnitIds(child.id)));
  return [rootId, ...nested.flat()];
}

export async function listPerangkatDaerah() {
  const units = await prisma.unit.findMany({
    where: { perangkatDaerahId: { not: null } },
    select: { perangkatDaerahId: true, perangkatDaerahNama: true },
    orderBy: { perangkatDaerahNama: "asc" },
  });

  const seen = new Map<string, string>();
  for (const unit of units) {
    const id = unit.perangkatDaerahId?.trim();
    if (!id || seen.has(id)) continue;
    seen.set(id, unit.perangkatDaerahNama?.trim() || id);
  }

  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function listGolonganOptions() {
  const rows = await prisma.pegawai.findMany({
    where: { golonganNama: { not: null } },
    distinct: ["golonganNama"],
    select: { golonganNama: true },
    orderBy: { golonganNama: "asc" },
  });
  return rows
    .map((row) => row.golonganNama?.trim())
    .filter((value): value is string => Boolean(value));
}

export async function pegawaiUnorAssignment(unorId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unorId },
    select: {
      id: true,
      name: true,
      perangkatDaerahId: true,
      perangkatDaerahNama: true,
    },
  });
  if (!unit) return null;
  return {
    unorId: unit.id,
    unorNama: unit.name,
    unitId: unit.id,
    perangkatDaerahId: unit.perangkatDaerahId,
    perangkatDaerahNama: unit.perangkatDaerahNama,
  };
}
