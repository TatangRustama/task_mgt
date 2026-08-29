"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function KeepTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleKeep() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/tasks/${taskId}/keep`, { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal mengambil tugas");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <Button onClick={handleKeep} disabled={loading} className="w-full">
        {loading ? "Memproses..." : "Ambil tugas"}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
