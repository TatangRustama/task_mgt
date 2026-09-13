import bcrypt from "bcryptjs";
import { Jabatan, Role, UnitType } from "@prisma/client";
import { mapPegawaiJabatan } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const PASSWORD_ROUNDS = 8;
const DEMO_EMAIL_SUFFIX = "@demo.go.id";

type PegawaiAccountSource = {
  id: string;
  nip: string | null;
  nik?: string | null;
  name: string;
  email: string | null;
  jabatanNama: string | null;
  unitId: string | null;
};

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function isProtectedUser(user: { role: Role; email: string }) {
  return user.role === "super_admin" || user.role === "admin" || user.email.endsWith(DEMO_EMAIL_SUFFIX);
}

function emailForPegawai(nip: string, preferred: string | null, taken: Set<string>) {
  const normalized = preferred?.trim().toLowerCase() || "";
  if (normalized.includes("@") && !taken.has(normalized) && !normalized.endsWith(DEMO_EMAIL_SUFFIX)) {
    return normalized;
  }
  return `${nip}@simpeg.local`;
}

async function unitTypeById(unitId: string | null, cache: Map<string, UnitType>) {
  if (!unitId) return null;
  const cached = cache.get(unitId);
  if (cached) return cached;
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { type: true } });
  if (!unit) return null;
  cache.set(unitId, unit.type);
  return unit.type;
}

export async function ensureUserFromPegawai(
  pegawai: PegawaiAccountSource,
  unitTypes: Map<string, UnitType> = new Map(),
) {
  const nip = pegawai.nip?.trim() || pegawai.nik?.trim();
  if (!nip) return null;

  const existing = await prisma.user.findUnique({ where: { nip } });
  if (existing && isProtectedUser(existing)) {
    return existing;
  }

  const type = await unitTypeById(pegawai.unitId, unitTypes);
  const jabatan = mapPegawaiJabatan(pegawai.jabatanNama, type);
  const role = "personal";
  const existingByEmail = pegawai.email
    ? await prisma.user.findUnique({ where: { email: pegawai.email.trim().toLowerCase() } })
    : null;
  const taken = new Set(existingByEmail && existingByEmail.nip !== nip ? [existingByEmail.email.toLowerCase()] : []);
  const email = existing?.email.endsWith("@simpeg.local") || !existing
    ? emailForPegawai(nip, pegawai.email, taken)
    : existing.email;

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: pegawai.name,
          email,
          role,
          jabatan,
          unitId: pegawai.unitId,
        },
      })
    : await prisma.user.create({
        data: {
          name: pegawai.name,
          nip,
          email,
          passwordHash: await bcrypt.hash(nip, PASSWORD_ROUNDS),
          role,
          jabatan,
          unitId: pegawai.unitId,
        },
      });

  await prisma.pegawai.update({
    where: { id: pegawai.id },
    data: { userId: user.id },
  });

  return user;
}

export async function syncPegawaiAccounts(onProgress?: (message: string, current: number, total: number) => void) {
  const pegawai = await prisma.pegawai.findMany({
    where: { nip: { not: null }, jenis: "asn" },
    select: {
      id: true,
      nip: true,
      name: true,
      email: true,
      jabatanNama: true,
      unitId: true,
    },
    orderBy: { nip: "asc" },
  });

  const units = await prisma.unit.findMany({
    where: { externalId: { not: null } },
    select: { id: true, type: true },
  });
  const unitTypes = new Map(units.map((unit) => [unit.id, unit.type]));
  const existingUsers = await prisma.user.findMany({
    select: { nip: true, email: true, id: true, role: true },
  });
  const byNip = new Map(existingUsers.map((user) => [user.nip, user]));
  const takenEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));

  let processed = 0;
  onProgress?.("Membuat akun login pegawai...", 0, pegawai.length);

  for (const group of chunk(pegawai, 8)) {
    await Promise.all(
      group.map(async (row) => {
        const nip = row.nip?.trim();
        if (!nip) return;
        const existing = byNip.get(nip);
        if (existing && isProtectedUser(existing)) {
          await prisma.pegawai.update({
            where: { id: row.id },
            data: { userId: existing.id },
          });
          return;
        }

        const jabatan = mapPegawaiJabatan(row.jabatanNama, row.unitId ? unitTypes.get(row.unitId) : null);
        const role = "personal";

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              role,
              jabatan,
              unitId: row.unitId,
            },
          });
          await prisma.pegawai.update({
            where: { id: row.id },
            data: { userId: existing.id },
          });
          return;
        }

        const email = emailForPegawai(nip, row.email, takenEmails);
        takenEmails.add(email);
        const created = await prisma.user.create({
          data: {
            name: row.name,
            nip,
            email,
            passwordHash: await bcrypt.hash(nip, PASSWORD_ROUNDS),
            role,
            jabatan,
            unitId: row.unitId,
          },
        });
        byNip.set(nip, { ...created, role });
        await prisma.pegawai.update({
          where: { id: row.id },
          data: { userId: created.id },
        });
      }),
    );
    processed += group.length;
    onProgress?.("Membuat akun login pegawai...", processed, pegawai.length);
  }

  await assignUnitLeaders();
  return pegawai.length;
}

const jabatanRank: Record<Jabatan, number> = {
  kepala_kantor: 4,
  kepala_bidang: 3,
  kepala_sub_bidang: 2,
  pelaksana: 1,
};

export async function assignUnitLeaders() {
  const units = await prisma.unit.findMany({
    where: { externalId: { not: null } },
    select: { id: true },
  });
  const members = await prisma.user.findMany({
    where: {
      unitId: { in: units.map((unit) => unit.id) },
      role: { notIn: ["super_admin", "admin"] },
    },
    select: { id: true, unitId: true, jabatan: true },
  });

  const byUnit = new Map<string, typeof members>();
  for (const member of members) {
    if (!member.unitId) continue;
    const list = byUnit.get(member.unitId) ?? [];
    list.push(member);
    byUnit.set(member.unitId, list);
  }

  for (const group of chunk(units, 40)) {
    await Promise.all(
      group.map((unit) => {
        const people = byUnit.get(unit.id) ?? [];
        const leader = [...people].sort(
          (a, b) => jabatanRank[b.jabatan ?? "pelaksana"] - jabatanRank[a.jabatan ?? "pelaksana"],
        )[0];
        const pimpinanId =
          leader && leader.jabatan && leader.jabatan !== "pelaksana" ? leader.id : null;
        return prisma.unit.update({
          where: { id: unit.id },
          data: { pimpinanId },
        });
      }),
    );
  }
}
