"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LocationMapView } from "@/components/map/LocationMapView";
import { ReviewForm } from "@/components/task/ReviewForm";
import { cn, formatDateTime } from "@/lib/utils";
import { formatJumlahSatuan } from "@/lib/satuan";

export type PendingApprovalTask = {
  id: string;
  title: string;
  assignedToName: string | null;
  completedAt: string | null;
  jumlahIntervensi: number | null;
  satuan: string | null;
  evidence: {
    notes: string;
    address: string;
    photoUrls: string[];
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export function PendingApprovalList({ tasks }: { tasks: PendingApprovalTask[] }) {
  const [openId, setOpenId] = useState<string | null>(tasks[0]?.id ?? null);

  useEffect(() => {
    if (tasks.length === 0) {
      setOpenId(null);
      return;
    }
    if (!openId || !tasks.some((task) => task.id === openId)) {
      setOpenId(tasks[0].id);
    }
  }, [openId, tasks]);

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const open = openId === task.id;
        return (
          <Card key={task.id} className="overflow-hidden">
            <div className="h-1.5 bg-primary-container" />
            <button
              type="button"
              onClick={() => setOpenId(open ? null : task.id)}
              className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-on-surface">{task.title}</h3>
                  <Badge variant="warning" className="shrink-0">
                    review
                  </Badge>
                </div>
                <p className="text-sm text-on-surface-variant">{task.assignedToName}</p>
                {formatJumlahSatuan(task.jumlahIntervensi, task.satuan) ? (
                  <p className="text-xs text-secondary">
                    {formatJumlahSatuan(task.jumlahIntervensi, task.satuan)}
                  </p>
                ) : null}
                <p className="text-xs text-tertiary">Selesai: {formatDateTime(task.completedAt)}</p>
              </div>
              <ChevronDown
                className={cn("mt-1 h-5 w-5 shrink-0 text-outline transition", open && "rotate-180")}
              />
            </button>

            {open ? (
              <CardContent className="space-y-4 border-t border-outline-variant pt-4">
                {task.evidence ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-on-surface">Bukti pekerjaan</p>
                    {task.evidence.notes ? (
                      <p className="text-sm text-on-surface-variant">{task.evidence.notes}</p>
                    ) : null}
                    {task.evidence.address ? (
                      <p className="text-sm text-tertiary">{task.evidence.address}</p>
                    ) : null}
                    {task.evidence.latitude !== null && task.evidence.longitude !== null ? (
                      <LocationMapView
                        latitude={task.evidence.latitude}
                        longitude={task.evidence.longitude}
                      />
                    ) : null}
                    {task.evidence.photoUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {task.evidence.photoUrls.map((url) => (
                          <div key={url} className="relative aspect-square overflow-hidden rounded-lg">
                            <Image src={url} alt="Bukti" fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">Tidak ada bukti pekerjaan.</p>
                )}

                <ReviewForm taskId={task.id} />

                <p className="text-center text-xs text-on-surface-variant">
                  <Link href={`/tugas/${task.id}`} className="font-medium text-secondary hover:underline">
                    Buka detail tugas
                  </Link>
                </p>
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
