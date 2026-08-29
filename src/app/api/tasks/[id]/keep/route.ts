import { NextResponse } from "next/server";
import { canPickupPoolTask } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || !canPickupPoolTask(user, task)) {
    return NextResponse.json(
      { error: "Kartu ini hanya bisa diambil staf sub bidang terkait" },
      { status: 403 }
    );
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: "dikerjakan",
      assignedToId: user.id,
      assignmentMode: "ditunjuk",
    },
  });

  return NextResponse.json(updated);
}
