export const DASHBOARD_STATUSES = [
  "disetujui",
  "menunggu_approval",
  "dikerjakan",
  "tersedia",
  "ditolak",
  "dibatalkan",
] as const;

export type DashboardStatus = (typeof DASHBOARD_STATUSES)[number];

export type DashboardMonthPoint = {
  label: string;
  total: number;
  counts: Record<DashboardStatus, number>;
};

export type TaskConditionTrend = {
  months: DashboardMonthPoint[];
  totals: Record<DashboardStatus, number>;
  total: number;
};

export type DashboardMonthChoice = {
  value: string;
  label: string;
};

export type DashboardMonthSelection = {
  year: number;
  month: number;
};

export type PerangkatDaerahRecapRow = {
  id: string;
  name: string;
  total: number;
  listed: boolean;
  counts: Record<DashboardStatus, number>;
};

export type PerangkatDaerahPegawaiRow = {
  id: string;
  name: string;
  listed: boolean;
  pegawai: number;
  melapor: number;
};
