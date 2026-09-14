import { displayJabatan } from "@/lib/jabatan-display";
import {
  MONITOR_IDLE_DAYS,
  MONITOR_OVERLOAD_MIN,
  MONITOR_RATING_WINDOW_DAYS,
  MONITOR_REVIEW_SLA_HOURS,
  unitLeadershipLine,
  type MonitorBoard,
  type MonitorExceptionKind,
  type MonitorPerson,
  type MonitorSummary,
  type MonitorTask,
  type MonitorUnitHeat,
} from "@/lib/monitor-types";
import { compareByPangkatDesc } from "@/lib/golongan";
import { prisma } from "@/lib/prisma";
import { mapTask } from "@/lib/reports";
import type { ReportTask } from "@/lib/report-types";
import { addDays, formatISODate, isCompletedOnTime } from "@/lib/utils";

export {
  MONITOR_FOCUS_LABEL,
  MONITOR_FOCUSES,
  MONITOR_IDLE_DAYS,
  MONITOR_OVERLOAD_MIN,
  MONITOR_RATING_WINDOW_DAYS,
  MONITOR_REVIEW_SLA_HOURS,
  MONITOR_UNIT_TYPE_LABEL,
  monitorHref,
  parseMonitorFocus,
  personMatchesFocus,
  tasksForFocus,
  unitLeadershipLine,
  unitMatchesFocus,
} from "@/lib/monitor-types";
export type {
  MonitorBoard,
  MonitorExceptionKind,
  MonitorFocus,
  MonitorPerson,
  MonitorSummary,
  MonitorTask,
  MonitorUnitHeat,
} from "@/lib/monitor-types";

const OPEN_STATUSES = ["tersedia", "dikerjakan", "ditolak", "menunggu_approval"] as const;
const OVERDUE_STATUSES = new Set(["tersedia", "dikerjakan", "ditolak"]);

type TaskRow = Parameters<typeof mapTask>[0] & { unitId: string };

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function uniqueKinds(kinds: MonitorExceptionKind[]) {
  return [...new Set(kinds)];
}

function classifyTask(
  task: ReportTask,
  startOfToday: Date,
  slaCutoff: Date,
  ratingCutoff: Date,
): MonitorExceptionKind[] {
  const kinds: MonitorExceptionKind[] = [];
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;

  if (OVERDUE_STATUSES.has(task.status) && deadline && deadline < startOfToday) {
    kinds.push("overdue");
  }
  if (task.status === "ditolak") kinds.push("rejected");
  if (task.status === "menunggu_approval" && completedAt && completedAt < slaCutoff) {
    kinds.push("review");
  }
  if (
    task.score === 1 &&
    completedAt &&
    completedAt >= ratingCutoff &&
    (task.status === "disetujui" || task.status === "menunggu_approval")
  ) {
    kinds.push("low_score");
  }
  if (task.status === "tersedia" && !task.assigneeId) kinds.push("pool");
  return kinds;
}

function hoursBetween(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

function heatTone(unit: Omit<MonitorUnitHeat, "tone" | "insight">): MonitorUnitHeat["tone"] {
  if (unit.overdue + unit.idle + unit.reviewStale + unit.rejected > 0) return "alert";
  if (unit.reviewQueue > 0 || (unit.reviewSlaHours != null && unit.reviewSlaHours >= MONITOR_REVIEW_SLA_HOURS)) {
    return "alert";
  }
  if (unit.workloadLabel === "timpang") return "watch";
  if (unit.completedInWindow > 0 && (unit.onTimePercent < 80 || (unit.averageScore > 0 && unit.averageScore < 2))) {
    return "watch";
  }
  return "good";
}

function insightText(summary: MonitorSummary) {
  const parts = [
    summary.overdue ? `${summary.overdue} terlambat` : null,
    summary.idle ? `${summary.idle} idle` : null,
    summary.reviewStale ? `${summary.reviewStale} review >${MONITOR_REVIEW_SLA_HOURS} jam` : null,
    summary.rejected ? `${summary.rejected} ditolak` : null,
    summary.lowScore ? `${summary.lowScore} nilai rendah` : null,
    summary.overload ? `${summary.overload} beban tinggi` : null,
    summary.pool ? `${summary.pool} kolam belum diambil` : null,
  ].filter(Boolean);
  if (parts.length === 0) return "Tidak ada isu terbuka. Unit berjalan lancar.";
  return `Perlu tindakan: ${parts.join(" · ")}.`;
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

export async function getMonitorBoard(options: {
  viewerId: string;
  rootUnitId: string | null;
  visibleUnitIds: string[];
  focusUnitId?: string | null;
  directReportIds?: string[];
}): Promise<MonitorBoard | null> {
  if (!options.visibleUnitIds.length) return null;

  const allowed = new Set(options.visibleUnitIds);
  const directReportIds = new Set(options.directReportIds ?? []);
  const focusUnitId =
    options.focusUnitId && allowed.has(options.focusUnitId) ? options.focusUnitId : options.rootUnitId;
  const drilledIn = Boolean(focusUnitId && options.rootUnitId && focusUnitId !== options.rootUnitId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const asOf = formatISODate(now);
  const idleCutoff = addDays(todayStart, -MONITOR_IDLE_DAYS);
  const slaCutoff = new Date(now.getTime() - MONITOR_REVIEW_SLA_HOURS * 60 * 60 * 1000);
  const ratingCutoff = addDays(todayStart, -MONITOR_RATING_WINDOW_DAYS);

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

  const [peopleRows, tasks, lastCompleted] = await Promise.all([
    prisma.user.findMany({
      where: { role: "personal", unitId: { in: scopeIds } },
      select: {
        id: true,
        name: true,
        jabatan: true,
        unitId: true,
        unit: { select: { name: true } },
        pegawai: { select: { golonganNama: true, jabatanNama: true, jenis: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        unitId: { in: scopeIds },
        status: { not: "dibatalkan" },
        OR: [{ status: { in: [...OPEN_STATUSES] } }, { completedAt: { gte: ratingCutoff } }],
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        evidence: { select: { address: true, notes: true, photoUrls: true } },
        review: { select: { score: true, reviewedAt: true, feedback: true } },
        rating: { select: { stars: true } },
      },
      orderBy: [{ deadline: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.task.groupBy({
      by: ["assignedToId"],
      where: {
        assignedToId: { not: null },
        unitId: { in: scopeIds },
        completedAt: { not: null },
        status: { not: "dibatalkan" },
      },
      _max: { completedAt: true },
    }),
  ]);

  const lastCompletedAt = new Map(
    lastCompleted
      .filter((row) => row.assignedToId)
      .map((row) => [row.assignedToId as string, row._max.completedAt]),
  );

  const monitorTasks: MonitorTask[] = (tasks as TaskRow[]).map((task) => {
    const mapped = mapTask(task);
    return {
      ...mapped,
      unitId: task.unitId,
      kinds: classifyTask(mapped, todayStart, slaCutoff, ratingCutoff),
    };
  });

  const poolTasks = monitorTasks.filter((task) => task.kinds.includes("pool"));
  const staffRows = peopleRows.filter((person) => person.id !== options.viewerId);
  const openByPerson = new Map<string, MonitorTask[]>();
  const exceptionByPerson = new Map<string, MonitorTask[]>();

  for (const task of monitorTasks) {
    if (!task.assigneeId) continue;
    if (OPEN_STATUSES.includes(task.status as (typeof OPEN_STATUSES)[number])) {
      const list = openByPerson.get(task.assigneeId) ?? [];
      list.push(task);
      openByPerson.set(task.assigneeId, list);
    }
    if (task.kinds.some((kind) => kind !== "pool")) {
      const list = exceptionByPerson.get(task.assigneeId) ?? [];
      list.push(task);
      exceptionByPerson.set(task.assigneeId, list);
    }
  }

  const openCounts = staffRows.map((person) => (openByPerson.get(person.id) ?? []).length);
  const openMedian = median(openCounts);
  const overloadThreshold = Math.max(MONITOR_OVERLOAD_MIN, Math.ceil(openMedian * 2));

  const allPeople: MonitorPerson[] = staffRows.map((person) => {
    const isStaff = person.jabatan === "pelaksana" || person.jabatan == null;
    const openTasks = openByPerson.get(person.id) ?? [];
    const exceptionTasks = exceptionByPerson.get(person.id) ?? [];
    const lastAt = lastCompletedAt.get(person.id) ?? null;
    const lastCompletedIso = lastAt?.toISOString() ?? null;
    const idleDays = lastAt ? Math.max(0, Math.floor((todayStart.getTime() - startOfDay(lastAt).getTime()) / 86400000)) : null;
    const hasLiveWork = openTasks.some((task) => task.status === "dikerjakan" || task.status === "menunggu_approval");
    const isIdle =
      isStaff &&
      !hasLiveWork &&
      openTasks.every((task) => task.status !== "ditolak") &&
      (lastAt == null || lastAt < idleCutoff);
    const isOverloaded = isStaff && openTasks.length >= overloadThreshold && openTasks.length >= MONITOR_OVERLOAD_MIN;
    const isUnderloaded = isStaff && openTasks.length === 0 && openMedian >= 2;
    const kinds: MonitorExceptionKind[] = [];
    if (isIdle) kinds.push("idle");
    if (isOverloaded) kinds.push("overload");
    if (isUnderloaded) kinds.push("underload");
    for (const task of exceptionTasks) kinds.push(...task.kinds.filter((kind) => kind !== "pool"));

    return {
      id: person.id,
      name: person.name,
      jabatanLabel: displayJabatan(person.pegawai, person.jabatan),
      unitId: person.unitId,
      unitName: person.unit?.name ?? null,
      isStaff,
      leadsUnitId: leadsByUser.get(person.id) ?? null,
      canReview: directReportIds.size === 0 || directReportIds.has(person.id),
      golonganNama: person.pegawai?.golonganNama ?? null,
      openCount: openTasks.length,
      overdueCount: exceptionTasks.filter((task) => task.kinds.includes("overdue")).length,
      rejectedCount: exceptionTasks.filter((task) => task.kinds.includes("rejected")).length,
      reviewStaleCount: exceptionTasks.filter((task) => task.kinds.includes("review")).length,
      lowScoreCount: exceptionTasks.filter((task) => task.kinds.includes("low_score")).length,
      lastCompletedAt: lastCompletedIso,
      idleDays: isIdle ? (idleDays ?? MONITOR_IDLE_DAYS) : idleDays,
      isIdle,
      isOverloaded,
      isUnderloaded,
      kinds: uniqueKinds(kinds),
      openTasks,
      exceptionTasks,
    };
  });

  allPeople.sort(compareByPangkatDesc);

  function unitStats(unitId: string): MonitorUnitHeat {
    const row = units.find((unit) => unit.id === unitId);
    const ids = descendantSet(unitId, units);
    const unitPeople = allPeople.filter((person) => person.unitId && ids.has(person.unitId));
    const unitTasks = monitorTasks.filter(
      (task) => ids.has(task.unitId) && task.assigneeId !== options.viewerId,
    );
    const windowCompleted = unitTasks.filter((task) => {
      if (!task.completedAt) return false;
      return new Date(task.completedAt) >= ratingCutoff;
    });
    const onTime = windowCompleted.filter((task) => isCompletedOnTime(task.completedAt, task.deadline));
    const scored = windowCompleted.filter((task) => task.score != null);
    const reviewHours: number[] = [];
    for (const task of unitTasks) {
      if (!task.completedAt) continue;
      const completedAt = new Date(task.completedAt);
      if (task.reviewedAt) reviewHours.push(hoursBetween(completedAt, new Date(task.reviewedAt)));
      else if (task.status === "menunggu_approval") reviewHours.push(hoursBetween(completedAt, now));
    }
    const reviewQueue = unitTasks.filter((task) => task.status === "menunggu_approval").length;
    const reviewSlaHours = reviewHours.length ? median(reviewHours) : null;
    const staffMedian = median(unitPeople.filter((person) => person.isStaff).map((person) => person.openCount));
    const workloadLabel: MonitorUnitHeat["workloadLabel"] =
      unitPeople.some((person) => person.isOverloaded) || (unitPeople.some((person) => person.isUnderloaded) && staffMedian >= 2)
        ? "timpang"
        : "seimbang";
    const stats = {
      id: unitId,
      name: row?.name ?? "-",
      type: row?.type ?? "bidang",
      parentId: row?.parentId ?? null,
      leaderId: row?.pimpinanId ?? null,
      leaderName: row?.pimpinan?.name ?? null,
      staffCount: unitPeople.length,
      overdue: unitTasks.filter((task) => task.kinds.includes("overdue")).length,
      idle: unitPeople.filter((person) => person.isIdle).length,
      reviewStale: unitTasks.filter((task) => task.kinds.includes("review")).length,
      rejected: unitTasks.filter((task) => task.kinds.includes("rejected")).length,
      openCount: unitTasks.filter((task) => OPEN_STATUSES.includes(task.status as (typeof OPEN_STATUSES)[number])).length,
      onTimePercent: windowCompleted.length ? Math.round((onTime.length / windowCompleted.length) * 100) : 0,
      averageScore: scored.length
        ? Math.round((scored.reduce((sum, task) => sum + (task.score || 0), 0) / scored.length) * 10) / 10
        : 0,
      completedInWindow: windowCompleted.length,
      reviewSlaHours,
      reviewQueue,
      workloadLabel,
    };
    const tone = heatTone(stats);
    return { ...stats, tone, insight: unitLeadershipLine({ ...stats, tone }) };
  }

  const heatmapParent = focusUnitId ?? options.rootUnitId;
  const childUnits = units.filter((unit) => unit.parentId === heatmapParent).map((unit) => unitStats(unit.id));
  const childLeaderIds = new Set(childUnits.map((unit) => unit.leaderId).filter((id): id is string => Boolean(id)));

  const people = allPeople.filter((person) => {
    if (childLeaderIds.has(person.id)) return false;
    if (drilledIn) return person.unitId === focusUnitId || person.leadsUnitId === focusUnitId;
    if (directReportIds.size > 0) return directReportIds.has(person.id);
    return person.unitId === heatmapParent;
  });

  const summary: MonitorSummary = {
    overdue:
      allPeople.reduce((sum, person) => sum + person.overdueCount, 0) +
      poolTasks.filter((task) => task.kinds.includes("overdue")).length,
    idle: allPeople.filter((person) => person.isIdle).length,
    reviewStale: allPeople.reduce((sum, person) => sum + person.reviewStaleCount, 0),
    rejected: allPeople.reduce((sum, person) => sum + person.rejectedCount, 0),
    lowScore: allPeople.reduce((sum, person) => sum + person.lowScoreCount, 0),
    overload: allPeople.filter((person) => person.isOverloaded).length,
    pool: poolTasks.length,
  };

  const rootName =
    units.find((unit) => unit.id === (focusUnitId ?? options.rootUnitId))?.name ?? "Unit";

  return {
    asOf,
    rootUnitId: options.rootUnitId,
    unitName: rootName,
    trail: focusUnitId ? buildTrail(focusUnitId, options.rootUnitId, units) : [],
    childUnits,
    people,
    poolTasks,
    summary,
    insight: insightText(summary),
  };
}
