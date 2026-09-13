import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export const FOTO_TUGAS_BUCKET = "foto_tugas";
const BUCKET = FOTO_TUGAS_BUCKET;
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

export function fotoTugasObjectPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const index = parsed.pathname.indexOf(PUBLIC_MARKER);
    if (index === -1) return null;
    const name = decodeURIComponent(parsed.pathname.slice(index + PUBLIC_MARKER.length));
    if (!name || name.includes("/") || name.includes("..")) return null;
    return name;
  } catch {
    return null;
  }
}

export async function saveUploadedFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (buffer.length > 1024 * 1024) {
    throw new Error("Ukuran file maksimal 1MB");
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Format file harus JPG, PNG, atau WebP");
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${randomUUID()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Gagal upload foto: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
