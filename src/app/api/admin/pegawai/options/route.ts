import { NextResponse } from "next/server";
import { formatGolonganPangkat } from "@/lib/golongan";
import { listGolonganOptions, listPerangkatDaerah } from "@/lib/admin-pegawai";
import { requireUser } from "@/lib/session";

export async function GET() {
  await requireUser(["super_admin"]);
  const [golongan, perangkatDaerah] = await Promise.all([listGolonganOptions(), listPerangkatDaerah()]);
  return NextResponse.json({
    golongan: golongan.map((value) => ({
      value,
      label: formatGolonganPangkat(value),
    })),
    perangkatDaerah,
  });
}
