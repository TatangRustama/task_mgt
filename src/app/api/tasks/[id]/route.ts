import { NextResponse } from "next/server";
import { canSeeTask } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      evidence: true,
      review: { include: { reviewedBy: { select: { name: true } } } },
      unit: { select: { name: true, pimpinanId: true } },
    },
  });

  if (!task || !(await canSeeTask(user, task))) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(task);
}
