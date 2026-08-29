import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { SimpegSyncCard } from "@/components/setting/SimpegSyncCard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function SettingPage() {
  const user = await requireUser();

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
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Setting" subtitle="Pengaturan aplikasi dan sinkronisasi data." />
      <SimpegSyncCard
        isAdmin={user.role === "admin"}
        initialUnitCount={unitCount}
        initialPegawaiCount={pegawaiCount}
        initialLastSyncedAt={lastSynced?.syncedAt?.toISOString() ?? null}
      />
    </PageMain>
  );
}
