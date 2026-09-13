import Link from "next/link";
import { User } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGolonganPangkat } from "@/lib/golongan";
import { statusLabel, formatRelativeTime } from "@/lib/utils";

export type HomeAtasan = {
  name: string;
  jabatan: string | null;
  nip: string | null;
  golongan: string | null;
};

export type HomeFromAtasan = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

export function AtasanCard({
  atasan,
  fromAtasan,
}: {
  atasan: HomeAtasan | null;
  fromAtasan: HomeFromAtasan[];
}) {
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-accent bg-primary p-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Atasan langsung</p>
            {atasan ? (
              <>
                <h3 className="mt-1 truncate text-base font-semibold leading-snug">{atasan.name}</h3>
                <p className="mt-1 text-xs opacity-90">
                  {formatGolonganPangkat(atasan.golongan)} · NIP {atasan.nip || "-"}
                </p>
                {atasan.jabatan ? (
                  <p className="mt-1 line-clamp-1 text-xs opacity-90" title={atasan.jabatan}>
                    {atasan.jabatan}
                  </p>
                ) : null}
              </>
            ) : (
              <h3 className="mt-1 text-base font-semibold">Tidak ada atasan langsung</h3>
            )}
          </div>
          <span className="rounded-full bg-white p-2 text-primary">
            <User className="h-4 w-4" />
          </span>
        </div>
      </div>

      {fromAtasan.length > 0 ? (
        <Card className="border-transparent bg-secondary-container text-on-secondary-container">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm text-on-secondary-container">Tugas dari atasan</CardTitle>
              <Link href="/board" className="text-xs font-semibold text-on-secondary-container/90 hover:underline">
                Lihat semua
              </Link>
            </div>
            <ul className="mt-2 space-y-2">
              {fromAtasan.map((task) => (
                <li key={task.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tugas/${task.id}`}
                      className="block truncate text-sm font-semibold text-on-secondary-container hover:underline"
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-on-secondary-container/80">
                      {statusLabel(task.status)} · {formatRelativeTime(task.updatedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardHeader>
        </Card>
      ) : null}
    </>
  );
}
