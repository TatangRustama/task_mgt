import { NextResponse } from "next/server";
import {
  DEFAULT_KEPATUHAN_TEMPLATE,
  getStoredKepatuhanTemplate,
  saveKepatuhanTemplate,
} from "@/lib/kepatuhan-template";
import { hasSuperAdminAccess } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    template: getStoredKepatuhanTemplate(),
    defaultTemplate: DEFAULT_KEPATUHAN_TEMPLATE,
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperAdminAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { template?: unknown };
  const raw = typeof body.template === "string" ? body.template : "";
  const saved = saveKepatuhanTemplate(raw);
  return NextResponse.json({ template: saved });
}
