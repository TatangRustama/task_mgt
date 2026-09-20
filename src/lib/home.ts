import type { Prisma, TaskStatus } from "@prisma/client";
import { MONITOR_REVIEW_SLA_HOURS } from "@/lib/monitor-types";
import { getAtasan, getDbOrgUser, getDirectReportIds, getOrgScope, isUnitLeader } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

const OPEN_STATUSES: TaskStatus[] = ["dikerjakan", "ditolak", "tersedia"];
const DONE_STATUSES: TaskStatus[] = ["menunggu_approval", "disetujui"];

export type HomeActivity = {
  id: string;
  title: string;
  status: TaskStatus;
  updatedAt: Date;
  assignedToName: string | null;
};

export type HomeAtasanInfo = {
  name: string;
  jabatan: string | null;
  nip: string | null;
  golongan: string | null;
};

export type HomeFromAtasan = {
  id: string;
  title: string;
  status: TaskStatus;
  updatedAt: Date;
};

export type HomeDashboardData = {
  firstName: string;
  unitName: string | null;
  isLeader: boolean;
  completedWeek: number;
  pending: number;
  completedTotal: number;
  overdue: number;
  dueToday: number;
  awaitingReview: number;
  awaitingMyReview: number;
  staleReview: number;
  unpickedPool: number;
  reportOverdue: number;
  recent: HomeActivity[];
  atasan: HomeAtasanInfo | null;
  fromAtasan: HomeFromAtasan[];
};

function personalScope(userId: string): Prisma.TaskWhereInput {
  return { OR: [{ assignedToId: userId }, { createdById: userId }] };
}

function emptyLeaderQueue() {
  return {
    awaitingMyReview: 0,
    staleReview: 0,
    unpickedPool: 0,
    reportOverdue: 0,
    queueRecent: [] as HomeActivity[],
  };
}

export async function getHomeDashboard(user: SessionUser): Promise<HomeDashboardData> {
  const orgUser = await getDbOrgUser(user.id);
  const isLeader = Boolean(orgUser && (isSuperAdmin(user.role) || isUnitLeader(orgUser)));
  const slaCutoff = new Date(Date.now() - MONITOR_REVIEW_SLA_HOURS * 60 * 60 * 1000);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const mineWhere = isSuperAdmin(user.role) ? {} : personalScope(user.id);

  const [staff, leader, atasanBlock] = await Promise.all([
    isLeader
      ? Promise.resolve({
          completedWeek: 0,
          pending: 0,
          completedTotal: 0,
          overdue: 0,
          dueToday: 0,
          awaitingReview: 0,
          recent: [] as HomeActivity[],
        })
      : loadStaffStats(mineWhere, weekAgo, startOfToday, endOfToday),
    isLeader && orgUser ? loadLeaderQueue(orgUser, user, slaCutoff, startOfToday) : Promise.resolve(emptyLeaderQueue()),
    loadAtasanBlock(orgUser, user.id),
  ]);

  return {
    firstName: user.name.split(" ")[0],
    unitName: orgUser?.unit?.name ?? null,
    isLeader,
    completedWeek: staff.completedWeek,
    pending: staff.pending,
    completedTotal: staff.completedTotal,
    overdue: staff.overdue,
    dueToday: staff.dueToday,
    awaitingReview: staff.awaitingReview,
    awaitingMyReview: leader.awaitingMyReview,
    staleReview: leader.staleReview,
    unpickedPool: leader.unpickedPool,
    reportOverdue: leader.reportOverdue,
    recent: isLeader ? leader.queueRecent : staff.recent,
    atasan: atasanBlock.atasan,
    fromAtasan: atasanBlock.fromAtasan,
  };
}

async function loadStaffStats(
  mineWhere: Prisma.TaskWhereInput,
  weekAgo: Date,
  startOfToday: Date,
  endOfToday: Date,
) {
  const liveWhere: Prisma.TaskWhereInput = {
    AND: [
      mineWhere,
      { status: { not: "dibatalkan" } },
      {
        OR: [
          { status: { in: [...OPEN_STATUSES, "menunggu_approval"] } },
          { status: "disetujui", completedAt: { gte: weekAgo } },
        ],
      },
    ],
  };

  const [live, completedTotal] = await Promise.all([
    prisma.task.findMany({
      where: liveWhere,
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        completedAt: true,
        updatedAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.count({
      where: { AND: [mineWhere, { status: { in: DONE_STATUSES } }] },
    }),
  ]);

  let pending = 0;
  let completedWeek = 0;
  let overdue = 0;
  let dueToday = 0;
  let awaitingReview = 0;

  for (const task of live) {
    const isOpen = OPEN_STATUSES.includes(task.status);
    if (isOpen) pending += 1;
    if (task.status === "menunggu_approval") awaitingReview += 1;
    if (DONE_STATUSES.includes(task.status) && task.completedAt && task.completedAt >= weekAgo) {
      completedWeek += 1;
    }
    if (isOpen && task.deadline) {
      if (task.deadline < startOfToday) overdue += 1;
      else if (task.deadline >= startOfToday && task.deadline <= endOfToday) dueToday += 1;
    }
  }

  return {
    completedWeek,
    pending,
    completedTotal,
    overdue,
    dueToday,
    awaitingReview,
    recent: live.slice(0, 6).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      updatedAt: task.updatedAt,
      assignedToName: task.assignedTo?.name ?? null,
    })),
  };
}

async function loadLeaderQueue(
  orgUser: NonNullable<Awaited<ReturnType<typeof getDbOrgUser>>>,
  user: SessionUser,
  slaCutoff: Date,
  startOfToday: Date,
) {
  const [unpickedPool, reportQueue] = await Promise.all([
    (async () => {
      const { visibleUnitIds } = await getOrgScope(user);
      if (!visibleUnitIds.length) return 0;
      return prisma.task.count({
        where: { unitId: { in: visibleUnitIds }, status: "tersedia", assignedToId: null },
      });
    })(),
    (async () => {
      const reportIds = await getDirectReportIds(orgUser);
      if (!reportIds.length) {
        return { awaitingMyReview: 0, staleReview: 0, reportOverdue: 0, queueRecent: [] as HomeActivity[] };
      }
      const queueWhere = { assignedToId: { in: reportIds }, status: "menunggu_approval" as const };
      const [awaitingMyReview, staleReview, reportOverdue, queueRecent] = await Promise.all([
        prisma.task.count({ where: queueWhere }),
        prisma.task.count({ where: { ...queueWhere, completedAt: { lt: slaCutoff } } }),
        prisma.task.count({
          where: { assignedToId: { in: reportIds }, status: { in: OPEN_STATUSES }, deadline: { lt: startOfToday } },
        }),
        prisma.task.findMany({
          where: queueWhere,
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
            assignedTo: { select: { name: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 6,
        }),
      ]);
      return {
        awaitingMyReview,
        staleReview,
        reportOverdue,
        queueRecent: queueRecent.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          updatedAt: task.updatedAt,
          assignedToName: task.assignedTo?.name ?? null,
        })),
      };
    })(),
  ]);

  return {
    awaitingMyReview: reportQueue.awaitingMyReview,
    staleReview: reportQueue.staleReview,
    unpickedPool,
    reportOverdue: reportQueue.reportOverdue,
    queueRecent: reportQueue.queueRecent,
  };
}

async function loadAtasanBlock(
  orgUser: Awaited<ReturnType<typeof getDbOrgUser>>,
  userId: string,
): Promise<{ atasan: HomeAtasanInfo | null; fromAtasan: HomeFromAtasan[] }> {
  const atasan = orgUser ? await getAtasan(orgUser) : null;
  if (!atasan) return { atasan: null, fromAtasan: [] };

  const fromAtasan = await prisma.task.findMany({
    where: {
      createdById: atasan.id,
      assignedToId: userId,
      status: { notIn: ["dibatalkan"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return {
    atasan: {
      name: atasan.name,
      jabatan: atasan.jabatanLabel,
      nip: atasan.nip,
      golongan: atasan.golonganNama,
    },
    fromAtasan,
  };
}
