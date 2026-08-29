import type { LaporanBy, LaporanView } from "@/lib/report-types";

export type LaporanQuery = {
  by?: LaporanBy;
  view?: LaporanView;
  date?: string;
  month?: number;
  year?: number;
};

export function laporanHref({
  by = "tugas",
  view = "harian",
  date,
  month,
  year,
}: LaporanQuery) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (by === "pegawai") params.set("by", "pegawai");
  if (date) params.set("date", date);
  if (month) params.set("month", String(month));
  if (year) params.set("year", String(year));
  return `/laporan?${params.toString()}`;
}
