export const LED_SCOPE_OVERVIEW = "__led_scope__";

export type UnitNode = {
  id: string;
  parentId: string | null;
};

export function descendantIds(rootId: string, units: UnitNode[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    const list = children.get(unit.parentId);
    if (list) list.push(unit.id);
    else children.set(unit.parentId, [unit.id]);
  }

  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const child of children.get(current) ?? []) {
      if (ids.has(child)) continue;
      ids.add(child);
      stack.push(child);
    }
  }
  return ids;
}

export function visibleForestRoots<T extends UnitNode>(units: T[]): T[] {
  const visible = new Set(units.map((unit) => unit.id));
  return units.filter((unit) => !unit.parentId || !visible.has(unit.parentId));
}

// Home unitId is the pegawai's permanent seat. A Plt/Plh often leads a different
// tree, or only a slice of the tree in visibleUnitIds. Returning null means the
// visible units are more than one tree and the board should show each root.
export function resolveLedRootUnitId(rootUnitId: string | null, units: UnitNode[]): string | null {
  if (units.length === 0) return rootUnitId;
  if (rootUnitId && units.some((unit) => unit.id === rootUnitId)) {
    const covered = descendantIds(rootUnitId, units);
    if (units.every((unit) => covered.has(unit.id))) return rootUnitId;
  }
  const roots = visibleForestRoots(units);
  if (roots.length === 1) return roots[0]!.id;
  return null;
}

export function resolveBoardFocus(
  rootUnitId: string | null,
  requestedFocusId: string | null | undefined,
  units: UnitNode[],
) {
  if (units.length === 0) {
    return {
      ledRootId: rootUnitId,
      focusUnitId: rootUnitId,
      boardRootId: rootUnitId,
      drilledIn: false,
    };
  }

  const allowed = new Set(units.map((unit) => unit.id));
  const ledRootId = resolveLedRootUnitId(rootUnitId, units);
  const requested = requestedFocusId && allowed.has(requestedFocusId) ? requestedFocusId : null;
  const focusUnitId = requested ?? ledRootId;
  const forestRoots = visibleForestRoots(units);
  const focusTreeRoot = focusUnitId
    ? (forestRoots.find((root) => descendantIds(root.id, units).has(focusUnitId))?.id ?? null)
    : null;
  const boardRootId = ledRootId ?? focusTreeRoot;
  const drilledIn = Boolean(focusUnitId && boardRootId && focusUnitId !== boardRootId);

  return { ledRootId, focusUnitId, boardRootId, drilledIn };
}

export function ledScopeIds(focusUnitId: string | null, units: UnitNode[], visibleUnitIds: string[]) {
  if (!focusUnitId) return visibleUnitIds;
  const allowed = new Set(visibleUnitIds);
  return [...descendantIds(focusUnitId, units)].filter((id) => allowed.has(id));
}

export function leaderBoardTrail(
  focusUnitId: string | null,
  ledRootId: string | null,
  chain: Array<{ id: string; name: string }>,
) {
  if (!focusUnitId) return [];
  if (ledRootId == null) {
    return [{ id: LED_SCOPE_OVERVIEW, name: "Unit yang dipimpin" }, ...chain];
  }
  return chain;
}
