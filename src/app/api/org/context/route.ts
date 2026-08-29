import { NextResponse } from "next/server";
import {
  canDelegate,
  canUsePoolAssignment,
  getAtasan,
  getDbOrgUser,
  getDirectReports,
  jabatanLabel,
  mustAssignNamed,
  unitTypeLabel,
} from "@/lib/org";
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

  const [subordinates, atasan] = await Promise.all([
    canDelegate(user) ? getDirectReports(user) : Promise.resolve([]),
    getAtasan(user),
  ]);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    jabatan: user.jabatan,
    jabatanLabel: user.jabatan ? jabatanLabel[user.jabatan] : "Admin",
    unit: user.unit
      ? {
          id: user.unit.id,
          name: user.unit.name,
          type: user.unit.type,
          typeLabel: unitTypeLabel[user.unit.type],
        }
      : null,
    canDelegate: canDelegate(user),
    canUsePool: canUsePoolAssignment(user),
    mustAssignNamed: mustAssignNamed(user),
    atasan: atasan
      ? {
          ...atasan,
          jabatanLabel: atasan.jabatan ? jabatanLabel[atasan.jabatan] : "-",
        }
      : null,
    subordinates: subordinates.map((person) => ({
      ...person,
      jabatanLabel: person.jabatan ? jabatanLabel[person.jabatan] : "-",
    })),
  });
}
