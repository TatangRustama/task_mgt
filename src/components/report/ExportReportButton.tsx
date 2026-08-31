"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LaporanBy, LaporanView } from "@/lib/report-types";

export function ExportReportButton({
  by,
  view,
  date,
  month,
  year,
}: {
  by: LaporanBy;
  view: LaporanView;
  date: string;
  month: number;
  year: number;
}) {
  const href = `/api/reports/export?by=${by}&view=${view}&date=${encodeURIComponent(date)}&month=${month}&year=${year}`;

  return (
    <Button variant="outline" className="w-full no-print" asChild>
      <a href={href} download>
        <Download className="h-4 w-4" />
        Export CSV
      </a>
    </Button>
  );
}
