import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskMonitorFilters } from "@/components/admin/TaskMonitorFilters";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getTaskMonitor, parseTaskMonitorFilters, taskMonitorDetailHref, taskMonitorHref } from "@/lib/task-monitor";
import { cn, formatDate, formatDateTime, statusLabel } from "@/lib/utils";

const sourceLabel = {
  delegasi: "Delegasi",
  mandiri: "Mandiri",
} as const;

export default async function TaskMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{
    pd?: string;
    u1?: string;
    u2?: string;
    u3?: string;
    q?: string;
    date?: string;
    sumber?: string;
    tahap?: string;
    page?: string;
  }>;
}) {
  await requireUser(["super_admin"]);
  const params = await searchParams;
  const requested = parseTaskMonitorFilters(params);
  const { rows, total, page, totalPages, perangkatDaerah, unor, filters, queried } = await getTaskMonitor(requested);

  return (
    <PageMain className="max-w-4xl space-y-4">
      <PageHeader
        title="Monitoring tugas"
        subtitle="Pilih filter lalu terapkan untuk menampilkan tugas. Daftar tidak dimuat sebelum ada filter."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{queried ? `Daftar tugas (${total})` : "Daftar tugas"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <TaskMonitorFilters
            key={taskMonitorHref(filters)}
            perangkatDaerah={perangkatDaerah}
            filters={filters}
            unorOptions={unor.options}
            showReset={queried}
          />

          {queried ? (
            <p className="text-on-surface-variant">
              Halaman {page} dari {totalPages}
            </p>
          ) : (
            <p className="text-on-surface-variant">
              Terapkan minimal satu filter untuk menampilkan tugas.
            </p>
          )}

          {!queried ? null : rows.length === 0 ? (
            <p className="text-on-surface-variant">Tidak ada tugas yang cocok dengan filter ini.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={taskMonitorDetailHref(row.id, filters)}
                    className="block rounded-lg border border-surface-container-highest bg-surface-container-low p-3 transition hover:border-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-on-surface">{row.title}</p>
                      <span className="flex shrink-0 items-center gap-1">
                        <Badge variant={row.status}>{statusLabel(row.status)}</Badge>
                        <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface">{row.assigneeName}</p>
                    <p className="text-xs text-on-surface-variant">{row.assigneeIdLabel}</p>
                    <p className="text-[10px] leading-4 text-on-surface-variant">
                      {row.perangkatDaerahNama} · {row.unitName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={row.source}>{sourceLabel[row.source]}</Badge>
                      <span className="text-xs text-on-surface-variant">
                        Ditugaskan {formatDate(row.assignedAt)}
                        {row.completedAt ? ` · Selesai ${formatDateTime(row.completedAt)}` : ""}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {queried ? <MonitorPager filters={filters} page={page} totalPages={totalPages} /> : null}
        </CardContent>
      </Card>
    </PageMain>
  );
}

function visiblePages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const marks = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    marks.add(2);
    marks.add(3);
    marks.add(4);
  }
  if (current >= total - 2) {
    marks.add(total - 1);
    marks.add(total - 2);
    marks.add(total - 3);
  }

  const nums = [...marks].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (let i = 0; i < nums.length; i += 1) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("ellipsis");
    out.push(nums[i]);
  }
  return out;
}

function MonitorPager({
  filters,
  page,
  totalPages,
}: {
  filters: Parameters<typeof taskMonitorHref>[0];
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const iconClass = cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 shrink-0");
  const idleClass = cn(iconClass, "pointer-events-none opacity-50");

  return (
    <nav className="flex flex-nowrap items-center justify-center gap-1 overflow-x-auto" aria-label="Halaman tugas">
      {page > 1 ? (
        <Link href={taskMonitorHref(filters, page - 1)} className={iconClass} aria-label="Sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={idleClass} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {visiblePages(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span key={`e-${index}`} className="shrink-0 px-1 text-on-surface-variant">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={taskMonitorHref(filters, item)}
            className={cn(
              buttonVariants({ variant: item === page ? "default" : "outline", size: "sm" }),
              "h-8 min-w-8 shrink-0 px-2",
            )}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={taskMonitorHref(filters, page + 1)} className={iconClass} aria-label="Berikutnya">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={idleClass} aria-disabled="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
