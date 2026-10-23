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
