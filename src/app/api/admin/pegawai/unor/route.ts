import { NextResponse } from "next/server";
import { listUnorChildren, listUnorRootsForPerangkatDaerah, listVisibleUnorRoots } from "@/lib/admin-pegawai";
import { getAdminScope, perangkatDaerahIdsForScope, unitIdInScope } from "@/lib/admin-scope";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId")?.trim() || "";
  const perangkatDaerahId = url.searchParams.get("perangkatDaerahId")?.trim() || "";
  const keep = <T extends { id: string }>(items: T[]) =>
    scope.unrestricted ? items : items.filter((item) => unitIdInScope(scope, item.id));

  if (parentId) {
    if (!unitIdInScope(scope, parentId)) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: keep(await listUnorChildren(parentId)) });
  }
  if (perangkatDaerahId) {
    const allowed = await perangkatDaerahIdsForScope(scope);
    if (allowed && !allowed.has(perangkatDaerahId)) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: keep(await listUnorRootsForPerangkatDaerah(perangkatDaerahId)) });
  }
  return NextResponse.json({ items: await listVisibleUnorRoots(scope) });
}
