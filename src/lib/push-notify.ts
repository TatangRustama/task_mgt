import { AssignmentMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendWebPush, type PushPayload } from "@/lib/web-push";

async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: ids } },
  });
  if (subscriptions.length === 0) return;

  const goneIds: string[] = [];
  await Promise.all(
    subscriptions.map(async (row) => {
      const result = await sendWebPush(row, payload);
      if (result === "gone") goneIds.push(row.id);
    }),
  );

  if (goneIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: goneIds } } });
  }
}

export async function notifyNewPostedTask(options: {
  taskId: string;
  title: string;
  createdByName: string;
  assignmentMode: AssignmentMode;
  assignedToId: string | null;
  unitId: string;
  createdById: string;
}) {
  try {
    if (options.assignmentMode === "ditunjuk" && options.assignedToId) {
      await sendPushToUsers([options.assignedToId], {
        title: "Tugas baru dari atasan",
        body: `${options.title} · ${options.createdByName}`,
        url: `/tugas/${options.taskId}`,
      });
      return;
    }

    if (options.assignmentMode === "kolam") {
      const staff = await prisma.user.findMany({
        where: {
          unitId: options.unitId,
          role: "personal",
          jabatan: "pelaksana",
          id: { not: options.createdById },
        },
        select: { id: true },
      });
      await sendPushToUsers(
        staff.map((person) => person.id),
        {
          title: "Tugas baru di board",
          body: `${options.title} · ${options.createdByName}`,
          url: "/board",
        },
      );
    }
  } catch (error) {
    console.error("notifyNewPostedTask", error);
  }
}
