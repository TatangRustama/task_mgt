import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { MandiriCreateControl } from "@/components/layout/CreateTaskFab";
import { EnablePushNotifications } from "@/components/layout/EnablePushNotifications";
import { getDbOrgUser, isUnitLeader } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { canUseEmployeeApp, isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const canCreateMandiri = canUseEmployeeApp(user.role);
  const [pegawai, orgUser] = await Promise.all([
    prisma.pegawai.findUnique({
      where: { userId: user.id },
      select: { jenis: true, nik: true, nip: true },
    }),
    getDbOrgUser(user.id),
  ]);
  const isLeader = Boolean(orgUser && isUnitLeader(orgUser));
  const identity = isSuperAdmin(user.role)
    ? "Super Admin"
    : pegawai?.jenis === "non_asn"
      ? `NIK ${pegawai.nik || "-"}`
      : `NIP ${pegawai?.nip || user.nip}`;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <Header userName={user.name} identity={identity} />
      <SideNav role={user.role} isLeader={isLeader} />
      <div className="pt-16 pb-24 md:ml-64 print:m-0 print:p-0">{children}</div>
      <BottomNav role={user.role} isLeader={isLeader} />
      {canCreateMandiri ? <MandiriCreateControl /> : null}
      {canCreateMandiri ? <EnablePushNotifications /> : null}
    </div>
  );
}
