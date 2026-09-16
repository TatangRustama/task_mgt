import type { LaporanBy, LaporanView, KinerjaView } from "@/lib/report-types";

export type ReportBasePath = "/laporan" | "/pimpinan";

export type LaporanQuery = {
  by?: LaporanBy;
  view?: LaporanView;
  date?: string;
  month?: number;
  year?: number;
  unit?: string | null;
};

export type KinerjaQuery = {
  view?: KinerjaView;
  date?: string;
  month?: number;
  year?: number;
  unit?: string | null;
  focus?: string | null;
};

export function reportHref(
  basePath: ReportBasePath,
  { view = "harian", date, month, year, unit }: Omit<LaporanQuery, "by">,
) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (date) params.set("date", date);
  if (month) params.set("month", String(month));
  if (year) params.set("year", String(year));
  if (unit) params.set("unit", unit);
  return `${basePath}?${params.toString()}`;
}

export function laporanHref(query: LaporanQuery) {
  return reportHref("/laporan", query);
}

export function parseKinerjaView(value: string | undefined): KinerjaView {
  if (value === "individu" || value === "harian" || value === "bulanan") return "individu";
  return "unit";
}

export function kinerjaHref({
  view = "unit",
  date,
  month,
  year,
  unit,
  focus,
}: KinerjaQuery) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (date) params.set("date", date);
  if (month) params.set("month", String(month));
  if (year) params.set("year", String(year));
  if (view === "unit") {
    if (unit) params.set("unit", unit);
    if (focus && focus !== "all") params.set("focus", focus);
  }
  return `/pimpinan?${params.toString()}`;
}
