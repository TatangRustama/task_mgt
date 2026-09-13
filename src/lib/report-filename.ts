import { formatLongDate, getMonthYearLabel } from "@/lib/utils";

export function contentDispositionAttachment(filename: string) {
  const safe = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  const ascii =
    safe
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/["\\]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "laporan.csv";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function dailyReportFilename(authorName: string, date: string) {
  return `Laporan harian a.n. ${authorName} ${formatLongDate(date)}.csv`;
}

export function monthlyReportFilename(authorName: string, month: number, year: number) {
  return `Laporan bulan ${getMonthYearLabel(month, year)} a.n. ${authorName}.csv`;
}

export function pegawaiReportFilename(authorName: string, month: number, year: number) {
  return `Laporan pegawai ${getMonthYearLabel(month, year)} a.n. ${authorName}.csv`;
}
