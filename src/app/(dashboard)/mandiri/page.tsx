export const dynamic = "force-dynamic";

import Link from "next/link";
import { FileText, Users, Network, Settings } from "lucide-react";
import { PerformanceBanner } from "@/components/home/PerformanceBanner";
import { PageMain } from "@/components/layout/PageMain";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getVisibleUnitIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatRelativeTime, statusLabel, cn } from "@/lib/utils";

export default async function MandiriPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const scope =
    user.role === "admin"
      ? {}
      : user.role === "pimpinan" && user.unitId
        ? { unitId: { in: await getVisibleUnitIds(user) } }
        : {
            OR: [{ assignedToId: user.id }, { createdById: user.id }],
          };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const openStatuses = ["dikerjakan", "ditolak", "tersedia"] as const;

  const [completedWeek, pending, completedTotal, overdue, dueToday, awaitingReview, unit, recent] =
    await Promise.all([
      prisma.task.count({
        where: {
          ...scope,
          status: { in: ["menunggu_approval", "disetujui"] },
          completedAt: { gte: weekAgo },
        },
      }),
      prisma.task.count({
        where: {
          ...scope,
          status: { in: [...openStatuses] },
        },
      }),
      prisma.task.count({
        where: {
          ...scope,
          status: { in: ["menunggu_approval", "disetujui"] },
        },
      }),
      prisma.task.count({
        where: {
          ...scope,
          status: { in: [...openStatuses] },
          deadline: { lt: startOfToday },
        },
      }),
      prisma.task.count({
        where: {
          ...scope,
          status: { in: [...openStatuses] },
          deadline: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.task.count({
        where: { ...scope, status: "menunggu_approval" },
      }),
      user.unitId
        ? prisma.unit.findUnique({ where: { id: user.unitId }, select: { name: true } })
        : Promise.resolve(null),
      prisma.task.findMany({
        where: scope,
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { assignedTo: { select: { name: true } } },
      }),
    ]);

  return (
    <PageMain>
      <PerformanceBanner
        firstName={firstName}
        unitName={unit?.name ?? null}
        completedWeek={completedWeek}
        pending={pending}
        completedTotal={completedTotal}
        overdue={overdue}
        dueToday={dueToday}
        awaitingReview={awaitingReview}
      />

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          {
            href: "/pegawai",
            title: "Pegawai",
            icon: Users,
            tone: "bg-sky-100 text-sky-600",
          },
          {
            href: "/struktur",
            title: "Struktur",
            icon: Network,
            tone: "bg-sky-100 text-sky-700",
          },
          {
            href: "/setting",
            title: "Setting",
            icon: Settings,
            tone: "bg-amber-100 text-amber-600",
          },
        ].map(({ href, title, icon: Icon, tone }) => (
          <Link key={href} href={href} className="min-w-0">
            <Card className="h-full transition hover:shadow-md">
              <CardHeader className="flex flex-col items-center gap-1.5 p-2 text-center md:flex-row md:items-center md:p-3 md:text-left">
                <div className={cn("rounded-md border border-outline p-1.5 md:p-2", tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-sm md:text-base">{title}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-outline bg-surface-container-lowest p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-on-surface">Aktivitas terbaru</h3>
          <Link href="/board" className="text-sm font-semibold text-secondary hover:underline">
            Lihat semua
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada aktivitas tugas.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((task, index) => (
              <li
                key={task.id}
                className={index === recent.length - 1 ? "flex items-center gap-2" : "flex items-center gap-2 border-b border-outline pb-2"}
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
                    {task.assignedTo ? ` · ${task.assignedTo.name}` : ""}
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
    </PageMain>
  );
}
