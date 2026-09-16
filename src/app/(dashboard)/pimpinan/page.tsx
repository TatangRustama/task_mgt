export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive } from "lucide-react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { MonitorDashboard } from "@/components/pimpinan/MonitorDashboard";
import { LaporanBoardView } from "@/components/report/LaporanBoard";
import { KinerjaViewTabs } from "@/components/report/ReportFilters";
import { getLaporanBoard } from "@/lib/laporan-board";
import { laporanHref, parseKinerjaView } from "@/lib/laporan-url";
import { getMonitorBoard } from "@/lib/monitor";
import { parseMonitorFocus } from "@/lib/monitor-types";
import { getDirectReportIds, getOrgScope } from "@/lib/org";
import { requireUser } from "@/lib/session";
import { formatISODate, isISODate, parseISODate } from "@/lib/utils";

export default async function PimpinanPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    month?: string;
    year?: string;
    unit?: string;
    focus?: string;
  }>;
}) {
  const user = await requireUser(["personal"]);
  const params = await searchParams;
  const today = formatISODate(new Date());
  const date = isISODate(params.date) ? params.date : today;
  const selected = parseISODate(date);
  const month = Number(params.month || selected.getMonth() + 1);
  const year = Number(params.year || selected.getFullYear());
  const view = parseKinerjaView(params.view);
  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);

  if (!isLeader) {
    redirect(laporanHref({ view: "harian", date, month, year }));
  }

  const focus = parseMonitorFocus(params.focus);
  const reportIds = orgUser ? await getDirectReportIds(orgUser) : [];

  const ownBoard =
    view === "individu"
      ? await getLaporanBoard({
          viewerId: user.id,
          rootUnitId: user.unitId,
          visibleUnitIds,
          isLeader: false,
          ownAssignedOnly: true,
          view: "harian",
          date,
          month,
          year,
        })
      : null;

  const board =
    view === "unit"
      ? await getMonitorBoard({
          viewerId: user.id,
          rootUnitId: user.unitId,
          visibleUnitIds,
          focusUnitId: params.unit,
          directReportIds: reportIds,
        })
      : null;

  const subtitle =
    view === "individu"
      ? "Rekap kerja Anda hari ini"
      : "Bawahan langsung dan unit yang perlu tindakan hari ini";

  return (
    <PageMain className="max-w-3xl space-y-6 print:max-w-none">
      <PageHeader
        title="Kinerja"
        subtitle={subtitle}
        action={
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Archive className="h-4 w-4" />
            Arsip
          </Link>
        }
      />

      <div className="no-print">
        <KinerjaViewTabs view={view} date={date} month={month} year={year} />
      </div>

      {view === "unit" ? (
        board ? (
          <MonitorDashboard
            board={board}
            focus={focus}
            unitId={params.unit && visibleUnitIds.includes(params.unit) ? params.unit : null}
            date={date}
            month={month}
            year={year}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
            Unit belum tersedia untuk monitoring kinerja.
          </p>
        )
      ) : ownBoard ? (
        <LaporanBoardView
          board={ownBoard}
          view="harian"
          date={date}
          month={month}
          year={year}
          unitId={null}
          basePath="/pimpinan"
          peopleHeading="Kinerja saya"
          showActions={false}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Unit belum tersedia untuk laporan kinerja.
        </p>
      )}
    </PageMain>
  );
}
