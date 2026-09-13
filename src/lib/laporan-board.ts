import { Prisma } from "@prisma/client";
import { jabatanLabel } from "@/lib/org";
import {
  laporanUnitLine,
  type LaporanBoard,
  type LaporanPerson,
  type LaporanSummary,
  type LaporanTone,
  type LaporanUnit,
} from "@/lib/laporan-board-types";
import { MONITOR_OVERLOAD_MIN, MONITOR_REVIEW_SLA_HOURS } from "@/lib/monitor-types";
import { prisma } from "@/lib/prisma";
import { mapTask } from "@/lib/reports";
import type { DayRecap, LaporanView, ReportTask } from "@/lib/report-types";
import { formatISODate, parseISODate } from "@/lib/utils";

type ScopedTask = ReportTask & { unitId: string };

const taskUiInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

const taskPrintInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true, photoUrls: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function hoursBetween(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function inRange(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false;
  const value = new Date(iso);
  return value >= start && value < end;
}

function assessedAt(task: Pick<ReportTask, "reviewedAt" | "completedAt">) {
  return task.reviewedAt || task.completedAt;
}

function descendantSet(rootId: string, units: Array<{ id: string; parentId: string | null }>) {
  const children = new Map<string, string[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    const list = children.get(unit.parentId);
    if (list) list.push(unit.id);
    else children.set(unit.parentId, [unit.id]);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const child of children.get(current) ?? []) {
      if (ids.has(child)) continue;
      ids.add(child);
      stack.push(child);
    }
  }
  return ids;
}

function buildTrail(
  focusId: string,
  rootId: string | null,
  units: Array<{ id: string; parentId: string | null; name: string }>,
) {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const trail: Array<{ id: string; name: string }> = [];
  let current = byId.get(focusId) ?? null;
  while (current) {
    trail.unshift({ id: current.id, name: current.name });
    if (current.id === rootId) break;
    current = current.parentId ? (byId.get(current.parentId) ?? null) : null;
  }
  return trail;
}

function scoreStats(tasks: ReportTask[]) {
  const scored = tasks.filter((task) => task.score != null);
  const averageScore = scored.length
    ? Math.round((scored.reduce((sum, task) => sum + (task.score || 0), 0) / scored.length) * 10) / 10
    : 0;
  return {
    averageScore,
    stars1: scored.filter((task) => task.score === 1).length,
    stars2: scored.filter((task) => task.score === 2).length,
    stars3: scored.filter((task) => task.score === 3).length,
  };
}

function onTimePercent(tasks: ReportTask[]) {
  if (!tasks.length) return 0;
  const onTime = tasks.filter((task) => {
    if (!task.deadline) return true;
    if (!task.completedAt) return false;
    return new Date(task.completedAt) <= new Date(task.deadline);
  });
  return Math.round((onTime.length / tasks.length) * 100);
}

function personTone(input: {
  completed: number;
  rejected: number;
  stars1: number;
  averageScore: number;
  onTimePercent: number;
  includeIdle: boolean;
}): LaporanTone {
  if (input.completed === 0 && input.rejected === 0) return input.includeIdle ? "idle" : "good";
  if (input.rejected > 0 || input.stars1 > 0 || (input.completed > 0 && input.onTimePercent < 70)) {
    return "alert";
  }
  if ((input.averageScore > 0 && input.averageScore < 2) || (input.completed > 0 && input.onTimePercent < 80)) {
    return "watch";
  }
  return "good";
}

function personInsight(
  person: Pick<
    LaporanPerson,
    "completed" | "rejected" | "waiting" | "averageScore" | "onTimePercent" | "stars1"
  >,
  view: LaporanView,
) {
  if (person.completed === 0 && person.rejected === 0 && person.waiting === 0) {
    return view === "harian" ? "Tidak ada kerja dinilai hari ini" : "Tidak ada kerja dinilai bulan ini";
  }
  return [
    person.completed ? `${person.completed} disetujui` : null,
    person.rejected ? `${person.rejected} ditolak` : null,
    person.waiting ? `${person.waiting} menunggu` : null,
    person.averageScore ? `nilai ${person.averageScore}/3` : null,
    person.completed ? `${person.onTimePercent}% tepat waktu` : null,
    person.stars1 ? `${person.stars1} di bawah ekspektasi` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function unitTone(unit: Omit<LaporanUnit, "tone" | "insight">): LaporanTone {
  if (unit.rejected > 0 || (unit.completed > 0 && unit.onTimePercent < 70)) return "alert";
  if (unit.reviewQueue > 0 || (unit.reviewSlaHours != null && unit.reviewSlaHours >= MONITOR_REVIEW_SLA_HOURS)) {
    return "alert";
  }
  if (
    unit.workloadLabel === "timpang" ||
    (unit.averageScore > 0 && unit.averageScore < 2) ||
    (unit.completed > 0 && unit.onTimePercent < 80)
  ) {
    return "watch";
  }
  if (unit.completed === 0 && unit.rejected === 0 && unit.reviewQueue === 0) return "idle";
  return "good";
}

function summaryInsight(summary: LaporanSummary, view: LaporanView) {
  const parts = [
    summary.completed ? `${summary.completed} disetujui` : null,
    summary.rejected ? `${summary.rejected} ditolak` : null,
    summary.waiting ? `${summary.waiting} menunggu review` : null,
    summary.averageScore ? `nilai ${summary.averageScore}/3` : null,
    summary.completed ? `${summary.onTimePercent}% tepat waktu` : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return view === "harian" ? "Tidak ada kerja dinilai hari ini." : "Tidak ada kerja dinilai pada bulan ini.";
  }
  return parts.join(" · ");
}

function emptyDays(month: number, year: number): DayRecap[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => ({
    date: formatISODate(new Date(year, month - 1, index + 1)),
    posted: 0,
    completed: 0,
  }));
}

function periodWhere(start: Date, end: Date, view: LaporanView): Prisma.TaskWhereInput {
  const inPeriod: Prisma.TaskWhereInput[] = [
    { completedAt: { gte: start, lt: end } },
    { review: { is: { reviewedAt: { gte: start, lt: end } } } },
    { status: "ditolak", updatedAt: { gte: start, lt: end } },
  ];
  if (view === "bulanan") inPeriod.push({ status: "menunggu_approval" });
  else inPeriod.push({ status: "menunggu_approval", completedAt: { gte: start, lt: end } });
  return { OR: inPeriod };
}

function toPerson(
  base: Omit<
    LaporanPerson,
    | "completed"
    | "rejected"
    | "waiting"
    | "onTimePercent"
    | "averageScore"
    | "stars1"
    | "stars2"
    | "stars3"
    | "insight"
    | "tone"
    | "tasks"
  >,
  tasks: ReportTask[],
  start: Date,
  end: Date,
  view: LaporanView,
  includeIdle: boolean,
): LaporanPerson {
  const approved = tasks.filter((task) => task.status === "disetujui" && inRange(assessedAt(task), start, end));
  const rejected = tasks.filter(
    (task) => task.status === "ditolak" && inRange(assessedAt(task) || task.createdAt, start, end),
  );
  const waiting = tasks.filter((task) => task.status === "menunggu_approval");
  const scores = scoreStats(approved);
  const person: LaporanPerson = {
    ...base,
    completed: approved.length,
    rejected: rejected.length,
    waiting: waiting.length,
    onTimePercent: onTimePercent(approved),
    averageScore: scores.averageScore,
    stars1: scores.stars1,
    stars2: scores.stars2,
    stars3: scores.stars3,
    insight: "",
    tone: "good",
    tasks: [...approved, ...rejected, ...waiting],
  };
  person.tone = personTone({ ...person, includeIdle });
  person.insight = personInsight(person, view);
  return person;
}

function rollupPeople(people: LaporanPerson[]): LaporanSummary {
  const approved = people.reduce((sum, person) => sum + person.completed, 0);
  const scoredTotal = people.reduce((sum, person) => sum + person.stars1 + person.stars2 + person.stars3, 0);
  const scoreSum = people.reduce(
    (sum, person) => sum + person.stars1 * 1 + person.stars2 * 2 + person.stars3 * 3,
    0,
  );
  const onTimeWeighted = people.reduce((sum, person) => sum + person.onTimePercent * person.completed, 0);
  return {
    completed: approved,
    rejected: people.reduce((sum, person) => sum + person.rejected, 0),
    waiting: people.reduce((sum, person) => sum + person.waiting, 0),
    averageScore: scoredTotal ? Math.round((scoreSum / scoredTotal) * 10) / 10 : 0,
    onTimePercent: approved ? Math.round(onTimeWeighted / approved) : 0,
  };
}

function rollupFromBoard(people: LaporanPerson[], units: LaporanUnit[]): LaporanSummary {
  if (units.length === 0) return rollupPeople(people);
  const completed =
    units.reduce((sum, unit) => sum + unit.completed, 0) + people.reduce((sum, person) => sum + person.completed, 0);
  const rejected =
    units.reduce((sum, unit) => sum + unit.rejected, 0) + people.reduce((sum, person) => sum + person.rejected, 0);
  const waiting =
    units.reduce((sum, unit) => sum + unit.reviewQueue, 0) + people.reduce((sum, person) => sum + person.waiting, 0);
  const scoredUnits = units.filter((unit) => unit.averageScore > 0 && unit.completed > 0);
  const scoredPeople = people.filter((person) => person.averageScore > 0 && person.completed > 0);
  const scoreWeight =
    scoredUnits.reduce((sum, unit) => sum + unit.averageScore * unit.completed, 0) +
    scoredPeople.reduce((sum, person) => sum + person.averageScore * person.completed, 0);
  const scoreCount =
    scoredUnits.reduce((sum, unit) => sum + unit.completed, 0) +
    scoredPeople.reduce((sum, person) => sum + person.completed, 0);
  const onTimeWeight =
    units.reduce((sum, unit) => sum + unit.onTimePercent * unit.completed, 0) +
    people.reduce((sum, person) => sum + person.onTimePercent * person.completed, 0);
  return {
    completed,
    rejected,
    waiting,
    averageScore: scoreCount ? Math.round((scoreWeight / scoreCount) * 10) / 10 : 0,
    onTimePercent: completed ? Math.round(onTimeWeight / completed) : 0,
  };
}

function recapDays(tasks: ReportTask[], start: Date, end: Date, month: number, year: number) {
  const days = emptyDays(month, year);
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const task of tasks) {
    if (task.status === "disetujui" && inRange(assessedAt(task), start, end)) {
      const key = formatISODate(new Date(assessedAt(task)!));
      if (byDate.has(key)) byDate.get(key)!.completed += 1;
    }
    if (task.status === "ditolak" && inRange(assessedAt(task) || task.createdAt, start, end)) {
      const key = formatISODate(new Date(assessedAt(task) || task.createdAt));
      if (byDate.has(key)) byDate.get(key)!.posted += 1;
    }
  }
  return days;
}

export async function getLaporanBoard(options: {
  viewerId: string;
  rootUnitId: string | null;
  visibleUnitIds: string[];
  isLeader: boolean;
  directReportIds?: string[];
  focusUnitId?: string | null;
  view: LaporanView;
  date: string;
  month: number;
  year: number;
  detail?: "ui" | "print";
}): Promise<LaporanBoard | null> {
  const start =
    options.view === "harian"
      ? parseISODate(options.date)
      : new Date(options.year, options.month - 1, 1);
  const end =
    options.view === "harian"
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
      : new Date(options.year, options.month, 1);
  const asOf = formatISODate(startOfDay(new Date()));
  const includeIdle = options.view === "bulanan";
  const include = options.detail === "print" ? taskPrintInclude : taskUiInclude;

  if (!options.isLeader) {
    const me = await prisma.user.findUnique({
      where: { id: options.viewerId },
      select: {
        id: true,
        name: true,
        jabatan: true,
        unitId: true,
        unit: { select: { id: true, name: true } },
      },
    });
    if (!me) return null;

    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ assignedToId: me.id }, { createdById: me.id }] },
          periodWhere(start, end, options.view),
          { status: { not: "dibatalkan" } },
        ],
      },
      include,
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    });

    const mapped = tasks.map(mapTask);
    const person = toPerson(
      {
        id: me.id,
        name: me.name,
        jabatanLabel: me.jabatan ? jabatanLabel[me.jabatan] : null,
        unitId: me.unitId,
        unitName: me.unit?.name ?? null,
        isStaff: me.jabatan === "pelaksana" || me.jabatan == null,
        leadsUnitId: null,
      },
      mapped,
      start,
      end,
      options.view,
      includeIdle,
    );
    const summary = rollupPeople([person]);
    const days = options.view === "bulanan" ? recapDays(mapped, start, end, options.month, options.year) : [];

    return {
      view: options.view,
      asOf,
      isLeader: false,
      rootUnitId: options.rootUnitId,
      unitName: me.unit?.name ?? "Laporan",
      trail: [],
      childUnits: [],
      people: [person],
      summary,
      insight: summaryInsight(summary, options.view),
      days,
      tasks: person.tasks,
    };
  }

  if (!options.visibleUnitIds.length) return null;

  const allowed = new Set(options.visibleUnitIds);
  const directReportIds = new Set(options.directReportIds ?? []);
  const focusUnitId =
    options.focusUnitId && allowed.has(options.focusUnitId) ? options.focusUnitId : options.rootUnitId;
  const drilledIn = Boolean(focusUnitId && options.rootUnitId && focusUnitId !== options.rootUnitId);

  const units = await prisma.unit.findMany({
    where: { id: { in: options.visibleUnitIds } },
    select: {
      id: true,
      name: true,
      parentId: true,
      type: true,
      pimpinanId: true,
      pimpinan: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  const leadsByUser = new Map(
    units.filter((unit) => unit.pimpinanId).map((unit) => [unit.pimpinanId as string, unit.id]),
  );
  const scopeIds = focusUnitId
    ? [...descendantSet(focusUnitId, units)].filter((id) => allowed.has(id))
    : options.visibleUnitIds;

  const [peopleRows, taskRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: "personal", unitId: { in: scopeIds } },
      select: {
        id: true,
        name: true,
        jabatan: true,
        unitId: true,
        unit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        AND: [{ unitId: { in: scopeIds } }, periodWhere(start, end, options.view), { status: { not: "dibatalkan" } }],
      },
      include,
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const mapped: ScopedTask[] = taskRows.map((task) => ({ ...mapTask(task), unitId: task.unitId }));
  const byAssignee = new Map<string, ScopedTask[]>();
  for (const task of mapped) {
    if (!task.assigneeId) continue;
    const list = byAssignee.get(task.assigneeId) ?? [];
    list.push(task);
    byAssignee.set(task.assigneeId, list);
  }

  const allPeople: LaporanPerson[] = peopleRows
    .filter((person) => person.id !== options.viewerId)
    .map((person) =>
      toPerson(
        {
          id: person.id,
          name: person.name,
          jabatanLabel: person.jabatan ? jabatanLabel[person.jabatan] : null,
          unitId: person.unitId,
          unitName: person.unit?.name ?? null,
          isStaff: person.jabatan === "pelaksana" || person.jabatan == null,
          leadsUnitId: leadsByUser.get(person.id) ?? null,
        },
        byAssignee.get(person.id) ?? [],
        start,
        end,
        options.view,
        includeIdle,
      ),
    );

  function unitStats(unitId: string): LaporanUnit {
    const row = units.find((unit) => unit.id === unitId);
    const ids = descendantSet(unitId, units);
    const unitPeople = allPeople.filter((person) => person.unitId && ids.has(person.unitId));
    const unitTasks = mapped.filter((task) => ids.has(task.unitId) && task.assigneeId !== options.viewerId);
    const approved = unitTasks.filter((task) => task.status === "disetujui" && inRange(assessedAt(task), start, end));
    const rejected = unitTasks.filter(
      (task) => task.status === "ditolak" && inRange(assessedAt(task) || task.createdAt, start, end),
    );
    const waiting = unitTasks.filter((task) => task.status === "menunggu_approval");
    const scores = scoreStats(approved);
    const completedCounts = unitPeople.filter((person) => person.isStaff).map((person) => person.completed);
    const completedMedian = median(completedCounts);
    const overloadCut = Math.max(MONITOR_OVERLOAD_MIN, Math.ceil(completedMedian * 2) || MONITOR_OVERLOAD_MIN);
    const workloadLabel: LaporanUnit["workloadLabel"] =
      completedCounts.some((count) => count >= overloadCut) &&
      completedCounts.some((count) => count === 0) &&
      completedMedian >= 1
        ? "timpang"
        : "seimbang";

    const reviewHours: number[] = [];
    let reviewOnTime = 0;
    let closedReviews = 0;
    for (const task of unitTasks) {
      if (!task.completedAt) continue;
      const completedAt = new Date(task.completedAt);
      if (task.reviewedAt && inRange(task.reviewedAt, start, end)) {
        const hours = hoursBetween(completedAt, new Date(task.reviewedAt));
        reviewHours.push(hours);
        closedReviews += 1;
        if (hours <= MONITOR_REVIEW_SLA_HOURS) reviewOnTime += 1;
      } else if (task.status === "menunggu_approval") {
        reviewHours.push(hoursBetween(completedAt, new Date()));
      }
    }

    const stats = {
      id: unitId,
      name: row?.name ?? "-",
      type: row?.type ?? "bidang",
      parentId: row?.parentId ?? null,
      leaderId: row?.pimpinanId ?? null,
      leaderName: row?.pimpinan?.name ?? null,
      staffCount: unitPeople.length,
      completed: approved.length,
      rejected: rejected.length,
      onTimePercent: onTimePercent(approved),
      averageScore: scores.averageScore,
      reviewSlaHours: reviewHours.length ? median(reviewHours) : null,
      reviewOnTimePercent: closedReviews ? Math.round((reviewOnTime / closedReviews) * 100) : null,
      reviewQueue: waiting.length,
      workloadLabel,
    };
    const tone = unitTone(stats);
    return { ...stats, tone, insight: laporanUnitLine({ ...stats, tone }) };
  }

  const heatmapParent = focusUnitId ?? options.rootUnitId;
  const childUnits = units.filter((unit) => unit.parentId === heatmapParent).map((unit) => unitStats(unit.id));
  const childLeaderIds = new Set(childUnits.map((unit) => unit.leaderId).filter((id): id is string => Boolean(id)));

  const people = allPeople.filter((person) => {
    if (childLeaderIds.has(person.id)) return false;
    if (options.view === "harian" && person.completed === 0 && person.rejected === 0 && person.waiting === 0) {
      return false;
    }
    if (drilledIn) return person.unitId === focusUnitId || person.leadsUnitId === focusUnitId;
    if (directReportIds.size > 0) return directReportIds.has(person.id);
    return person.unitId === heatmapParent;
  });

  const rank: Record<LaporanTone, number> = { alert: 0, watch: 1, good: 2, idle: 3 };
  people.sort((a, b) => {
    if (rank[a.tone] !== rank[b.tone]) return rank[a.tone] - rank[b.tone];
    if (a.rejected !== b.rejected) return b.rejected - a.rejected;
    if (a.completed !== b.completed) return b.completed - a.completed;
    return a.name.localeCompare(b.name, "id");
  });

  const displayedSummary = rollupFromBoard(people, childUnits);
  const days = options.view === "bulanan" ? recapDays(mapped, start, end, options.month, options.year) : [];
  const rootName = units.find((unit) => unit.id === (focusUnitId ?? options.rootUnitId))?.name ?? "Unit";

  return {
    view: options.view,
    asOf,
    isLeader: true,
    rootUnitId: options.rootUnitId,
    unitName: rootName,
    trail: focusUnitId ? buildTrail(focusUnitId, options.rootUnitId, units) : [],
    childUnits,
    people,
    summary: displayedSummary,
    insight: summaryInsight(displayedSummary, options.view),
    days,
    tasks: people.flatMap((person) => person.tasks),
  };
}
