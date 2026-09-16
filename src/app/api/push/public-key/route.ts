import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/web-push";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = getVapidPublicKey();
  if (!key) return NextResponse.json({ key: null, enabled: false });
  return NextResponse.json({ key, enabled: true });
}
