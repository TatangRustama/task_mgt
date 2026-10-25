import { NextResponse } from "next/server";
import {
  canDelegate,
  assignmentRules,
  displayJabatan,
  getActiveLeadershipScope,
  getAtasan,
  getDbOrgUser,
  getDirectReports,
  jabatanLabel,
  unitTypeLabel,
} from "@/lib/org";
import { penugasanLabel } from "@/lib/penugasan";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getDbOrgUser(sessionUser.id);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeScope = await getActiveLeadershipScope(user);
  const rules = assignmentRules(user, activeScope);
  const [subordinates, atasan] = await Promise.all([
    canDelegate(user, activeScope) ? getDirectReports(user, activeScope?.unitId) : Promise.resolve([]),
    getAtasan(user),
  ]);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    jabatan: user.jabatan,
    jabatanLabel:
      user.role === "personal"
        ? displayJabatan(user.pegawai, user.jabatan)
        : user.jabatan
          ? jabatanLabel[user.jabatan]
          : "Admin",
    unit: user.unit
      ? {
          id: user.unit.id,
          name: user.unit.name,
          type: user.unit.type,
          typeLabel: unitTypeLabel[user.unit.type],
        }
      : null,
    canDelegate: canDelegate(user, activeScope),
    canUsePool: rules.canUsePool,
    mustAssignNamed: rules.mustAssignNamed,
    poolUnitName: rules.poolUnit?.name ?? null,
    activeScope: activeScope ? { id: activeScope.id, label: activeScope.label } : null,
    penugasan: (user.penugasanSementara ?? []).map((item) => ({
      jenis: item.jenis,
      label: penugasanLabel(item.jenis, item.unit.name),
    })),
    atasan,
    subordinates,
  });
}
