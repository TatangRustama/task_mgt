import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  await requireUser(["super_admin"]);
  const units = await prisma.unit.findMany({
    where: { externalId: { not: null } },
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
