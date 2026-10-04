/** Photos sent with a completion. An empty upload keeps evidence already stored. */
export function mergedEvidencePhotoUrls(
  uploaded: readonly string[],
  existing: readonly string[] | null | undefined,
) {
  if (uploaded.length > 0) return [...uploaded];
  return existing ? [...existing] : [];
}

/** Missing or blank coordinates keep the stored pin instead of clearing it. */
export function mergedCoordinate(raw: unknown, existing: number | null | undefined): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : (existing ?? null);
  }
  if (raw == null) return existing ?? null;
  const text = String(raw).trim();
  if (!text) return existing ?? null;
  const value = Number(text);
  return Number.isFinite(value) ? value : (existing ?? null);
}
