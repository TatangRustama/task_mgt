import { NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";

function hostFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).host;
  } catch {
    return null;
  }
}

export async function GET() {
  const authSecret = Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);
  const databaseUrl = Boolean(process.env.DATABASE_URL);
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? null;
  const vercelUrl = process.env.VERCEL_URL ?? null;
  const configuredHost = hostFromUrl(nextAuthUrl ?? undefined);
  const currentHost = hostFromUrl(vercelUrl ?? undefined);
  const urlMismatch = Boolean(
    configuredHost && currentHost && configuredHost !== currentHost,
  );

  const supabaseUrl = Boolean(process.env.SUPABASE_URL?.trim());
  const supabaseServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const localUploadsDir = process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
  const usingSupabaseStorage = supabaseUrl && supabaseServiceKey;
  const storageOk = usingSupabaseStorage || Boolean(localUploadsDir);

  let databaseOk = false;
  let databaseError: string | null = null;
  if (databaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Database connection failed";
    }
  }

  return NextResponse.json({
    ok: authSecret && databaseUrl && databaseOk && storageOk && !urlMismatch,
    env: {
      AUTH_SECRET: authSecret,
      DATABASE_URL: databaseUrl,
      DATABASE_OK: databaseOk,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
      STORAGE: usingSupabaseStorage ? "supabase" : "local",
      LOCAL_UPLOADS_DIR: usingSupabaseStorage ? null : localUploadsDir,
      NEXTAUTH_URL: nextAuthUrl,
      AUTH_URL: process.env.AUTH_URL ?? null,
      VERCEL_URL: vercelUrl,
      VAPID: Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()),
    },
    databaseError,
    urlMismatch,
    hint: !storageOk
      ? "Direktori upload lokal tidak dapat diakses."
      : !databaseOk
      ? "Perbarui DATABASE_URL di .env dengan password database Supabase yang benar, lalu restart dev server."
      : urlMismatch
        ? "Remove NEXTAUTH_URL from Vercel env vars (trustHost handles preview URLs), then redeploy."
        : null,
  });
}
