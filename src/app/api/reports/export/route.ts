import { NextResponse } from "next/server";
import { groupKinerja, monthAsOfDate } from "@/lib/kinerja";
import { getDailyLaporanPrintContext } from "@/lib/laporan-print";
import { buildDailyWfhCsv, buildPegawaiReportCsv, buildTaskReportCsv } from "@/lib/report-export";
import { getDailyReport, getMonthlyCalendar, getPegawaiBreakdown } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";
import { formatISODate, getMonthYearLabel, isISODate, parseISODate } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const by = searchParams.get("by") === "pegawai" ? "pegawai" : "tugas";
  const view = searchParams.get("view") === "bulanan" ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const dateParam = searchParams.get("date") || undefined;
  const date = isISODate(dateParam) ? dateParam : today;
  const selected = parseISODate(date);
  const month = Number(searchParams.get("month") || selected.getMonth() + 1);
  const year = Number(searchParams.get("year") || selected.getFullYear());

  const scope = {
    role: user.role,
    userId: user.id,
    unitId: user.unitId,
  };

  if (by === "pegawai" && view === "bulanan") {
    const monthly = await getMonthlyCalendar({ ...scope, month, year });
    if (!monthly) {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const people = await getPegawaiBreakdown(monthly.tasks, scope, start, end);
    const grouped = groupKinerja(people, monthAsOfDate(month, year), "bulanan");
    const rows = [...grouped.perhatian, ...grouped.lancar, ...grouped.idle].map((item) => ({
      name: item.person.name,
      kinerja: item.eval.label,
      completed: item.eval.completed,
      total: item.eval.total,
      averageScore: item.person.summary.averageScore,
      onTimePercent: item.person.summary.onTimePercent,
    }));

    const csv = buildPegawaiReportCsv({
      month,
      year,
      unitName: monthly.unitName,
      instansiName: monthly.instansiName,
      summary: monthly.summary,
      rows,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-pegawai-${year}-${String(month).padStart(2, "0")}.csv"`,
      },
    });
  }

  if (view === "harian" && by === "tugas") {
    const daily = await getDailyReport({ ...scope, date });
    if (!daily) {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
    }

    const print = await getDailyLaporanPrintContext({
      userId: user.id,
      instansiName: daily.instansiName,
      agencyName: daily.agencyName,
    });

    const csv = buildDailyWfhCsv({
      date,
      authorName: print.author.name,
      authorNip: print.author.nip,
      tasks: daily.tasks,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-wfh-${date}.csv"`,
      },
    });
  }

  const data =
    view === "bulanan"
      ? await getMonthlyCalendar({ ...scope, month, year })
      : await getDailyReport({ ...scope, date });

  if (!data) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  }

  const title =
    view === "bulanan"
      ? `Tugas Bulanan ${getMonthYearLabel(month, year)}`
      : `Tugas Harian ${date}`;

  const csv = buildTaskReportCsv({
    title,
    unitName: data.unitName,
    instansiName: data.instansiName,
    summary: data.summary,
    tasks: data.tasks,
  });

  const filename =
    view === "bulanan"
      ? `laporan-tugas-${year}-${String(month).padStart(2, "0")}.csv`
      : `laporan-tugas-${date}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
