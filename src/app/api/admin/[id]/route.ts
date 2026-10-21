import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { buildOpdScope, credentialsForRole, userDetailSelect, validateOpdUnit } from "@/lib/admin-users";
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
  const opdScope = await buildOpdScope(user.id, user.opdUnitId || user.pegawai?.unorId);
  return NextResponse.json({ user, opdScope, isSelf: actor.id === user.id });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin"]);
  const { id } = await params;
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, opdAdmin: true, superAdmin: true, email: true, jabatan: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const role = String(body.role || "") as Role;
  const loginId = String(body.username || body.nip || "").trim();
  const opdAdmin = role === "personal" && Boolean(body.opdAdmin);
  const superAdmin = role === "personal" && Boolean(body.superAdmin);
  const requestedUnitId = String(body.opdUnitId || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }

  const credentials = credentialsForRole(role, loginId);
  if (!credentials.ok) {
    return NextResponse.json({ error: credentials.error }, { status: 400 });
  }

  const keepsSuperAdmin = role === "super_admin" || superAdmin;
  const hadSuperAdmin = existing.role === "super_admin" || existing.superAdmin;
  if (hadSuperAdmin && !keepsSuperAdmin) {
    const superAdminCount = await prisma.user.count({
      where: { OR: [{ role: "super_admin" }, { superAdmin: true }] },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: "Tidak dapat mengubah role Super Admin terakhir" }, { status: 400 });
    }
    if (actor.id === existing.id) {
      return NextResponse.json({ error: "Tidak dapat mengubah role akun yang sedang digunakan" }, { status: 400 });
    }
  }

  let opdUnitId: string | null | undefined = opdAdmin && superAdmin ? undefined : null;
  if (opdAdmin && !superAdmin) {
    const scope = await validateOpdUnit(id, requestedUnitId);
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: 400 });
    opdUnitId = scope.opdUnitId;
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
        opdAdmin,
        superAdmin,
        ...(opdUnitId !== undefined ? { opdUnitId } : {}),
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
  const opdScope = user ? await buildOpdScope(user.id, user.opdUnitId || user.pegawai?.unorId) : null;
  return NextResponse.json({ user, opdScope, isSelf: actor.id === id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["super_admin"]);
  const { id } = await params;

  if (actor.id === id) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun yang sedang digunakan" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, superAdmin: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  if (existing.role === "super_admin" || existing.superAdmin) {
    const superAdminCount = await prisma.user.count({
      where: { OR: [{ role: "super_admin" }, { superAdmin: true }] },
    });
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
    prisma.dailyTaskReport.updateMany({ where: { atasanId: id }, data: { atasanId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
