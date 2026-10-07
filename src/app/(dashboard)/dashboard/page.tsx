import { DashboardMonthSelect } from "@/components/admin/DashboardMonthSelect";
import { DashboardTabs } from "@/components/admin/DashboardTabs";
import { TaskConditionCharts } from "@/components/admin/TaskConditionCharts";
import { PerangkatDaerahRecapTable } from "@/components/admin/PerangkatDaerahRecapTable";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Card, CardContent } from "@/components/ui/card";
import {
  DASHBOARD_STATUSES,
  dashboardPeriodCaption,
  getPerangkatDaerahTaskRecap,
  getTaskConditionTrend,
  listDashboardMonthChoices,
  resolveDashboardMonth,
} from "@/lib/admin-dashboard";
import { requireUser } from "@/lib/session";
import { statusLabel } from "@/lib/utils";

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
  const [trend, perangkatDaerah] = await Promise.all([
    getTaskConditionTrend(month),
    getPerangkatDaerahTaskRecap(month),
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <Card>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Total</p>
                <p className="text-2xl font-bold tabular-nums text-on-surface">{trend.total}</p>
                <p className="text-xs text-on-surface-variant">{period}</p>
              </CardContent>
            </Card>
            {DASHBOARD_STATUSES.map((status) => (
              <Card key={status}>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                    {statusLabel(status)}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-on-surface">{trend.totals[status]}</p>
                  <p className="text-xs text-on-surface-variant">Kondisi saat ini</p>
                </CardContent>
              </Card>
            ))}
          </div>
        }
        charts={<TaskConditionCharts trend={trend} />}
        perangkat={<PerangkatDaerahRecapTable rows={perangkatDaerah} />}
      />
    </PageMain>
  );
}
