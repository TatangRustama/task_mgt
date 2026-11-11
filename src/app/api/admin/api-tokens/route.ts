import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { hasSuperAdminAccess } from "@/lib/roles";
import { createNewApiToken, deleteApiToken, getStoredApiTokens } from "@/lib/api-tokens";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tokens = getStoredApiTokens();
  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Keterangan pengguna wajib diisi" },
        { status: 400 }
      );
    }

    const created = createNewApiToken(name);
    return NextResponse.json({ success: true, token: created });
  } catch {
    return NextResponse.json({ error: "Gagal memproses request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parameter id wajib disertakan" }, { status: 400 });
  }

  const deleted = deleteApiToken(id);
  if (!deleted) {
    return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Token berhasil dihapus" });
}
