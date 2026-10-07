import { NextResponse } from "next/server";
import type { PenugasanJenis } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activePenugasanWhere, penugasanLabel } from "@/lib/penugasan";
import { requireUser } from "@/lib/session";

const jenisValues: PenugasanJenis[] = ["plt", "plh"];

export async function GET(request: Request) {
  await requireUser(["super_admin"]);
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";

  if (q) {
    const units = await prisma.unit.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, type: true, pimpinanId: true },
      orderBy: { name: "asc" },
      take: 8,
    });
    return NextResponse.json({ units });
  }

  if (!userId) return NextResponse.json({ items: [] });

  const items = await prisma.penugasanSementara.findMany({
    where: { userId, ...activePenugasanWhere() },
    select: {
      id: true,
      jenis: true,
      mulai: true,
      surat: true,
      unit: { select: { id: true, name: true, type: true } },
    },
    orderBy: { mulai: "desc" },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      label: penugasanLabel(item.jenis, item.unit.name),
    })),
  });
}

export async function POST(request: Request) {
  await requireUser(["super_admin"]);
  const body = await request.json().catch(() => null);
  const userId = String(body?.userId || "").trim();
  const unitId = String(body?.unitId || "").trim();
  const jenis = String(body?.jenis || "") as PenugasanJenis;
  const surat = String(body?.surat || "").trim();

  if (!userId || !unitId || !jenisValues.includes(jenis)) {
    return NextResponse.json({ error: "Pegawai, unit, dan jenis penugasan wajib diisi" }, { status: 400 });
  }

  const [user, unit, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, unitId: true } }),
    prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, name: true, pimpinanId: true } }),
    prisma.penugasanSementara.findFirst({
      where: { unitId, ...activePenugasanWhere() },
      select: { id: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Akun pegawai tidak ditemukan" }, { status: 404 });
  if (!unit) return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  if (unit.pimpinanId) {
    return NextResponse.json({ error: "Unit ini sudah punya pejabat definitif" }, { status: 400 });
  }
  if (existing) {
    return NextResponse.json({ error: "Unit ini sudah punya Plt atau Plh yang masih berjalan" }, { status: 400 });
  }

  const created = await prisma.penugasanSementara.create({
    data: {
      userId,
      unitId,
      jenis,
      surat: surat || null,
    },
    select: { id: true, jenis: true },
  });

  return NextResponse.json(
    { ...created, label: penugasanLabel(created.jenis, unit.name) },
    { status: 201 },
  );
}
