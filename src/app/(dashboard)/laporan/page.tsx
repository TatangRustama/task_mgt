import { Suspense } from "react";
import { LaporanBoardView } from "@/components/report/LaporanBoard";
import { ReportFilters } from "@/components/report/ReportFilters";
import { LaporanPrintProvider } from "@/components/report/PrintReportButton";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { getLaporanBoard } from "@/lib/laporan-board";
import { getOrgScope } from "@/lib/org";
import type { LaporanView } from "@/lib/report-types";
import { requireUser } from "@/lib/session";
import { formatISODate, isISODate, parseISODate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ReportBodyFallback() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-28 animate-pulse rounded-lg bg-surface-container" />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-28 animate-pulse rounded-lg bg-surface-container-high" />
      </div>
      <div className="h-20 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-20 animate-pulse rounded-lg bg-surface-container" />
    </div>
  );
}

async function LaporanBody({
  view,
  date,
  month,
  year,
  unit,
}: {
  view: LaporanView;
  date: string;
  month: number;
  year: number;
  unit?: string;
}) {
  const user = await requireUser(["personal"]);
  const { visibleUnitIds, isLeader } = await getOrgScope(user);
  const [board, ownBoard] = await Promise.all([
    getLaporanBoard({
      viewerId: user.id,
      rootUnitId: user.unitId,
      visibleUnitIds,
      isLeader,
      focusUnitId: unit,
      view,
      date,
      month,
      year,
    }),
    isLeader
      ? getLaporanBoard({
          viewerId: user.id,
          rootUnitId: user.unitId,
          visibleUnitIds,
          isLeader: false,
          ownAssignedOnly: true,
          view,
          date,
          month,
          year,
        })
      : Promise.resolve(null),
  ]);

  if (!board) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
        Unit belum tersedia untuk laporan.
      </p>
    );
  }

  return (
    <LaporanBoardView
      board={{ ...board, tasks: [] }}
      view={view}
      date={date}
      month={month}
      year={year}
      unitId={unit && visibleUnitIds.includes(unit) ? unit : null}
      ownPerson={ownBoard?.people[0] ?? null}
      ownHeading="Laporan individu"
      ownDefaultOpen={false}
    />
  );
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    month?: string;
    year?: string;
    unit?: string;
  }>;
}) {
  const user = await requireUser(["personal"]);
  const { isLeader } = await getOrgScope(user);
  const params = await searchParams;
  const view: LaporanView =
    params.view === "harian" || params.view === "bulanan" ? params.view : isLeader ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const date = isISODate(params.date) ? params.date : today;
  const selected = parseISODate(date);
  const month = Number(params.month || selected.getMonth() + 1);
  const year = Number(params.year || selected.getFullYear());

  return (
    <PageMain className="max-w-3xl space-y-6 print:max-w-none">
      <div className="no-print">
        <PageHeader
          title="Laporan"
          subtitle={
            view === "harian"
              ? isLeader
                ? "Recap kerja bawahan langsung hari ini"
                : "Rekap kerja Anda hari ini"
              : isLeader
                ? "Rapor bawahan langsung dan unit"
                : "Rapor kinerja Anda"
          }
        />
      </div>
      <LaporanPrintProvider view={view} date={date} month={month} year={year} unit={params.unit}>
        <div className="space-y-6">
          <div className="no-print">
            <ReportFilters basePath="/laporan" view={view} date={date} month={month} year={year} unit={params.unit} />
          </div>
          <Suspense fallback={<ReportBodyFallback />}>
            <LaporanBody view={view} date={date} month={month} year={year} unit={params.unit} />
          </Suspense>
        </div>
      </LaporanPrintProvider>
    </PageMain>
  );
}
