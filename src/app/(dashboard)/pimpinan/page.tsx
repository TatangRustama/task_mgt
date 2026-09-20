export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive } from "lucide-react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { KinerjaBoard } from "@/components/pimpinan/KinerjaBoard";
import { KinerjaBoardSkeleton } from "@/components/pimpinan/KinerjaBoardSkeleton";
import { KinerjaViewTabs } from "@/components/report/ReportFilters";
import { laporanHref, parseKinerjaView } from "@/lib/laporan-url";
import { parseMonitorFocus } from "@/lib/monitor-types";
import { getOrgScope } from "@/lib/org";
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
  const { isLeader } = await getOrgScope(user);

  if (!isLeader) {
    redirect(laporanHref({ view: "harian", date, month, year }));
  }

  const focus = parseMonitorFocus(params.focus);
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

      <Suspense fallback={<KinerjaBoardSkeleton />}>
        <KinerjaBoard
          view={view}
          date={date}
          month={month}
          year={year}
          unit={params.unit}
          focus={focus}
        />
      </Suspense>
    </PageMain>
  );
}
