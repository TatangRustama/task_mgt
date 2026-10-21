import { NextResponse } from "next/server";
import { getAdminScope } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  const units = await prisma.unit.findMany({
    where: scope.unrestricted
      ? { externalId: { not: null } }
      : { id: { in: scope.unitIds } },
    select: {
      id: true,
      name: true,
      parentId: true,
      type: true,
      perangkatDaerahId: true,
      perangkatDaerahNama: true,
    },
    orderBy: [{ perangkatDaerahNama: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ units });
}
