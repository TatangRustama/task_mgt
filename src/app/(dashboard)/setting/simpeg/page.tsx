import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { SimpegSyncCard } from "@/components/setting/SimpegSyncCard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function SettingSimpegPage() {
  await requireUser(["super_admin"]);
  const [unitCount, pegawaiCount, lastSynced] = await Promise.all([
    prisma.unit.count({ where: { externalId: { not: null } } }),
    prisma.pegawai.count({ where: { jenis: "asn", syncedAt: { not: null } } }),
    prisma.pegawai.findFirst({
      where: { syncedAt: { not: null } },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),
  ]);

  return (
    <PageMain className="max-w-5xl space-y-6">
      <PageHeader
        title="Sinkron SIMPEG"
        subtitle="Sinkronisasi data unit organisasi dan pegawai ASN dari SIMPEG."
      />
      <SimpegSyncCard
        isAdmin={true}
        initialUnitCount={unitCount}
        initialPegawaiCount={pegawaiCount}
        initialLastSyncedAt={lastSynced?.syncedAt ? lastSynced.syncedAt.toISOString() : null}
      />
    </PageMain>
  );
}
