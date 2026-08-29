import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type UnitRecord = {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  eselonId: string | null;
  statusUnor: string | null;
  perangkatDaerahId: string | null;
  perangkatDaerahNama: string | null;
  parent: { id: string; name: string } | null;
};

function collectDescendants(startId: string, childrenByParent: Map<string, string[]>) {
  const ids = new Set<string>([startId]);
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!ids.has(childId)) {
        ids.add(childId);
        stack.push(childId);
      }
    }
  }
  return ids;
}

function fold(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function textMatches(haystack: string, needle: string) {
  const foldedHay = fold(haystack);
  const foldedNeedle = fold(needle);
  if (!foldedNeedle) return false;
  if (foldedHay.includes(foldedNeedle)) return true;
  const tokens = foldedNeedle.split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => foldedHay.includes(token));
}

function matchingSubtree(units: UnitRecord[], query: string) {
  const childrenByParent = new Map<string, string[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    const siblings = childrenByParent.get(unit.parentId) ?? [];
    siblings.push(unit.id);
    childrenByParent.set(unit.parentId, siblings);
  }

  const include = new Set<string>();
  for (const unit of units) {
    const pdMatch = textMatches(unit.perangkatDaerahNama || "", query);
    const nameMatch = textMatches(unit.name, query);
    const parentMatch = textMatches(unit.parent?.name || "", query);
    if (!pdMatch && !nameMatch && !parentMatch) continue;

    if (pdMatch) {
      include.add(unit.id);
      continue;
    }

    for (const id of collectDescendants(unit.id, childrenByParent)) {
      include.add(id);
    }
  }

  return units.filter((unit) => include.has(unit.id));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json([]);
  }

  const units = await prisma.unit.findMany({
    where: { externalId: { not: null } },
    select: {
      id: true,
      name: true,
      parentId: true,
      type: true,
      eselonId: true,
      statusUnor: true,
      perangkatDaerahId: true,
      perangkatDaerahNama: true,
      parent: { select: { id: true, name: true } },
    },
    orderBy: [{ perangkatDaerahNama: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(matchingSubtree(units, q));
}
