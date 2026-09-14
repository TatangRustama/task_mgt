import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  collectDescendantUnitIds,
  pegawaiStatusWhere,
} from "@/lib/admin-pegawai";
import { orderByIds, pageIdsByPangkatDesc } from "@/lib/golongan";
import { prisma } from "@/lib/prisma";
import { parseUserPageSize } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  await requireUser(["super_admin"]);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const golongan = url.searchParams.get("golongan")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const perangkatDaerahId = url.searchParams.get("perangkatDaerahId")?.trim() || "";
  const unorId = url.searchParams.get("unorId")?.trim() || "";
  const pageSize = parseUserPageSize(url.searchParams.get("pageSize"));
  const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);

  const and: Prisma.PegawaiWhereInput[] = [];
  const statusWhere = pegawaiStatusWhere(status);
  if (statusWhere) and.push(statusWhere);
  if (golongan) and.push({ golonganNama: golongan });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nip: { contains: q } },
        { nik: { contains: q } },
      ],
    });
  }
  if (unorId) {
    const unitIds = await collectDescendantUnitIds(unorId);
    and.push({ OR: [{ unitId: { in: unitIds } }, { unorId: { in: unitIds } }] });
  } else if (perangkatDaerahId) {
    and.push({ perangkatDaerahId });
  }

  const where: Prisma.PegawaiWhereInput = and.length > 0 ? { AND: and } : {};

  const total = await prisma.pegawai.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const ranked = await prisma.pegawai.findMany({
    where,
    select: { id: true, name: true, golonganNama: true },
  });
  const pageIds = pageIdsByPangkatDesc(ranked, page, pageSize);
  const data = pageIds.length
    ? orderByIds(
        await prisma.pegawai.findMany({
          where: { id: { in: pageIds } },
          select: {
            id: true,
            name: true,
            jenis: true,
            nip: true,
            nik: true,
            jabatanNama: true,
            golonganNama: true,
            kedudukanHukum: true,
            unorNama: true,
            perangkatDaerahNama: true,
          },
        }),
        pageIds,
      )
    : [];

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages,
  });
}
