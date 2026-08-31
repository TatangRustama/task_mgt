"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationLoader } from "@/components/layout/NavigationLoader";
import { reportHref, type ReportBasePath } from "@/lib/laporan-url";
import { addDays, formatISODate, parseISODate } from "@/lib/utils";

export function DailyDateNav({
  basePath = "/laporan",
  date,
  month,
  year,
}: {
  basePath?: ReportBasePath;
  date: string;
  month?: number;
  year?: number;
}) {
  const router = useRouter();
  const { start } = useNavigationLoader();
  const current = parseISODate(date);
  const prev = formatISODate(addDays(current, -1));
  const next = formatISODate(addDays(current, 1));
  const today = formatISODate(new Date());

  function goTo(value: string) {
    start();
    router.push(reportHref(basePath, { view: "harian", date: value, month, year }));
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => goTo(prev)} aria-label="Hari sebelumnya">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <input
        type="date"
        value={date}
        onChange={(event) => goTo(event.target.value)}
        className="h-11 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
      />
      <Button variant="outline" size="icon" onClick={() => goTo(next)} aria-label="Hari berikutnya">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {date !== today ? (
        <Button variant="secondary" onClick={() => goTo(today)}>
          Hari ini
        </Button>
      ) : null}
    </div>
  );
}
