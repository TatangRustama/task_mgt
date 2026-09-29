import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { MandiriCreateControl } from "@/components/layout/CreateTaskFab";
import { EnablePushNotifications } from "@/components/layout/EnablePushNotifications";
import { getDbOrgUser, isUnitLeader } from "@/lib/org";
import { canUseEmployeeApp, isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const canCreateMandiri = canUseEmployeeApp(user.role);
  const orgUser = await getDbOrgUser(user.id);
  const pegawai = orgUser?.pegawai;
  const isLeader = Boolean(orgUser && isUnitLeader(orgUser));
  const identity = isSuperAdmin(user.role)
    ? "Super Admin"
    : pegawai?.jenis === "non_asn"
      ? `NIK ${pegawai.nik || "-"}`
      : `NIP ${pegawai?.nip || user.nip}`;

  return (
    <div className="min-h-screen bg-surface-container-high print:bg-white">
      <Header userName={user.name} identity={identity} />
      <SideNav role={user.role} isLeader={isLeader} />
      <div className="app-frame min-h-screen bg-background pt-16 pb-24 shadow-[0_0_40px_rgba(27,33,86,0.06)] md:pl-64 print:m-0 print:bg-white print:p-0 print:shadow-none">
        {children}
      </div>
      <BottomNav role={user.role} isLeader={isLeader} />
      {canCreateMandiri ? <MandiriCreateControl /> : null}
      {canCreateMandiri ? <EnablePushNotifications /> : null}
    </div>
  );
}
