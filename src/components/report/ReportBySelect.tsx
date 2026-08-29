"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { laporanHref } from "@/lib/laporan-url";
import type { LaporanBy, LaporanView } from "@/lib/report-types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: LaporanBy; label: string }[] = [
  { value: "tugas", label: "Tugas" },
  { value: "pegawai", label: "Pegawai" },
];

export function ReportBySelect({
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((option) => option.value === by) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0 no-print">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Jenis laporan"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-0.5 text-sm font-medium text-secondary"
      >
        {current.label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-tertiary transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 min-w-[7.5rem] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest py-0.5 shadow-sm"
        >
          {OPTIONS.map((option) => (
            <Link
              key={option.value}
              role="option"
              aria-selected={by === option.value}
              href={laporanHref({ by: option.value, view, date, month, year })}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-1.5 text-sm",
                by === option.value ? "font-medium text-on-surface" : "text-secondary"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
