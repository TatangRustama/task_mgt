import { Role } from "@prisma/client";
import { kinerjaHref } from "@/lib/laporan-url";
import { getMonitorBoard } from "@/lib/monitor";
import { personMatchesFocus, unitMatchesFocus } from "@/lib/monitor-types";
import { getDbOrgUser, getDescendantUnitIds, getDirectReportIds, getNewTasksFromAtasan, isUnitLeader, type OrgUser } from "@/lib/org";
import type { NoticeSection, UserNotifications } from "@/lib/notification-types";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils";
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

  const [visibleUnitIds, directReportIds] = await Promise.all([
    getDescendantUnitIds(user.unitId),
    getDirectReportIds(user),
  ]);
  const board = await getMonitorBoard({
    viewerId: user.id,
    rootUnitId: user.unitId,
    visibleUnitIds,
    directReportIds,
  });
  if (!board) return empty;

  const perhatianPeople = board.people.filter((person) => personMatchesFocus(person, "all"));
  const perhatianUnits = board.childUnits.filter((unit) => unitMatchesFocus(unit, "all"));
  const items = [
    ...perhatianUnits.map((unit) => ({
      id: `unit-${unit.id}`,
      title: unit.leaderName || unit.name,
      subtitle: unit.insight,
      href: kinerjaHref({
        view: "unit",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        date: formatISODate(now),
        unit: unit.id,
      }),
      at: now.toISOString(),
    })),
    ...perhatianPeople.map((person) => ({
      id: person.id,
      title: person.name,
      subtitle: person.kinds.includes("overdue")
        ? `${person.overdueCount} terlambat`
        : person.kinds.includes("rejected")
          ? `${person.rejectedCount} ditolak`
          : person.isIdle
            ? "Idle"
            : person.kinds.includes("review")
              ? `${person.reviewStaleCount} menunggu review`
              : person.unitName || "Perlu perhatian",
      href,
      at: now.toISOString(),
    })),
  ];

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
