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
  unit,
}: {
  by: LaporanBy;
  view: LaporanView;
  date: string;
  month: number;
  year: number;
  unit?: string | null;
}) {
  const params = new URLSearchParams({
    by,
    view,
    date,
    month: String(month),
    year: String(year),
  });
  if (unit) params.set("unit", unit);
  const href = `/api/reports/export?${params.toString()}`;

  return (
    <Button variant="outline" className="w-full no-print" asChild>
      <a href={href} download>
        <Download className="h-4 w-4" />
        Export CSV
      </a>
    </Button>
  );
}
