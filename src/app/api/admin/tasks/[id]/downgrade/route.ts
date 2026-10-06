import { NextResponse } from "next/server";
import { downgradeTaskStage } from "@/lib/task-monitor";
import { requireUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser(["super_admin"]);
  const { id } = await params;
  const result = await downgradeTaskStage(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json({ status: result.status });
}
