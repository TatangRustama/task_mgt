import { UNASSIGNED_PEGAWAI_ID, type DayRecap, type PegawaiReportRow } from "@/lib/report-types";
import { formatISODate } from "@/lib/utils";

export type KinerjaLevel = "perlu_perhatian" | "lancar" | "tidak_aktif";

export type KinerjaEval = {
  level: KinerjaLevel;
  label: string;
  insight: string;
  completed: number;
  inProgress: number;
  overdue: number;
  waiting: number;
  rejected: number;
  total: number;
  completionRate: number;
};

export type EvaluatedPegawai = {
  person: PegawaiReportRow;
  eval: KinerjaEval;
};

const DONE_STATUSES = new Set(["menunggu_approval", "disetujui"]);

function isDone(status: string, completedAt: string | null) {
  return Boolean(completedAt) || DONE_STATUSES.has(status);
}

function isTaskOverdue(deadline: string | null, completed: boolean, asOfDate: string) {
  if (!deadline || completed) return false;
  return formatISODate(new Date(deadline)) < asOfDate;
}

export function evaluateKinerjaHarian(row: PegawaiReportRow, asOfDate: string): KinerjaEval {
  return evaluateKinerja(row, asOfDate, "harian");
}

export function evaluateKinerja(
  row: PegawaiReportRow,
  asOfDate: string,
  period: "harian" | "bulanan" = "harian",
): KinerjaEval {
  const tasks = row.tasks;
  const total = tasks.length;
  let completed = 0;
  let inProgress = 0;
  let overdue = 0;
  let waiting = 0;
  let rejected = 0;

  for (const task of tasks) {
    const done = isDone(task.status, task.completedAt);
    if (isTaskOverdue(task.deadline, done, asOfDate)) overdue += 1;
    if (task.status === "menunggu_approval") waiting += 1;
    if (task.status === "ditolak") rejected += 1;
    if (done) completed += 1;
    else inProgress += 1;
  }

  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const score = row.summary.averageScore;

  if (row.id === UNASSIGNED_PEGAWAI_ID) {
    return {
      level: "perlu_perhatian",
      label: "Kolam",
      insight: `${total} tugas belum diambil`,
      completed,
      inProgress,
      overdue,
      waiting,
      rejected,
      total,
      completionRate,
    };
  }

  if (total === 0) {
    return {
      level: "tidak_aktif",
      label: "Tidak aktif",
      insight: period === "harian" ? "Tidak ada tugas hari ini" : "Tidak ada tugas bulan ini",
      completed,
      inProgress,
      overdue,
      waiting,
      rejected,
      total,
      completionRate,
    };
  }

  if (overdue > 0 || rejected > 0 || (period === "bulanan" && score > 0 && score < 2)) {
    const parts = [
      overdue ? `${overdue} terlambat` : null,
      rejected ? `${rejected} ditolak` : null,
      period === "bulanan" && score > 0 && score < 2 ? `nilai ${score}/3` : null,
      completed ? `${completed} selesai` : null,
    ].filter(Boolean);
    return {
      level: "perlu_perhatian",
      label: "Perlu perhatian",
      insight: parts.join(" · "),
      completed,
      inProgress,
      overdue,
      waiting,
      rejected,
      total,
      completionRate,
    };
  }

  const parts = [
    completed ? `${completed} selesai` : null,
    inProgress ? `${inProgress} dikerjakan` : null,
    waiting ? `${waiting} review` : null,
    score ? `nilai ${score}/3` : null,
  ].filter(Boolean);

  return {
    level: "lancar",
    label: completed === total ? "Selesai" : "Berjalan",
    insight: parts.join(" · ") || `${total} tugas`,
    completed,
    inProgress,
    overdue,
    waiting,
    rejected,
    total,
    completionRate,
  };
}

function sortPerhatian(a: EvaluatedPegawai, b: EvaluatedPegawai) {
  if (a.eval.overdue !== b.eval.overdue) return b.eval.overdue - a.eval.overdue;
  if (a.eval.rejected !== b.eval.rejected) return b.eval.rejected - a.eval.rejected;
  return a.eval.completionRate - b.eval.completionRate;
}

function sortLancar(a: EvaluatedPegawai, b: EvaluatedPegawai) {
  if (a.eval.completionRate !== b.eval.completionRate) {
    return b.eval.completionRate - a.eval.completionRate;
  }
  return (b.person.summary.averageScore || 0) - (a.person.summary.averageScore || 0);
}

export function groupKinerjaHarian(people: PegawaiReportRow[], asOfDate: string) {
  return groupKinerja(people, asOfDate, "harian");
}

export function groupKinerja(
  people: PegawaiReportRow[],
  asOfDate: string,
  period: "harian" | "bulanan" = "harian",
) {
  const pool = people.find((person) => person.id === UNASSIGNED_PEGAWAI_ID) ?? null;
  const staff = people.filter((person) => person.id !== UNASSIGNED_PEGAWAI_ID);
  const evaluated = staff.map((person) => ({
    person,
    eval: evaluateKinerja(person, asOfDate, period),
  }));

  return {
    pool,
    poolEval: pool ? evaluateKinerja(pool, asOfDate, period) : null,
    perhatian: evaluated.filter((item) => item.eval.level === "perlu_perhatian").sort(sortPerhatian),
    lancar: evaluated.filter((item) => item.eval.level === "lancar").sort(sortLancar),
    idle: evaluated.filter((item) => item.eval.level === "tidak_aktif"),
  };
}

export function monthAsOfDate(month: number, year: number) {
  const today = new Date();
  if (today.getFullYear() === year && today.getMonth() + 1 === month) {
    return formatISODate(today);
  }
  return formatISODate(new Date(year, month, 0));
}

export function recapDaysForTasks(
  tasks: { createdAt: string; completedAt: string | null }[],
  month: number,
  year: number,
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const recap = new Map(
    Array.from({ length: daysInMonth }, (_, index) => {
      const date = formatISODate(new Date(year, month - 1, index + 1));
      return [date, { date, posted: 0, completed: 0 }] as [string, DayRecap];
    }),
  );

  for (const task of tasks) {
    const postedKey = formatISODate(new Date(task.createdAt));
    if (recap.has(postedKey)) recap.get(postedKey)!.posted += 1;
    if (task.completedAt) {
      const completedKey = formatISODate(new Date(task.completedAt));
      if (recap.has(completedKey)) recap.get(completedKey)!.completed += 1;
    }
  }

  return [...recap.values()];
}
