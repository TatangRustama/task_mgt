import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser(["super_admin"]);
  const { id } = await params;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const password = String(body.password || "").trim();
  const confirmPassword = String(body.confirmPassword || "").trim();

  if (!password || !confirmPassword) {
    return NextResponse.json({ error: "Lengkapi password baru dan konfirmasi" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Konfirmasi password tidak sama" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  return NextResponse.json({ ok: true });
}
