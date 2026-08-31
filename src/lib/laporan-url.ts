import type { LaporanBy, LaporanView } from "@/lib/report-types";

export type ReportBasePath = "/laporan" | "/pimpinan";

export type LaporanQuery = {
  by?: LaporanBy;
  view?: LaporanView;
  date?: string;
  month?: number;
  year?: number;
};

export function reportHref(
  basePath: ReportBasePath,
  { view = "harian", date, month, year }: Omit<LaporanQuery, "by">,
) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (date) params.set("date", date);
  if (month) params.set("month", String(month));
  if (year) params.set("year", String(year));
  return `${basePath}?${params.toString()}`;
}

export function laporanHref(query: LaporanQuery) {
  return reportHref("/laporan", query);
}

export function kinerjaHref(query: Omit<LaporanQuery, "by">) {
  return reportHref("/pimpinan", query);
}
