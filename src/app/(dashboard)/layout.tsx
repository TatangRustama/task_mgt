import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { getUserNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const canCreateMandiri = user.role === "pegawai" || user.role === "pimpinan";
  const [pegawai, notifications] = await Promise.all([
    prisma.pegawai.findUnique({
      where: { userId: user.id },
      select: { jenis: true, nik: true, nip: true },
    }),
    getUserNotifications(user.id, user.role),
  ]);
  const identity =
    pegawai?.jenis === "non_asn"
      ? `NIK ${pegawai.nik || "-"}`
      : `NIP ${pegawai?.nip || user.nip}`;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <Header userName={user.name} identity={identity} notifications={notifications} />
      <SideNav role={user.role} canCreateMandiri={canCreateMandiri} />
      <div className="pt-16 pb-24 md:ml-64 print:m-0 print:p-0">{children}</div>
      <BottomNav role={user.role} canCreateMandiri={canCreateMandiri} />
    </div>
  );
}
