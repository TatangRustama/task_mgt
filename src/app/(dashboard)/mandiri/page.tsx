import { Suspense } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { AtasanCard } from "@/components/home/AtasanCard";
import { PerformanceBanner } from "@/components/home/PerformanceBanner";
import { PageMain } from "@/components/layout/PageMain";
import { getHomeDashboard } from "@/lib/home";
import { requireUser } from "@/lib/session";
import { formatRelativeTime, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function HomeDashboardFallback() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
      <div className="h-24 animate-pulse rounded-xl bg-primary/80" />
      <div className="h-40 animate-pulse rounded-xl border border-outline bg-surface-container-lowest" />
    </div>
  );
}

async function HomeDashboard() {
  const user = await requireUser(["personal"]);
  const data = await getHomeDashboard(user);

  return (
    <div className="space-y-3">
      <PerformanceBanner
        firstName={data.firstName}
        unitName={data.unitName}
        isLeader={data.isLeader}
        completedWeek={data.completedWeek}
        pending={data.pending}
        completedTotal={data.completedTotal}
        overdue={data.overdue}
        dueToday={data.dueToday}
        awaitingReview={data.awaitingReview}
        awaitingMyReview={data.awaitingMyReview}
        staleReview={data.staleReview}
        unpickedPool={data.unpickedPool}
        reportOverdue={data.reportOverdue}
      />
      <AtasanCard atasan={data.atasan} fromAtasan={data.fromAtasan} />
      <div className="rounded-lg border border-outline bg-surface-container-lowest p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-on-surface">
            {data.isLeader ? "Menunggu persetujuan Anda" : "Aktivitas terbaru"}
          </h3>
          <Link
            href={data.isLeader ? "/pimpinan/persetujuan" : "/board"}
            className="text-sm font-semibold text-secondary hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {data.isLeader ? "Tidak ada tugas menunggu persetujuan." : "Belum ada aktivitas tugas."}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.recent.map((task, index) => (
              <li
                key={task.id}
                className={
                  index === data.recent.length - 1
                    ? "flex items-center gap-2"
                    : "flex items-center gap-2 border-b border-outline pb-2"
                }
              >
                <div className="shrink-0 rounded-md border border-outline bg-sky-100 p-1.5 text-sky-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tugas/${task.id}`}
                    className="block truncate text-sm font-semibold text-on-surface hover:underline"
                    title={task.title}
                  >
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {statusLabel(task.status)}
                    {task.assignedToName ? ` · ${task.assignedToName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-tertiary">
                  {formatRelativeTime(task.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MandiriPage() {
  return (
    <PageMain>
      <Suspense fallback={<HomeDashboardFallback />}>
        <HomeDashboard />
      </Suspense>
    </PageMain>
  );
}
