import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Jabatan, Role, UnitType } from "@prisma/client";
import {
  expectedParentType,
  expectedUnitTypeForJabatan,
  jabatanLabel,
  roleFromJabatan,
  unitTypeLabel,
} from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  await requireUser(["admin"]);

  const units = await prisma.unit.findMany({
    include: {
      instansi: true,
      parent: { select: { id: true, name: true, type: true } },
      pimpinan: { select: { id: true, name: true } },
      _count: { select: { users: true, children: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const users = await prisma.user.findMany({
    include: {
      unit: { select: { name: true, type: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    units,
    users,
    unitTypeLabel,
    jabatanLabel,
  });
}

export async function POST(request: Request) {
  await requireUser(["admin"]);

  const body = await request.json();
  const action = body.action as string;

  if (action === "create_unit") {
    const instansi = await prisma.instansi.findFirst();
    if (!instansi) {
      return NextResponse.json({ error: "Instansi belum ada" }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const type = (body.type || "bidang") as UnitType;
    const parentId = body.parentId ? String(body.parentId) : null;

    if (!name) {
      return NextResponse.json({ error: "Nama unit wajib diisi" }, { status: 400 });
    }

    if (!["kantor", "bidang", "sub_bidang"].includes(type)) {
      return NextResponse.json({ error: "Jenis unit tidak valid" }, { status: 400 });
    }

    const requiredParent = expectedParentType(type);
    if (requiredParent) {
      if (!parentId) {
        return NextResponse.json(
          { error: `Unit ${unitTypeLabel[type]} wajib memiliki unit induk` },
          { status: 400 }
        );
      }
      const parent = await prisma.unit.findUnique({ where: { id: parentId } });
      if (!parent || parent.type !== requiredParent) {
        return NextResponse.json(
          { error: `Induk ${unitTypeLabel[type]} harus bertipe ${unitTypeLabel[requiredParent]}` },
          { status: 400 }
        );
      }
    } else if (parentId) {
      return NextResponse.json({ error: "Kantor tidak boleh memiliki unit induk" }, { status: 400 });
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        type,
        parentId,
        instansiId: instansi.id,
        pimpinanId: body.pimpinanId || null,
      },
    });

    if (body.pimpinanId) {
      await prisma.user.update({
        where: { id: body.pimpinanId },
        data: { role: "pimpinan", unitId: unit.id },
      });
    }

    return NextResponse.json(unit, { status: 201 });
  }

  if (action === "create_user") {
    const jabatanRaw = body.jabatan ? String(body.jabatan) : "";
    const jabatan = (["kepala_kantor", "kepala_bidang", "kepala_sub_bidang", "pelaksana"].includes(
      jabatanRaw
    )
      ? jabatanRaw
      : null) as Jabatan | null;
    const role = (body.role || roleFromJabatan(jabatan)) as Role;
    const unitId = body.unitId ? String(body.unitId) : null;

    if (role !== "admin") {
      if (!jabatan) {
        return NextResponse.json({ error: "Jabatan wajib diisi" }, { status: 400 });
      }
      if (!unitId) {
        return NextResponse.json({ error: "Unit wajib diisi" }, { status: 400 });
      }
      const unit = await prisma.unit.findUnique({ where: { id: unitId } });
      const expectedType = expectedUnitTypeForJabatan(jabatan);
      if (!unit || (expectedType && unit.type !== expectedType)) {
        return NextResponse.json(
          {
            error: expectedType
              ? `${jabatanLabel[jabatan]} harus ditempatkan di unit ${unitTypeLabel[expectedType]}`
              : "Unit tidak valid",
          },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(String(body.password || "password123"), 10);
    const user = await prisma.user.create({
      data: {
        name: String(body.name),
        nip: String(body.nip),
        email: String(body.email),
        passwordHash,
        role: role === "admin" ? "admin" : roleFromJabatan(jabatan),
        jabatan: role === "admin" ? null : jabatan,
        unitId: role === "admin" ? null : unitId,
      },
    });

    if (jabatan && jabatan !== "pelaksana" && unitId) {
      await prisma.unit.update({
        where: { id: unitId },
        data: { pimpinanId: user.id },
      });
    }

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}
