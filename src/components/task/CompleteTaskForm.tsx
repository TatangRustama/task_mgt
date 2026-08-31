"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceFields, useEvidenceCapture } from "@/components/task/EvidenceCapture";
import { useNavigationLoader } from "@/components/layout/NavigationLoader";

export function CompleteTaskForm({ taskId, isRevision = false }: { taskId: string; isRevision?: boolean }) {
  const router = useRouter();
  const { start } = useNavigationLoader();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const evidence = useEvidenceCapture(true);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const evidenceError = evidence.validate();
    if (evidenceError) {
      setError(evidenceError);
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      body: evidence.toFormData(),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyelesaikan tugas");
      return;
    }

    start();
    router.push("/board");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EvidenceFields
        notes={evidence.notes}
        setNotes={evidence.setNotes}
        address={evidence.address}
        setAddress={evidence.setAddress}
        latitude={evidence.latitude}
        longitude={evidence.longitude}
        photos={evidence.photos}
        geoError={evidence.geoError}
        onPhotoChange={async (event) => {
          const photoError = await evidence.handlePhotoChange(event);
          if (photoError) setError(photoError);
          else setError("");
        }}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" variant="success" className="w-full" disabled={loading}>
        {loading ? "Mengunggah..." : isRevision ? "Kirim ulang revisi" : "Telah Selesai"}
      </Button>
    </form>
  );
}
