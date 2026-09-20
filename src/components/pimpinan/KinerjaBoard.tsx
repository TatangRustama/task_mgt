import { MonitorDashboard } from "@/components/pimpinan/MonitorDashboard";
import { LaporanBoardView } from "@/components/report/LaporanBoard";
import { getLaporanBoard } from "@/lib/laporan-board";
import { laporanHref } from "@/lib/laporan-url";
import { getMonitorBoard } from "@/lib/monitor";
import type { MonitorFocus } from "@/lib/monitor-types";
import { getOrgScope } from "@/lib/org";
import type { KinerjaView } from "@/lib/report-types";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export async function KinerjaBoard({
  view,
  date,
  month,
  year,
  unit,
  focus,
}: {
  view: KinerjaView;
  date: string;
  month: number;
  year: number;
  unit?: string;
  focus: MonitorFocus;
}) {
  const user = await requireUser(["personal"]);
  const { visibleUnitIds, isLeader } = await getOrgScope(user);

  if (!isLeader) {
    redirect(laporanHref({ view: "harian", date, month, year }));
  }

  if (view === "individu") {
    const ownBoard = await getLaporanBoard({
      viewerId: user.id,
      rootUnitId: user.unitId,
      visibleUnitIds,
      isLeader: false,
      ownAssignedOnly: true,
      view: "harian",
      date,
      month,
      year,
    });
    if (!ownBoard) {
      return (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Unit belum tersedia untuk laporan kinerja.
        </p>
      );
    }
    return (
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
    );
  }

  const board = await getMonitorBoard({
    viewerId: user.id,
    rootUnitId: user.unitId,
    visibleUnitIds,
    focusUnitId: unit,
  });
  if (!board) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
        Unit belum tersedia untuk monitoring kinerja.
      </p>
    );
  }

  return (
    <MonitorDashboard
      board={board}
      focus={focus}
      unitId={unit && visibleUnitIds.includes(unit) ? unit : null}
      date={date}
      month={month}
      year={year}
    />
  );
}
