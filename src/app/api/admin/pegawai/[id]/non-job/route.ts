import { NextResponse } from "next/server";
import { getAdminScope, pegawaiRecordInScope, ADMIN_SCOPE_MISSING } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { isPrivilegedRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const maxDuration = 30;

const pegawaiDetailSelect = {
  id: true,
  jenis: true,
  nip: true,
  nik: true,
  name: true,
  address: true,
  gelarDepan: true,
  gelarBelakang: true,
  tempatLahir: true,
  tanggalLahir: true,
  jenisKelamin: true,
  email: true,
  noHp: true,
  kedudukanHukum: true,
  tingkatPendidikan: true,
  golonganNama: true,
  jenisJabatanNama: true,
  jabatanNama: true,
  unorId: true,
  unorNama: true,
  perangkatDaerahId: true,
  perangkatDaerahNama: true,
  unitId: true,
  userId: true,
  unit: { select: { id: true, name: true, pimpinanId: true } },
  user: {
    select: {
      unitId: true,
      role: true,
      jabatan: true,
      ledUnits: { select: { id: true, name: true } },
    },
  },
} as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  if (!scope.unrestricted && scope.unitIds.length === 0) {
    return NextResponse.json({ error: ADMIN_SCOPE_MISSING }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.pegawai.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      userId: true,
      unitId: true,
      unorId: true,
      deletedAt: true,
      user: { select: { id: true, unitId: true, role: true } },
    },
  });

  if (!existing || existing.deletedAt || !pegawaiRecordInScope(scope, existing)) {
    return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
  }

  if (existing.user && isPrivilegedRole(existing.user.role)) {
    return NextResponse.json(
      { error: "Akun pengelola tidak dapat di-nonjob-kan dari daftar pegawai" },
      { status: 403 },
    );
  }

  if (existing.userId === actor.id) {
    return NextResponse.json(
      { error: "Anda tidak dapat me-nonjob-kan akun yang sedang digunakan" },
      { status: 403 },
    );
  }

  await prisma.$transaction(async (tx) => {
    if (existing.userId) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { jabatan: "pelaksana" },
      });
      await tx.unit.updateMany({
        where: { pimpinanId: existing.userId },
        data: { pimpinanId: null },
      });
    }

    await tx.pegawai.update({
      where: { id: existing.id },
      data: {
        jabatanNama: "Pelaksana (Non-job)",
        jenisJabatanNama: "Pelaksana",
      },
    });
  });

  const pegawai = await prisma.pegawai.findUnique({
    where: { id },
    select: pegawaiDetailSelect,
  });

  return NextResponse.json({
    ok: true,
    message: `${existing.name} berhasil dinon-job-kan menjadi pelaksana`,
    pegawai,
  });
}
