import Link from "next/link";
import { Settings, UserPlus, Users } from "lucide-react";
import { SuperAdminMockCard, SuperAdminMockNotice } from "@/components/admin/SuperAdminMock";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

const shortcuts = [
  { href: "/admin/pegawai", title: "Pegawai", desc: "Data pegawai, tambah ASN dan Non-ASN", icon: Users },
  { href: "/admin", title: "Manajemen pengguna", desc: "Tambah user dan pilih role", icon: UserPlus },
  { href: "/setting", title: "Setting", desc: "Pengaturan aplikasi", icon: Settings },
];

export default async function SuperAdminDashboardPage() {
  const user = await requireUser(["super_admin"]);

  return (
    <PageMain className="max-w-5xl space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={`Selamat datang, ${user.name}. Ringkasan super admin akan tampil di sini.`}
      />
      <SuperAdminMockNotice text="Dashboard ini masih mockup. Menu Pegawai dan Manajemen pengguna sudah aktif." />

      <div className="grid gap-3 sm:grid-cols-3">
        <SuperAdminMockCard title="Pegawai" value="—" hint="Total data pegawai" />
        <SuperAdminMockCard title="Unit organisasi" value="—" hint="Struktur instansi" />
        <SuperAdminMockCard title="Akun sistem" value="—" hint="Super admin dan admin" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shortcuts.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:bg-surface-container-low">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <p className="mt-1 text-sm text-on-surface-variant">{desc}</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageMain>
  );
}
