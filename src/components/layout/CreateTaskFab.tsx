"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/task/TaskForm";

export function CreateTaskFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tambah tugas mandiri"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition hover:shadow-xl hover:opacity-90 active:scale-95 no-print md:bottom-8 md:right-8"
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>
      <TaskFormDialog open={open} onOpenChange={setOpen} mode="mandiri" />
    </>
  );
}
