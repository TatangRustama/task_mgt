import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasSuperAdminAccess } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { isSimpegConfigured } from "@/lib/simpeg";
import { refreshPegawaiFromSimpeg } from "@/lib/simpeg-sync";

export const maxDuration = 60;

const pegawaiDetailSelect = {
  id: true,
  jenis: true,
  nip: true,
  nik: true,
  name: true,
  address: true,
  gelarDepan: true,
  gelarBelakang: true,
  tempatLahir: true,
  tanggalLahir: true,
  jenisKelamin: true,
  email: true,
  noHp: true,
  kedudukanHukum: true,
  tingkatPendidikan: true,
  golonganNama: true,
  jenisJabatanNama: true,
  jabatanNama: true,
  unorId: true,
  unorNama: true,
  perangkatDaerahId: true,
  perangkatDaerahNama: true,
  unitId: true,
  userId: true,
  unit: { select: { id: true, name: true } },
  user: { select: { unitId: true, role: true } },
} as const;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSuperAdminAccess(user)) {
    return NextResponse.json({ error: "Hanya super admin yang dapat menarik data Simpeg" }, { status: 403 });
  }
  if (!isSimpegConfigured()) {
    return NextResponse.json({ error: "SIMPEG_API_TOKEN belum diatur" }, { status: 500 });
  }

  const { id } = await params;

  try {
    const result = await refreshPegawaiFromSimpeg(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const pegawai = await prisma.pegawai.findUnique({
      where: { id: result.id },
      select: pegawaiDetailSelect,
    });
    if (!pegawai) {
      return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ pegawai });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui pegawai dari Simpeg";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
