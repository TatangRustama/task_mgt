import { NextResponse } from "next/server";
import { getLaporanBoard } from "@/lib/laporan-board";
import { laporanPersonLabel } from "@/lib/laporan-board-types";
import { getDailyLaporanPrintContext } from "@/lib/laporan-print";
import { getDirectReportIds, getOrgScope } from "@/lib/org";
import {
  contentDispositionAttachment,
  dailyReportFilename,
  monthlyReportFilename,
} from "@/lib/report-filename";
import { buildDailyWfhCsv, buildLaporanAssessmentCsv } from "@/lib/report-export";
import { getUnitMeta } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";
import { formatISODate, getMonthYearLabel, isISODate, parseISODate } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") === "bulanan" ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const dateParam = searchParams.get("date") || undefined;
  const date = isISODate(dateParam) ? dateParam : today;
  const selected = parseISODate(date);
  const month = Number(searchParams.get("month") || selected.getMonth() + 1);
  const year = Number(searchParams.get("year") || selected.getFullYear());
  const unit = searchParams.get("unit") || undefined;

  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);
  const reportIds = orgUser && isLeader ? await getDirectReportIds(orgUser) : [];
  const board = await getLaporanBoard({
    viewerId: user.id,
    rootUnitId: user.unitId,
    visibleUnitIds,
    isLeader,
    directReportIds: reportIds,
    focusUnitId: unit,
    view,
    date,
    month,
    year,
    detail: "print",
  });
  if (!board) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  }

  if (view === "harian" && !isLeader) {
    const meta = await getUnitMeta(user.unitId);
    const print = await getDailyLaporanPrintContext({
      userId: user.id,
      instansiName: meta.instansiName,
      agencyName: meta.agencyName,
    });
    const csv = buildDailyWfhCsv({
      date,
      authorName: print.author.name,
      authorNip: print.author.nip,
      tasks: board.tasks,
    });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": contentDispositionAttachment(dailyReportFilename(print.author.name, date)),
      },
    });
  }

  const rows = [
    ...board.childUnits.map((unitRow) => ({
      name: unitRow.leaderName || unitRow.name,
      role: unitRow.name,
      insight: unitRow.insight,
      completed: unitRow.completed,
      rejected: unitRow.rejected,
      averageScore: unitRow.averageScore,
      onTimePercent: unitRow.onTimePercent,
    })),
    ...board.people.map((person) => ({
      name: person.name,
      role: person.jabatanLabel || "Pegawai",
      insight: person.insight || laporanPersonLabel(person),
      completed: person.completed,
      rejected: person.rejected,
      averageScore: person.averageScore,
      onTimePercent: person.onTimePercent,
    })),
  ];

  const title =
    view === "bulanan"
      ? `Rapor ${getMonthYearLabel(month, year)}`
      : `Recap harian ${date}`;
  const csv = buildLaporanAssessmentCsv({
    title,
    unitName: board.unitName,
    insight: board.insight,
    summary: board.summary,
    rows,
  });
  const filename =
    view === "bulanan" ? monthlyReportFilename(user.name, month, year) : dailyReportFilename(user.name, date);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDispositionAttachment(filename),
    },
  });
}
