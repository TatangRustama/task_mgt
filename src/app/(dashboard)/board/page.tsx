export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { BoardView } from "@/components/board/BoardView";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { getBoardPageData } from "@/lib/board";
import { canDelegate, getDbOrgUser, isUnitLeader } from "@/lib/org";
import { requireUser } from "@/lib/session";

function BoardBodyFallback() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="flex justify-between">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-container" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-surface-container" />
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-surface-container" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-32 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-32 animate-pulse rounded-lg bg-surface-container" />
      </div>
    </div>
  );
}

async function BoardBody({ openDelegasi }: { openDelegasi: boolean }) {
  const user = await requireUser(["personal"]);
  const { orgUser, isLeader, tasks } = await getBoardPageData(user);
  const isStaffBoard = !isLeader;

  if (!user.unitId) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
        Akun Anda belum ditautkan ke unit. Hubungi admin instansi.
      </p>
    );
  }

  return (
    <BoardView
      tasks={tasks}
      currentUserId={user.id}
      canDelegate={orgUser ? canDelegate(orgUser) : false}
      openDelegasi={openDelegasi}
      emptyTersedia={
        isStaffBoard
          ? "Belum ada kartu kolam di sub bidang Anda."
          : "Belum ada tugas kolam. Kepala sub bidang dapat melempar kartu ke board staf."
      }
    />
  );
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ delegasi?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(["personal"]), searchParams]);
  const orgUser = await getDbOrgUser(user.id);
  const isStaffBoard = !(orgUser && isUnitLeader(orgUser));

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
      <Suspense fallback={<BoardBodyFallback />}>
        <BoardBody openDelegasi={params.delegasi === "1"} />
      </Suspense>
    </PageMain>
  );
}
