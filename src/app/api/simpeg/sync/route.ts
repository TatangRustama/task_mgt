import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isSimpegConfigured } from "@/lib/simpeg";
import { syncSimpeg } from "@/lib/simpeg-sync";

export const maxDuration = 300;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [unitCount, pegawaiCount, lastSynced] = await Promise.all([
    prisma.unit.count({ where: { externalId: { not: null } } }),
    prisma.pegawai.count({ where: { jenis: "asn", syncedAt: { not: null } } }),
    prisma.pegawai.findFirst({
      where: { syncedAt: { not: null } },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),
  ]);

  return NextResponse.json({
    configured: isSimpegConfigured(),
    unitCount,
    pegawaiCount,
    lastSyncedAt: lastSynced?.syncedAt ?? null,
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat sinkronisasi" }, { status: 403 });
  }
  if (!isSimpegConfigured()) {
    return NextResponse.json({ error: "SIMPEG_API_TOKEN belum diatur" }, { status: 500 });
  }

  try {
    const result = await syncSimpeg();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal sinkronisasi Simpeg";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
