import type { ReportSummary, ReportTask } from "@/lib/report-types";
import { formatDate, getMonthYearLabel, statusLabel } from "@/lib/utils";
import { formatJumlahSatuan } from "@/lib/satuan";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: Array<string | number | null | undefined>) {
  return `${cells.map(csvCell).join(",")}\r\n`;
}

export function buildTaskReportCsv(options: {
  title: string;
  unitName: string;
  instansiName: string;
  summary: ReportSummary;
  tasks: ReportTask[];
}) {
  const lines = [
    csvRow(["Laporan", options.title]),
    csvRow(["Instansi", options.instansiName]),
    csvRow(["Unit", options.unitName]),
    csvRow([]),
    csvRow(["Diposting", options.summary.posted]),
    csvRow(["Selesai", options.summary.completed]),
    csvRow(["Rata bintang", options.summary.averageScore || "-"]),
    csvRow(["Tepat waktu %", options.summary.onTimePercent]),
    csvRow([]),
    csvRow([
      "No",
      "Judul",
      "Pegawai",
      "Status",
      "Sumber",
      "Dibuat",
      "Selesai",
      "Deadline",
      "Bintang",
      "Jumlah",
      "Satuan",
      "Lokasi",
    ]),
  ];

  options.tasks.forEach((task, index) => {
    lines.push(
      csvRow([
        index + 1,
        task.title,
        task.assigneeName,
        statusLabel(task.status),
        task.source,
        formatDate(task.createdAt),
        formatDate(task.completedAt),
        formatDate(task.deadline),
        task.score ?? "-",
        task.jumlahIntervensi ?? "-",
        task.satuan || "-",
        task.address || "-",
      ]),
    );
  });

  return `\uFEFF${lines.join("")}`;
}

export function buildDailyWfhCsv(options: {
  date: string;
  authorName: string;
  authorNip: string;
  tasks: ReportTask[];
}) {
  const lines = [
    csvRow(["Laporan Kinerja WFH", options.date]),
    csvRow(["Nama", options.authorName]),
    csvRow(["NIP", options.authorNip]),
    csvRow([]),
    csvRow(["No", "Uraian Kegiatan", "Tempat", "Hasil/Output", "Dokumentasi"]),
  ];

  if (options.tasks.length === 0) {
    lines.push(csvRow([1, "-", "Rumah", "-", "-"]));
  } else {
    options.tasks.forEach((task, index) => {
      const uraian = [task.title, task.description].filter(Boolean).join(" — ");
      const hasil =
        [
          formatJumlahSatuan(task.jumlahIntervensi, task.satuan),
          task.notes,
          task.feedback,
        ]
          .filter(Boolean)
          .join(" — ") || "-";
      lines.push(
        csvRow([
          index + 1,
          uraian,
          task.address?.trim() || "Rumah",
          hasil,
          task.photoUrls.length ? task.photoUrls.join("; ") : "-",
        ]),
      );
    });
  }

  return `\uFEFF${lines.join("")}`;
}

export function buildLaporanAssessmentCsv(options: {
  title: string;
  unitName: string;
  insight: string;
  summary: { completed: number; rejected: number; averageScore: number; onTimePercent: number };
  rows: Array<{
    name: string;
    role: string;
    insight: string;
    completed: number;
    rejected: number;
    averageScore: number;
    onTimePercent: number;
  }>;
}) {
  const lines = [
    csvRow(["Laporan", options.title]),
    csvRow(["Unit", options.unitName]),
    csvRow(["Ringkasan", options.insight]),
    csvRow([]),
    csvRow(["Disetujui", options.summary.completed]),
    csvRow(["Ditolak", options.summary.rejected]),
    csvRow(["Rata bintang", options.summary.averageScore || "-"]),
    csvRow(["Tepat waktu %", options.summary.onTimePercent]),
    csvRow([]),
    csvRow(["Nama", "Peran / unit", "Predikat", "Disetujui", "Ditolak", "Rata bintang", "Tepat waktu %"]),
  ];

  for (const row of options.rows) {
    lines.push(
      csvRow([
        row.name,
        row.role,
        row.insight,
        row.completed,
        row.rejected,
        row.averageScore || "-",
        row.onTimePercent,
      ]),
    );
  }

  return `\uFEFF${lines.join("")}`;
}

export function buildPegawaiReportCsv(options: {
  month: number;
  year: number;
  unitName: string;
  instansiName: string;
  summary: ReportSummary;
  rows: Array<{
    name: string;
    kinerja: string;
    completed: number;
    total: number;
    averageScore: number;
    onTimePercent: number;
  }>;
}) {
  const period = getMonthYearLabel(options.month, options.year);
  const lines = [
    csvRow(["Laporan Pegawai", period]),
    csvRow(["Instansi", options.instansiName]),
    csvRow(["Unit", options.unitName]),
    csvRow([]),
    csvRow(["Diposting", options.summary.posted]),
    csvRow(["Selesai", options.summary.completed]),
    csvRow(["Rata bintang", options.summary.averageScore || "-"]),
    csvRow(["Tepat waktu %", options.summary.onTimePercent]),
    csvRow([]),
    csvRow(["Pegawai", "Kinerja", "Selesai", "Total", "Rata bintang", "Tepat waktu %"]),
  ];

  for (const row of options.rows) {
    lines.push(
      csvRow([
        row.name,
        row.kinerja,
        row.completed,
        row.total,
        row.averageScore || "-",
        row.onTimePercent,
      ]),
    );
  }

  return `\uFEFF${lines.join("")}`;
}
