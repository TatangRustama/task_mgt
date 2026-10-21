import { NextResponse } from "next/server";
import { hasSuperAdminAccess } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { isSimpegConfigured } from "@/lib/simpeg";
import { syncSimpegUnor } from "@/lib/simpeg-sync";

export const maxDuration = 300;

export async function POST() {
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

  try {
    const unitCount = await syncSimpegUnor();
    return NextResponse.json({ unitCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menarik data dari Simpeg PB";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
