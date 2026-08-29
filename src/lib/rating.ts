export const STAR_MAX = 3;

export const starLabels = [
  "Dibawah Ekspektasi",
  "Sesuai Ekspektasi",
  "Diatas Ekspektasi",
] as const;

export function isStarValue(value: number): value is 1 | 2 | 3 {
  return Number.isInteger(value) && value >= 1 && value <= STAR_MAX;
}

/** Map stored stars or legacy 1-100 review scores to 1-3. */
export function normalizeStars(score: number | null | undefined): number | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 1 && score <= STAR_MAX) return score;
  if (score <= 33) return 1;
  if (score <= 66) return 2;
  return 3;
}

export function starLabel(stars: number | null | undefined) {
  if (!isStarValue(stars ?? 0)) return null;
  return starLabels[(stars as 1 | 2 | 3) - 1];
}

export function formatStars(stars: number | null | undefined) {
  const value = normalizeStars(stars);
  return value == null ? null : `${value}/${STAR_MAX}`;
}
