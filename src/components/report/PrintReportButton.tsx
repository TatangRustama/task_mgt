"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { DailyWfhPrintReport } from "@/components/report/DailyWfhPrintReport";
import { MonthlyTaskPrintReport } from "@/components/report/MonthlyTaskPrintReport";
import { Button } from "@/components/ui/button";
import type { DailyLaporanPrintContext, LaporanPrintContext, PrintUnitReviewRow } from "@/lib/laporan-print-view";
import { isPrintableTask } from "@/lib/laporan-print-view";
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
      onClick={() => (print ? print.prepareAndPrint() : window.print())}
    >
      <Printer className="h-4 w-4" />
      {print?.busy ? "Menyiapkan..." : "Cetak Laporan"}
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
};
type BulananPayload = {
  view: "bulanan";
  print: LaporanPrintContext;
  tasks: ReportTask[];
  isLeader: boolean;
  rows: PrintAssessmentRow[];
  leaderTasks?: ReportTask[];
};

function waitForPrintImages() {
  const images = [
    ...document.querySelectorAll<HTMLImageElement>(".print-kinerja img, .print-wfh img"),
  ];
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
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
  dailyTasks?: ReportTask[];
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [harian, setHarian] = useState<{
    print: DailyLaporanPrintContext;
    tasks: ReportTask[];
    isLeader: boolean;
    leaderTasks: ReportTask[];
  } | null>(null);
  const [bulanan, setBulanan] = useState<{
    print: LaporanPrintContext;
    tasks: ReportTask[];
    isLeader: boolean;
    rows: PrintAssessmentRow[];
    leaderTasks: ReportTask[];
  } | null>(null);
  const pendingPrint = useRef(false);

  useEffect(() => {
    setHarian(null);
    setBulanan(null);
  }, [view, date, month, year, unit]);

  useEffect(() => {
    if (!pendingPrint.current) return;
    if (view === "harian" && !harian) return;
    if (view === "bulanan" && !bulanan) return;
    pendingPrint.current = false;
    let cancelled = false;
    (async () => {
      await waitForPrintImages();
      if (!cancelled) window.print();
    })();
    return () => {
      cancelled = true;
    };
  }, [view, harian, bulanan]);

  async function prepareAndPrint() {
    if (view === "harian" && harian) {
      await waitForPrintImages();
      window.print();
      return;
    }
    if (view === "bulanan" && bulanan) {
      await waitForPrintImages();
      window.print();
      return;
    }

    setBusy(true);
    pendingPrint.current = true;
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
        return;
      }
      const data = (await res.json()) as HarianPayload | BulananPayload;
      if (data.view === "harian") {
        setHarian({
          print: data.print,
          tasks: data.tasks ?? [],
          isLeader: data.isLeader,
          leaderTasks: data.leaderTasks ?? [],
        });
      } else {
        setBulanan({
          print: data.print,
          tasks: data.tasks,
          isLeader: data.isLeader,
          rows: data.rows,
          leaderTasks: data.leaderTasks ?? [],
        });
      }
    } finally {
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
        />
      ) : null}
    </PrintPrepareContext.Provider>
  );
}
