import { notFound } from "next/navigation";
import { TaskMonitorActions } from "@/components/admin/TaskMonitorActions";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { LocationMapView } from "@/components/map/LocationMapView";
import { EvidencePhotoGrid } from "@/components/task/EvidencePhotoGrid";
import { StarRating } from "@/components/task/StarRating";
import { TaskDescription } from "@/components/task/TaskDescription";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignmentModeLabel } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { formatJumlahSatuan } from "@/lib/satuan";
import { requireUser } from "@/lib/session";
import { downgradedTaskStatus, parseTaskMonitorFilters, taskMonitorHref } from "@/lib/task-monitor";
import { cn, formatDate, formatDateTime, formatNip, priorityBarClass, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const sourceLabel = {
  delegasi: "Delegasi",
  mandiri: "Mandiri",
} as const;

export default async function TaskMonitorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    pd?: string;
    u1?: string;
    u2?: string;
    u3?: string;
    q?: string;
    date?: string;
    sumber?: string;
    tahap?: string;
    page?: string;
  }>;
}) {
  await requireUser(["super_admin"]);
  const { id } = await params;
  const listHref = taskMonitorHref(parseTaskMonitorFilters(await searchParams));

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          name: true,
          nip: true,
          pegawai: { select: { jenis: true, nip: true, nik: true, perangkatDaerahNama: true } },
        },
      },
      createdBy: { select: { name: true } },
      unit: { select: { name: true, perangkatDaerahNama: true } },
      evidence: true,
      review: { include: { reviewedBy: { select: { name: true } } } },
      rating: true,
    },
  });

  if (!task || task.status === "dibatalkan") notFound();

  const assigneeId =
    task.assignedTo?.pegawai?.jenis === "non_asn"
      ? `NIK ${task.assignedTo.pegawai.nik || "-"}`
      : task.assignedTo
        ? `NIP ${formatNip(task.assignedTo.pegawai?.nip || task.assignedTo.nip)}`
        : "-";
  const perangkatDaerah =
    task.unit.perangkatDaerahNama ||
    task.assignedTo?.pegawai?.perangkatDaerahNama ||
    "Perangkat daerah belum diisi";

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Detail tugas" subtitle={task.title} />
      <Card className="relative overflow-hidden">
        <div className={cn("absolute inset-y-0 left-0 w-2", priorityBarClass[task.priority] ?? "bg-tertiary")} />
        <CardHeader className="pl-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={task.source}>{sourceLabel[task.source]}</Badge>
            <Badge variant={task.assignmentMode}>{assignmentModeLabel(task.assignmentMode)}</Badge>
            <Badge variant={task.priority}>{task.priority}</Badge>
            <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
          </div>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pl-6 text-sm text-on-surface-variant">
          {task.description ? <TaskDescription text={task.description} /> : null}
          {formatJumlahSatuan(task.jumlahIntervensi, task.satuan) ? (
            <p>Jumlah yang diintervensi: {formatJumlahSatuan(task.jumlahIntervensi, task.satuan)}</p>
          ) : null}
          <p>Perangkat daerah: {perangkatDaerah}</p>
          <p>Unit: {task.unit.name}</p>
          <p>Dibuat oleh: {task.createdBy.name}</p>
          <p>Pegawai: {task.assignedTo?.name || "Belum ditugaskan"}</p>
          <p>{assigneeId}</p>
          <p>Tanggal ditugaskan: {formatDate(task.assignedAt)}</p>
          {task.deadline ? <p>Deadline: {formatDate(task.deadline)}</p> : null}
          {task.completedAt ? <p>Selesai: {formatDateTime(task.completedAt)}</p> : null}
          <TaskMonitorActions
            task={{
              id: task.id,
              title: task.title,
              description: task.description,
              deadline: task.deadline,
              assignedAt: task.assignedAt,
              completedAt: task.completedAt,
              priority: task.priority,
              jumlahIntervensi: task.jumlahIntervensi,
              satuan: task.satuan,
            }}
            listHref={listHref}
            currentStatus={task.status}
            nextStatus={downgradedTaskStatus(task.status)}
          />
        </CardContent>
      </Card>

      {task.evidence ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bukti pekerjaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-on-surface-variant">{task.evidence.notes}</p>
            <p className="text-sm text-tertiary">{task.evidence.address}</p>
            {task.evidence.latitude !== null && task.evidence.longitude !== null ? (
              <LocationMapView latitude={task.evidence.latitude} longitude={task.evidence.longitude} />
            ) : null}
            <EvidencePhotoGrid urls={task.evidence.photoUrls} />
          </CardContent>
        </Card>
      ) : null}

      {task.review ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review pimpinan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-on-surface-variant">
            <p>Keputusan: {task.review.decision}</p>
            {task.rating ? (
              <div className="space-y-1">
                <p>Penilaian:</p>
                <StarRating value={task.rating.stars} readOnly />
              </div>
            ) : null}
            {task.review.feedback ? <p>Feedback: {task.review.feedback}</p> : null}
            <p>Review oleh: {task.review.reviewedBy.name}</p>
            <p>{formatDateTime(task.review.reviewedAt)}</p>
          </CardContent>
        </Card>
      ) : null}
    </PageMain>
  );
}
