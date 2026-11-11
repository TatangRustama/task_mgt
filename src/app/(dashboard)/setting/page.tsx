import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { ExternalApiCard } from "@/components/setting/ExternalApiCard";
import { SimpegSyncCard } from "@/components/setting/SimpegSyncCard";
import { getStoredApiTokens } from "@/lib/api-tokens";
import { prisma } from "@/lib/prisma";
import { hasSuperAdminAccess } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function SettingPage() {
  const user = await requireUser();

  if (hasSuperAdminAccess(user)) {
    const [unitCount, pegawaiCount, lastSynced] = await Promise.all([
      prisma.unit.count({ where: { externalId: { not: null } } }),
      prisma.pegawai.count({ where: { jenis: "asn", syncedAt: { not: null } } }),
      prisma.pegawai.findFirst({
        where: { syncedAt: { not: null } },
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true },
      }),
    ]);

    const initialTokens = getStoredApiTokens();

    return (
      <PageMain className="max-w-5xl space-y-6">
        <PageHeader
          title="Pengaturan Sistem"
          subtitle="Kelola integrasi API eksternal dan sinkronisasi data SIMPEG."
        />

        <div className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            API Eksternal
          </h2>
          <ExternalApiCard initialTokens={initialTokens} />
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Sinkronisasi SIMPEG
          </h2>
          <SimpegSyncCard
            isAdmin={true}
            initialUnitCount={unitCount}
            initialPegawaiCount={pegawaiCount}
            initialLastSyncedAt={lastSynced?.syncedAt ? lastSynced.syncedAt.toISOString() : null}
          />
        </div>
      </PageMain>
    );
  }

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Setting" subtitle="Pengaturan akun dan preferensi pengguna." />
      <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
        Fitur pengaturan akun sedang dalam pengembangan.
      </p>
    </PageMain>
  );
}
