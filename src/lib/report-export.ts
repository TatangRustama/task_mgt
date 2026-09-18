import {
  evidenceRows,
  groupTasksByPrintDate,
  groupTasksForWfhPrint,
  printDailyHasilParafText,
  printDailyKeteranganText,
  printHasilParafText,
  printKeterangan,
  printUraianText,
  type PrintPerson,
  type PrintUnitReviewRow,
} from "@/lib/laporan-print-view";
import type { HarianPrintData, BulananPrintData } from "@/lib/laporan-print-data";
import type { ReportTask } from "@/lib/report-types";
import { formatPrintedOnDate, formatWfhReportDate, getMonthYearLabel } from "@/lib/utils";

const DELIMITER = ";";

function excelSafeText(value: string) {
  return value
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u00B7\u2022\u2027\u22C5]/g, "-")
    .replace(/\u00A0/g, " ");
}

function csvCell(value: string | number | null | undefined) {
  const text = excelSafeText(String(value ?? ""));
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: Array<string | number | null | undefined> = []) {
  return `${cells.map(csvCell).join(DELIMITER)}\r\n`;
}

function identityRows(person: PrintPerson, pangkatLabel: string) {
  return [
    csvRow(["Nama", person.name]),
    csvRow(["NIP", person.nip]),
    csvRow([pangkatLabel, person.pangkatGolongan]),
    csvRow(["Jabatan", person.jabatan]),
  ];
}

function monthlyTaskTableRows(tasks: ReportTask[], authorName: string, empty: string) {
  const lines = [csvRow(["No.", "Hari/Tgl", "Uraian Tugas", "Keterangan", "Hasil/ Paraf"])];
  if (tasks.length === 0) {
    lines.push(csvRow(["", "", empty, "", ""]));
    return lines;
  }
  for (const group of groupTasksByPrintDate(tasks)) {
    for (const task of group.tasks) {
      lines.push(
        csvRow([
          group.no,
          group.date,
          printUraianText(task, { includeJumlah: true }),
          printKeterangan(task, authorName, { includeFeedback: false }) || "-",
          printHasilParafText(task),
        ]),
      );
    }
  }
  return lines;
}

function dailyIndividuTableRows(tasks: ReportTask[], empty: string) {
  const lines = [csvRow(["No.", "Uraian Tugas", "Keterangan", "Hasil/ Paraf"])];
  if (tasks.length === 0) {
    lines.push(csvRow(["", empty, "", ""]));
    return lines;
  }
  tasks.forEach((task, index) => {
    lines.push(
      csvRow([
        index + 1,
        printUraianText(task),
        printDailyKeteranganText(task),
        printDailyHasilParafText(task),
      ]),
    );
  });
  return lines;
}

function dailyUnitTableRows(tasks: ReportTask[]) {
  const lines = [csvRow(["NO", "URAIAN KEGIATAN", "KETERANGAN", "HASIL/ PARAF"])];
  const groups = groupTasksForWfhPrint(tasks);
  if (groups.length === 0) {
    lines.push(csvRow([1, "-", "-", "-"]));
    return lines;
  }
  for (const group of groups) {
    for (const task of group.tasks) {
      lines.push(
        csvRow([
          group.no,
          printUraianText(task),
          printDailyKeteranganText(task),
          printDailyHasilParafText(task),
        ]),
      );
    }
  }
  return lines;
}

function reviewUnitRows(rows: PrintUnitReviewRow[]) {
  const lines = [
    csvRow(["Nama / unit", "Predikat", "Disetujui", "Ditolak", "Nilai", "Tepat waktu"]),
  ];
  if (rows.length === 0) {
    lines.push(csvRow(["Tidak ada bawahan yang dinilai pada periode ini.", "", "", "", "", ""]));
    return lines;
  }
  for (const row of rows) {
    const nama = [row.name, row.identity, row.jabatanNama].filter((part) => part && part !== "-").join("\n");
    lines.push(
      csvRow([
        nama,
        row.insight,
        row.completed,
        row.rejected,
        row.averageScore ? `${row.averageScore}/3` : "-",
        row.completed ? `${row.onTimePercent}%` : "-",
      ]),
    );
  }
  return lines;
}

function lampiranRows(tasks: ReportTask[], showDate = true) {
  const rows = evidenceRows(tasks);
  if (rows.length === 0) return [];
  const header = showDate ? ["No.", "Hari/Tgl", "Bukti Visual"] : ["No.", "Bukti Visual"];
  const lines = [csvRow([]), csvRow(["Lampiran"]), csvRow(["Bukti Dokumen"]), csvRow(header)];
  rows.forEach((row, index) => {
    const visual = [row.title, ...row.photos].join("\n");
    lines.push(showDate ? csvRow([index + 1, row.date, visual]) : csvRow([index + 1, visual]));
  });
  return lines;
}

export function buildDailyPrintCsv(data: HarianPrintData) {
  const { print, isLeader, date, tasks, leaderTasks, lampiranTasks } = data;
  const lines = [
    csvRow(["LAPORAN KINERJA"]),
    csvRow([formatWfhReportDate(date)]),
    csvRow([]),
    ...identityRows(print.author, "Pangkat"),
    csvRow([]),
    csvRow(["Atasan langsung / Pemberi Tugas"]),
    ...(print.atasan ? identityRows(print.atasan, "Pangkat") : [csvRow(["Tidak ada atasan langsung."])]),
  ];

  if (isLeader) {
    lines.push(csvRow([]), csvRow(["Rincian Tugas Individu"]));
    lines.push(
      ...dailyIndividuTableRows(leaderTasks, "Tidak ada tugas individu pada tanggal ini."),
    );
    lines.push(csvRow([]), csvRow(["Rincian Tugas Unit"]));
    lines.push(...dailyUnitTableRows(tasks));
  } else {
    lines.push(csvRow([]));
    lines.push(...dailyUnitTableRows(tasks));
  }

  lines.push(csvRow([]), csvRow(["dicetak pada :", formatPrintedOnDate()]));
  lines.push(csvRow([print.author.jabatan]));
  lines.push(...lampiranRows(lampiranTasks, false));
  return lines.join("");
}

export function buildMonthlyPrintCsv(data: BulananPrintData) {
  const { print, isLeader, month, year, tasks, rows, leaderTasks, lampiranTasks } = data;
  const period = getMonthYearLabel(month, year).toUpperCase();
  const lines = [
    csvRow([
      isLeader ? "LAPORAN PENILAIAN KINERJA BULANAN" : "LAPORAN PELAKSANAAN KINERJA BULANAN",
      period,
    ]),
    csvRow([]),
    ...identityRows(print.author, "Pangkat/Golongan"),
    csvRow([]),
    csvRow(["Atasan langsung / Pemberi Tugas"]),
    ...(print.atasan
      ? identityRows(print.atasan, "Pangkat/Golongan")
      : [csvRow(["Tidak ada atasan langsung."])]),
  ];

  if (isLeader) {
    lines.push(csvRow([]), csvRow(["Rincian Tugas Individu"]));
    lines.push(
      ...monthlyTaskTableRows(leaderTasks, print.author.name, "Tidak ada tugas individu pada periode ini."),
    );
    lines.push(csvRow([]), csvRow(["Review Tugas Unit"]));
    lines.push(...reviewUnitRows(rows));
  }

  lines.push(csvRow([]), csvRow([isLeader ? "Rincian Tugas Unit" : "Uraian tugas"]));
  lines.push(
    ...monthlyTaskTableRows(
      tasks,
      print.author.name,
      "Tidak ada tugas pada periode ini.",
    ),
  );
  lines.push(csvRow([]), csvRow(["dicetak pada :", formatPrintedOnDate()]));
  lines.push(...lampiranRows(lampiranTasks));
  return lines.join("");
}

export function buildLaporanPrintCsv(data: HarianPrintData | BulananPrintData) {
  return data.view === "harian" ? buildDailyPrintCsv(data) : buildMonthlyPrintCsv(data);
}

export function encodeExcelCsv(csv: string) {
  const payload = `sep=${DELIMITER}\r\n${csv.replace(/^\uFEFF/, "")}`;
  const bytes = new Uint8Array(2 + payload.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[2 + i * 2 + 1] = (code >> 8) & 0xff;
  }
  return bytes;
}
