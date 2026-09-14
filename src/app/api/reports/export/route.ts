import { NextResponse } from "next/server";
import { getLaporanPrintData } from "@/lib/laporan-print-data";
import {
  contentDispositionAttachment,
  dailyReportFilename,
  monthlyReportFilename,
} from "@/lib/report-filename";
import { buildLaporanPrintCsv, encodeExcelCsv } from "@/lib/report-export";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getLaporanPrintData(user, new URL(request.url).searchParams);
  if (!data) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  }

  const csv = encodeExcelCsv(buildLaporanPrintCsv(data));
  const filename =
    data.view === "bulanan"
      ? monthlyReportFilename(data.print.author.name, data.month, data.year)
      : dailyReportFilename(data.print.author.name, data.date);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": contentDispositionAttachment(filename),
    },
  });
}
