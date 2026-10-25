export const KAPASITAS_COOKIE = "kinerja-kapasitas";

export type LeadershipScope = {
  id: string;
  kind: "definitif" | "plt" | "plh";
  unitId: string;
  unitName: string;
  unitType: "kantor" | "bidang" | "sub_bidang";
  label: string;
};

/** Active hat when the user holds more than one. Otherwise null so callers keep the unfiltered view. */
export function resolveLeadershipScope(
  scopes: LeadershipScope[],
  requestedId: string | null | undefined,
): LeadershipScope | null {
  if (scopes.length < 2) return null;
  return scopes.find((scope) => scope.id === requestedId) ?? scopes[0] ?? null;
}

/**
 * Plt/Plh is a leadership seat. The home post is one only when this person
 * already leads that unit. Holding an acting seat elsewhere does not promote it.
 */
export function activeScopeGrantsLeadership(scope: LeadershipScope, definitiveLeader: boolean) {
  if (scope.kind !== "definitif") return true;
  return definitiveLeader;
}

export function assignmentRulesForScope(scope: LeadershipScope, definitiveLeader: boolean) {
  if (!activeScopeGrantsLeadership(scope, definitiveLeader)) {
    return {
      canUsePool: false,
      mustAssignNamed: false,
      poolUnit: null as { id: string; name: string } | null,
    };
  }
  const poolUnit =
    scope.unitType === "sub_bidang" ? { id: scope.unitId, name: scope.unitName } : null;
  return {
    canUsePool: poolUnit !== null,
    mustAssignNamed: scope.unitType === "kantor" || scope.unitType === "bidang",
    poolUnit,
  };
}
