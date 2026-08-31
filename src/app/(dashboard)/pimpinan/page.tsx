export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardPlus,
  ClipboardList,
  FileText,
  User,
} from "lucide-react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { PegawaiReport } from "@/components/report/PegawaiReport";
import { ReportFilters } from "@/components/report/ReportFilters";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getAtasan, getDbOrgUser, getDirectReportIds, jabatanLabel } from "@/lib/org";
import { formatGolonganPangkat } from "@/lib/golongan";
import { getDailyReport, getMonthlyCalendar, getPegawaiBreakdown } from "@/lib/reports";
import type { LaporanView } from "@/lib/report-types";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, cn, formatISODate, formatRelativeTime, isISODate, parseISODate, statusLabel } from "@/lib/utils";

export default async function PimpinanPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    month?: string;
    year?: string;
  }>;
}) {
  const user = await requireUser(["admin", "pimpinan"]);
  const params = await searchParams;
  const view: LaporanView = params.view === "harian" ? "harian" : "bulanan";
  const today = formatISODate(new Date());
  const date = isISODate(params.date) ? params.date : today;
  const selected = parseISODate(date);
  const month = Number(params.month || selected.getMonth() + 1);
  const year = Number(params.year || selected.getFullYear());

  const orgUser = await getDbOrgUser(user.id);
  const scope = {
    role: user.role,
    userId: user.id,
    unitId: user.unitId,
  };

  const [reportIds, atasan, daily, monthly] = await Promise.all([
    orgUser ? getDirectReportIds(orgUser) : Promise.resolve([] as string[]),
    orgUser ? getAtasan(orgUser) : Promise.resolve(null),
    view === "harian" ? getDailyReport({ ...scope, date }) : Promise.resolve(null),
    view === "bulanan" ? getMonthlyCalendar({ ...scope, month, year }) : Promise.resolve(null),
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

  const report = daily ?? monthly;
  const start = view === "harian" ? parseISODate(date) : new Date(year, month - 1, 1);
  const end = view === "harian" ? addDays(start, 1) : new Date(year, month, 1);
  const people = report ? await getPegawaiBreakdown(report.tasks, scope, start, end) : [];

  const atasanJabatan =
    atasanPegawai?.jabatanNama || (atasan?.jabatan ? jabatanLabel[atasan.jabatan] : null);
  const atasanNip = atasanPegawai?.nip || atasanUser?.nip || null;
  const atasanGolongan = atasanPegawai?.golonganNama || null;

  return (
    <PageMain className="max-w-3xl space-y-6 print:max-w-none">
      <div className="no-print">
        <PageHeader
          title="Kinerja"
          subtitle={
            view === "harian" ? "Pantau kinerja pegawai harian" : "Pantau kinerja pegawai bulanan"
          }
        />

        <KinerjaOpsBar pendingCount={pendingCount} />

        <div className="mt-3 overflow-hidden rounded-lg border border-accent bg-primary p-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                Atasan langsung
              </p>
              {atasan ? (
                <>
                  <h3 className="mt-1 truncate text-base font-semibold leading-snug">{atasan.name}</h3>
                  <p className="mt-1 text-xs opacity-90">
                    {formatGolonganPangkat(atasanGolongan)} · NIP {atasanNip || "-"}
                  </p>
                  {atasanJabatan ? (
                    <p className="mt-1 line-clamp-1 text-xs opacity-90" title={atasanJabatan}>
                      {atasanJabatan}
                    </p>
                  ) : null}
                </>
              ) : (
                <h3 className="mt-1 text-base font-semibold">Tidak ada atasan langsung</h3>
              )}
            </div>
            <span className="rounded-full bg-white p-2 text-primary">
              <User className="h-4 w-4" />
            </span>
          </div>
        </div>

        {fromAtasan.length > 0 ? (
          <Card className="mt-4 border-transparent bg-secondary-container text-on-secondary-container">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm text-on-secondary-container">Tugas dari atasan</CardTitle>
                <Link href="/board" className="text-xs font-semibold text-on-secondary-container/90 hover:underline">
                  Lihat semua
                </Link>
              </div>
              <ul className="mt-2 space-y-2">
                {fromAtasan.map((task) => (
                  <li key={task.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tugas/${task.id}`}
                        className="block truncate text-sm font-semibold text-on-secondary-container hover:underline"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-on-secondary-container/80">
                        {statusLabel(task.status)} · {formatRelativeTime(task.updatedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardHeader>
          </Card>
        ) : null}
      </div>

      <ReportFilters basePath="/pimpinan" view={view} date={date} month={month} year={year} />

      {!report ? (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Unit belum tersedia untuk monitoring kinerja.
        </p>
      ) : (
        <PegawaiReport
          by="pegawai"
          view={view}
          date={date}
          month={month}
          year={year}
          summary={report.summary}
          people={people}
          days={monthly?.days ?? []}
          unitName={report.unitName}
          instansiName={report.instansiName}
          pimpinanName={monthly?.pimpinanName}
        />
      )}
    </PageMain>
  );
}

function KinerjaOpsBar({ pendingCount }: { pendingCount: number }) {
  const items = [
    {
      href: "/pimpinan/persetujuan",
      label: "Persetujuan",
      icon: CheckCircle2,
      badge: pendingCount,
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      href: "/pimpinan/delegasi",
      label: "Delegasi",
      icon: ClipboardPlus,
      tone: "bg-sky-100 text-sky-700",
    },
    { href: "/board", label: "Board", icon: ClipboardList, tone: "bg-sky-100 text-sky-600" },
    { href: "/laporan", label: "Laporan", icon: FileText, tone: "bg-amber-100 text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ href, label, icon: Icon, badge, tone }) => (
        <Link
          key={href}
          href={href}
          className="relative flex flex-col items-center gap-1 rounded-lg border border-outline bg-surface-container-lowest px-1 py-2 text-center transition hover:border-primary"
        >
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md border border-outline", tone)}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-semibold leading-tight text-on-surface">{label}</span>
          {badge ? (
            <Badge variant="warning" className="absolute -right-1 -top-1 px-1.5 py-0 text-[10px]">
              {badge}
            </Badge>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
