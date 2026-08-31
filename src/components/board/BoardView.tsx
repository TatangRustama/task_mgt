"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TaskCard, TaskCardData } from "@/components/board/TaskCard";
import { TaskFormDialog } from "@/components/task/TaskForm";

export function BoardView({
  tasks,
  currentUserId,
  emptyTersedia = "Belum ada tugas tersedia. Buat tugas mandiri atau tunggu delegasi pimpinan.",
  canDelegate = false,
}: {
  tasks: TaskCardData[];
  currentUserId: string;
  emptyTersedia?: string;
  canDelegate?: boolean;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [delegasiOpen, setDelegasiOpen] = useState(false);

  const tersedia = tasks.filter((t) => t.status === "tersedia");
  const dikerjakan = tasks.filter((t) => t.status === "dikerjakan" || t.status === "ditolak");
  const selesai = tasks.filter((t) =>
    ["menunggu_approval", "disetujui"].includes(t.status)
  );

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  }

  function renderColumn(items: TaskCardData[], emptyText: string) {
    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-outline bg-surface-container-lowest p-4 text-center text-sm text-on-surface-variant">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((task) => (
          <TaskCard key={task.id} task={task} currentUserId={currentUserId} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        {canDelegate ? (
          <Button size="sm" onClick={() => setDelegasiOpen(true)}>
            <Plus className="h-4 w-4" />
            Delegasi Tugas baru
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="tersedia">
        <TabsList>
          <TabsTrigger value="tersedia">Tersedia ({tersedia.length})</TabsTrigger>
          <TabsTrigger value="dikerjakan">Dikerjakan ({dikerjakan.length})</TabsTrigger>
          <TabsTrigger value="selesai">Selesai ({selesai.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="tersedia">
          {renderColumn(tersedia, emptyTersedia)}
        </TabsContent>
        <TabsContent value="dikerjakan">
          {renderColumn(dikerjakan, "Belum ada tugas yang sedang dikerjakan.")}
        </TabsContent>
        <TabsContent value="selesai">
          {renderColumn(selesai, "Belum ada tugas selesai.")}
        </TabsContent>
      </Tabs>

      {canDelegate ? (
        <TaskFormDialog open={delegasiOpen} onOpenChange={setDelegasiOpen} mode="delegasi" />
      ) : null}
    </>
  );
}
