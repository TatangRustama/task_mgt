import type { Prisma, TaskStatus } from "@prisma/client";
import { MONITOR_REVIEW_SLA_HOURS } from "@/lib/monitor-types";
import { getAtasan, getDirectReportIds, getOrgScope } from "@/lib/org";
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

export async function getHomeDashboard(user: SessionUser): Promise<HomeDashboardData> {
  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);
  const reportIds = orgUser && isLeader ? await getDirectReportIds(orgUser) : [];
  const slaCutoff = new Date(Date.now() - MONITOR_REVIEW_SLA_HOURS * 60 * 60 * 1000);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const mineWhere = isSuperAdmin(user.role) ? {} : personalScope(user.id);
  const queueWhere: Prisma.TaskWhereInput | null =
    isLeader && reportIds.length
      ? { assignedToId: { in: reportIds }, status: "menunggu_approval" }
      : null;
  const poolWhere: Prisma.TaskWhereInput | null =
    isLeader && visibleUnitIds.length
      ? { unitId: { in: visibleUnitIds }, status: "tersedia", assignedToId: null }
      : null;
  const reportOpenWhere: Prisma.TaskWhereInput | null =
    isLeader && reportIds.length
      ? { assignedToId: { in: reportIds }, status: { in: OPEN_STATUSES } }
      : null;

  const [mine, awaitingMyReview, staleReview, unpickedPool, reportOverdue, queueRecent, atasan] = await Promise.all([
    prisma.task.findMany({
      where: mineWhere,
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
    queueWhere ? prisma.task.count({ where: queueWhere }) : Promise.resolve(0),
    queueWhere
      ? prisma.task.count({ where: { ...queueWhere, completedAt: { lt: slaCutoff } } })
      : Promise.resolve(0),
    poolWhere ? prisma.task.count({ where: poolWhere }) : Promise.resolve(0),
    reportOpenWhere
      ? prisma.task.count({
          where: { ...reportOpenWhere, deadline: { lt: startOfToday } },
        })
      : Promise.resolve(0),
    queueWhere
      ? prisma.task.findMany({
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
        })
      : Promise.resolve([]),
    orgUser ? getAtasan(orgUser) : Promise.resolve(null),
  ]);

  let pending = 0;
  let completedTotal = 0;
  let completedWeek = 0;
  let overdue = 0;
  let dueToday = 0;
  let awaitingReview = 0;

  for (const task of mine) {
    const isOpen = OPEN_STATUSES.includes(task.status);
    const isDone = DONE_STATUSES.includes(task.status);
    if (isOpen) pending += 1;
    if (task.status === "menunggu_approval") awaitingReview += 1;
    if (isDone) {
      completedTotal += 1;
      if (task.completedAt && task.completedAt >= weekAgo) completedWeek += 1;
    }
    if (isOpen && task.deadline) {
      if (task.deadline < startOfToday) overdue += 1;
      else if (task.deadline >= startOfToday && task.deadline <= endOfToday) dueToday += 1;
    }
  }

  const [atasanPegawai, atasanUser, fromAtasan] = await Promise.all([
    atasan
      ? prisma.pegawai.findUnique({
          where: { userId: atasan.id },
          select: { jabatanNama: true, nip: true, golonganNama: true },
        })
      : Promise.resolve(null),
    atasan
      ? prisma.user.findUnique({
          where: { id: atasan.id },
          select: { nip: true },
        })
      : Promise.resolve(null),
    atasan
      ? prisma.task.findMany({
          where: {
            createdById: atasan.id,
            assignedToId: user.id,
            status: { notIn: ["dibatalkan"] },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: { id: true, title: true, status: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const recent: HomeActivity[] = isLeader
    ? queueRecent.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        updatedAt: task.updatedAt,
        assignedToName: task.assignedTo?.name ?? null,
      }))
    : mine.slice(0, 6).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        updatedAt: task.updatedAt,
        assignedToName: task.assignedTo?.name ?? null,
      }));

  return {
    firstName: user.name.split(" ")[0],
    unitName: orgUser?.unit?.name ?? null,
    isLeader,
    completedWeek,
    pending,
    completedTotal,
    overdue,
    dueToday,
    awaitingReview,
    awaitingMyReview,
    staleReview,
    unpickedPool,
    reportOverdue,
    recent,
    atasan: atasan
      ? {
          name: atasan.name,
          jabatan: atasan.jabatanLabel,
          nip: atasanPegawai?.nip || atasanUser?.nip || null,
          golongan: atasanPegawai?.golonganNama || null,
        }
      : null,
    fromAtasan,
  };
}
