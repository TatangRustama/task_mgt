import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { lookupOrSyncPegawaiByNip } from "@/lib/simpeg-sync";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(user.role)) {
    return NextResponse.json({ error: "Hanya super admin yang dapat mencari pegawai ASN" }, { status: 403 });
  }

  const nip = new URL(request.url).searchParams.get("nip")?.trim() || "";
  if (!nip) {
    return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
  }

  const found = await lookupOrSyncPegawaiByNip(nip);
  if (!found) {
    return NextResponse.json({ error: "Pegawai tidak terdaftar di Simpeg" }, { status: 404 });
  }

  return NextResponse.json({
    ...found.pegawai,
    source: found.source,
    alreadySaved: found.alreadySaved,
  });
}
