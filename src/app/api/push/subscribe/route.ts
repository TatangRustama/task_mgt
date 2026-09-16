import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canUseEmployeeApp } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { getVapidPublicKey } from "@/lib/web-push";

function keysFromBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const endpoint = "endpoint" in body ? String(body.endpoint || "").trim() : "";
  const keys = "keys" in body && body.keys && typeof body.keys === "object" ? body.keys : null;
  const p256dh = keys && "p256dh" in keys ? String(keys.p256dh || "").trim() : "";
  const auth = keys && "auth" in keys ? String(keys.auth || "").trim() : "";
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canUseEmployeeApp(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getVapidPublicKey()) {
    return NextResponse.json({ error: "Push belum dikonfigurasi" }, { status: 503 });
  }

  const parsed = keysFromBody(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "Subscription tidak valid" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.endpoint },
    create: { userId: user.id, ...parsed },
    update: { userId: user.id, p256dh: parsed.p256dh, auth: parsed.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = keysFromBody(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "Subscription tidak valid" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id, endpoint: parsed.endpoint },
  });
  return NextResponse.json({ ok: true });
}
