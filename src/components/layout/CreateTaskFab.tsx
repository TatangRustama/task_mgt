"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/task/TaskForm";

export function MandiriCreateControl() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tambah tugas mandiri"
        className="fixed z-[71] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(27,33,86,0.28)] transition hover:bg-accent active:scale-95 print:hidden bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-4 md:right-6"
      >
        <Plus className="h-7 w-7" strokeWidth={2.6} />
      </button>
      <TaskFormDialog open={open} onOpenChange={setOpen} mode="mandiri" />
    </>
  );
}
