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
  let databaseErrorDetails: any = null;
  let pgOk = false;
  let pgError: string | null = null;

  const rawUrl = process.env.DATABASE_URL || "";
  const sanitizedUrl = rawUrl.replace(/:([^:@]+)@/, ":***@");

  if (databaseUrl) {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: rawUrl,
        ssl: rawUrl.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      });
      await pool.query("SELECT 1");
      await pool.end();
      pgOk = true;
    } catch (e: any) {
      pgError = e?.message || String(e);
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "tanggalKinerja" TEXT;
        CREATE INDEX IF NOT EXISTS "Task_unitId_tanggalKinerja_idx" ON "Task"("unitId", "tanggalKinerja");
        UPDATE "Task"
        SET "tanggalKinerja" = TO_CHAR("completedAt" AT TIME ZONE 'Asia/Jayapura', 'YYYY-MM-DD')
        WHERE "completedAt" IS NOT NULL AND "tanggalKinerja" IS NULL;

        ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "nama_jabatan" TEXT;
        ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "namaJabatan" TEXT;
        ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "scopeKind" TEXT DEFAULT 'definitif';
        ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "penugasanSementaraId" TEXT;
        ALTER TABLE "MonthlyTaskReport" ADD COLUMN IF NOT EXISTS "scopeKind" TEXT NOT NULL DEFAULT 'definitif';
        ALTER TABLE "MonthlyTaskReport" ADD COLUMN IF NOT EXISTS "penugasanSementaraId" TEXT;
        ALTER TABLE "MonthlyTaskReport" ADD COLUMN IF NOT EXISTS "unitId" TEXT;
        ALTER TABLE "DailyTaskReport" ADD COLUMN IF NOT EXISTS "scopeKind" TEXT NOT NULL DEFAULT 'definitif';
        ALTER TABLE "DailyTaskReport" ADD COLUMN IF NOT EXISTS "penugasanSementaraId" TEXT;
        ALTER TABLE "DailyTaskReport" ADD COLUMN IF NOT EXISTS "unitId" TEXT;

        UPDATE "Unit"
        SET 
          "nama_jabatan" = CASE
            WHEN UPPER("name") LIKE 'INSPEKTORAT%' THEN 'INSPEKTUR' || SUBSTRING("name" FROM 12)
            WHEN UPPER("name") LIKE 'SEKRETARIAT%' THEN 'SEKRETARIS' || SUBSTRING("name" FROM 12)
            WHEN UPPER("name") LIKE 'KEPALA %' OR UPPER("name") LIKE 'SEKRETARIS%' OR UPPER("name") LIKE 'INSPEKTUR%' OR UPPER("name") LIKE 'DIREKTUR%' OR UPPER("name") LIKE 'GUBERNUR%' OR UPPER("name") LIKE 'STAF AHLI%' OR UPPER("name") LIKE 'ASISTEN%' THEN "name"
            ELSE 'KEPALA ' || "name"
          END,
          "namaJabatan" = CASE
            WHEN UPPER("name") LIKE 'INSPEKTORAT%' THEN 'INSPEKTUR' || SUBSTRING("name" FROM 12)
            WHEN UPPER("name") LIKE 'SEKRETARIAT%' THEN 'SEKRETARIS' || SUBSTRING("name" FROM 12)
            WHEN UPPER("name") LIKE 'KEPALA %' OR UPPER("name") LIKE 'SEKRETARIS%' OR UPPER("name") LIKE 'INSPEKTUR%' OR UPPER("name") LIKE 'DIREKTUR%' OR UPPER("name") LIKE 'GUBERNUR%' OR UPPER("name") LIKE 'STAF AHLI%' OR UPPER("name") LIKE 'ASISTEN%' THEN "name"
            ELSE 'KEPALA ' || "name"
          END
        WHERE "nama_jabatan" IS NULL OR TRIM("nama_jabatan") = '';
      `);
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch (error: any) {
      databaseError = error instanceof Error ? error.message : "Database connection failed";
      databaseErrorDetails = {
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause,
        code: error?.code,
      };
    }
  }

  return NextResponse.json({
    ok: authSecret && databaseUrl && databaseOk && storageOk && !urlMismatch,
    env: {
      AUTH_SECRET: authSecret,
      DATABASE_URL: databaseUrl,
      DATABASE_OK: databaseOk,
      DATABASE_TARGET: sanitizedUrl,
      PG_OK: pgOk,
      PG_ERROR: pgError,
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
    databaseErrorDetails,
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
