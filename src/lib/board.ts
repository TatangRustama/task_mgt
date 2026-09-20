import type { Prisma } from "@prisma/client";
import type { TaskCardData } from "@/components/board/TaskCard";
import { canSeeTaskWithScope, getOrgScope } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { formatISODate, parseISODate } from "@/lib/utils";

const boardTaskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  source: true,
  priority: true,
  deadline: true,
  assignmentMode: true,
  createdById: true,
  assignedToId: true,
  unitId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  jumlahIntervensi: true,
  satuan: true,
  assignedTo: { select: { name: true } },
} as const;

function activeBoardWhere(todayStart: Date): Prisma.TaskWhereInput {
  return {
    OR: [
      { status: { in: ["tersedia", "dikerjakan", "ditolak"] } },
      {
        status: { in: ["menunggu_approval", "disetujui"] },
        completedAt: { gte: todayStart },
      },
    ],
  };
}

export async function getBoardPageData(user: SessionUser) {
  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);
  const todayStart = parseISODate(formatISODate(new Date()));

  const visibility: Prisma.TaskWhereInput = isLeader
    ? {
        OR: [
          { assignedToId: user.id },
          { createdById: user.id },
          ...(visibleUnitIds.length ? [{ unitId: { in: visibleUnitIds } }] : []),
        ],
      }
    : {
        OR: [
          { assignedToId: user.id },
          { createdById: user.id },
          ...(user.unitId
            ? [{ assignmentMode: "kolam" as const, status: "tersedia" as const, unitId: user.unitId }]
            : []),
        ],
      };

  const tasks = visibleUnitIds.length || !isLeader
    ? await prisma.task.findMany({
        where: { AND: [visibility, activeBoardWhere(todayStart)] },
        select: boardTaskSelect,
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const visibleTasks: TaskCardData[] = tasks.filter((task) =>
    canSeeTaskWithScope(user, task, { visibleUnitIds, isLeader }),
  );

  return {
    orgUser,
    isLeader,
    tasks: visibleTasks,
  };
}
