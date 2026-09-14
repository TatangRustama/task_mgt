import type { UnitType } from "@prisma/client";
import type { DayRecap, LaporanView, ReportTask } from "@/lib/report-types";

export type LaporanTone = "good" | "watch" | "alert" | "idle";

export type LaporanPerson = {
  id: string;
  name: string;
  jabatanLabel: string | null;
  unitId: string | null;
  unitName: string | null;
  isStaff: boolean;
  leadsUnitId: string | null;
  golonganNama: string | null;
  completed: number;
  rejected: number;
  waiting: number;
  onTimePercent: number;
  averageScore: number;
  stars1: number;
  stars2: number;
  stars3: number;
  insight: string;
  tone: LaporanTone;
  tasks: ReportTask[];
};

export type LaporanUnit = {
  id: string;
  name: string;
  type: UnitType;
  parentId: string | null;
  leaderId: string | null;
  leaderName: string | null;
  staffCount: number;
  completed: number;
  rejected: number;
  onTimePercent: number;
  averageScore: number;
  reviewSlaHours: number | null;
  reviewOnTimePercent: number | null;
  reviewQueue: number;
  workloadLabel: "timpang" | "seimbang";
  insight: string;
  tone: LaporanTone;
};

export type LaporanSummary = {
  completed: number;
  rejected: number;
  waiting: number;
  averageScore: number;
  onTimePercent: number;
};

export type LaporanBoard = {
  view: LaporanView;
  asOf: string;
  isLeader: boolean;
  rootUnitId: string | null;
  unitName: string;
  trail: Array<{ id: string; name: string }>;
  childUnits: LaporanUnit[];
  people: LaporanPerson[];
  summary: LaporanSummary;
  insight: string;
  days: DayRecap[];
  tasks: ReportTask[];
};

export function laporanPersonLabel(person: Pick<LaporanPerson, "tone" | "completed">) {
  if (person.tone === "alert") return "Perlu perhatian";
  if (person.tone === "idle") return "Tidak aktif";
  if (person.tone === "watch") return "Waspada";
  return person.completed > 0 ? "Lancar" : "Lancar";
}

export function laporanUnitLine(
  unit: Pick<
    LaporanUnit,
    | "completed"
    | "rejected"
    | "averageScore"
    | "onTimePercent"
    | "reviewSlaHours"
    | "reviewQueue"
    | "workloadLabel"
    | "tone"
  >,
) {
  const parts = [
    unit.completed ? `${unit.completed} selesai` : null,
    unit.averageScore ? `nilai ${unit.averageScore}/3` : null,
    unit.completed ? `${unit.onTimePercent}% tepat waktu` : null,
    unit.reviewSlaHours != null ? `review ${Math.round(unit.reviewSlaHours)} jam` : null,
    unit.reviewQueue ? `${unit.reviewQueue} menunggu` : null,
    unit.rejected ? `${unit.rejected} ditolak` : null,
    unit.workloadLabel === "timpang" ? "beban timpang" : null,
  ].filter(Boolean);
  if (parts.length === 0) return unit.tone === "good" ? "Unit lancar" : "Tidak ada kerja dinilai";
  return parts.join(" · ");
}
