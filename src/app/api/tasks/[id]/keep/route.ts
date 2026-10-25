import { NextResponse } from "next/server";
import { effectiveJabatan } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (effectiveJabatan(user) !== "pelaksana" || !user.unitId) {
    return NextResponse.json(
      { error: "Kartu ini hanya bisa diambil staf sub bidang terkait" },
      { status: 403 },
    );
  }

  const claimed = await prisma.task.updateMany({
    where: {
      id,
      source: "delegasi",
      assignmentMode: "kolam",
      status: "tersedia",
      unitId: user.unitId,
    },
    data: {
      status: "dikerjakan",
      assignedToId: user.id,
      assignmentMode: "ditunjuk",
    },
  });

  if (claimed.count !== 1) {
    return NextResponse.json(
      { error: "Kartu ini sudah diambil atau tidak lagi tersedia" },
      { status: 409 },
    );
  }

  const task = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json(task);
}
