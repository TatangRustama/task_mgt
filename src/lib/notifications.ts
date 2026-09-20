import { Role } from "@prisma/client";
import { kinerjaHref } from "@/lib/laporan-url";
import { MONITOR_IDLE_DAYS, MONITOR_REVIEW_SLA_HOURS } from "@/lib/monitor-types";
import { getDbOrgUser, getDirectReportIds, getNewTasksFromAtasan, isUnitLeader, type OrgUser } from "@/lib/org";
import type { NoticeSection, UserNotifications } from "@/lib/notification-types";
import { prisma } from "@/lib/prisma";
import { addDays, formatISODate } from "@/lib/utils";
import { isAppAdmin, isSuperAdmin } from "@/lib/roles";

function sectionTotal(sections: NoticeSection[]) {
  return sections.reduce((sum, section) => sum + section.count, 0);
}

async function getPendingApprovalSection(reportIds: string[] | null): Promise<NoticeSection> {
  const empty: NoticeSection = {
    id: "pending-approval",
    title: "Menunggu persetujuan",
    count: 0,
    href: "/pimpinan/persetujuan",
    items: [],
  };

  const where =
    reportIds === null
      ? { status: "menunggu_approval" as const }
      : reportIds.length > 0
        ? { status: "menunggu_approval" as const, assignedToId: { in: reportIds } }
        : null;

  if (!where) return empty;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { completedAt: "desc" },
    take: 7,
    select: {
      id: true,
      title: true,
      completedAt: true,
      assignedTo: { select: { name: true } },
    },
  });

  const extra = tasks.length > 6;
  const items = extra ? tasks.slice(0, 6) : tasks;
  const count = extra
    ? await prisma.task.count({ where })
    : tasks.length;

  return {
    ...empty,
    count,
    items: items.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: task.assignedTo?.name || "Pegawai",
      href: `/tugas/${task.id}`,
      at: (task.completedAt ?? new Date()).toISOString(),
    })),
  };
}

async function getPerhatianSection(user: OrgUser): Promise<NoticeSection> {
  const now = new Date();
  const href = kinerjaHref({
    view: "unit",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    date: formatISODate(now),
  });
  const empty: NoticeSection = {
    id: "perhatian",
    title: "Pegawai perlu perhatian",
    count: 0,
    href,
    items: [],
  };

  if (!user.unitId) return empty;
  const reportIds = await getDirectReportIds(user);
  if (reportIds.length === 0) return empty;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const idleCutoff = addDays(todayStart, -MONITOR_IDLE_DAYS);
  const slaCutoff = new Date(now.getTime() - MONITOR_REVIEW_SLA_HOURS * 3_600_000);
  const openStatuses = ["tersedia", "dikerjakan", "ditolak", "menunggu_approval"] as const;

  const [people, openTasks, lastCompleted] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { assignedToId: { in: reportIds }, status: { in: [...openStatuses] } },
      select: { assignedToId: true, status: true, deadline: true, completedAt: true },
    }),
    prisma.task.groupBy({
      by: ["assignedToId"],
      where: {
        assignedToId: { in: reportIds },
        completedAt: { not: null },
        status: { not: "dibatalkan" },
      },
      _max: { completedAt: true },
    }),
  ]);

  const lastByPerson = new Map(
    lastCompleted
      .filter((row) => row.assignedToId)
      .map((row) => [row.assignedToId as string, row._max.completedAt]),
  );
  const tasksByPerson = new Map<string, typeof openTasks>();
  for (const task of openTasks) {
    if (!task.assignedToId) continue;
    const list = tasksByPerson.get(task.assignedToId) ?? [];
    list.push(task);
    tasksByPerson.set(task.assignedToId, list);
  }

  const items = people.flatMap((person) => {
    const tasks = tasksByPerson.get(person.id) ?? [];
    const overdue = tasks.filter(
      (task) =>
        task.deadline &&
        task.deadline < todayStart &&
        (task.status === "tersedia" || task.status === "dikerjakan" || task.status === "ditolak"),
    ).length;
    const rejected = tasks.filter((task) => task.status === "ditolak").length;
    const review = tasks.filter(
      (task) => task.status === "menunggu_approval" && task.completedAt && task.completedAt < slaCutoff,
    ).length;
    const lastAt = lastByPerson.get(person.id) ?? null;
    const hasLive = tasks.some((task) => task.status === "dikerjakan" || task.status === "menunggu_approval");
    const idle = !hasLive && rejected === 0 && (lastAt == null || lastAt < idleCutoff);
    if (!overdue && !rejected && !review && !idle) return [];
    return [
      {
        id: person.id,
        title: person.name,
        subtitle: overdue
          ? `${overdue} terlambat`
          : rejected
            ? `${rejected} ditolak`
            : idle
              ? "Idle"
              : `${review} menunggu review`,
        href,
        at: now.toISOString(),
      },
    ];
  });

  return {
    ...empty,
    title: "Perlu perhatian",
    count: items.length,
    items: items.slice(0, 6),
  };
}

async function getRejectedSection(userId: string): Promise<NoticeSection> {
  const where = { assignedToId: userId, status: "ditolak" as const };
  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 7,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      review: { select: { feedback: true } },
    },
  });
  const extra = tasks.length > 6;
  const items = extra ? tasks.slice(0, 6) : tasks;
  const count = extra ? await prisma.task.count({ where }) : tasks.length;

  return {
    id: "rejected",
    title: "Perlu revisi",
    count,
    href: "/board",
    items: items.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: task.review?.feedback ? `Revisi: ${task.review.feedback}` : "Tugas ditolak pimpinan",
      href: `/tugas/${task.id}`,
      at: task.updatedAt.toISOString(),
    })),
  };
}

function mapAtasanSection(
  count: number,
  items: Array<{ id: string; title: string; createdAt: string; createdByName: string }>,
): NoticeSection {
  return {
    id: "atasan",
    title: "Tugas dari atasan",
    count,
    href: "/board",
    items: items.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: `Dari ${task.createdByName}`,
      href: `/tugas/${task.id}`,
      at: task.createdAt,
    })),
  };
}

export async function getUserNotifications(userId: string, role: Role): Promise<UserNotifications> {
  if (isSuperAdmin(role) || isAppAdmin(role)) {
    return { count: 0, sections: [] };
  }
  const orgUser = await getDbOrgUser(userId);
  const isLeader = orgUser ? isUnitLeader(orgUser) : false;

  if (isLeader && orgUser) {
    const reportIds = await getDirectReportIds(orgUser);
    const [pending, perhatian] = await Promise.all([
      getPendingApprovalSection(reportIds),
      getPerhatianSection(orgUser),
    ]);
    const sections = [pending, perhatian];
    return { count: sectionTotal(sections), sections };
  }

  const [atasan, rejected] = await Promise.all([
    getNewTasksFromAtasan(userId),
    getRejectedSection(userId),
  ]);

  const sections: NoticeSection[] = [];
  if (atasan.count > 0) sections.push(mapAtasanSection(atasan.count, atasan.items));
  if (rejected.count > 0) sections.push(rejected);

  return {
    count: sectionTotal(sections),
    sections,
  };
}
