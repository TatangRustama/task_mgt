export const dynamic = "force-dynamic";

import { BoardView } from "@/components/board/BoardView";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { canDelegate, canSeeTaskWithScope, getOrgScope } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ delegasi?: string }>;
}) {
  const user = await requireUser(["personal"]);
  const params = await searchParams;
  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);

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

  const visibleTasks = tasks.filter((task) =>
    canSeeTaskWithScope(user, task, {
      visibleUnitIds,
      isLeader,
    }),
  );

  const isStaffBoard = !isLeader;

  return (
    <PageMain>
      <PageHeader
        title="Active Tasks"
        subtitle={
          orgUser?.unit
            ? isStaffBoard
              ? `Kolam ${orgUser.unit.name}: ambil kartu yang tersedia, atau kerjakan tugas yang ditunjuk ke Anda.`
              : "Pantau, delegasikan, atau selesaikan tugas bersama Tim Kerja"
            : "Belum terdaftar di unit"
        }
      />
      {user.unitId ? (
        <BoardView
          tasks={visibleTasks}
          currentUserId={user.id}
          canDelegate={orgUser ? canDelegate(orgUser) : false}
          openDelegasi={params.delegasi === "1"}
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
