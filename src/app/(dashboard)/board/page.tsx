export const dynamic = "force-dynamic";

import { BoardView } from "@/components/board/BoardView";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { canDelegate, canSeeTask, getDbOrgUser, getVisibleUnitIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function BoardPage() {
  const user = await requireUser();
  const orgUser = await getDbOrgUser(user.id);
  const visibleUnitIds = await getVisibleUnitIds(user);

  const tasks = visibleUnitIds.length
    ? await prisma.task.findMany({
        where: {
          OR: [
            { unitId: { in: visibleUnitIds } },
            { assignedToId: user.id },
            { createdById: user.id },
          ],
        },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const visibleTasks = [];
  for (const task of tasks) {
    if (await canSeeTask(user, task)) visibleTasks.push(task);
  }

  const unit = user.unitId
    ? await prisma.unit.findUnique({ where: { id: user.unitId } })
    : null;

  const isStaffBoard = user.role === "pegawai";

  return (
    <PageMain>
      <PageHeader
        title="Active Tasks"
        subtitle={
          unit
            ? isStaffBoard
              ? `Kolam ${unit.name}: ambil kartu yang tersedia, atau kerjakan tugas yang ditunjuk ke Anda.`
              : "Pantau, delegasikan, atau selesaikan tugas bersama Tim Kerja"
            : "Belum terdaftar di unit"
        }
      />
      {user.unitId ? (
        <BoardView
          tasks={visibleTasks}
          currentUserId={user.id}
          canDelegate={orgUser ? canDelegate(orgUser) : false}
          emptyTersedia={
            isStaffBoard
              ? "Belum ada kartu kolam di sub bidang Anda."
              : "Belum ada tugas kolam. Kepala sub bidang dapat melempar kartu ke board staf."
          }
        />
      ) : (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Akun Anda belum ditautkan ke unit. Hubungi admin instansi.
        </p>
      )}
    </PageMain>
  );
}
