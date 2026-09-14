import { NextResponse } from "next/server";
import { getLaporanPrintData } from "@/lib/laporan-print-data";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getLaporanPrintData(user, new URL(request.url).searchParams);
  if (!data) return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  return NextResponse.json(data);
}
