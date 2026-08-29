export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardPlus,
  Crown,
  FileText,
  User,
} from "lucide-react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAtasan, getDbOrgUser, getDirectReportIds, jabatanLabel } from "@/lib/org";
import { formatGolonganPangkat } from "@/lib/golongan";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatRelativeTime, statusLabel } from "@/lib/utils";

export default async function PimpinanPage() {
  const user = await requireUser(["admin", "pimpinan"]);

  const orgUser = await getDbOrgUser(user.id);
  const [reportIds, atasan] = await Promise.all([
    orgUser ? getDirectReportIds(orgUser) : Promise.resolve([] as string[]),
    orgUser ? getAtasan(orgUser) : Promise.resolve(null),
  ]);

  const [atasanPegawai, atasanUser, pendingCount, fromAtasan] = await Promise.all([
    atasan
      ? prisma.pegawai.findUnique({
          where: { userId: atasan.id },
          select: { jabatanNama: true, nip: true, golonganNama: true },
        })
      : Promise.resolve(null),
    atasan
      ? prisma.user.findUnique({
          where: { id: atasan.id },
          select: { nip: true },
        })
      : Promise.resolve(null),
    user.role === "admin"
      ? prisma.task.count({ where: { status: "menunggu_approval" } })
      : reportIds.length
        ? prisma.task.count({
            where: { status: "menunggu_approval", assignedToId: { in: reportIds } },
          })
        : Promise.resolve(0),
    atasan
      ? prisma.task.findMany({
          where: {
            createdById: atasan.id,
            assignedToId: user.id,
            status: { notIn: ["dibatalkan"] },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const menus = [
    {
      href: "/board",
      title: "Board Unit",
      desc: "Lihat semua kartu tugas unit",
      icon: Crown,
    },
    {
      href: "/pimpinan/delegasi",
      title: "Delegasi Tugas",
      desc: "Tunjuk bawahan atau lempar ke board subbid",
      icon: ClipboardPlus,
    },
    {
      href: "/pimpinan/persetujuan",
      title: "Persetujuan",
      desc: "Setujui tugas dan beri bintang",
      icon: CheckCircle2,
      badge: pendingCount,
    },
    {
      href: "/laporan",
      title: "Laporan Unit",
      desc: "Monitoring arsip kinerja bulanan",
      icon: BarChart3,
    },
  ];

  const atasanJabatan =
    atasanPegawai?.jabatanNama || (atasan?.jabatan ? jabatanLabel[atasan.jabatan] : null);
  const atasanNip = atasanPegawai?.nip || atasanUser?.nip || null;
  const atasanGolongan = atasanPegawai?.golonganNama || null;

  return (
    <PageMain>
      <PageHeader
        title="Pimpinan"
        subtitle="Delegasi bernama ke bawahan, atau kolam board khusus staf sub bidang."
      />

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-primary-container p-6 text-on-primary-container shadow-md">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Atasan langsung
              </p>
              {atasan ? (
                <>
                  <h3 className="mt-2 text-xl font-semibold leading-snug">{atasan.name}</h3>
                  <p className="mt-2 text-sm opacity-90">{formatGolonganPangkat(atasanGolongan)}</p>
                  <p className="mt-1 text-sm opacity-90">NIP {atasanNip || "-"}</p>
                  {atasanJabatan ? (
                    <p className="mt-2 line-clamp-2 text-sm opacity-90" title={atasanJabatan}>
                      {atasanJabatan}
                    </p>
                  ) : null}
                </>
              ) : (
                <h3 className="mt-2 text-xl font-semibold">Tidak ada atasan langsung</h3>
              )}
            </div>
            <span className="rounded-full bg-white p-2 text-primary-container">
              <User className="h-5 w-5" />
            </span>
          </div>
        </div>

        <Card className="border-transparent bg-accent text-on-accent">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base text-on-accent">Tugas dari atasan langsung</CardTitle>
              <Link href="/board" className="text-sm font-semibold text-on-accent/90 hover:underline">
                Lihat semua
              </Link>
            </div>
            {fromAtasan.length === 0 ? (
              <p className="text-sm text-on-accent/80">
                {atasan ? "Belum ada tugas dari atasan." : "Tidak ada atasan langsung."}
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {fromAtasan.map((task, index) => (
                  <li
                    key={task.id}
                    className={
                      index === fromAtasan.length - 1
                        ? "flex items-center gap-3"
                        : "flex items-center gap-3 border-b border-white/20 pb-3"
                    }
                  >
                    <div className="shrink-0 rounded-lg bg-white/20 p-2 text-on-accent">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tugas/${task.id}`}
                        className="block truncate text-sm font-semibold text-on-accent hover:underline"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-on-accent/80">
                        {statusLabel(task.status)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-on-accent/70">
                      {formatRelativeTime(task.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {menus.map(({ href, title, desc, icon: Icon, badge }) => (
            <Link key={href} href={href} className="min-w-0">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="rounded-xl bg-surface-container p-3 text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="truncate">{title}</span>
                      {badge ? (
                        <Badge variant="warning" className="shrink-0">
                          {badge} pending
                        </Badge>
                      ) : null}
                    </CardTitle>
                    <p className="text-sm text-on-surface-variant">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-outline" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageMain>
  );
}
