import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser(["super_admin"]);
  const { id } = await params;
  const existing = await prisma.penugasanSementara.findUnique({ where: { id }, select: { id: true, selesai: true } });
  if (!existing) return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  if (existing.selesai && existing.selesai <= new Date()) {
    return NextResponse.json({ ok: true });
  }

  await prisma.penugasanSementara.update({
    where: { id },
    data: { selesai: new Date() },
  });
  return NextResponse.json({ ok: true });
}
