import { notFound } from "next/navigation";
import { EvidencePhotoGrid } from "@/components/task/EvidencePhotoGrid";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeepTaskButton } from "@/components/task/KeepTaskButton";
import { CompleteTaskForm } from "@/components/task/CompleteTaskForm";
import { ManagePostedTaskActions } from "@/components/task/ManagePostedTaskActions";
import { ReviewForm } from "@/components/task/ReviewForm";
import { StarRating } from "@/components/task/StarRating";
import { LocationMapView } from "@/components/map/LocationMapView";
import { assignmentModeLabel, canManagePostedTersediaTask, canPickupPoolTask, canReviewTask, canSeeTask, getDbOrgUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, formatDateTime, priorityBarClass, statusLabel } from "@/lib/utils";
import { formatJumlahSatuan } from "@/lib/satuan";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(["personal"]);

  const orgUser = await getDbOrgUser(user.id);
  if (!orgUser) notFound();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      unit: { select: { name: true } },
      evidence: true,
      review: { include: { reviewedBy: { select: { name: true } } } },
      rating: true,
    },
  });

  if (!task || !(await canSeeTask(user, task))) notFound();

  const canKeep = canPickupPoolTask(user, task);
  const canManagePosted = canManagePostedTersediaTask(user, task);

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
            {formatJumlahSatuan(task.jumlahIntervensi, task.satuan) ? (
              <p>Jumlah yang diintervensi: {formatJumlahSatuan(task.jumlahIntervensi, task.satuan)}</p>
            ) : null}
            <p>Unit: {task.unit.name}</p>
            <p>Dibuat oleh: {task.createdBy.name}</p>
            {task.assignedTo ? <p>Pegawai: {task.assignedTo.name}</p> : <p>Belum diambil staf</p>}
            <p>Tanggal ditugaskan: {formatDate(task.assignedAt)}</p>
            {task.deadline ? <p>Deadline: {formatDate(task.deadline)}</p> : null}
            {task.completedAt ? <p>Selesai: {formatDateTime(task.completedAt)}</p> : null}
            {canManagePosted ? (
              <ManagePostedTaskActions
                task={task}
                afterDeleteHref="/board"
                className="pt-3"
              />
            ) : null}
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
            {task.status === "ditolak" && task.review?.feedback ? (
              <div className="border-b border-error-container bg-error-container/40 px-4 py-3 text-sm text-error">
                <p className="font-semibold">Tugas ditolak — perbaiki lalu kirim ulang</p>
                <p className="mt-1 text-on-surface-variant">{task.review.feedback}</p>
              </div>
            ) : null}
            <CardHeader>
              <CardTitle className="text-base">
                {task.status === "ditolak" ? "Kirim Ulang Revisi" : "Telah Selesai"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompleteTaskForm
                taskId={task.id}
                isRevision={task.status === "ditolak"}
                jumlahIntervensi={task.jumlahIntervensi}
                satuan={task.satuan}
              />
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
              <EvidencePhotoGrid urls={task.evidence.photoUrls} />
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
