import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Card, CardContent } from "@/components/ui/card";
import { PendingApprovalList } from "@/components/task/PendingApprovalList";
import { getDbOrgUser, getDirectReportIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PersetujuanPage() {
  const user = await requireUser(["admin", "pimpinan"]);

  const orgUser = await getDbOrgUser(user.id);
  const reportIds = orgUser ? await getDirectReportIds(orgUser) : [];

  const tasks =
    user.role === "admin"
      ? await prisma.task.findMany({
          where: { status: "menunggu_approval" },
          include: {
            assignedTo: { select: { name: true } },
            evidence: true,
          },
          orderBy: { completedAt: "asc" },
        })
      : reportIds.length
        ? await prisma.task.findMany({
            where: { status: "menunggu_approval", assignedToId: { in: reportIds } },
            include: {
              assignedTo: { select: { name: true } },
              evidence: true,
            },
            orderBy: { completedAt: "asc" },
          })
        : [];

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader
        title="Persetujuan"
        subtitle={`${tasks.length} tugas menunggu review dan penilaian bintang`}
      />
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-on-surface-variant">
            Tidak ada tugas menunggu persetujuan.
          </CardContent>
        </Card>
      ) : (
        <PendingApprovalList
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            assignedToName: task.assignedTo?.name ?? null,
            completedAt: task.completedAt?.toISOString() ?? null,
            evidence: task.evidence
              ? {
                  notes: task.evidence.notes,
                  address: task.evidence.address,
                  photoUrls: task.evidence.photoUrls,
                  latitude: task.evidence.latitude,
                  longitude: task.evidence.longitude,
                }
              : null,
          }))}
        />
      )}
    </PageMain>
  );
}
