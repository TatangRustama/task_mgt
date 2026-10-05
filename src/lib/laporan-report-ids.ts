export function isDrilledInReportUnit(
  unit: string | undefined,
  rootUnitId: string | null,
  visibleUnitIds: readonly string[],
) {
  return Boolean(unit && rootUnitId && unit !== rootUnitId && visibleUnitIds.includes(unit));
}

/** Task ids stored on the one monthly validation record. A unit drill-down must not replace that record with a subset. */
export function monthlyValidationTaskIds(options: {
  drilledIn: boolean;
  focusedTaskIds: readonly string[];
  rootTaskIds: readonly string[];
  ownTaskIds: readonly string[];
  includeOwn: boolean;
}) {
  const source = options.drilledIn ? options.rootTaskIds : options.focusedTaskIds;
  const own = options.includeOwn ? options.ownTaskIds : [];
  return [...new Set([...own, ...source])];
}
