import { SuperAdminMockCard, SuperAdminMockPage } from "@/components/admin/SuperAdminMock";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function SettingPage() {
  const user = await requireUser();

  if (isSuperAdmin(user.role)) {
    return (
      <SuperAdminMockPage
        title="Setting"
        subtitle="Pengaturan aplikasi, sinkronisasi, dan konfigurasi instansi."
        notice="Halaman ini masih mockup. Pengaturan super admin akan ditambahkan di sini."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SuperAdminMockCard title="Instansi" value="—" hint="Profil dan kop surat" />
          <SuperAdminMockCard title="Sinkronisasi" value="—" hint="Simpeg dan data master" />
          <SuperAdminMockCard title="Akses" value="—" hint="Role dan kebijakan login" />
          <SuperAdminMockCard title="Notifikasi" value="—" hint="Pengingat tugas dan persetujuan" />
        </div>
      </SuperAdminMockPage>
    );
  }

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Setting" />
      <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
        Dalam tahap pengembangan
      </p>
    </PageMain>
  );
}
