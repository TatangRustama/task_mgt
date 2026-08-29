import { NextResponse } from "next/server";
import { canReviewTask, getDbOrgUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { isStarValue } from "@/lib/rating";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getDbOrgUser(sessionUser.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  if (!task.completedAt) {
    return NextResponse.json({ error: "Tugas belum dikerjakan" }, { status: 400 });
  }

  if (!task.assignedToId || task.assignedToId === user.id) {
    return NextResponse.json({ error: "Tugas ini tidak dapat dinilai" }, { status: 400 });
  }

  if (!(await canReviewTask(user, task.assignedToId))) {
    return NextResponse.json({ error: "Anda hanya dapat menilai bawahan langsung" }, { status: 403 });
  }

  const body = await request.json();
  const stars = Number(body.stars);
  if (!isStarValue(stars)) {
    return NextResponse.json({ error: "Penilaian harus 1 sampai 3 bintang" }, { status: 400 });
  }

  const rating = await prisma.taskRating.upsert({
    where: { taskId: id },
    create: {
      taskId: id,
      ratedById: user.id,
      stars,
    },
    update: {
      ratedById: user.id,
      stars,
      ratedAt: new Date(),
    },
  });

  return NextResponse.json(rating);
}
