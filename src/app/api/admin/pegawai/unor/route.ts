import { NextResponse } from "next/server";
import { listUnorChildren, listUnorRootsForPerangkatDaerah } from "@/lib/admin-pegawai";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  await requireUser(["super_admin"]);
  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId")?.trim() || "";
  const perangkatDaerahId = url.searchParams.get("perangkatDaerahId")?.trim() || "";

  if (parentId) {
    const items = await listUnorChildren(parentId);
    return NextResponse.json({ items });
  }
  if (perangkatDaerahId) {
    const items = await listUnorRootsForPerangkatDaerah(perangkatDaerahId);
    return NextResponse.json({ items });
  }
  return NextResponse.json({ items: [] });
}
