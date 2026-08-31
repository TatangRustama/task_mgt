import { Role } from "@prisma/client";
import { groupKinerja, monthAsOfDate } from "@/lib/kinerja";
import { kinerjaHref } from "@/lib/laporan-url";
import { getDbOrgUser, getDirectReportIds, getNewTasksFromAtasan, type OrgUser } from "@/lib/org";
import type { NoticeSection, UserNotifications } from "@/lib/notification-types";
import { getMonthlyCalendar, getPegawaiBreakdown } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils";

function sectionTotal(sections: NoticeSection[]) {
  return sections.reduce((sum, section) => sum + section.count, 0);
}

async function getPendingApprovalSection(user: OrgUser, role: Role): Promise<NoticeSection> {
  const reportIds = role === "admin" ? null : await getDirectReportIds(user);
  const where =
    role === "admin"
      ? { status: "menunggu_approval" as const }
      : reportIds && reportIds.length > 0
        ? { status: "menunggu_approval" as const, assignedToId: { in: reportIds } }
        : null;

  if (!where) {
    return {
      id: "pending-approval",
      title: "Menunggu persetujuan",
      count: 0,
      href: "/pimpinan/persetujuan",
      items: [],
    };
  }

  const [count, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: { completedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        completedAt: true,
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  return {
    id: "pending-approval",
    title: "Menunggu persetujuan",
    count,
    href: "/pimpinan/persetujuan",
    items: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: task.assignedTo?.name || "Pegawai",
      href: `/tugas/${task.id}`,
      at: (task.completedAt ?? new Date()).toISOString(),
    })),
  };
}

async function getPerhatianSection(user: OrgUser, role: Role): Promise<NoticeSection> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const date = formatISODate(now);
  const href = kinerjaHref({ view: "bulanan", month, year, date });

  const monthly = await getMonthlyCalendar({
    role,
    userId: user.id,
    unitId: user.unitId,
    month,
    year,
  });

  if (!monthly) {
    return {
      id: "perhatian",
      title: "Pegawai perlu perhatian",
      count: 0,
      href,
      items: [],
    };
  }

  const people = await getPegawaiBreakdown(
    monthly.tasks,
    { role, userId: user.id, unitId: user.unitId },
    start,
    end,
  );
  const grouped = groupKinerja(people, monthAsOfDate(month, year), "bulanan");

  return {
    id: "perhatian",
    title: "Pegawai perlu perhatian",
    count: grouped.perhatian.length,
    href,
    items: grouped.perhatian.slice(0, 6).map((item) => ({
      id: item.person.id,
      title: item.person.name,
      subtitle: item.eval.insight,
      href,
      at: now.toISOString(),
    })),
  };
}

async function getRejectedSection(userId: string): Promise<NoticeSection> {
  const where = { assignedToId: userId, status: "ditolak" as const };
  const [count, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        review: { select: { feedback: true } },
      },
    }),
  ]);

  return {
    id: "rejected",
    title: "Perlu revisi",
    count,
    href: "/board",
    items: tasks.map((task) => ({
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
  const orgUser = await getDbOrgUser(userId);
  const isLeader = role === "admin" || role === "pimpinan";

  if (isLeader && orgUser) {
    const [pending, perhatian] = await Promise.all([
      getPendingApprovalSection(orgUser, role),
      getPerhatianSection(orgUser, role),
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
