import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeepTaskButton } from "@/components/task/KeepTaskButton";
import { CompleteTaskForm } from "@/components/task/CompleteTaskForm";
import { ReviewForm } from "@/components/task/ReviewForm";
import { StarRating } from "@/components/task/StarRating";
import { LocationMapView } from "@/components/map/LocationMapView";
import { assignmentModeLabel, canPickupPoolTask, canReviewTask, canSeeTask, getDbOrgUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, formatDateTime, priorityBarClass, statusLabel } from "@/lib/utils";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const orgUser = await getDbOrgUser(user.id);
  if (!orgUser) notFound();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      unit: { select: { name: true } },
      evidence: true,
      review: { include: { reviewedBy: { select: { name: true } } } },
      rating: true,
    },
  });

  if (!task || !(await canSeeTask(user, task))) notFound();

  const canKeep = canPickupPoolTask(user, task);

  const canComplete =
    task.assignedToId === user.id &&
    (task.status === "dikerjakan" || task.status === "ditolak");

  const canReview =
    task.status === "menunggu_approval" && (await canReviewTask(orgUser, task.assignedToId));

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Detail Tugas" subtitle={task.title} />
        {/* task detail */}
        <Card className="relative overflow-hidden">
          <div className={cn("absolute inset-y-0 left-0 w-2", priorityBarClass[task.priority] ?? "bg-tertiary")} />
          <CardHeader className="pl-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={task.source}>{task.source}</Badge>
              <Badge variant={task.assignmentMode}>{assignmentModeLabel(task.assignmentMode)}</Badge>
              <Badge variant={task.priority}>{task.priority}</Badge>
              <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
            </div>
            <CardTitle>{task.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pl-6 text-sm text-on-surface-variant">
            {task.description ? <p>{task.description}</p> : null}
            <p>Unit: {task.unit.name}</p>
            <p>Dibuat oleh: {task.createdBy.name}</p>
            {task.assignedTo ? <p>Pegawai: {task.assignedTo.name}</p> : <p>Belum diambil staf</p>}
            {task.deadline ? <p>Deadline: {formatDate(task.deadline)}</p> : null}
            {task.completedAt ? <p>Selesai: {formatDateTime(task.completedAt)}</p> : null}
          </CardContent>
        </Card>

        {canKeep ? (
          <Card>
            <CardContent className="py-4">
              <KeepTaskButton taskId={task.id} />
            </CardContent>
          </Card>
        ) : null}

        {canComplete ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Telah Selesai</CardTitle>
            </CardHeader>
            <CardContent>
              <CompleteTaskForm taskId={task.id} />
            </CardContent>
          </Card>
        ) : null}

        {task.evidence ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bukti Pekerjaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-on-surface-variant">{task.evidence.notes}</p>
              <p className="text-sm text-tertiary">{task.evidence.address}</p>
              {task.evidence.latitude !== null && task.evidence.longitude !== null ? (
                <LocationMapView
                  latitude={task.evidence.latitude}
                  longitude={task.evidence.longitude}
                />
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {task.evidence.photoUrls.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={url} alt="Bukti" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canReview ? (
          <ReviewForm taskId={task.id} />
        ) : null}

        {task.review ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Pimpinan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-on-surface-variant">
              <p>Keputusan: {task.review.decision}</p>
              {task.rating ? (
                <div className="space-y-1">
                  <p>Penilaian:</p>
                  <StarRating value={task.rating.stars} readOnly />
                </div>
              ) : null}
              {task.review.feedback ? <p>Catatan: {task.review.feedback}</p> : null}
              <p>Review oleh: {task.review.reviewedBy.name}</p>
              <p>{formatDateTime(task.review.reviewedAt)}</p>
            </CardContent>
          </Card>
        ) : null}
    </PageMain>
  );
}
