import { NextResponse } from "next/server";
import { PegawaiJenis, Prisma } from "@prisma/client";
import { getDescendantUnitIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { pegawaiUnorAssignment } from "@/lib/admin-pegawai";
import { canManageNonAsn, isSuperAdmin } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { ensureUserFromPegawai } from "@/lib/simpeg-accounts";
import { lookupOrSyncPegawaiByNip } from "@/lib/simpeg-sync";

const emptyPage = (page: number, pageSize: number) =>
  NextResponse.json({
    data: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
  });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const scope = url.searchParams.get("scope") || "";
  const requestedSize = Number(url.searchParams.get("pageSize") || 5) || 5;
  const pageSize =
    scope === "bawahan"
      ? Math.min(5, Math.max(1, requestedSize))
      : Math.min(50, Math.max(1, requestedSize));
  const jenis = url.searchParams.get("jenis");

  const where: Prisma.PegawaiWhereInput = {};
  if (jenis === "asn" || jenis === "non_asn") {
    where.jenis = jenis;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nip: { contains: q } },
      { nik: { contains: q } },
      { unorNama: { contains: q, mode: "insensitive" } },
      { jabatanNama: { contains: q, mode: "insensitive" } },
      { perangkatDaerahNama: { contains: q, mode: "insensitive" } },
    ];
  }

  if (scope === "bawahan") {
    where.jenis = "asn";
    if (!isSuperAdmin(user.role)) {
      if (!user.unitId) {
        return emptyPage(page, pageSize);
      }
      const unitIds = await getDescendantUnitIds(user.unitId);
      if (unitIds.length === 0) {
        return emptyPage(page, pageSize);
      }
      where.unitId = { in: unitIds };
    }
    if (user.nip) {
      where.NOT = { nip: user.nip };
    }
  }

  const [total, data] = await Promise.all([
    prisma.pegawai.count({ where }),
    prisma.pegawai.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const jenis = body.jenis as PegawaiJenis;
  const name = String(body.name || "").trim();
  const address = String(body.address || "").trim();
  const unorId = typeof body.unorId === "string" ? body.unorId.trim() : "";

  if (!["asn", "non_asn"].includes(jenis)) {
    return NextResponse.json({ error: "Jenis pegawai tidak valid" }, { status: 400 });
  }

  const assignment = unorId ? await pegawaiUnorAssignment(unorId) : null;
  if (unorId && !assignment) {
    return NextResponse.json({ error: "Unit organisasi tidak ditemukan" }, { status: 404 });
  }

  if (jenis === "asn") {
    const nip = String(body.nip || "").trim();
    if (!nip) {
      return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
    }
    const existing = await prisma.pegawai.findUnique({ where: { nip } });
    if (existing) {
      const saved = assignment
        ? await prisma.pegawai.update({ where: { id: existing.id }, data: assignment })
        : existing;
      await ensureUserFromPegawai(saved);
      return NextResponse.json(saved);
    }
    const found = await lookupOrSyncPegawaiByNip(nip);
    if (!found) {
      return NextResponse.json({ error: "Pegawai tidak terdaftar di Simpeg" }, { status: 404 });
    }
    if ("id" in found.pegawai) {
      const saved = assignment
        ? await prisma.pegawai.update({ where: { id: found.pegawai.id }, data: assignment })
        : found.pegawai;
      await ensureUserFromPegawai(saved);
      return NextResponse.json(saved, { status: 201 });
    }
    const created = await prisma.pegawai.create({
      data: {
        jenis: "asn",
        nip,
        name: found.pegawai.name,
        address: found.pegawai.address,
        ...assignment,
      },
    });
    await ensureUserFromPegawai(created);
    return NextResponse.json(created, { status: 201 });
  }

  if (jenis === "non_asn" && !canManageNonAsn(user.role)) {
    return NextResponse.json(
      { error: "Hanya admin yang dapat menambahkan pegawai Non-ASN" },
      { status: 403 },
    );
  }

  if (!name) {
    return NextResponse.json({ error: "Nama lengkap wajib diisi" }, { status: 400 });
  }
  if (!address) {
    return NextResponse.json({ error: "Alamat wajib diisi" }, { status: 400 });
  }

  const nik = String(body.nik || "").trim();
  if (!nik) {
    return NextResponse.json({ error: "NIK wajib diisi" }, { status: 400 });
  }
  const existingNik = await prisma.pegawai.findUnique({ where: { nik } });
  if (existingNik) {
    return NextResponse.json({ error: "NIK sudah terdaftar" }, { status: 409 });
  }

  if (!assignment) {
    return NextResponse.json({ error: "Unit organisasi wajib dipilih" }, { status: 400 });
  }

  const created = await prisma.pegawai.create({
    data: {
      jenis: "non_asn",
      nik,
      name,
      address,
      ...assignment,
    },
  });
  await ensureUserFromPegawai(created);
  return NextResponse.json(created, { status: 201 });
}
