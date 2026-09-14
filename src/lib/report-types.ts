import { Role } from "@prisma/client";

export type ReportTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source: string;
  priority: string;
  createdAt: string;
  assignedAt: string;
  completedAt: string | null;
  deadline: string | null;
  reviewedAt: string | null;
  score: number | null;
  address: string | null;
  notes: string | null;
  feedback: string | null;
  photoUrls: string[];
  assigneeId: string | null;
  assigneeName: string;
  createdByName: string;
  jumlahIntervensi: number | null;
  satuan: string | null;
};

export const UNASSIGNED_PEGAWAI_ID = "__unassigned__";

export type ReportSummary = {
  posted: number;
  completed: number;
  averageScore: number;
  onTimePercent: number;
};

export const emptySummary = (): ReportSummary => ({
  posted: 0,
  completed: 0,
  averageScore: 0,
  onTimePercent: 0,
});

export type LaporanBy = "tugas" | "pegawai";
export type LaporanView = "harian" | "bulanan";
export type KinerjaView = "pantau" | LaporanView;

export type ReportPegawai = {
  id: string;
  name: string;
  jabatanLabel: string | null;
  unitName: string | null;
  golonganNama: string | null;
};

export type PegawaiReportRow = ReportPegawai & {
  tasks: ReportTask[];
  summary: ReportSummary;
};

export type DayRecap = {
  date: string;
  posted: number;
  completed: number;
};

export type DailyReportData = {
  date: string;
  tasks: ReportTask[];
  summary: ReportSummary;
  unitName: string;
  instansiName: string;
  pimpinanName: string;
  agencyName: string;
};

export type MonthlyCalendarData = {
  month: number;
  year: number;
  days: DayRecap[];
  summary: ReportSummary;
  tasks: ReportTask[];
  unitName: string;
  instansiName: string;
  pimpinanName: string;
  agencyName: string;
};

export type ReportScope = {
  role: Role;
  userId: string;
  unitId: string | null;
  assigneeId?: string;
  isLeader?: boolean;
  visibleUnitIds?: string[];
};
