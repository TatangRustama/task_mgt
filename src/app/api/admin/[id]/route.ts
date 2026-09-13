import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { credentialsForRole, userDetailSelect } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function loadUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userDetailSelect,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin"]);
  const { id } = await params;
  const user = await loadUser(id);
  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ user, isSelf: actor.id === user.id });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin"]);
  const { id } = await params;
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true, jabatan: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const role = String(body.role || "") as Role;
  const loginId = String(body.username || body.nip || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }

  const credentials = credentialsForRole(role, loginId);
  if (!credentials.ok) {
    return NextResponse.json({ error: credentials.error }, { status: 400 });
  }

  if (existing.role === "super_admin" && role !== "super_admin") {
    const superAdminCount = await prisma.user.count({ where: { role: "super_admin" } });
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: "Tidak dapat mengubah role Super Admin terakhir" }, { status: 400 });
    }
    if (actor.id === existing.id) {
      return NextResponse.json({ error: "Tidak dapat mengubah role akun yang sedang digunakan" }, { status: 400 });
    }
  }

  const email =
    role === "personal" &&
    existing.role === "personal" &&
    existing.email &&
    !existing.email.endsWith("@simpeg.local")
      ? existing.email
      : credentials.email;

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        role,
        nip: credentials.nip,
        email,
        jabatan: role === "personal" ? existing.jabatan ?? "pelaksana" : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Username atau NIP sudah terdaftar" }, { status: 409 });
    }
    throw error;
  }

  const user = await loadUser(id);
  return NextResponse.json({ user, isSelf: actor.id === id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin"]);
  const { id } = await params;

  if (actor.id === id) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun yang sedang digunakan" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  if (existing.role === "super_admin") {
    const superAdminCount = await prisma.user.count({ where: { role: "super_admin" } });
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: "Tidak dapat menghapus Super Admin terakhir" }, { status: 400 });
    }
  }

  const [createdTasks, reviews, ratings] = await Promise.all([
    prisma.task.count({ where: { createdById: id } }),
    prisma.taskReview.count({ where: { reviewedById: id } }),
    prisma.taskRating.count({ where: { ratedById: id } }),
  ]);
  if (createdTasks > 0 || reviews > 0 || ratings > 0) {
    return NextResponse.json(
      { error: "Akun tidak dapat dihapus karena masih terhubung dengan data tugas" },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.unit.updateMany({ where: { pimpinanId: id }, data: { pimpinanId: null } }),
    prisma.task.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.pegawai.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.monthlyTaskReport.updateMany({ where: { atasanId: id }, data: { atasanId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
