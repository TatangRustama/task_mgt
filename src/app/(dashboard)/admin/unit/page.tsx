import { UnitOrganisasiBrowser, type OrgUnit } from "@/components/admin/UnitOrganisasiBrowser";
import { PageMain } from "@/components/layout/PageMain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function UnitOrganisasiPage() {
  await requireUser(["super_admin"]);

  const [units, pegawaiCounts] = await Promise.all([
    prisma.unit.findMany({
      select: {
        id: true,
        name: true,
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
      where: { deletedAt: null, unorId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(
    pegawaiCounts.flatMap((row) => (row.unorId ? [[row.unorId, row._count._all] as const] : [])),
  );

  const rows: OrgUnit[] = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
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
      <UnitOrganisasiBrowser units={rows} />
    </PageMain>
  );
}
