import { NextResponse } from "next/server";
import { getAdminScope, unitIdInScope } from "@/lib/admin-scope";
import { deriveNamaJabatan } from "@/lib/jabatan-display";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  const { id } = await context.params;

  const existing = await prisma.unit.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing || !unitIdInScope(scope, existing.id)) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawJabatan = typeof body?.namaJabatan === "string" ? body.namaJabatan.trim() : "";
  const namaJabatan = rawJabatan || deriveNamaJabatan(existing.name) || null;

  const updated = await prisma.unit.update({
    where: { id: existing.id },
    data: { namaJabatan },
    select: { id: true, name: true, namaJabatan: true },
  });

  return NextResponse.json({ unit: updated });
}
