"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/task/TaskForm";

export function MandiriCreateControl({
  layout = "footer",
}: {
  layout?: "footer" | "sidebar";
}) {
  const [open, setOpen] = useState(false);

  if (layout === "sidebar") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-accent bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Plus className="h-4 w-4" strokeWidth={2.6} />
          </span>
          Tugas Mandiri
        </button>
        <TaskFormDialog open={open} onOpenChange={setOpen} mode="mandiri" />
      </>
    );
  }

  return (
    <>
      <div className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-0.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Tambah tugas mandiri"
          className="absolute bottom-full left-1/2 z-10 flex h-12 w-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-[#7EB6FF] bg-primary text-white ring-[5px] ring-white transition hover:bg-accent active:scale-95"
        >
          <Plus className="h-6 w-6" strokeWidth={2.8} />
        </button>
        <span className="h-5 w-5 shrink-0" aria-hidden />
        <span className="max-w-[4.75rem] truncate text-center text-[11px] font-medium leading-4 text-secondary">
          Tugas Mandiri
        </span>
      </div>
      <TaskFormDialog open={open} onOpenChange={setOpen} mode="mandiri" />
    </>
  );
}
