import { NextResponse } from "next/server";
import { authenticateCredentials, LoginError } from "@/lib/auth-login";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || body.email || "").trim();
  const password = String(body.password || "");

  try {
    await authenticateCredentials(username, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LoginError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, code: "database", error: "Layanan sementara tidak tersedia. Coba lagi beberapa saat." },
      { status: 503 },
    );
  }
}
