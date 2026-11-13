import { UnitOrganisasiBrowser, type OrgUnit } from "@/components/admin/UnitOrganisasiBrowser";
import { PageMain } from "@/components/layout/PageMain";
import { adminScopeNotice, getAdminScope } from "@/lib/admin-scope";
import { deriveNamaJabatan } from "@/lib/jabatan-display";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function UnitOrganisasiPage() {
  const user = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(user);
  const notice = adminScopeNotice(scope);

  const [units, pegawaiCounts] = await Promise.all([
    prisma.unit.findMany({
      where: scope.unrestricted ? undefined : { id: { in: scope.unitIds } },
      select: {
        id: true,
        name: true,
        namaJabatan: true,
        parentId: true,
        type: true,
        eselonId: true,
        statusUnor: true,
        perangkatDaerahId: true,
        perangkatDaerahNama: true,
        parent: { select: { name: true } },
        pimpinan: { select: { name: true } },
      },
      orderBy: [{ perangkatDaerahNama: "asc" }, { name: "asc" }],
    }),
    prisma.pegawai.groupBy({
      by: ["unorId"],
      where: {
        deletedAt: null,
        unorId: scope.unrestricted ? { not: null } : { in: scope.unitIds },
      },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(
    pegawaiCounts.flatMap((row) => (row.unorId ? [[row.unorId, row._count._all] as const] : [])),
  );

  const rows: OrgUnit[] = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    namaJabatan: unit.namaJabatan?.trim() || deriveNamaJabatan(unit.name) || null,
    parentId: unit.parentId,
    parentName: unit.parent?.name ?? null,
    type: unit.type,
    eselonId: unit.eselonId,
    statusUnor: unit.statusUnor,
    perangkatDaerahId: unit.perangkatDaerahId,
    perangkatDaerahNama: unit.perangkatDaerahNama,
    pimpinanName: unit.pimpinan?.name ?? null,
    pegawaiCount: counts.get(unit.id) ?? 0,
  }));

  return (
    <PageMain className="max-w-4xl space-y-4">
      {notice ? (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
          {notice}
        </p>
      ) : null}
      <UnitOrganisasiBrowser units={rows} />
    </PageMain>
  );
}
