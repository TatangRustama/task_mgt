import { NextResponse } from "next/server";
import { ReviewDecision } from "@prisma/client";
import { canReviewTask, getDbOrgUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { isStarValue } from "@/lib/rating";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

  if (!(await canReviewTask(user, task.assignedToId))) {
    return NextResponse.json({ error: "Anda hanya dapat mereview bawahan langsung" }, { status: 403 });
  }

  if (task.status !== "menunggu_approval") {
    return NextResponse.json({ error: "Tugas belum menunggu approval" }, { status: 400 });
  }

  const body = await request.json();
  const decision = body.decision as ReviewDecision;
  const feedback = body.feedback ? String(body.feedback) : null;
  const stars = body.stars !== null && body.stars !== undefined ? Number(body.stars) : null;

  if (!["disetujui", "ditolak"].includes(decision)) {
    return NextResponse.json({ error: "Keputusan tidak valid" }, { status: 400 });
  }

  if (decision === "disetujui" && !isStarValue(stars ?? 0)) {
    return NextResponse.json({ error: "Beri 1 sampai 3 bintang sebelum menyetujui" }, { status: 400 });
  }

  if (decision === "ditolak" && !feedback) {
    return NextResponse.json({ error: "Catatan revisi wajib diisi" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.taskReview.upsert({
      where: { taskId: id },
      create: {
        taskId: id,
        reviewedById: user.id,
        decision,
        score: decision === "disetujui" ? stars : null,
        feedback,
      },
      update: {
        reviewedById: user.id,
        decision,
        score: decision === "disetujui" ? stars : null,
        feedback,
        reviewedAt: new Date(),
      },
    });

    if (decision === "disetujui" && stars != null) {
      await tx.taskRating.upsert({
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
    }

    return tx.task.update({
      where: { id },
      data: {
        status: decision === "disetujui" ? "disetujui" : "ditolak",
        completedAt: decision === "disetujui" ? task.completedAt : null,
      },
    });
  });

  return NextResponse.json(updated);
}
