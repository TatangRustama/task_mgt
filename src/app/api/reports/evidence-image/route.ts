import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { FOTO_TUGAS_BUCKET, fotoTugasObjectPath } from "@/lib/upload";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url).searchParams.get("url") || "";
  const path = fotoTugasObjectPath(url);
  if (!path) return NextResponse.json({ error: "URL foto tidak valid" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(FOTO_TUGAS_BUCKET).download(path);
  if (error || !data) {
    return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
