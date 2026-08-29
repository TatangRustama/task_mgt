export type ReportTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source: string;
  priority: string;
  createdAt: string;
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
};

export const UNASSIGNED_PEGAWAI_ID = "__unassigned__";

export type ReportSummary = {
  posted: number;
  completed: number;
  averageScore: number;
  onTimePercent: number;
};

export type LaporanBy = "tugas" | "pegawai";
export type LaporanView = "harian" | "bulanan";

export type ReportPegawai = {
  id: string;
  name: string;
  jabatanLabel: string | null;
  unitName: string | null;
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
  role: "admin" | "pimpinan" | "pegawai";
  userId: string;
  unitId: string | null;
  assigneeId?: string;
};
