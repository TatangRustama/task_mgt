import { NextResponse } from "next/server";
import { downgradeTaskStage } from "@/lib/task-monitor";
import { ADMIN_SCOPE_MISSING, getAdminScope, taskRecordInScope } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const taskScopeSelect = {
  unitId: true,
  assignedTo: { select: { unitId: true, pegawai: { select: { unitId: true, unorId: true } } } },
} as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  if (!scope.unrestricted && scope.unitIds.length === 0) {
    return NextResponse.json({ error: ADMIN_SCOPE_MISSING }, { status: 403 });
  }
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, select: taskScopeSelect });
  if (!task || !taskRecordInScope(scope, task)) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }
  const result = await downgradeTaskStage(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json({ status: result.status });
}
