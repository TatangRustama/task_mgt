"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/task/StarRating";
import { useNavigationLoader } from "@/components/layout/NavigationLoader";

export function ReviewForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { start } = useNavigationLoader();
  const [decision, setDecision] = useState<"disetujui" | "ditolak">("disetujui");
  const [stars, setStars] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (decision === "disetujui" && stars == null) {
      setError("Beri 1 sampai 3 bintang sebelum menyetujui.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/tasks/${taskId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        feedback,
        stars: decision === "disetujui" ? stars : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan review");
      return;
    }

    start();
    router.push("/pimpinan/persetujuan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4 card-shadow">
      <div>
        <p className="text-sm font-semibold text-on-surface">Persetujuan & penilaian</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Setujui atau tolak tugas, dan beri bintang saat menyetujui.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={decision === "disetujui" ? "success" : "outline"}
          onClick={() => {
            setDecision("disetujui");
            setError("");
          }}
        >
          Setujui
        </Button>
        <Button
          type="button"
          variant={decision === "ditolak" ? "destructive" : "outline"}
          onClick={() => {
            setDecision("ditolak");
            setStars(null);
            setError("");
          }}
        >
          Tolak
        </Button>
      </div>

      {decision === "disetujui" ? (
        <div className="space-y-2">
          <Label>Bintang</Label>
          <StarRating value={stars} onChange={setStars} disabled={loading} />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`feedback-${taskId}`}>Catatan</Label>
        <Textarea
          id={`feedback-${taskId}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={decision === "ditolak" ? "Alasan penolakan / revisi" : "Umpan balik (opsional)"}
          required={decision === "ditolak"}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Menyimpan..." : "Simpan Review"}
      </Button>
    </form>
  );
}
