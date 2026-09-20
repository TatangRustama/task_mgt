"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { DailyWfhPrintReport } from "@/components/report/DailyWfhPrintReport";
import { MonthlyTaskPrintReport } from "@/components/report/MonthlyTaskPrintReport";
import { Button } from "@/components/ui/button";
import type { DailyLaporanPrintContext, LaporanPrintContext, PrintUnitReviewRow } from "@/lib/laporan-print-view";
import { isPrintableTask } from "@/lib/laporan-print-view";
import { downloadPrintPdf, printPdfFilename } from "@/lib/print-pdf";
import type { LaporanView, ReportTask } from "@/lib/report-types";

type PrintPrepare = {
  prepareAndPrint: () => void;
  busy: boolean;
};

const PrintPrepareContext = createContext<PrintPrepare | null>(null);

export function PrintReportButton() {
  const print = useContext(PrintPrepareContext);
  return (
    <Button
      variant="outline"
      className="w-full no-print"
      disabled={print?.busy}
      onClick={() => print?.prepareAndPrint()}
    >
      <Printer className="h-4 w-4" />
      {print?.busy ? "Menyiapkan PDF..." : "Cetak Laporan"}
    </Button>
  );
}

type PrintAssessmentRow = PrintUnitReviewRow;

type HarianPayload = {
  view: "harian";
  print: DailyLaporanPrintContext;
  isLeader: boolean;
  tasks?: ReportTask[];
  leaderTasks?: ReportTask[];
  lampiranTasks?: ReportTask[];
};
type BulananPayload = {
  view: "bulanan";
  print: LaporanPrintContext;
  tasks: ReportTask[];
  isLeader: boolean;
  rows: PrintAssessmentRow[];
  leaderTasks?: ReportTask[];
  lampiranTasks?: ReportTask[];
};

function applyPrintPhotoOrientation(img: HTMLImageElement) {
  if (!img.classList.contains("print-bukti-img")) return;
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
  const portrait = img.naturalHeight >= img.naturalWidth;
  const target = img.closest(".print-bukti-open") ?? img;
  target.classList.toggle("print-bukti-img-portrait", portrait);
  target.classList.toggle("print-bukti-img-landscape", !portrait);
  img.classList.toggle("print-bukti-img-portrait", portrait);
  img.classList.toggle("print-bukti-img-landscape", !portrait);
}

function waitForPrintImages() {
  const images = [
    ...document.querySelectorAll<HTMLImageElement>(".print-kinerja img, .print-wfh img"),
  ];
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            applyPrintPhotoOrientation(img);
            resolve();
            return;
          }
          const done = () => {
            applyPrintPhotoOrientation(img);
            resolve();
          };
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  ).then(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export function LaporanPrintProvider({
  view,
  date,
  month,
  year,
  unit,
  children,
}: {
  view: LaporanView;
  date: string;
  month: number;
  year: number;
  unit?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [harian, setHarian] = useState<{
    print: DailyLaporanPrintContext;
    tasks: ReportTask[];
    isLeader: boolean;
    leaderTasks: ReportTask[];
    lampiranTasks: ReportTask[];
  } | null>(null);
  const [bulanan, setBulanan] = useState<{
    print: LaporanPrintContext;
    tasks: ReportTask[];
    isLeader: boolean;
    rows: PrintAssessmentRow[];
    leaderTasks: ReportTask[];
    lampiranTasks: ReportTask[];
  } | null>(null);
  const pendingPrint = useRef(false);

  useEffect(() => {
    setHarian(null);
    setBulanan(null);
  }, [view, date, month, year, unit]);

  async function savePdf(authorName: string, reportView: "harian" | "bulanan") {
    await waitForPrintImages();
    await downloadPrintPdf(
      printPdfFilename({
        view: reportView,
        authorName,
        date,
        month,
        year,
      }),
    );
  }

  useEffect(() => {
    if (!pendingPrint.current) return;
    if (view === "harian" && !harian) return;
    if (view === "bulanan" && !bulanan) return;
    pendingPrint.current = false;
    const authorName =
      view === "harian" ? harian?.print.author.name : bulanan?.print.author.name;
    if (!authorName) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await savePdf(authorName, view);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, harian, bulanan, date, month, year]);

  async function prepareAndPrint() {
    if (busy) return;

    setBusy(true);
    pendingPrint.current = true;
    setHarian(null);
    setBulanan(null);
    const params = new URLSearchParams({
      view,
      date,
      month: String(month),
      year: String(year),
    });
    if (unit) params.set("unit", unit);
    try {
      const res = await fetch(`/api/reports/print-context?${params.toString()}`);
      if (!res.ok) {
        pendingPrint.current = false;
        setBusy(false);
        return;
      }
      const data = (await res.json()) as HarianPayload | BulananPayload;
      if (data.view === "harian") {
        setHarian({
          print: data.print,
          tasks: data.tasks ?? [],
          isLeader: data.isLeader,
          leaderTasks: data.leaderTasks ?? [],
          lampiranTasks: data.lampiranTasks ?? [],
        });
      } else {
        setBulanan({
          print: data.print,
          tasks: data.tasks,
          isLeader: data.isLeader,
          rows: data.rows,
          leaderTasks: data.leaderTasks ?? [],
          lampiranTasks: data.lampiranTasks ?? [],
        });
      }
    } catch {
      pendingPrint.current = false;
      setBusy(false);
    }
  }

  return (
    <PrintPrepareContext.Provider value={{ prepareAndPrint, busy }}>
      {children}
      {harian ? (
        <DailyWfhPrintReport
          date={date}
          tasks={harian.tasks}
          print={harian.print}
          isLeader={harian.isLeader}
          leaderTasks={harian.leaderTasks}
          lampiranTasks={harian.lampiranTasks}
        />
      ) : null}
      {bulanan ? (
        <MonthlyTaskPrintReport
          month={month}
          year={year}
          tasks={bulanan.tasks.filter((task) => isPrintableTask(task))}
          print={bulanan.print}
          isLeader={bulanan.isLeader}
          rows={bulanan.rows}
          leaderTasks={bulanan.leaderTasks}
          lampiranTasks={bulanan.lampiranTasks}
        />
      ) : null}
    </PrintPrepareContext.Provider>
  );
}
