import { Card, CardContent } from "@/components/ui/card";
import type { ReportSummary } from "@/lib/report-types";
import { cn } from "@/lib/utils";

export function ReportStats({ summary }: { summary: ReportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Total diposting" value={summary.posted} />
      <StatCard highlight label="Total selesai" value={summary.completed} />
      <StatCard label="Rata bintang" value={summary.averageScore ? `${summary.averageScore}/3` : "-"} />
      <StatCard label="Tepat waktu" value={`${summary.onTimePercent}%`} />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", highlight && "border-0 bg-primary-container text-on-primary-container")}>
      <CardContent className="p-4">
        <p className={cn("text-xs font-medium uppercase tracking-wide", highlight ? "opacity-80" : "text-tertiary")}>
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-bold", highlight ? "text-on-primary-container" : "text-on-surface")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
