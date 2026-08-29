import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET),
    env: {
      AUTH_SECRET: Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
      AUTH_URL: process.env.AUTH_URL ?? null,
      VERCEL_URL: process.env.VERCEL_URL ?? null,
    },
  });
}
