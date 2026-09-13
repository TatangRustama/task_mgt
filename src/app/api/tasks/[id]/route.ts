import { NextResponse } from "next/server";
import { TaskPriority } from "@prisma/client";
import { canManagePostedTersediaTask, canSeeTask } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { parseJumlahSatuan } from "@/lib/satuan";
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

const PRIORITIES = new Set<TaskPriority>(["rendah", "sedang", "tinggi"]);

async function getPostedTersediaTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return { error: NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 }) };
  }
  if (!canManagePostedTersediaTask({ id: userId }, task)) {
    return {
      error: NextResponse.json(
        { error: "Hanya pembuat tugas yang dapat mengubah tugas tersedia" },
        { status: 403 },
      ),
    };
  }
  return { task };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await getPostedTersediaTask(user.id, id);
  if ("error" in loaded) return loaded.error;

  const body = await request.json();
  const title = String(body.title || "").trim();
  const description = body.description ? String(body.description) : null;
  const deadline = body.deadline ? new Date(body.deadline) : null;
  const priority = (body.priority || loaded.task.priority) as TaskPriority;
  const parsedJumlah = parseJumlahSatuan(body.jumlahIntervensi, body.satuan, false);

  if (!title || title.length > 60) {
    return NextResponse.json({ error: "Judul wajib diisi (max 60 karakter)" }, { status: 400 });
  }
  if (!PRIORITIES.has(priority)) {
    return NextResponse.json({ error: "Prioritas tidak valid" }, { status: 400 });
  }
  if (!parsedJumlah.ok) {
    return NextResponse.json({ error: parsedJumlah.error }, { status: 400 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      deadline,
      priority,
      jumlahIntervensi: parsedJumlah.jumlahIntervensi,
      satuan: parsedJumlah.satuan,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await getPostedTersediaTask(user.id, id);
  if ("error" in loaded) return loaded.error;

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
