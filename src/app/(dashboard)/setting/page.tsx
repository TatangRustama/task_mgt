import { SuperAdminMockCard } from "@/components/admin/SuperAdminMock";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { SimpegSyncCard } from "@/components/setting/SimpegSyncCard";
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

    return (
      <PageMain className="max-w-5xl space-y-6">
        <PageHeader
          title="Pengaturan Sistem"
          subtitle="Konfigurasi aplikasi, sinkronisasi massal SIMPEG, dan manajemen instansi."
        />

        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-on-surface-variant">
            Sinkronisasi Master SIMPEG (Super Admin)
          </h2>
          <SimpegSyncCard
            isAdmin={true}
            initialUnitCount={unitCount}
            initialPegawaiCount={pegawaiCount}
            initialLastSyncedAt={lastSynced?.syncedAt ? lastSynced.syncedAt.toISOString() : null}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-on-surface-variant">
            Konfigurasi Lainnya
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <SuperAdminMockCard title="Instansi" value="—" hint="Profil dan kop surat" />
            <SuperAdminMockCard title="Akses & Kebijakan" value="—" hint="Role dan kebijakan login" />
            <SuperAdminMockCard title="Notifikasi" value="—" hint="Pengingat tugas dan persetujuan" />
            <SuperAdminMockCard title="Audit Log" value="—" hint="Riwayat aktivitas sistem" />
          </div>
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
