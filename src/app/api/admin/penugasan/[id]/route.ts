import { NextResponse } from "next/server";
import { ADMIN_SCOPE_MISSING, getAdminScope, unitIdInScope } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  if (!scope.unrestricted && scope.unitIds.length === 0) {
    return NextResponse.json({ error: ADMIN_SCOPE_MISSING }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.penugasanSementara.findUnique({
    where: { id },
    select: { id: true, selesai: true, unitId: true },
  });
  if (!existing || !unitIdInScope(scope, existing.unitId)) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (existing.selesai && existing.selesai <= new Date()) {
    return NextResponse.json({ ok: true });
  }

  await prisma.penugasanSementara.update({
    where: { id },
    data: { selesai: new Date() },
  });
  return NextResponse.json({ ok: true });
}
