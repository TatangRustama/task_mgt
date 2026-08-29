import { NextResponse } from "next/server";

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

  const supabaseUrl = Boolean(process.env.SUPABASE_URL);
  const supabaseServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    ok: authSecret && databaseUrl && supabaseUrl && supabaseServiceKey && !urlMismatch,
    env: {
      AUTH_SECRET: authSecret,
      DATABASE_URL: databaseUrl,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
      NEXTAUTH_URL: nextAuthUrl,
      AUTH_URL: process.env.AUTH_URL ?? null,
      VERCEL_URL: vercelUrl,
    },
    urlMismatch,
    hint: urlMismatch
      ? "Remove NEXTAUTH_URL from Vercel env vars (trustHost handles preview URLs), then redeploy."
      : null,
  });
}
