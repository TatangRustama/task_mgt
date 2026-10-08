import { CircleCheck, CircleX, Clock, Inbox, ListTodo, Sigma, type LucideIcon } from "lucide-react";
import { DashboardMonthSelect } from "@/components/admin/DashboardMonthSelect";
import { DashboardTabs } from "@/components/admin/DashboardTabs";
import { TaskConditionCharts } from "@/components/admin/TaskConditionCharts";
import { PerangkatDaerahRecapTable } from "@/components/admin/PerangkatDaerahRecapTable";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Card, CardContent } from "@/components/ui/card";
import {
  DASHBOARD_STATUSES,
  dashboardPeriodCaption,
  getPerangkatDaerahPegawaiRecap,
  getPerangkatDaerahTaskRecap,
  getTaskConditionTrend,
  listDashboardMonthChoices,
  resolveDashboardMonth,
  type DashboardStatus,
} from "@/lib/admin-dashboard";
import { requireUser } from "@/lib/session";
import { cn, statusLabel } from "@/lib/utils";

const STATUS_CARD_ICONS: Record<Exclude<DashboardStatus, "dibatalkan">, { icon: LucideIcon; className: string }> = {
  disetujui: { icon: CircleCheck, className: "text-emerald-600" },
  menunggu_approval: { icon: Clock, className: "text-amber-500" },
  dikerjakan: { icon: ListTodo, className: "text-primary" },
  tersedia: { icon: Inbox, className: "text-secondary" },
  ditolak: { icon: CircleX, className: "text-error" },
};

export default async function SuperAdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  await requireUser(["super_admin"]);
  const params = await searchParams;
  const monthChoices = await listDashboardMonthChoices();
  const month = resolveDashboardMonth(params.bulan, monthChoices);
  const period = dashboardPeriodCaption(month);
  const [trend, perangkatDaerah, pegawaiDaerah] = await Promise.all([
    getTaskConditionTrend(month),
    getPerangkatDaerahTaskRecap(month),
    getPerangkatDaerahPegawaiRecap(month),
  ]);

  return (
    <PageMain className="max-w-5xl space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={month ? `Kondisi ${period}` : "Kondisi 3 Bulan terakhir"}
        action={<DashboardMonthSelect value={month ? params.bulan ?? "" : ""} options={monthChoices} />}
      />

      <DashboardTabs
        recap={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total" value={trend.total} icon={Sigma} iconClassName="text-primary" />
              {DASHBOARD_STATUSES.filter((status) => status !== "dibatalkan").map((status) => {
                const visual = STATUS_CARD_ICONS[status];
                return (
                  <StatCard
                    key={status}
                    label={status === "menunggu_approval" ? "Belum approval" : statusLabel(status)}
                    value={trend.totals[status]}
                    icon={visual.icon}
                    iconClassName={visual.className}
                  />
                );
              })}
            </div>
            <TaskConditionCharts trend={trend} />
          </div>
        }
        perangkat={<PerangkatDaerahRecapTable tasks={perangkatDaerah} pegawai={pegawaiDaerah} />}
      />
    </PageMain>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <Icon
        className={cn("pointer-events-none absolute -bottom-3 -right-2 h-16 w-16 opacity-20", iconClassName)}
        strokeWidth={1.5}
        aria-hidden
      />
      <CardContent className="relative space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-on-surface">{value}</p>
      </CardContent>
    </Card>
  );
}
