"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button variant="outline" className="w-full no-print" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      Cetak Laporan
    </Button>
  );
}
