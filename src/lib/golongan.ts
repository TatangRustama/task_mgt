const pangkatByGolongan: Record<string, string> = {
  "I/a": "Juru Muda",
  "I/b": "Juru Muda Tingkat I",
  "I/c": "Juru",
  "I/d": "Juru Tingkat I",
  "II/a": "Pengatur Muda",
  "II/b": "Pengatur Muda Tingkat I",
  "II/c": "Pengatur",
  "II/d": "Pengatur Tingkat I",
  "III/a": "Penata Muda",
  "III/b": "Penata Muda Tingkat I",
  "III/c": "Penata",
  "III/d": "Penata Tingkat I",
  "IV/a": "Pembina",
  "IV/b": "Pembina Tingkat I",
  "IV/c": "Pembina Utama Muda",
  "IV/d": "Pembina Utama Madya",
  "IV/e": "Pembina Utama",
};

export function formatGolonganPangkat(golonganNama: string | null | undefined) {
  const golongan = (golonganNama || "").trim();
  if (!golongan) return "-";
  if (golongan.includes("(")) return golongan;
  const pangkat = pangkatByGolongan[golongan.replace(/\s+/g, "")];
  if (!pangkat) return golongan;
  return `${pangkat} (${golongan})`;
}

const GOLONGAN_ORDER = [
  "IV/e",
  "IV/d",
  "IV/c",
  "IV/b",
  "IV/a",
  "III/d",
  "III/c",
  "III/b",
  "III/a",
  "II/d",
  "II/c",
  "II/b",
  "II/a",
  "I/d",
  "I/c",
  "I/b",
  "I/a",
] as const;

export function golonganSortKey(golonganNama: string | null | undefined) {
  const text = (golonganNama || "").replace(/\s+/g, "");
  const index = GOLONGAN_ORDER.findIndex((code) => text.includes(code));
  return index === -1 ? GOLONGAN_ORDER.length : index;
}

export function compareByPangkatDesc(
  a: { name: string; golonganNama?: string | null },
  b: { name: string; golonganNama?: string | null },
) {
  const rank = golonganSortKey(a.golonganNama) - golonganSortKey(b.golonganNama);
  if (rank !== 0) return rank;
  return a.name.localeCompare(b.name, "id");
}

export function sortByPangkatDesc<T extends { name: string; golonganNama?: string | null }>(items: T[]) {
  return [...items].sort(compareByPangkatDesc);
}

export function pageIdsByPangkatDesc(
  rows: Array<{ id: string; name: string; golonganNama?: string | null }>,
  page: number,
  pageSize: number,
) {
  const start = Math.max(0, (page - 1) * pageSize);
  return sortByPangkatDesc(rows)
    .slice(start, start + pageSize)
    .map((row) => row.id);
}

export function orderByIds<T extends { id: string }>(rows: T[], ids: string[]) {
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
