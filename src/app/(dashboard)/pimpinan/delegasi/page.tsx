"use client";

import { useState } from "react";
import { TaskFormDialog } from "@/components/task/TaskForm";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DelegasiPage() {
  const [open, setOpen] = useState(false);

  return (
    <PageMain className="max-w-3xl">
      <PageHeader
        title="Tambah Tugas"
        subtitle="Tunjuk bawahan langsung, atau lempar ke kolam board staf sub bidang."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Baru
          </Button>
        }
      />
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center card-shadow">
        <p className="mb-4 text-sm text-on-surface-variant">
          Kepala kantor dan kepala bidang menunjuk penerima secara bernama. Kepala sub bidang
          dapat menunjuk staf atau melempar kartu ke board sub bidang agar stafnya yang mengambil.
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Tugas Baru
        </Button>
      </div>
      <TaskFormDialog open={open} onOpenChange={setOpen} mode="delegasi" />
    </PageMain>
  );
}
