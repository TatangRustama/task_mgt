import type { UnitType } from "@prisma/client";
import type { ReportTask } from "@/lib/report-types";

export const MONITOR_IDLE_DAYS = 3;
export const MONITOR_REVIEW_SLA_HOURS = 24;
export const MONITOR_RATING_WINDOW_DAYS = 14;
export const MONITOR_OVERLOAD_MIN = 4;

export const MONITOR_FOCUSES = [
  "all",
  "overdue",
  "idle",
  "review",
  "rejected",
  "low_score",
  "overload",
  "pool",
] as const;

export type MonitorFocus = (typeof MONITOR_FOCUSES)[number];

export type MonitorExceptionKind =
  | "overdue"
  | "idle"
  | "review"
  | "rejected"
  | "low_score"
  | "overload"
  | "underload"
  | "pool";

export type MonitorTask = ReportTask & {
  unitId: string;
  kinds: MonitorExceptionKind[];
};

export type MonitorPerson = {
  id: string;
  name: string;
  jabatanLabel: string | null;
  unitId: string | null;
  unitName: string | null;
  isStaff: boolean;
  leadsUnitId: string | null;
  canReview: boolean;
  openCount: number;
  overdueCount: number;
  rejectedCount: number;
  reviewStaleCount: number;
  lowScoreCount: number;
  lastCompletedAt: string | null;
  idleDays: number | null;
  isIdle: boolean;
  isOverloaded: boolean;
  isUnderloaded: boolean;
  kinds: MonitorExceptionKind[];
  openTasks: MonitorTask[];
  exceptionTasks: MonitorTask[];
};

export type MonitorUnitHeat = {
  id: string;
  name: string;
  type: UnitType;
  parentId: string | null;
  leaderId: string | null;
  leaderName: string | null;
  staffCount: number;
  overdue: number;
  idle: number;
  reviewStale: number;
  rejected: number;
  openCount: number;
  onTimePercent: number;
  averageScore: number;
  completedInWindow: number;
  reviewSlaHours: number | null;
  reviewQueue: number;
  workloadLabel: "timpang" | "seimbang";
  insight: string;
  tone: "good" | "watch" | "alert";
};

export type MonitorSummary = {
  overdue: number;
  idle: number;
  reviewStale: number;
  rejected: number;
  lowScore: number;
  overload: number;
  pool: number;
};

export type MonitorBoard = {
  asOf: string;
  rootUnitId: string | null;
  unitName: string;
  trail: Array<{ id: string; name: string }>;
  childUnits: MonitorUnitHeat[];
  people: MonitorPerson[];
  poolTasks: MonitorTask[];
  summary: MonitorSummary;
  insight: string;
};

export const MONITOR_FOCUS_LABEL: Record<MonitorFocus, string> = {
  all: "Semua",
  overdue: "Terlambat",
  idle: "Idle",
  review: "Review",
  rejected: "Ditolak",
  low_score: "Nilai rendah",
  overload: "Beban",
  pool: "Kolam",
};

export const MONITOR_UNIT_TYPE_LABEL: Record<UnitType, string> = {
  kantor: "Kantor",
  bidang: "Bidang",
  sub_bidang: "Sub Bidang",
};

export function parseMonitorFocus(value: string | undefined): MonitorFocus {
  return MONITOR_FOCUSES.includes(value as MonitorFocus) ? (value as MonitorFocus) : "all";
}

export function monitorHref(query: {
  date: string;
  month: number;
  year: number;
  unit?: string | null;
  focus?: MonitorFocus;
}) {
  const params = new URLSearchParams();
  params.set("view", "pantau");
  params.set("date", query.date);
  params.set("month", String(query.month));
  params.set("year", String(query.year));
  if (query.unit) params.set("unit", query.unit);
  if (query.focus && query.focus !== "all") params.set("focus", query.focus);
  return `/pimpinan?${params.toString()}`;
}

export function personMatchesFocus(person: MonitorPerson, focus: MonitorFocus) {
  if (focus === "all") return person.kinds.some((kind) => kind !== "underload");
  if (focus === "overdue") return person.overdueCount > 0;
  if (focus === "idle") return person.isIdle;
  if (focus === "review") return person.reviewStaleCount > 0;
  if (focus === "rejected") return person.rejectedCount > 0;
  if (focus === "low_score") return person.lowScoreCount > 0;
  if (focus === "overload") return person.isOverloaded || person.isUnderloaded;
  return false;
}

export function unitMatchesFocus(unit: MonitorUnitHeat, focus: MonitorFocus) {
  if (focus === "all") return unit.tone !== "good" || unit.reviewQueue > 0 || unit.workloadLabel === "timpang";
  if (focus === "overdue") return unit.overdue > 0;
  if (focus === "idle") return unit.idle > 0;
  if (focus === "review") return unit.reviewQueue > 0 || (unit.reviewSlaHours != null && unit.reviewSlaHours >= 24);
  if (focus === "rejected") return unit.rejected > 0;
  if (focus === "overload") return unit.workloadLabel === "timpang";
  return false;
}

export function unitLeadershipLine(
  unit: Pick<
    MonitorUnitHeat,
    "reviewSlaHours" | "reviewQueue" | "workloadLabel" | "overdue" | "idle" | "rejected" | "tone"
  >,
) {
  const parts = [
    unit.overdue ? `${unit.overdue} terlambat` : null,
    unit.idle ? `${unit.idle} idle` : null,
    unit.reviewSlaHours != null ? `review ${Math.round(unit.reviewSlaHours)} jam` : null,
    unit.reviewQueue ? `${unit.reviewQueue} menunggu` : null,
    unit.rejected ? `${unit.rejected} ditolak` : null,
    unit.workloadLabel === "timpang" ? "beban timpang" : null,
  ].filter(Boolean);
  if (parts.length === 0) return unit.tone === "good" ? "Unit lancar" : "Tidak ada isu terbuka";
  return parts.join(" · ");
}

export function tasksForFocus(person: MonitorPerson, focus: MonitorFocus) {
  if (focus === "idle" || focus === "overload") return person.openTasks;
  if (focus === "all") return person.exceptionTasks;
  return person.exceptionTasks.filter((task) => task.kinds.includes(focus));
}
