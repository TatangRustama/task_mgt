import { KepatuhanMonitorView } from "@/components/admin/KepatuhanMonitorView";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { adminScopeNotice, getAdminScope } from "@/lib/admin-scope";
import { getKepatuhanMonitor, parseKepatuhanFilters } from "@/lib/kepatuhan-monitor";
import { getStoredKepatuhanTemplate } from "@/lib/kepatuhan-template";
import { requireUser } from "@/lib/session";

export default async function KepatuhanMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    date?: string;
    month?: string;
    pd?: string;
    u1?: string;
    u2?: string;
    u3?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const user = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(user);
  const notice = adminScopeNotice(scope);
  const params = await searchParams;
  const requested = parseKepatuhanFilters(params);
  const [data, messageTemplate] = await Promise.all([
    getKepatuhanMonitor(requested, scope),
    Promise.resolve(getStoredKepatuhanTemplate()),
  ]);

  return (
    <PageMain className="max-w-5xl space-y-4">
      <PageHeader
        title="Kepatuhan input kinerja"
        subtitle={
          scope.unrestricted
            ? "Pantau kepatuhan input kinerja pegawai."
            : "Pantau kepatuhan input kinerja pegawai unit Anda."
        }
      />
      {notice ? (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
          {notice}
        </p>
      ) : null}
      <KepatuhanMonitorView
        key={JSON.stringify(data.filters)}
        rows={data.rows}
        summary={data.summary}
        perangkatDaerah={data.perangkatDaerah}
        unorOptions={data.unor.options}
        filters={data.filters}
        periodLabel={data.periodLabel}
        perangkatLocked={data.perangkatLocked}
        queried={data.queried}
        messageTemplate={messageTemplate}
      />
    </PageMain>
  );
}
