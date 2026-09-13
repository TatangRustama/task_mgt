export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { MonitorDashboard } from "@/components/pimpinan/MonitorDashboard";
import { laporanHref } from "@/lib/laporan-url";
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
  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);

  if (!isLeader) {
    redirect(
      laporanHref({
        view: params.view === "harian" ? "harian" : "bulanan",
        date,
        month,
        year,
      }),
    );
  }

  const focus = parseMonitorFocus(params.focus);
  const reportIds = orgUser ? await getDirectReportIds(orgUser) : [];
  const board = await getMonitorBoard({
    viewerId: user.id,
    rootUnitId: user.unitId,
    visibleUnitIds,
    focusUnitId: params.unit,
    directReportIds: reportIds,
  });

  return (
    <PageMain className="max-w-3xl space-y-6 print:max-w-none">
      <PageHeader
        title="Kinerja"
        subtitle="Bawahan langsung dan unit yang perlu tindakan hari ini"
        action={
          <Link href="/laporan" className="text-sm font-semibold text-secondary hover:underline">
            Arsip
          </Link>
        }
      />

      {board ? (
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
      )}
    </PageMain>
  );
}
