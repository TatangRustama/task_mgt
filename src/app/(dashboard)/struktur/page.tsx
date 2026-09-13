import { SuperAdminMockCard, SuperAdminMockPage } from "@/components/admin/SuperAdminMock";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { unitTypeLabel } from "@/lib/org";
import { isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function StrukturPage() {
  const user = await requireUser(["personal", "super_admin"]);

  if (isSuperAdmin(user.role)) {
    return (
      <SuperAdminMockPage
        title="Struktur organisasi"
        subtitle="Hierarki instansi, perangkat daerah, dan unit kerja."
        notice="Halaman ini masih mockup. Data struktur organisasi akan ditampilkan di sini."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SuperAdminMockCard title="Kantor" value="—" hint="Unit tingkat kantor" />
          <SuperAdminMockCard title="Bidang" value="—" hint="Unit tingkat bidang" />
          <SuperAdminMockCard title="Sub bidang" value="—" hint="Unit tingkat sub bidang" />
        </div>
      </SuperAdminMockPage>
    );
  }

  const unit = user.unitId
    ? await prisma.unit.findUnique({
        where: { id: user.unitId },
        select: {
          name: true,
          type: true,
          statusUnor: true,
          eselonId: true,
          perangkatDaerahNama: true,
          parent: { select: { name: true } },
        },
      })
    : null;

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Struktur" subtitle="Unit organisasi Anda" />
      {unit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{unit.perangkatDaerahNama || "Unit organisasi"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-surface-container-highest bg-surface-container-low p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-on-surface">{unit.name}</p>
                <Badge variant="mandiri">{unitTypeLabel[unit.type]}</Badge>
              </div>
              {unit.parent?.name ? (
                <p className="text-sm text-on-surface-variant">Induk: {unit.parent.name}</p>
              ) : null}
              <p className="text-xs text-tertiary">
                {unit.statusUnor || "Status tidak diketahui"}
                {unit.eselonId ? ` · Eselon ${unit.eselonId}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Unit organisasi Anda belum ditetapkan.
        </p>
      )}
    </PageMain>
  );
}
