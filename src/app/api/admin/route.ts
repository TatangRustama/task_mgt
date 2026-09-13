import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { credentialsForRole, MANAGED_ROLES } from "@/lib/admin-users";
import {
  parseUserPageSize,
  roleLabel,
  USER_MAX_PAGE_SIZE,
  USER_PAGE_SIZES,
} from "@/lib/roles";
import { requireUser } from "@/lib/session";

function parseRoleFilter(raw: string | null): Role | undefined {
  if (!raw || raw === "all") return undefined;
  return MANAGED_ROLES.includes(raw as Role) ? (raw as Role) : undefined;
}

export async function GET(request: Request) {
  await requireUser(["super_admin"]);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const role = parseRoleFilter(url.searchParams.get("role"));
  const pageSize = parseUserPageSize(url.searchParams.get("pageSize"));
  const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { nip: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { pegawai: { is: { nik: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      nip: true,
      role: true,
      createdAt: true,
      pegawai: { select: { nik: true, nip: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({
    users,
    total,
    page,
    pageSize,
    totalPages,
    roleLabel,
    pageSizes: USER_PAGE_SIZES,
    maxPageSize: USER_MAX_PAGE_SIZE,
  });
}

export async function POST(request: Request) {
  await requireUser(["super_admin"]);

  const body = await request.json();
  const name = String(body.name || "").trim();
  const password = String(body.password || "").trim();
  const role = String(body.role || "") as Role;
  const loginId = String(body.username || body.nip || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });
  }

  const credentials = credentialsForRole(role, loginId);
  if (!credentials.ok) {
    return NextResponse.json({ error: credentials.error }, { status: 400 });
  }

  const { nip, email } = credentials;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        nip,
        email,
        passwordHash,
        role,
        jabatan: role === "personal" ? "pelaksana" : null,
      },
    });
    return NextResponse.json(
      { id: user.id, name: user.name, username: user.nip, role: user.role },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Username atau NIP sudah terdaftar" }, { status: 409 });
    }
    throw error;
  }
}
