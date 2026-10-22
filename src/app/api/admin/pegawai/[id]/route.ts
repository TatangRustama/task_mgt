import { NextResponse } from "next/server";
import { softDeletePegawai } from "@/lib/admin-pegawai";
import { getAdminScope, pegawaiRecordInScope, ADMIN_SCOPE_MISSING, unitIdInScope } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { isProtectedPegawaiAccount } from "@/lib/roles";
import { requireUser } from "@/lib/session";

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
  unit: { select: { id: true, name: true } },
  user: { select: { unitId: true, role: true } },
} as const;

async function loadPegawai(id: string) {
  return prisma.pegawai.findUnique({
    where: { id },
    select: pegawaiDetailSelect,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  const { id } = await params;
  const pegawai = await loadPegawai(id);
  if (!pegawai || !pegawaiRecordInScope(scope, pegawai)) {
    return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ pegawai });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      userId: true,
      unitId: true,
      unorId: true,
      user: { select: { unitId: true, role: true, opdAdmin: true, superAdmin: true } },
    },
  });
  if (!existing || !pegawaiRecordInScope(scope, existing)) {
    return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
  }
  if (isProtectedPegawaiAccount(existing.user)) {
    return NextResponse.json({ error: "Akun pengelola tidak dapat diubah dari daftar pegawai" }, { status: 403 });
  }

  const body = await request.json();
  const unorId = typeof body.unorId === "string" ? body.unorId.trim() : "";

  if (unorId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unorId },
      select: {
        id: true,
        name: true,
        perangkatDaerahId: true,
        perangkatDaerahNama: true,
      },
    });
    if (!unit || !unitIdInScope(scope, unit.id)) {
      return NextResponse.json({ error: "Unit organisasi tidak ditemukan" }, { status: 404 });
    }

    await prisma.pegawai.update({
      where: { id },
      data: {
        unorId: unit.id,
        unorNama: unit.name,
        unitId: unit.id,
        perangkatDaerahId: unit.perangkatDaerahId,
        perangkatDaerahNama: unit.perangkatDaerahNama,
      },
    });
    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { unitId: unit.id },
      });
    }
    const pegawai = await loadPegawai(id);
    return NextResponse.json({ pegawai });
  }

  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }

  await prisma.pegawai.update({
    where: { id },
    data: {
      name,
      jabatanNama: String(body.jabatanNama || "").trim() || null,
      email: String(body.email || "").trim() || null,
      noHp: String(body.noHp || "").trim() || null,
      address: String(body.address || "").trim(),
      gelarDepan: String(body.gelarDepan || "").trim() || null,
      gelarBelakang: String(body.gelarBelakang || "").trim() || null,
    },
  });
  if (existing.userId) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { name },
    });
  }

  const pegawai = await loadPegawai(id);
  return NextResponse.json({ pegawai });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  if (!scope.unrestricted && scope.unitIds.length === 0) {
    return NextResponse.json({ error: ADMIN_SCOPE_MISSING }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.pegawai.findUnique({
    where: { id },
    select: { unitId: true, unorId: true, user: { select: { unitId: true, role: true } } },
  });
  if (!existing || !pegawaiRecordInScope(scope, existing)) {
    return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
  }
  const result = await softDeletePegawai(id, actor.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, name: result.name });
}
